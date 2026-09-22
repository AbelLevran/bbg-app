# Design — BBG Group Work Management & Burnout Tracker System

**Companion to:** `prd.md` (read that first — this document assumes its vocabulary: Ticket, TimeSession, ActivityLog, Cluster, Recurring Series, Workload Risk, etc.)
**Stack:** Vue 3 (Composition API) · Node.js (Express) · PostgreSQL
**Purpose:** technical design + a 4-phase implementation plan sized for a quota-limited AI coding agent (e.g. Antigravity), so each of the 4 prompts is self-contained and independently verifiable.

---

## 1. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Vue 3 + `<script setup>` (Composition API) | |
| Frontend state | Pinia | one store per domain: `auth`, `tickets`, `timer`, `workload`, `org` |
| Frontend routing | Vue Router 4 | role-based route guards (mirrors `prd.md §4.2`) |
| Frontend build | Vite | |
| Frontend charts | Chart.js + `vue-chartjs` | matches chart types already validated in the prototype (grouped bar, line, single bar) |
| Frontend HTTP | native `fetch` wrapped in a small `api.js` client, or `axios` | |
| Backend | Node.js + Express (or Fastify — pick one and stay consistent) | REST JSON API |
| ORM / query layer | Prisma (recommended) or Knex | Prisma gives migrations + typed client for free, fits a 4-prompt agent build well |
| Database | PostgreSQL 15+ | |
| Auth | JWT access token (short-lived, ~15 min) + httpOnly refresh-token cookie, OR server sessions via `express-session` + PostgreSQL session store | pick one in Prompt 1 and don't revisit |
| Password hashing | bcrypt (or argon2) | |
| Validation | zod (shared-shape validation on both request bodies and, optionally, frontend forms) | |
| Dates/timezones | Store all timestamps as `timestamptz` in UTC; compute "week" boundaries (Mon–Sun) in application code, not in SQL, to keep the logic identical to what's documented here | |

---

## 2. High-level architecture

```
┌────────────────────┐        HTTPS/JSON         ┌──────────────────────┐        SQL        ┌──────────────┐
│   Vue 3 SPA (Vite)  │  ───────────────────────▶ │  Node.js + Express   │ ────────────────▶ │  PostgreSQL   │
│  Pinia + Vue Router │ ◀─────────────────────────│  REST API + JWT auth │ ◀──────────────── │               │
└────────────────────┘                            └──────────────────────┘                    └──────────────┘
```

- Single deployable frontend (static build served by any static host or by Express itself) + single Node API service + one Postgres instance. No microservices needed for this scope.
- All workload/burnout math (per `prd.md §3.6`) is computed **server-side** on request (or cached per week if it becomes a performance concern later) — never trust a client-computed number for anything shown to another user.

---

## 3. Database schema

All tables use `uuid` primary keys (`gen_random_uuid()`, requires `pgcrypto` extension) unless noted. All `created_at`/`updated_at` are `timestamptz default now()`.

### 3.1 `departments`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| name | text unique | "BMS", "Retail", "Wholesale", "Production" |
| head_user_id | uuid FK → users.id, nullable | set after the head user exists (avoid circular insert order issues) |

### 3.2 `users`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| name | text | display name |
| username | text unique | login identifier, e.g. `budi` — no email collected for v1 |
| password_hash | text | bcrypt |
| role | enum `HEAD_GROUP` \| `DEPARTMENT_HEAD` \| `MEMBER` | |
| department_id | uuid FK → departments.id, nullable | null only for `HEAD_GROUP` |
| title | text | display label, e.g. "Department Head", "Member" |
| is_active | boolean default true | soft-deactivate instead of hard-deleting users (see `prd.md §5`) |
| must_change_password | boolean default false | set true after an admin-driven password reset (`prd.md §4.1`); login flow forces a password-change step while true |
| created_at, updated_at | timestamptz | |

