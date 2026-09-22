<script setup>
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import RoleBadge from '@/components/common/RoleBadge.vue';
import {
  LayoutDashboard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Building2,
  ArrowUpRight
} from 'lucide-vue-next';

const authStore = useAuthStore();
const user = computed(() => authStore.user);

const dashboardTitle = computed(() => {
  if (authStore.isHeadGroup) return 'Head Group Executive Dashboard';
  if (authStore.isDepartmentHead) return `${user.value?.departmentName} Department Dashboard`;
  return 'Personal Work Dashboard';
});

const dashboardSubtitle = computed(() => {
  if (authStore.isHeadGroup) return 'Group-wide oversight of all 4 departments, ticket flow, and workload signals.';
  if (authStore.isDepartmentHead) return `Operational overview for ${user.value?.departmentName} team tickets and capacity.`;
  return 'Your personal active tasks, weekly capacity progress, and tracked time.';
});
</script>

<template>
  <div class="dashboard-view">
    <!-- Welcome Header -->
    <div class="dashboard-header glass-card">
      <div class="header-main">
        <div class="header-text">
          <div class="header-topline">
            <RoleBadge v-if="user?.role" :role="user.role" />
            <span class="dept-indicator" v-if="user?.departmentName">
              <Building2 :size="13" />
              {{ user.departmentName }}
            </span>
          </div>
          <h1 class="page-title">{{ dashboardTitle }}</h1>
          <p class="page-subtitle">{{ dashboardSubtitle }}</p>
        </div>
      </div>
      <div class="header-meta">
        <span class="user-greeting">Logged in as <strong>{{ user?.name }}</strong> (@{{ user?.username }})</span>
      </div>
    </div>

    <!-- Phase 1 App Shell Status Notice -->
    <div class="phase-banner glass-card">
      <div class="banner-badge">Phase 1 Complete</div>
      <div class="banner-content">
        <h3 class="banner-title">Foundation & App Shell Ready</h3>
        <p class="banner-desc">
          Authentication (JWT + refresh token rotation), PostgreSQL schema with Prisma, and role-based route guards are active.
          Ticketing & live timer will be implemented in Phase 2; Workload & Burnout charts in Phase 3.
        </p>
      </div>
    </div>

    <!-- KPI Metric Cards Grid Preview -->
    <div class="kpi-grid">
      <div class="kpi-card glass-card">
        <div class="kpi-top">
          <span class="kpi-label">Active Tickets</span>
          <div class="kpi-icon-wrap icon-blue">
            <CheckCircle2 :size="18" />
          </div>
        </div>
        <div class="kpi-value">0</div>
        <div class="kpi-note">Awaiting Phase 2 ticket creation</div>
      </div>

      <div class="kpi-card glass-card">
        <div class="kpi-top">
          <span class="kpi-label">Tracked Time (Week)</span>
          <div class="kpi-icon-wrap icon-purple">
            <Clock :size="18" />
          </div>
        </div>
        <div class="kpi-value">0h 00m</div>
        <div class="kpi-note">Real timer active in Phase 2</div>
      </div>

      <div class="kpi-card glass-card">
        <div class="kpi-top">
          <span class="kpi-label">Weekly Capacity</span>
          <div class="kpi-icon-wrap icon-emerald">
            <Users :size="18" />
          </div>
        </div>
        <div class="kpi-value">40h</div>
        <div class="kpi-note">Default 5 days × 8 hours</div>
      </div>

      <div class="kpi-card glass-card">
        <div class="kpi-top">
          <span class="kpi-label">Workload Risk</span>
          <div class="kpi-icon-wrap icon-amber">
            <AlertTriangle :size="18" />
          </div>
        </div>
        <div class="kpi-value text-emerald">Normal</div>
        <div class="kpi-note">Calculated in Phase 3</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.dashboard-header {
  padding: 1.75rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  background: linear-gradient(135deg, rgba(17, 24, 39, 0.8) 0%, rgba(26, 34, 52, 0.6) 100%);
}

.header-topline {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.dept-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.775rem;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.05);
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-full);
}

.page-title {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.page-subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: 0.35rem;
}

.header-meta {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.header-meta strong {
  color: var(--text-primary);
}

/* Phase Banner */
.phase-banner {
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  border-left: 4px solid var(--accent-cyan);
  background: rgba(6, 182, 212, 0.06);
}

.banner-badge {
  background: rgba(6, 182, 212, 0.2);
  color: #67e8f9;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.3rem 0.65rem;
  border-radius: var(--radius-md);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.banner-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.banner-desc {
  font-size: 0.825rem;
  color: var(--text-secondary);
  margin-top: 0.2rem;
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.25rem;
}

.kpi-card {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
}

.kpi-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.kpi-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.kpi-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-blue {
  background: rgba(2, 132, 199, 0.15);
  color: #38bdf8;
}
.icon-purple {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
}
.icon-emerald {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}
.icon-amber {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.kpi-value {
  font-size: 1.75rem;
  font-weight: 800;
  font-family: var(--font-mono);
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.text-emerald {
  color: #34d399;
}

.kpi-note {
  font-size: 0.75rem;
  color: var(--text-muted);
}
</style>
