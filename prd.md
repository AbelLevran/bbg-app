# PRD — BBG Group Work Management & Burnout Tracker System

**Status:** Draft for engineering handoff (production build)
**Source:** Derived from a validated interactive prototype (HTML/React) built and tested feature-by-feature with the product owner. This PRD describes the *behavior* the production system must reproduce, not the prototype's implementation.
**Intended stack:** Vue 3 + Node.js + PostgreSQL (see `design.md` for technical design)
**Intended build process:** Delivered to an AI coding agent (e.g. Antigravity) across 4 scoped prompts. See `design.md §9` for the phase breakdown.

---

## 1. Product summary

BBG is an internal web application for a company group ("BBG") to manage day-to-day work as **tickets**, track **actual time worked** via a real timer (not self-reported estimates), and give managers — especially the Head Group — a **non-judgmental, factual view of workload and burnout risk** across the organization. It is explicitly **not** a Jira/Asana/Monday.com clone: it is a small, focused internal tool.

The core loop is:

```
Ticket → Assignment → Timer → Actual Time → Workload → Burnout Risk → Dashboard/Reports
```

---

## 2. Organization model

- **Group name:** BBG
- **1 Head Group** — oversight/monitoring role, does not do ticket work personally.
- **4 Departments**, each with **1 Department Head** and **several Members**:
  - BMS
  - Retail
  - Wholesale
  - Production
- Minimum realistic seed data: 15 people total (1 Head Group + 4 Department Heads + 10 Members), distributed across the 4 departments.

### 2.1 Roles

| Role | Can do |
|---|---|
| `HEAD_GROUP` | View all dashboards, all tickets, all departments; create tickets; assign to anyone; view all workload/burnout data; view reports; **cannot** create tickets *for themselves as an assignee's personal workload page* — Head Group has no "My Work" page (monitoring-only role, see §4.9). |
| `DEPARTMENT_HEAD` | View own-department dashboard and team tickets; create tickets; assign to self or own-department members; run timer on own assigned tickets; change status on tickets in their department; edit/delete **only tickets they personally created** (see §4.3.4); view Burnout Tracker for all departments (read-only outside own department); edit weekly-hours for themselves and their own department's members. |
| `MEMBER` | View personal dashboard, "My Work", "My Tickets"; create tickets; run timer on own assigned tickets; edit/delete **only tickets they personally created**; edit their **own** weekly working hours only. |

**Important nuance:** "who can create/assign" is independent from "who can edit/delete." Assignment permissions are covered in §4.3.1. Edit/delete permissions are covered in §4.3.4 and are based **solely on ticket ownership (`createdBy`)**, regardless of role.

---

## 3. Core data concepts

### 3.1 Ticket

Every unit of work is a Ticket. Required distinction: **Created By**, **Requested By**, and **Assigned To** are three separate people (e.g. Ahmad requests work, Abel logs the ticket, Budi does it).

Fields (see `design.md §3` for exact DB schema):
- Identity: id, human-readable ticket number (`TICKET-101`, sequential)
- Content: title, description
- People: createdBy, requestedBy, assignedTo (all user references)
- Classification: priority (`LOW`/`MEDIUM`/`HIGH`), status (see §3.2), estimatedMinutes
- Dates: dueDate, createdAt, updatedAt
- Recurrence (optional): recurrenceGroupId, recurrenceFrequency (`DAILY`/`WEEKLY`), seriesLabel (§4.6)
- Cluster (required): clusterType (`DAILY`/`EVENT`, default `DAILY`), clusterName (only when `EVENT`) (§4.7)
- Stuck reason (optional): stuckReason — free text, required whenever status is set to `STUCK` (§3.2)

**Department is never stored on the ticket directly.** It is always derived: `Assigned To → User → Department`. This avoids inconsistency (a ticket assigned to a BMS employee is a BMS ticket, period).

### 3.2 Ticket status