### 3.3 `tickets`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| ticket_number | text unique | app-generated sequential, e.g. `TICKET-101` |
| title | text | |
| description | text nullable | |
| created_by | uuid FK → users.id | drives edit/delete permission (`prd.md §4.3.4`) |
| requested_by | uuid FK → users.id | |
| assigned_to | uuid FK → users.id | department is derived from this user, never stored here |
| priority | enum `LOW` \| `MEDIUM` \| `HIGH` | |
| status | enum `TODO` \| `IN_PROGRESS` \| `IN_REVIEW` \| `STUCK` \| `DONE` \| `CANCELLED` | |
| stuck_reason | text nullable | required (app-level, not DB constraint) whenever status = `STUCK`; cleared when status changes away from `STUCK` |
| estimated_minutes | integer | |
| due_date | timestamptz | |
| recurrence_group_id | uuid nullable | shared across a series; null = not recurring |
| recurrence_frequency | enum `DAILY` \| `WEEKLY`, nullable | |
| series_label | text nullable | base title used to generate the next occurrence's title |
| cluster_type | enum `DAILY` \| `EVENT` default `DAILY` | |
| cluster_name | text nullable | required (app-level) when cluster_type = `EVENT` |
| created_at, updated_at | timestamptz | |

Indexes: `(assigned_to)`, `(created_by)`, `(status)`, `(due_date)`, `(recurrence_group_id)`, `(cluster_type, cluster_name)`.

### 3.4 `time_sessions`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| ticket_id | uuid FK → tickets.id (cascade delete with ticket) | |
| user_id | uuid FK → users.id | |
| started_at | timestamptz | |
| ended_at | timestamptz nullable | null = currently open/running session |
| duration_minutes | integer | computed and stored at close time (`ended_at - started_at`); for an open session the API computes duration on the fly as `now - started_at` and never trusts a client-sent value |
| source | enum `TIMER` \| `MANUAL` | |
| manual_reason | text nullable | required when source = `MANUAL` |

Index: `(ticket_id)`, `(user_id, started_at)`.

**One-active-timer-per-user rule** is enforced at the application layer, not via a DB constraint that's awkward to express cleanly: a user's "active timer" is simply *the most recent `time_sessions` row for that user with `ended_at IS NULL`, OR the most recent row overall if we also need to distinguish PAUSED*. Because the prototype's timer state machine needs to distinguish `RUNNING` vs `PAUSED` vs `IDLE` and PAUSED has no open session row, add a small dedicated table instead of trying to infer state purely from `time_sessions`:

### 3.5 `active_timers` (one row per user who currently has a non-idle timer)
| column | type | notes |
|---|---|---|
| user_id | uuid PK, FK → users.id | one row per user, enforces the one-active-timer rule via the PK itself |
| ticket_id | uuid FK → tickets.id | |
| status | enum `RUNNING` \| `PAUSED` | |
| active_session_id | uuid nullable, FK → time_sessions.id | set while RUNNING, null while PAUSED |

State transitions map 1:1 to `prd.md §3.4`:
- **START**: insert a `time_sessions` row (`started_at = now`, `ended_at = null`, `source = TIMER`); upsert `active_timers` (status=RUNNING, active_session_id = new session id). Reject with 409 if a row already exists for this user pointing at a different ticket (client then offers Cancel / View / Stop & Start New).
- **PAUSE**: close the active session (`ended_at = now`, `duration_minutes` computed); update `active_timers.status = PAUSED`, `active_session_id = null`.
- **RESUME**: insert a **new** `time_sessions` row; update `active_timers` back to RUNNING with the new session id.
- **STOP**: if RUNNING, close the active session; **delete** the `active_timers` row entirely (back to IDLE).

### 3.6 `activity_logs`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| ticket_id | uuid FK → tickets.id (cascade delete with ticket) | |
| user_id | uuid FK → users.id | |
| type | enum `CREATED` \| `ASSIGNED` \| `STATUS_CHANGED` \| `TIMER_STARTED` \| `TIMER_PAUSED` \| `TIMER_RESUMED` \| `TIMER_STOPPED` \| `MANUAL_TIME_ADDED` \| `UPDATED` | |
| description | text | human-readable, pre-rendered server-side |
| created_at | timestamptz | |

Index: `(ticket_id, created_at desc)`.

### 3.7 `user_capacity_overrides`
Per-person, per-week editable weekly hours (`prd.md §3.6`).

| column | type | notes |
|---|---|---|
| user_id | uuid FK → users.id | |
| week_start_date | date | Monday of the ISO week this override applies to |
| raw_text | text | exactly what the user typed, e.g. "38" |
| minutes | integer | parsed value used in calculations |
| updated_by | uuid FK → users.id | audit — who set it (self, dept head, or head group) |
| updated_at | timestamptz | |

