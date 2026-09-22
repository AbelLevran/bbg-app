# BBG Group Work Management & Burnout Tracker System

An internal web application for BBG group to manage day-to-day work as **tickets**, track **actual time worked** via precision wall-clock timers, and provide leadership with a **non-judgmental, factual view of organizational workload and burnout signals**.

---

## 1. Project Architecture

The project is structured as a clean monorepo:

```
BBG-APP/
├── server/                     # Node.js + Express + Prisma REST API
│   ├── prisma/
│   │   ├── schema.prisma       # Complete schema per design.md §3
│   │   ├── migrations/         # PostgreSQL migrations
│   │   └── seed.js             # BBG org seed script (15 users, 4 depts)
│   ├── src/
│   │   ├── index.js            # Express server entry point (Port 4000)
│   │   ├── app.js              # Express middlewares, CORS & routes
│   │   ├── controllers/        # Request handlers (auth, user)
│   │   ├── services/           # Business logic & domain services
│   │   ├── routes/             # REST endpoints (/api/v1/auth, /api/v1/users)
│   │   ├── middlewares/        # Auth & validation middlewares
│   │   └── utils/              # JWT, password hashing & formatting
│   └── test-auth.js            # Auth integration test script
│
├── client/                     # Vue 3 + Vite + Pinia Frontend SPA
│   ├── src/
│   │   ├── api/                # API client with auto-refresh on 401
│   │   ├── components/
│   │   │   ├── common/         # Reusable badges, indicators
│   │   │   └── layout/         # Topbar, Sidebar, and AppLayout shell
│   │   ├── router/             # Vue Router 4 with role-based navigation guards
│   │   ├── stores/             # Pinia auth store
│   │   ├── views/              # Dashboard, Tickets, My Work, Burnout Tracker, Reports
│   │   └── style.css           # Modern dark design tokens & utility styles
│   ├── vite.config.js          # Vite config with API proxy
│   └── index.html              # HTML root with typography
│
├── docker-compose.yml          # PostgreSQL service definition
├── package.json                # Root workspace configuration
├── prd.md                      # Product Requirements Document
└── design.md                   # Technical Architecture & Implementation Spec
```

---

## 2. Prerequisites

- **Node.js**: v18.0.0+ (Tested on v24.x)
- **npm**: v9.0.0+
- **PostgreSQL**: 15+ (Local service or Docker)

---

## 3. Quick Start & Setup

### A. Environment Configuration

The backend reads configuration from `server/.env`:

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

> **Using Docker for PostgreSQL:**
> If you don't have a local PostgreSQL service running, start one with:
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

Apply migrations and populate the database with the initial 15-user organization:

```bash
cd server
npm run db:migrate
npm run db:seed
```

---

## 4. Seeded Accounts Reference (BBG Organization)

All seeded test accounts share the development password: **`password123`**

| Username | Full Name | Role | Title | Department |
|---|---|---|---|---|
| `ahmad` | Ahmad Fauzi | `HEAD_GROUP` | Head Group | — (Group Oversight) |
| `budi` | Budi Santoso | `DEPARTMENT_HEAD` | BMS Department Head | BMS |
| `citra` | Citra Dewi | `MEMBER` | Senior Business Analyst | BMS |
| `dani` | Dani Pratama | `MEMBER` | Systems Analyst | BMS |
| `eka` | Eka Putri | `MEMBER` | BMS Specialist | BMS |
| `fajar` | Fajar Nugraha | `DEPARTMENT_HEAD` | Retail Department Head | Retail |
| `gita` | Gita Permata | `MEMBER` | Retail Operations Analyst | Retail |
| `hadi` | Hadi Wijaya | `MEMBER` | Retail Channel Coordinator | Retail |
| `indri` | Indri Safitri | `DEPARTMENT_HEAD` | Wholesale Department Head | Wholesale |
| `joko` | Joko Susilo | `MEMBER` | Corporate Account Specialist | Wholesale |
| `kartika` | Kartika Sari | `MEMBER` | Institutional Relations Analyst | Wholesale |
| `lukman` | Lukman Hakim | `MEMBER` | Wholesale Solutions Analyst | Wholesale |
| `maya` | Maya Anggraini | `DEPARTMENT_HEAD` | Production Department Head | Production |
| `nanda` | Nanda Putra | `MEMBER` | Service Delivery Lead | Production |
| `oscar` | Oscar Pratama | `MEMBER` | Quality Assurance Specialist | Production |

---

## 5. Running the Application

### Option 1: Run Both Concurrently

```bash
# From the project root
npm run dev:server
# In another terminal:
npm run dev:client
```

### Option 2: Run Separately

**Backend Server:**
```bash
cd server
npm run dev
# Starts API at http://localhost:4000 (API endpoints at /api/v1/*)
```

**Frontend Client:**
```bash
cd client
npm run dev
# Starts Vite at http://localhost:5173
```

Visit **`http://localhost:5173`** in your browser to access the app.

---

## 6. Role-Based Navigation Matrix (`prd.md §4.2`)

| Navigation View | `HEAD_GROUP` | `DEPARTMENT_HEAD` | `MEMBER` | Notes |
|---|:---:|:---:|:---:|---|
| **Dashboard** (`/dashboard`) | ✓ | ✓ | ✓ | Context-sensitive summary |
| **Tickets** (`/tickets`) | ✓ ("Tickets") | ✓ ("Team Tickets") | ✓ ("My Tickets") | Scoped list view |
| **My Work** (`/my-work`) | ✗ *(Forbidden)* | ✓ | ✓ | Head Group has no personal work queue |
| **Burnout Tracker** (`/burnout-tracker`) | ✓ | ✓ | ✓ | Transparent view across all 4 departments |
| **Reports** (`/reports`) | ✓ | ✗ *(Forbidden)* | ✗ *(Forbidden)* | Head Group exclusive analytics & CSV export |
| **Employee Detail** (`/employees/:id`) | ✓ | ✓ | ✓ | Reachable by click-through |

---

## 7. Authentication Flow (`design.md §1 & §5`)

- **Login (`POST /api/v1/auth/login`)**: Authenticates username and password. Issues a 15-minute JWT access token in the response payload and sets a 7-day `httpOnly`, `SameSite=Lax` refresh cookie backed by the `refresh_tokens` database table.
- **Refresh (`POST /api/v1/auth/refresh`)**: Rotates refresh tokens and issues a fresh access token without requiring re-authentication.
- **Logout (`POST /api/v1/auth/logout`)**: Explicitly revokes the refresh token in PostgreSQL and clears the client cookie.
- **Admin Password Reset (`POST /api/v1/users/:id/reset-password`)**:
  - `HEAD_GROUP` can reset passwords for any employee.
  - `DEPARTMENT_HEAD` can reset passwords for members of their own department.
  - Generates a temporary password, flags `must_change_password = true`, and revokes active sessions.