Statuses: `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `STUCK`, `DONE`, `CANCELLED`.

- `STUCK` requires a **mandatory reason** captured at the moment the status is changed to Stuck (e.g. "Menunggu koordinasi dengan grup lain"). The reason is stored on the ticket and shown prominently on the ticket detail page, and is also logged to the activity feed.
- `STUCK` counts as an **active** status for workload/active-ticket-count purposes (it is unresolved work).
- **Overdue is not a status.** It is a computed/derived indicator: `dueDate < today AND status NOT IN (DONE, CANCELLED)`. Show as an "Overdue" badge wherever status is shown.
- Stopping a timer never changes ticket status, and changing ticket status never affects the timer. These two systems are independent.

### 3.3 Priority

Exactly three levels: `LOW`, `MEDIUM`, `HIGH`. Do not add more.

### 3.4 Time tracking (the timer)

Actual time is **never** freely typed by the user (except the explicit Manual Time Entry escape hatch, §3.5). It is derived from a real, timestamp-based timer.

**Timer states:** `IDLE`, `RUNNING`, `PAUSED`.

**Controls:** START, PAUSE, RESUME, STOP.

**Source of truth:** wall-clock timestamps, not a `setInterval` counter. On page reload, elapsed time for a RUNNING timer must be recomputed as `now - startedAt`, never trusted from a stored "elapsed seconds" counter.

**Session-splitting behavior (important, and non-obvious):** START creates a new TimeSession row. PAUSE closes that TimeSession (`endedAt = now`, `durationMinutes` computed) but keeps the timer conceptually "paused" on that ticket for that user (no new session yet). RESUME opens a **new** TimeSession row (does not reopen the old one). STOP closes whichever TimeSession is currently open (if running), and clears the user's active-timer pointer entirely (back to `IDLE`).

Example: START 09:00 → PAUSE 10:30 (session #1 = 90 min) → RESUME 13:00 → STOP 14:15 (session #2 = 75 min). Ticket's actual time = `SUM(TimeSession.durationMinutes)` = 165 minutes, represented as **two separate session rows**, not one continuous block. This matches how the Time Session History UI must render it (grouped by day, one row per session, tagged `Timer` or `Manual`).

**Rules:**
- Only the ticket's **assignee** may operate that ticket's timer (start/pause/resume/stop). Everyone else sees the timer state read-only.
- A user may have **at most one active timer** (RUNNING or PAUSED) at any time, across all their tickets — not per-ticket. If they try to START a timer while another is active elsewhere, block it and present three choices: **Cancel**, **View Active Ticket**, **Stop Current & Start New**. Never silently start a second timer.
- A small **active-timer widget** must be visible from anywhere in the app (e.g. in the header) whenever the logged-in user has a running/paused timer, showing a live-ticking duration, the ticket it belongs to, and Pause/Resume/Stop controls, so the user never has to navigate back to the ticket to control it.

### 3.5 Manual time entry

A "+ Add manual time" action must always be available on a ticket (for its assignee) for when someone forgets to start the timer. It requires: a duration (quick presets like 30m/1h/1h30m/2h/4h plus a custom option) and a **mandatory reason** (e.g. "Forgot to start timer"). It is recorded as a TimeSession with `source = MANUAL` (vs `TIMER`), and both sources roll into the same actual-time total.

### 3.6 Weekly capacity & workload ("Burnout Tracker")

This is the most business-sensitive part of the product — get the language and math right.

**Per-person, per-week editable capacity (not a global constant).** Every person has a "weekly working hours" figure for a given calendar week. It defaults to 40 hours (5 days × 8 hours) if never set, but must be a **free-text-editable** number per person per week (e.g. Budi = 38h this week, Citra = 36h this week) — because real working hours vary (holidays, part-time weeks, leave, etc.). This is **not** a department-wide setting; it is set **per individual**.

- Input format: free text, interpreted leniently (bare number = hours, e.g. "38"; explicit "38h" or "2280m" also accepted).
- Who can edit whose capacity: the person themselves, their own Department Head, or Head Group. No one else.
- Department-level totals (for the Burnout Tracker's department summary cards) are always **derived as the sum of that department's individual member capacities** for the selected week — there is no separate department-level capacity setting.

**Weekly calculations, per person, per week:**
- **Planned Workload** = `SUM(estimatedMinutes)` of tickets assigned to the person whose `dueDate` falls in that week (excluding `CANCELLED`).
- **Actual Workload** = `SUM(TimeSession.durationMinutes)` for that person, for sessions started in that week.
- **Remaining Capacity** = `Capacity - Planned Workload`.
- **Planned Utilization %** = `Planned Workload / Capacity × 100`.
- **Actual Utilization %** = `Actual Workload / Capacity × 100`.

**Workload Risk level** (used both for the general "planned vs capacity" risk badge shown across the app, and for the Burnout Tracker's actual-vs-capacity status):

| Range | Level | Label shown in UI |
|---|---|---|
| < 80% | `NORMAL` | Normal |
| 80% – 100% | `HIGH` | High load |
| 100% – 120% | `OVER` | Over capacity |
| > 120% | `EXTREME` | Extreme load |

**Language rules — non-negotiable:**
- Never use "Lazy", "Poor Performance", "Underperforming", "Bad Employee" or any performance-judgment language anywhere workload is shown.
- If the UI uses the word "Burnout" anywhere, it must be paired with a visible disclaimer that this is a workload signal derived from system data (assigned work, estimates, tracked hours, active tickets, overdue work), **not a medical diagnosis or a performance score.** This disclaimer text must appear on: the Burnout Tracker page, the personal "My Work" workload card, and the Employee Detail workload card.
- Workload tables are **monitoring views, not performance leaderboards.** Never sort/rank people by workload as if it were a scoreboard, and never label high-utilization employees in a way that implies fault.
- Alerts must be phrased factually: "Budi is at 112% planned capacity" — not "Budi is burned out" or "Budi is overloaded because they're slow."

### 3.7 Recurring tickets (Option A: independent series, not subtasks)

Some work repeats on a cadence (e.g. a daily report). Model this as a **series of independent, fully-trackable tickets** sharing a `recurrenceGroupId` — **not** as parent/child subtasks and **not** as a checklist. Each occurrence is a first-class ticket with its own status, timer, actual time, and overdue state; the only thing that links them is the shared group id.

- Creating a recurring ticket: user provides a **series label** (e.g. "Daily Report Segmentasi"), a frequency (`DAILY` or `WEEKLY`), and a number of occurrences to generate immediately (e.g. 5). The system generates that many tickets, titled `"{Series Label} — {date}"`, with due dates incrementing by the frequency interval from the first due date chosen.
- From any ticket in a series, the user can **"Add next occurrence"** at any time — computes the next date after the latest existing occurrence and creates one more ticket in the series, without regenerating the whole batch.
- A ticket that belongs to a series shows a small recurring indicator, and its detail page shows a "Recurring series" panel: the other occurrences (date, status, actual time), total tracked time across the series, and the Add-next-occurrence action.
- Editing or deleting one occurrence never affects the others (deleting one occurrence is scoped to that occurrence only — make this explicit in the delete confirmation copy when the ticket is part of a series).

### 3.8 Clusters: Daily Task vs Event

Every ticket has a `clusterType`: `DAILY` (default — ordinary day-to-day work, including recurring daily tickets) or `EVENT` (a named, cross-department initiative, e.g. "BSI EXPO", with a `clusterName`).

The Tickets page (and its role-specific variants: "My Tickets" for Members, "Team Tickets" for Department Heads) is split into two views:

- **Daily Task tab (default):** the familiar flat, filterable/sortable ticket table, scoped to `clusterType != EVENT`.
- **Events tab:** shows a **gallery of event cards** — one per distinct event name visible to the current user's scope — each showing progress % (done/total), ticket counts, involved departments, contributor avatars, and stuck/overdue badges. Clicking a card drills into that event: a progress summary panel (total/done/active/stuck/overdue, contributor list) plus the filtered ticket table for just that event (with the same filters, and Edit/Delete subject to the same ownership rule).

This gives Head Group (and anyone else) a way to see "how is the BSI EXPO initiative going" as a first-class view, separate from routine daily tickets.

### 3.9 No "My Work" for Head Group

Head Group is a monitoring-only role and is never assigned personal work in the normal flow, so it has no "My Work" page and no personal workload widgets. Its navigation is: Dashboard, Tickets, Burnout Tracker, Reports. (Employees list is removed — see §4.10.)

---

## 4. Functional requirements by area

### 4.1 Authentication

The prototype used a **simulated** two-step login (pick department → pick name → 4-digit PIN, same PIN for everyone) purely for demo purposes. **This must not ship to production as-is.** For the real system:

- Real authentication is required: **username** + password (hashed, e.g. bcrypt/argon2) at minimum. No email collection needed for v1 — usernames keep account setup simple (e.g. `budi`, `citra`). Consider SSO later if the company already has an identity provider.
- Session handling via secure, httpOnly cookies or short-lived JWT + refresh token — decide in `design.md`.
- Keep the pleasant two-step *feel* if desired (pick your name, then authenticate) but back it with real credential verification and per-user passwords, not one shared PIN.
- Standard security requirements: rate-limit login attempts, don't leak whether a username exists on failed login, enforce a minimum password policy. Since there's no email on file, **password reset is admin-driven**: Head Group or a Department Head can reset a user's password from the Employee Detail page (generates a temporary password the user must change on next login) — no "forgot password" email flow for v1.

### 4.2 Navigation (role-based)

| | HEAD_GROUP | DEPARTMENT_HEAD | MEMBER |
|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ |
| Tickets | ✓ ("Tickets") | ✓ ("Team Tickets") | ✓ ("My Tickets") |
| My Work | — | ✓ | ✓ |
| Burnout Tracker | ✓ | ✓ | ✓ |
| Reports | ✓ | — | — |

Header/topbar always shows: current user's name, role, department (if any), a live active-timer widget when applicable, and Log out.

### 4.3 Tickets

#### 4.3.1 Creating a ticket
Form fields: Title (or "Series title" when recurring), Description, Requested By (any user), Assigned To (constrained by role — Head Group: anyone; Department Head: self or own-department members; Member: self only), Priority, Estimated Time (quick presets: 30m/1h/1h30m/2h/4h/8h, plus Custom), Due Date, Cluster (Daily default, or Event + event name with autocomplete of existing event names), and an optional "Make this a recurring series" toggle (frequency + occurrence count) per §3.7.

#### 4.3.2 Tickets list (Daily Task tab)
Table columns: Ticket #, Title (with a recurring-series indicator if applicable), Requested By, Assigned To, Department (derived), Priority, Status (+ Overdue badge), Estimate, Actual, Due Date, Actions (Edit/Delete, see §4.3.4).
Filters: free-text search (title/ticket #), Department (Head Group only), Employee (not for Members), Status, Priority, Overdue-only toggle. Sort by: Due Date, Priority, Estimate, Actual, Created Date, ascending/descending.

#### 4.3.3 Ticket detail page
Header: ticket #, title, priority badge, status badge, overdue badge, recurring-series badge. Information panel: Created By, Requested By, Assigned To, Department, Priority, Due Date. Work Time panel: Estimated, Actual, Remaining Estimate, progress %. Timer panel (per §3.4). Time Session History (grouped by day, Timer/Manual tagged). Activity log (chronological, all status/assignment/timer/manual-time events). If part of a recurring series, the Recurring Series panel (§3.7). If status is `STUCK`, a visible banner with the stuck reason.

#### 4.3.4 Edit & Delete — ownership rule
**Only the person who created the ticket (`createdBy`) may edit or delete it.** This applies uniformly regardless of role — Head Group does not get an override. This is a deliberate guardrail against accidentally editing or deleting someone else's ticket. The Edit/Delete buttons must not merely be disabled for non-owners — they must not render at all, in both the list view and the detail view.
Delete is **permanent** (hard delete): it removes the ticket plus all of its TimeSessions and ActivityLog entries. Given the destructive/irreversible nature, require an explicit confirmation step (e.g. typing "DELETE") before the delete executes. If the ticket belongs to a recurring series, the confirmation copy must clarify that only this occurrence is deleted, not the whole series.
Status changes (including marking Stuck) are governed by a **separate** permission: Head Group, the ticket's Department Head, or the assignee — independent of who created the ticket.

### 4.4 Dashboards (role-based)

All dashboards share: a Week selector, KPI cards, and the standard workload-risk visual language from §3.6.

**Head Group Dashboard:** global filters (Week, Department, Employee). KPI cards: Total/Active/Completed/Overdue tickets, then Planned/Actual/Group Capacity/Utilization. Charts: Planned vs Actual workload by department (grouped bar); Workload Risk Overview (clickable tiles: Normal/High Load/Over Capacity/Extreme Load counts, filtering the employee table below); Weekly Workload Trend (line: Planned/Actual/Capacity, last ~4 weeks); Daily Workload (bar: tracked hours Mon–Fri). Sections: Employee Workload table (monitoring view, not a ranking — clicking a row opens Employee Detail), Department Workload (progress bars per department), Workload Alerts (factual, e.g. "7 tickets are overdue", "3 employees have sustained high workload" — sustained = >100% planned utilization for 2+ consecutive weeks).

**Department Head Dashboard:** same shape, scoped to their own department; no department/employee filter (implicitly scoped).

**Member Dashboard:** personal workload risk card, this-week snapshot (capacity/planned/actual/remaining/active/overdue counts), and a short list of their active tickets.

### 4.5 My Work (Department Head & Member only)

Detailed personal view: Week selector, personal Workload Risk card (with the required disclaimer, §3.6), Weekly Workload Trend chart (planned/actual/capacity, last 4 weeks), My Active Tickets table, My Overdue Tickets table, My Time Tracked table (this week, grouped by ticket).

### 4.6 Burnout Tracker (all roles)

Renamed from a prior "Departments/Workload" concept — this is now the canonical, group-wide, transparent workload page, visible to **every** role (unlike other pages, it is intentionally **not** scoped down for Members/Department Heads — everyone sees all 4 departments, for organizational transparency). Contents:

- Week selector.
- Department filter — **Head Group only** (other roles always see all departments; this is purely a convenience filter for Head Group, not a permission boundary).
- A summary visualization comparing **Weekly Hours vs Actual by department** (grouped bar chart, aggregated from each department's members).
- One card per department: department risk badge, progress bar, totals (sum of individual weekly hours, sum of actual, status %, overdue count), a **per-member grouped bar chart** (weekly hours vs actual, one bar-pair per person), and a member table with columns Member / Role / **Weekly Hours (editable, free text, per §3.6)** / Actual This Week / Status % / Risk badge.
- Edit permission on each row per §3.6 (self, own department head, or Head Group); read-only for everyone else, shown as plain text.
- The required non-diagnostic disclaimer text (§3.6) must appear on this page.

### 4.7 Reports (Head Group only)

Two tables, both with **Export CSV**:

**Weekly Workload Report** — columns: Employee, Role, Department, Capacity, Planned, Actual, Utilization, **Active Tickets**, Overdue, **Workload Risk**. Rows are clickable through to Employee Detail (this report is now the primary "people directory" surface — see §4.10).

**Department Report** — columns: Department, Total Tickets, Completed, Active, Overdue, Planned Hours, Actual Hours, Capacity, Utilization.

### 4.8 Employee Detail (`/employees/:id`)

Reachable by clicking any person's name/avatar anywhere in the app (dashboards, Burnout Tracker, Reports) — there is deliberately **no standalone "browse all employees" list page** (removed, see §4.10). Shows: profile header (name, role, department), this-week KPI cards (weekly capacity, planned, actual, utilization), Workload Risk card, Ticket Status chart, 4-week Weekly Workload trend chart, and a 4-week Workload History table. For Head Group (viewing anyone) and Department Head (viewing their own department's members), a **"Reset password"** action is available here per §4.1's admin-driven reset flow.

### 4.9 Departments detail
Superseded by the Burnout Tracker (§4.6), which now carries department-level detail. No separate "Departments" page.

### 4.10 Employees list — removed
There is intentionally no standalone Employees directory page, even for Head Group. Head Group's navigation is Dashboard / Tickets / Burnout Tracker / Reports. Person-level detail remains reachable by clicking through from any table (Dashboard employee table, Reports, Burnout Tracker). Navigating directly to a bare employees-list route should redirect to Dashboard.

---

## 5. Non-functional requirements

- **Multi-user, real-time-enough:** unlike the throwaway prototype (browser-local storage only), the production system must persist to a shared PostgreSQL database so all users see the same data. Near-real-time is sufficient (polling or simple refresh on navigation is acceptable for v1; WebSocket/live-push is a nice-to-have, not required for v1).
- **Timer correctness under network conditions:** the timer's source of truth must remain timestamp-based (client displays `now - startedAt`; server is authoritative for `startedAt`/`endedAt`). Handle client clock drift gracefully — always trust the server-recorded timestamps for the stored duration.
- **Responsive layout:** usable on laptop and tablet widths at minimum (internal tool; mobile-phone support is nice-to-have, not required for v1).
- **Data integrity:** deleting a user should not orphan tickets — decide a policy in `design.md` (e.g. soft-delete users, or require reassignment before deactivation).
- **Auditability:** the Activity Log is a core trust feature (who did what, when) — every status change, assignment, timer event, manual time entry, and ticket edit must produce an activity log entry.
- **Language:** UI language is English (matching the validated prototype), consistent field/label naming.

## 6. Explicitly out of scope for v1

- Notifications (push or in-app).
- Native mobile app.
- File attachments on tickets.
- Multi-language UI.
- SSO (unless the company already needs it — flag as a decision point, not a default requirement).
- Real-time collaborative editing (two people editing the same ticket simultaneously) — last-write-wins is acceptable for v1.

## 7. Acceptance criteria (high-level, per phase — detailed checklists live in `design.md §9`)

The production build is considered functionally complete when a person can: log in with real credentials; create, edit (if owner), and delete (if owner) a ticket; run a timer end-to-end (start/pause/resume/stop) with the one-active-timer rule enforced and reflected live in the header; see their own and, per role, others' workload and burnout risk with correct math per §3.6; set their own weekly working hours as free text and see it reflected everywhere workload is computed; create and extend a recurring ticket series; create and browse an Event cluster; and, as Head Group, export the Weekly Workload Report as CSV with the Role/Active Tickets/Workload Risk columns present.
