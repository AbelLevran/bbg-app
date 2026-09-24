# BBG Group Work Management & Burnout Tracker System

An enterprise internal web application for BBG group to manage day-to-day work as **tickets**, track **actual time worked** via precision wall-clock timers, and provide leadership with a **non-judgmental, factual view of organizational workload and burnout signals**.

---

## 1. Project Architecture Overview

The project is structured as a clean monorepo:

```
BBG-APP/
├── server/                     # Node.js + Express + Prisma REST API
│   ├── prisma/
│   │   ├── schema.prisma       # Complete PostgreSQL schema per design.md §3
│   │   ├── migrations/         # PostgreSQL migration files
│   │   └── seed.js             # BBG org seed script (15 users, 4 depts)
│   ├── src/
│   │   ├── index.js            # Express server entry point (Port 4000)
│   │   ├── app.js              # Express middlewares, CORS & route registry
│   │   ├── controllers/        # Request handlers (auth, tickets, workload, reports, users)
│   │   ├── services/           # Domain logic & telemetry calculation services
│   │   ├── routes/             # REST endpoint routers (/api/v1/*)
│   │   ├── middlewares/        # JWT auth & role validation middlewares
│   │   └── utils/              # Token hashing, password helpers, date calculators
│   ├── test-auth.js            # Phase 1: Auth test suite
│   ├── test-tickets-phase2.js  # Phase 2: Tickets & Timer test suite
│   └── test-reports-employee.js# Phase 4: Reports, Employee Detail & Password reset test suite
│
├── client/                     # Vue 3 + Vite + Pinia Frontend SPA
│   ├── src/
│   │   ├── api/                # API client with auto-refresh on 401
│   │   ├── components/
│   │   │   ├── auth/           # Forced password reset modal
│   │   │   ├── charts/         # Chart.js visualizations (Donut, Line, Bar, Grouped)
│   │   │   ├── common/         # Role badges, status badges, week selector
│   │   │   ├── events/         # Event cards & initiative detail panel
│   │   │   ├── layout/         # AppLayout shell, Topbar (live timer widget), Sidebar
│   │   │   ├── tickets/        # Ticket forms, filter bar, conflict modal, timer widget
│   │   │   └── workload/       # WorkloadRiskCard, DeptWorkloadCard, UserCapacityInput
│   │   ├── router/             # Vue Router 4 with role-based navigation guards
│   │   ├── stores/             # Pinia stores (auth, timer, workload)
│   │   ├── views/              # Dashboard, Tickets, My Work, Burnout Tracker, Reports, Employee Detail
│   │   └── style.css           # Modern dark design tokens & utility styles
│   ├── vite.config.js          # Vite configuration with /api proxy
│   └── index.html              # HTML root with Inter & JetBrains Mono typography
│
├── docker-compose.yml          # PostgreSQL service definition
├── package.json                # Root workspace configuration
├── prd.md                      # Product Requirements Document
└── design.md                   # Technical Architecture & Implementation Spec
```

### Technology Choices
- **Backend**: Node.js (v18+), Express 4, Prisma ORM 5, PostgreSQL 15, bcryptjs, jsonwebtoken, date-fns.
- **Frontend**: Vue 3 (Composition API `<script setup>`), Vite 6, Pinia, Vue Router 4, Chart.js + vue-chartjs, Lucide Vue Next icons.
- **Styling**: Curated custom design tokens, modern dark theme aesthetics, glassmorphism, responsive CSS grid and flexbox.

---

## 2. Prerequisites

- **Node.js**: v18.0.0+ (Tested on v20.x and v24.x)
- **npm**: v9.0.0+
- **PostgreSQL**: 15+ (Local installation or Docker)

---

## 3. Setup & Installation

### A. Environment Configuration

1. **Server Environment (`server/.env`)**:
   ```env
   PORT=4000
   NODE_ENV=development
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bbg_db?schema=public"
   JWT_ACCESS_SECRET="bbg_access_super_secret_jwt_key_2026_dev"
   JWT_REFRESH_SECRET="bbg_refresh_super_secret_jwt_key_2026_dev"
   JWT_ACCESS_EXPIRES_IN="15m"
   JWT_REFRESH_EXPIRES_IN="7d"
   CORS_ORIGIN="http://localhost:5173"
   ```

2. **Client Environment (`client/.env`)**:
   ```env
   VITE_API_BASE_URL="/api/v1"
   ```

> **Using Docker for PostgreSQL:**
> If you don't have a local PostgreSQL instance running:
> ```bash
> docker compose up -d
> ```