Primary key: `(user_id, week_start_date)`. When no row exists for a user/week, the default is 2400 minutes (40h).

### 3.8 `sessions` (if using server-side auth sessions instead of pure JWT)
Only needed if you choose session-cookie auth over JWT in §1. Standard `connect-pg-simple`-style table if so.

---

## 4. Derived/computed values — formulas (must match `prd.md §3.6` exactly)

These are **not** stored; compute them per request, scoped to a given user + week (`week_start`/`week_end` = Monday 00:00 to Sunday 23:59:59, in the org's local timezone):

```
capacity_minutes(user, week)      = user_capacity_overrides row if present, else 2400
planned_minutes(user, week)       = SUM(tickets.estimated_minutes)
                                     WHERE assigned_to = user AND status != 'CANCELLED'
                                     AND due_date BETWEEN week_start AND week_end
actual_minutes(user, week)        = SUM(time_sessions.duration_minutes for closed sessions)
                                     + (now - started_at, in minutes, for the one open session if any)
                                     WHERE user_id = user AND started_at BETWEEN week_start AND week_end
planned_utilization_pct           = planned_minutes / capacity_minutes * 100
actual_utilization_pct            = actual_minutes  / capacity_minutes * 100
remaining_capacity_minutes        = capacity_minutes - planned_minutes
risk_level(pct)                   = pct > 120 ? 'EXTREME' : pct > 100 ? 'OVER' : pct >= 80 ? 'HIGH' : 'NORMAL'
overdue(ticket)                   = ticket.due_date < today AND ticket.status NOT IN ('DONE','CANCELLED')
is_active_status(status)          = status IN ('TODO','IN_PROGRESS','IN_REVIEW','STUCK')
```

Department-level rollups (Burnout Tracker, `prd.md §4.6`) = simple sums of the above across that department's members for the selected week. There is no separate department capacity value.

"Sustained high workload" (dashboard alert) = `planned_utilization_pct > 100` for 2+ consecutive weeks ending at the selected week.

---

## 5. API design (REST, JSON, versioned under `/api/v1`)

Auth: all endpoints except `/auth/*` require a valid access token; role/ownership checks happen server-side, never trust the client.

### Auth
- `POST /auth/login` `{ username, password }` → `{ accessToken, user }` (+ sets refresh cookie)
- `POST /auth/refresh` → new access token
- `POST /auth/logout`
- `GET /auth/me` → current user
- `POST /users/:id/reset-password` — admin-driven reset (Head Group for anyone; Department Head for their own department's members, per `prd.md §4.1`); generates a temporary password returned once in the response, user must change it on next login (`must_change_password` boolean on `users`, checked at login)

### Org
- `GET /departments` → list with head + member counts
- `GET /users` → list (used for assignment dropdowns, Reports, Burnout Tracker); support `?departmentId=` filter

### Tickets
- `GET /tickets` — query params: `clusterType`, `clusterName`, `departmentId`, `assignedTo`, `status`, `priority`, `overdueOnly`, `search`, `sortBy`, `sortDir`. Server applies the role-based visibility scope (`prd.md §4.2/§4.3.2`) — Members only ever see their own; Department Heads only their department; Head Group sees all.
- `GET /tickets/:id` — full detail incl. computed `actualMinutes`, `overdue`
- `POST /tickets` — create (single or, if `recurrence` block present, generates a batch — see below)
- `PATCH /tickets/:id` — **server must verify `req.user.id === ticket.created_by`** before allowing this, per `prd.md §4.3.4`; else 403
- `DELETE /tickets/:id` — same ownership check; cascades to `time_sessions` and `activity_logs` via FK `ON DELETE CASCADE`
- `PATCH /tickets/:id/status` — body `{ status, stuckReason? }`; server enforces `stuckReason` is present when `status = 'STUCK'`; enforces the *status-change* permission (assignee, department head, or head group — independent of `created_by`)
- `POST /tickets/:id/recurrence/next-occurrence` — implements "Add next occurrence" (`prd.md §3.7`)
- `POST /tickets/recurring-series` — body includes `seriesLabel, frequency, occurrences, startDueDate, ...base ticket fields` → creates N tickets sharing a new `recurrence_group_id`

### Timer
- `POST /tickets/:id/timer/start`
- `POST /tickets/:id/timer/pause`
- `POST /tickets/:id/timer/resume`
- `POST /tickets/:id/timer/stop`
- `GET /timer/active` — the current user's active timer (ticket id, status, elapsed) for the header widget; poll this every ~1s client-side while a timer is running (or drive it purely client-side off `started_at` and only re-sync on pause/resume/stop/page-load, which is cheaper — recommended)
- `POST /tickets/:id/manual-time` — body `{ minutes, reason }`

All timer endpoints enforce: only the ticket's `assigned_to` user may call them; return 409 with the conflicting ticket if the user already has an active timer elsewhere (client then shows Cancel/View/Stop&Start-New).

### Workload / Burnout Tracker
- `GET /workload/user/:userId?week=YYYY-MM-DD` → the computed block from §4
- `GET /workload/department/:deptId?week=YYYY-MM-DD` → department rollup
- `PUT /users/:userId/capacity?week=YYYY-MM-DD` — body `{ text }`; server parses & stores per §4; enforces the edit-permission rule (self / own dept head / head group)

### Reports
- `GET /reports/weekly-workload?week=YYYY-MM-DD` → rows per `prd.md §4.7` (incl. role, active tickets, workload risk)
- `GET /reports/department?week=YYYY-MM-DD`
- `GET /reports/weekly-workload.csv`, `GET /reports/department.csv` — same data, CSV content-type

### Events (clusters)
- `GET /events` → distinct `cluster_name` values visible to the current user's scope, with rollup stats (for the Events gallery)
- `GET /events/:name/tickets` → tickets in that event, scoped by role

---

## 6. Frontend structure (Vue 3)

```
src/
  main.js
  router/index.js            // route table + role guards, mirrors prd.md §4.2
  stores/
    auth.js                  // login/logout, current user, token refresh
    tickets.js                // list/detail cache, CRUD actions
    timer.js                  // active timer state, ticking, start/pause/resume/stop
    workload.js               // per-user/department workload cache by week
    org.js                     // departments/users reference data
  api/
    client.js                 // fetch wrapper, attaches auth header, handles 401 refresh
    tickets.js, timer.js, workload.js, reports.js, events.js   // thin per-resource wrappers
  views/
    LoginView.vue
    DashboardView.vue          // switches internally by role (or 3 sub-components)
    TicketsView.vue            // Daily Task / Events tabs (prd.md §3.8)
    TicketDetailView.vue
    NewTicketView.vue
    MyWorkView.vue
    BurnoutTrackerView.vue
    ReportsView.vue
    EmployeeDetailView.vue
  components/
    layout/Sidebar.vue, Topbar.vue, ActiveTimerWidget.vue
    tickets/TicketTable.vue, TicketFiltersBar.vue, TimerBox.vue,
            EditTicketModal.vue, DeleteConfirmModal.vue, StuckReasonModal.vue,
            ManualTimeModal.vue, RecurringSeriesPanel.vue
    events/EventGallery.vue, EventSummaryCard.vue
    workload/WorkloadRiskCard.vue, UserCapacityInput.vue, DeptWorkloadCard.vue
    charts/GroupedBarChart.vue, LineTrendChart.vue, SingleBarChart.vue   // thin vue-chartjs wrappers
    common/Badge.vue, ProgressBar.vue, KpiCard.vue, AvatarChip.vue
```

Route guards read `auth` store's `user.role` and mirror `prd.md §4.2`'s table exactly (e.g. `/my-work` blocked for `HEAD_GROUP`; `/reports` only for `HEAD_GROUP`). Do this centrally in the router, not scattered per-view.

---

## 7. Key business logic to port carefully from the validated prototype

These are the parts most likely to be subtly wrong if re-derived from scratch — implement them exactly as specified:

1. **Timer session-splitting on pause/resume** (§3.4/§3.5 of this doc) — a common bug is to keep one continuous session and just track paused-duration separately; that is *not* what was validated. Pause closes the session; resume opens a new one.
2. **Workload risk uses `planned_utilization` for the general risk badge**, but the **Burnout Tracker's per-row/per-department status % uses `actual_utilization`** (actual hours vs weekly hours), not planned. These are two different metrics shown in different places — don't conflate them.
3. **Edit/delete = ownership (`created_by`) only.** Status-change = a different, broader permission set. Don't merge these two checks.
4. **Department is never a stored field on tickets** — always join through `assigned_to → users.department_id`.
5. **Recurring tickets are independent siblings**, not parent/child. Deleting one never touches the others.
6. **Cluster (`Daily` vs `Event`) is orthogonal to recurrence** — a recurring series is usually `clusterType = DAILY`, but nothing prevents an event-scoped ticket from also being part of a series if ever needed.

---

## 8. Deployment notes

- Environment variables: `DATABASE_URL`, `JWT_SECRET` (or session secret), `NODE_ENV`, `CORS_ORIGIN`, `PORT`.
- Migrations: use Prisma Migrate (or Knex migrations) — never hand-edit the schema in production.
- Seed script: recreate the org structure from `prd.md §2` (BBG, 4 departments — BMS/Retail/Wholesale/Production, 15 users) so the app is demoable immediately after first deploy, mirroring the prototype's mock-data generator.
- Serve the Vue build as static files behind the same domain as the API (or a reverse proxy) to avoid CORS complexity in production; keep CORS enabled for local dev (Vite dev server on a different port than the API).

---

## 9. Implementation plan — 4 prompts for the AI coding agent

Each phase below is scoped to be a realistic single agent session, and each ends with a concrete, testable checklist so you can verify progress before spending your next prompt. Paste `prd.md` and this file (`design.md`) as context in **every** prompt — the agent should treat them as the source of truth, not re-derive requirements from conversation memory (which won't persist across your cooldown).

### 🔹 Prompt 1 of 4 — Foundation (backend + DB + auth + app shell)
**Prompt to give the agent:**
> Read `prd.md` and `design.md` fully before doing anything. Set up the project: a Node.js/Express backend and a Vue 3 (Vite) frontend, monorepo-style (`/server`, `/client`) or two folders, your choice — pick one and document it in a top-level README. Set up PostgreSQL with Prisma (or Knex) and implement every table in `design.md §3` as migrations. Implement `/auth/login` (**username + password**, not email), `/auth/refresh`, `/auth/logout`, `/auth/me`, and the admin-driven `/users/:id/reset-password` endpoint, with bcrypt password hashing and the auth strategy chosen in `design.md §1`. Write a seed script that creates the BBG org exactly as described in `prd.md §2` (4 departments — BMS, Retail, Wholesale, Production — 1 Head Group, 1 Department Head + members per department, 15 users total), with simple usernames (e.g. `ahmad`, `budi`, `citra`) and dev-only passwords documented in the seed script's output. Build the Vue app shell: router with the role-based route table from `prd.md §4.2` (empty placeholder views are fine for now), Pinia `auth` store wired to real login, a working username/password login page, and the Sidebar/Topbar layout showing the logged-in user and a working Log out.

**Done when:**
- [ ] `docker-compose` or equivalent brings up Postgres locally; migrations run cleanly.
- [ ] Seed script populates the full BBG org with usernames + passwords printed to console.
- [ ] Can log in with a seeded user's real username/password and land on an (empty) dashboard shell.
- [ ] Sidebar shows the correct nav items per role (per `prd.md §4.2` table).
- [ ] Logging out returns to the login page and invalidates the session/token.

### 🔹 Prompt 2 of 4 — Core Ticketing + Timer
**Prompt to give the agent:**
> Continuing the same project (read `prd.md` and `design.md` again for full context). Implement the full Tickets domain: all `/tickets*` endpoints from `design.md §5`, with the role-based visibility scoping and the ownership-based edit/delete rule from `prd.md §4.3.4` enforced server-side (write a quick automated check or manual test proving a non-owner gets 403). Implement the timer endpoints and the `active_timers` state machine exactly as specified in `design.md §3.5`/`§7.1`, including the one-active-timer-per-user conflict response. On the frontend: New Ticket form (`prd.md §4.3.1`), Tickets list with filters/sort (`§4.3.2`, Daily Task tab only for now — Events tab comes in Prompt 3), Ticket Detail page with the full timer UI (Start/Pause/Resume/Stop, live-ticking display, the one-active-timer conflict modal with Cancel/View/Stop&Start-New), Manual Time Entry modal, Time Session History, Activity Log, and Edit/Delete wired to the ownership rule (buttons simply don't render for non-owners). Add the header's live active-timer widget.

**Done when:**
- [ ] Can create a ticket, see it in the list, open its detail page.
- [ ] Timer start → pause → resume → stop produces the correct session-split behavior (two session rows for a pause/resume cycle, per `design.md §7.1`) — verify directly in the DB.
- [ ] Starting a second timer while one is active shows the conflict modal; "Stop current & start new" works.
- [ ] Editing/deleting a ticket you didn't create is impossible (button absent; direct API call returns 403).
- [ ] Manual time entry appears in Time Session History tagged "Manual", with the reason stored.
- [ ] Activity log shows every action taken so far, in order.

### 🔹 Prompt 3 of 4 — Workload Intelligence (Dashboards, Burnout Tracker, Recurring, Events, Stuck)
**Prompt to give the agent:**
> Continuing the same project. Implement the workload/burnout math server-side exactly per `design.md §4` (both `planned_utilization` and `actual_utilization` — they're used in different places, see `design.md §7.2`, don't conflate them). Implement `user_capacity_overrides` (per-person-per-week free-text weekly hours) with the edit-permission rule from `prd.md §3.6` (self / own dept head / head group). Build: the three role-based Dashboards (`prd.md §4.4`) with all listed charts and the clickable Workload Risk Overview tiles; My Work (`§4.5`); the Burnout Tracker page (`§4.6`) including the department-filter-for-Head-Group-only and both required chart visualizations; recurring ticket series creation + "Add next occurrence" (`§3.7`); the Daily Task/Events tab split on the Tickets page plus the Event gallery and event-detail drill-in (`§3.8`); and the `STUCK` status flow with its mandatory-reason modal and the on-ticket stuck banner (`§3.2`). Make sure every place that shows workload/burnout language includes the required non-diagnostic disclaimer text (`prd.md §3.6`).

**Done when:**
- [ ] Setting a person's weekly hours to a custom value (e.g. "38") changes their risk % everywhere it's shown (dashboard, My Work, Employee Detail, Burnout Tracker) — confirms the shared calculation is actually being reused, not duplicated/forked.
- [ ] A Member can edit only their own weekly hours; a Department Head can edit their department's; Head Group can edit anyone's — verify all three.
- [ ] Head Group's Burnout Tracker department filter narrows the view; other roles never see a filter but still see all 4 departments.
- [ ] Creating a recurring series with, say, 5 daily occurrences produces 5 independent tickets sharing a series id; "Add next occurrence" appends a 6th without touching the first 5.
- [ ] The Events tab shows a gallery card per distinct event name with correct progress %, and drilling in shows only that event's tickets plus the summary panel.
- [ ] Marking a ticket Stuck without a reason is blocked; with a reason, the ticket shows the banner and the reason appears in the activity log.

### 🔹 Prompt 4 of 4 — Reports, Employee Detail, Polish & Deployment
**Prompt to give the agent:**
> Continuing the same project. Implement Reports (`prd.md §4.7`) — both tables with the full column set (Weekly Workload Report must include Role, Active Tickets, and Workload Risk per `design.md §5`), CSV export for both, and clickable rows into Employee Detail. Implement Employee Detail (`§4.8`) fully, reachable only via click-through (no standalone employees list route — confirm navigating directly to it redirects to Dashboard, per `§4.10`), including the admin "Reset password" action for Head Group/Department Head wired to `/users/:id/reset-password`, and the forced password-change step on next login when `must_change_password` is true. Do a full pass on responsive layout (laptop + tablet widths), loading/empty/error states on every view, and basic input validation with user-friendly error messages on all forms. Write a short top-level README covering local setup, environment variables, running migrations + seed, and how to deploy (per `design.md §8`). Do a final end-to-end pass through every item in `prd.md §7`'s acceptance criteria and fix anything that doesn't hold.

**Done when:**
- [ ] Every item in `prd.md §7` (acceptance criteria) passes manually.
- [ ] CSV exports open correctly in a spreadsheet app with the right columns.
- [ ] No route in the app is reachable that shouldn't be, for any of the 3 roles (spot-check the `prd.md §4.2` table against the running app).
- [ ] App is deployable from a clean checkout following only the README.
