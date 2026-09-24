import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

import LoginView from '@/views/LoginView.vue';
import AppLayout from '@/components/layout/AppLayout.vue';
import DashboardView from '@/views/DashboardView.vue';
import TicketsView from '@/views/TicketsView.vue';
import NewTicketView from '@/views/NewTicketView.vue';
import TicketDetailView from '@/views/TicketDetailView.vue';
import MyWorkView from '@/views/MyWorkView.vue';
import BurnoutTrackerView from '@/views/BurnoutTrackerView.vue';
import ReportsView from '@/views/ReportsView.vue';
import EmployeeDetailView from '@/views/EmployeeDetailView.vue';

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { guestOnly: true, title: 'Sign In' }
  },
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: DashboardView,
        meta: { title: 'Dashboard', roles: ['HEAD_GROUP', 'DEPARTMENT_HEAD', 'MEMBER'] }
      },
      {
        path: 'tickets',
        name: 'tickets',
        component: TicketsView,
        meta: { title: 'Tickets', roles: ['HEAD_GROUP', 'DEPARTMENT_HEAD', 'MEMBER'] }
      },
      {
        path: 'tickets/new',
        name: 'new-ticket',
        component: NewTicketView,
        meta: { title: 'New Ticket', roles: ['HEAD_GROUP', 'DEPARTMENT_HEAD', 'MEMBER'] }
      },
      {
        path: 'tickets/:id',
        name: 'ticket-detail',
        component: TicketDetailView,
        meta: { title: 'Ticket Detail', roles: ['HEAD_GROUP', 'DEPARTMENT_HEAD', 'MEMBER'] }
      },
      {
        path: 'my-work',
        name: 'my-work',
        component: MyWorkView,
        // Head Group has NO "My Work" page (prd.md §3.9, §4.2)
        meta: { title: 'My Work', roles: ['DEPARTMENT_HEAD', 'MEMBER'] }
      },
      {
        path: 'burnout-tracker',
        name: 'burnout-tracker',
        component: BurnoutTrackerView,
        meta: { title: 'Burnout Tracker', roles: ['HEAD_GROUP', 'DEPARTMENT_HEAD', 'MEMBER'] }
      },
      {
        path: 'reports',
        name: 'reports',
        component: ReportsView,
        // Head Group only (prd.md §4.2, §4.7)
        meta: { title: 'Reports', roles: ['HEAD_GROUP'] }
      },
      {
        path: 'employees/:id',
        name: 'employee-detail',
        component: EmployeeDetailView,
        meta: { title: 'Employee Detail', roles: ['HEAD_GROUP', 'DEPARTMENT_HEAD', 'MEMBER'] }
      },
      {
        // prd.md §4.10: Employees list removed, redirect to dashboard
        path: 'employees',
        redirect: '/dashboard'
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // Ensure auth state is restored on initial load
  if (!authStore.isInitialized) {
    await authStore.initAuth();
  }

  // Update page title
  if (to.meta.title) {
    document.title = `${to.meta.title} — BBG Management`;
  }

  const isAuth = authStore.isAuthenticated;
  const userRole = authStore.role;

  // 1. Guest-only routes (e.g. /login)
  if (to.meta.guestOnly && isAuth) {
    return next({ path: '/dashboard' });
  }

  // 2. Protected routes requiring authentication
  if (to.matched.some(record => record.meta.requiresAuth) && !isAuth) {
    return next({ path: '/login', query: { redirect: to.fullPath } });
  }

  // 3. Role-based access control (prd.md §4.2)
  if (to.meta.roles && !to.meta.roles.includes(userRole)) {
    console.warn(`[RouteGuard] Access denied for role ${userRole} to path ${to.path}. Redirecting to /dashboard.`);
    return next({ path: '/dashboard' });
  }

  next();
});

export default router;