### B. Install Dependencies

Install root and workspace dependencies:

```bash
# In server directory
cd server
npm install

# In client directory
cd ../client
npm install
```

### C. Database Migrations & Seeding

Run Prisma migrations and populate the complete 15-user organization with sample tickets, active timers, and capacity overrides:

```bash
cd server
npm run db:migrate
npm run db:seed
```

---

## 4. Seeded Test Accounts Reference

All seeded test accounts share the default development password: **`password123`**

| Username | Full Name | Role | Department | Permitted Views |
|---|---|---|---|---|
| `ahmad` | Ahmad Fauzi | `HEAD_GROUP` | Group Oversight | Dashboard (Group), Tickets (All), Burnout Tracker, Reports |
| `budi` | Budi Santoso | `DEPARTMENT_HEAD` | BMS | Dashboard (Dept), Tickets (Team), My Work, Burnout Tracker |
| `citra` | Citra Dewi | `MEMBER` | BMS | Dashboard (Personal), Tickets (My), My Work, Burnout Tracker |
| `dani` | Dani Pratama | `MEMBER` | BMS | Dashboard (Personal), Tickets (My), My Work, Burnout Tracker |
| `eka` | Eka Putri | `MEMBER` | BMS | Dashboard (Personal), Tickets (My), My Work, Burnout Tracker |
| `fajar` | Fajar Nugraha | `DEPARTMENT_HEAD` | Retail | Dashboard (Dept), Tickets (Team), My Work, Burnout Tracker |
| `gita` | Gita Permata | `MEMBER` | Retail | Dashboard (Personal), Tickets (My), My Work, Burnout Tracker |
| `hadi` | Hadi Wijaya | `MEMBER` | Retail | Dashboard (Personal), Tickets (My), My Work, Burnout Tracker |
| `indri` | Indri Safitri | `DEPARTMENT_HEAD` | Wholesale | Dashboard (Dept), Tickets (Team), My Work, Burnout Tracker |
| `joko` | Joko Susilo | `MEMBER` | Wholesale | Dashboard (Personal), Tickets (My), My Work, Burnout Tracker |
| `kartika` | Kartika Sari | `MEMBER` | Wholesale | Dashboard (Personal), Tickets (My), My Work, Burnout Tracker |
| `lukman` | Lukman Hakim | `MEMBER` | Wholesale | Dashboard (Personal), Tickets (My), My Work, Burnout Tracker |
| `maya` | Maya Anggraini | `DEPARTMENT_HEAD` | Production | Dashboard (Dept), Tickets (Team), My Work, Burnout Tracker |
| `nanda` | Nanda Putra | `MEMBER` | Production | Dashboard (Personal), Tickets (My), My Work, Burnout Tracker |
| `oscar` | Oscar Pratama | `MEMBER` | Production | Dashboard (Personal), Tickets (My), My Work, Burnout Tracker |

---

## 5. Running the Application

### Development Servers

**Backend API Server:**
```bash
cd server
npm run dev
# Starts API at http://localhost:4000 (endpoints prefixed by /api/v1)
```

**Frontend SPA:**
```bash
cd client
npm run dev
# Starts Vite dev server at http://localhost:5173
```

Visit **`http://localhost:5173`** in your browser.

---

## 6. Available Scripts

### Server Scripts (`server/package.json`)
- `npm run dev`: Starts the Express server with Nodemon live reloading.
- `npm run start`: Starts the Express server in production mode.
- `npm run db:migrate`: Applies Prisma migrations to the PostgreSQL database.
- `npm run db:seed`: Seeds the 4 departments and 15 users with sample tickets and timers.
- `npm run db:studio`: Opens Prisma Studio GUI at `http://localhost:5555`.

### Client Scripts (`client/package.json`)
- `npm run dev`: Starts Vite local development server on port 5173.
- `npm run build`: Type-checks and builds the production bundle into `dist/`.
- `npm run preview`: Previews the production build locally.

---

## 7. Automated Test Suites

The project includes standalone automated integration test suites for verifying backend endpoints, security rules, and telemetry math:

1. **Authentication & Password Tests:**
   ```bash
   node server/test-auth.js
   ```
2. **Tickets, Role Scoping & Precision Timer State Machine Tests:**
   ```bash
   node server/test-tickets-phase2.js
   ```
3. **Reports, Employee Detail & Mandatory Password Change Tests:**
   ```bash
   node server/test-reports-employee.js
   ```

---

## 8. Role-Based Navigation Matrix (`prd.md §4.2`)

| Navigation View | Route | `HEAD_GROUP` | `DEPARTMENT_HEAD` | `MEMBER` |
|---|---|:---:|:---:|:---:|
| **Dashboard** | `/dashboard` | ✓ (Group KPIs & Dept Comparison) | ✓ (Team KPIs & Member List) | ✓ (Personal KPIs & Workload) |
| **Tickets** | `/tickets` | ✓ ("Tickets" — All depts) | ✓ ("Team Tickets" — Dept scoped) | ✓ ("My Tickets" — Assigned only) |
| **My Work** | `/my-work` | ✗ *(Forbidden — §3.9)* | ✓ (Personal active tasks & logs) | ✓ (Personal active tasks & logs) |
| **Burnout Tracker**| `/burnout-tracker`| ✓ (Dept filter enabled) | ✓ (All 4 depts transparently) | ✓ (All 4 depts transparently) |
| **Executive Reports**| `/reports` | ✓ (Weekly & Dept tables + CSV) | ✗ *(Forbidden)* | ✗ *(Forbidden)* |
| **Employee Detail**| `/employees/:id` | ✓ (Reset password for anyone) | ✓ (Reset password for own dept) | ✓ (Read-only view) |
| **Standalone Employees**| `/employees` | ↳ *Redirects to `/dashboard`* | ↳ *Redirects to `/dashboard`* | ↳ *Redirects to `/dashboard`* |

---

## 9. Key Feature Workflows

### A. Precision Timers & Session Splitting (`design.md §3.5 & §7.1`)
- Timers use real wall-clock elapsed time calculated from UTC timestamps.
- **Pause & Resume**: Automatically split into distinct closed `time_entries` sessions to preserve audit accuracy.
- **One-Active-Timer Rule**: Attempting to start a timer while another is active triggers a 409 conflict and renders the conflict modal, allowing the user to seamlessly switch or keep the current timer.
- **Global Topbar Widget**: Displays the live-ticking active timer with Pause, Resume, and Stop controls from anywhere in the application.

### B. Workload & Burnout Telemetry (`design.md §4 & §7.2`)
- **Planned Utilization**: `(Sum of estimated hours of uncompleted tickets due this week / weekly capacity hours) × 100%`. Used for risk assessment.
- **Actual Utilization**: `(Sum of recorded actual hours logged this week / weekly capacity hours) × 100%`. Used in the Burnout Tracker.
- **Risk Thresholds**:
  - `NORMAL`: Planned utilization < 100%
  - `HIGH_LOAD`: Planned utilization 100% – 120%
  - `BURNOUT_RISK`: Planned utilization > 120% OR 2+ consecutive weeks over 100%
- **Mandatory Disclaimer**: Every workload risk component explicitly renders:
  > *"Workload risk indicators are based strictly on recorded hours and capacity thresholds. They do not constitute a clinical assessment or psychological evaluation of employee burnout."*

### C. Executive Reports & CSV Export (`prd.md §4.7`)
- Head Group exclusive interface with dual reporting tables:
  1. **Weekly Workload Report**: Employee, Role, Department, Capacity, Planned, Actual, Planned Util %, Actual Util %, Active Tickets, Overdue, Workload Risk. Rows click through directly to Employee Detail.
  2. **Department Report**: Department, Member Count, Total Tickets, Completed, Active, Overdue, Planned (h), Actual (h), Capacity (h), Utilization %.
- Live CSV exports generated server-side with RFC 4180 escaping and UTF-8 charset.

### D. Admin-Driven Password Reset & Forced Password Change (`prd.md §4.1`)
- Password reset is admin-driven only (Head Group for anyone; Department Head for members of their own department).
- A 10-character cryptographically secure temporary password is generated, active sessions are invalidated, and `must_change_password` is set to `true`.
- On next login, the user is presented with a non-dismissible security modal forcing them to set a new password before accessing the system.

---

## 10. Production Deployment Guide

### Containerized Deployment (Docker)
The backend and frontend can be built and deployed via Docker:

```dockerfile
# Example multi-stage Dockerfile for server
FROM node:20-alpine AS builder
WORKDIR /app
COPY server/package*.json ./
RUN npm ci
COPY server/prisma ./prisma
RUN npx prisma generate
COPY server/ ./
EXPOSE 4000
CMD ["npm", "start"]
```

### Static Hosting for Frontend (Vite)
Build the frontend SPA:
```bash
cd client
npm run build
```
Deploy the resulting `dist/` directory to any static hosting provider (e.g., Nginx, AWS S3 + CloudFront, Cloudflare Pages, Vercel) with fallback routing to `index.html`.
