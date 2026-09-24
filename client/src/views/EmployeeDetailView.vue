<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useWorkloadStore } from '@/stores/workload';
import { getUserDetailApi } from '@/api/users';
import RoleBadge from '@/components/common/RoleBadge.vue';
import WeekSelector from '@/components/common/WeekSelector.vue';
import UserCapacityInput from '@/components/workload/UserCapacityInput.vue';
import DonutChart from '@/components/charts/DonutChart.vue';
import LineTrendChart from '@/components/charts/LineTrendChart.vue';
import {
  User,
  Building2,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowLeft,
  Calendar,
  Clock,
  Briefcase,
  Activity,
  Info,
  Check,
  Loader2
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const workloadStore = useWorkloadStore();

const employeeId = computed(() => route.params.id);
const selectedWeek = ref(workloadStore.selectedWeek);

const loading = ref(true);
const errorMsg = ref('');
const employeeData = ref(null);

onMounted(async () => {
  await loadEmployeeDetails();
});

watch(
  () => [employeeId.value, selectedWeek.value],
  async () => {
    await loadEmployeeDetails();
  }
);

async function loadEmployeeDetails() {
  if (!employeeId.value) return;
  loading.value = true;
  errorMsg.value = '';
  try {
    const data = await getUserDetailApi(employeeId.value, selectedWeek.value);
    employeeData.value = data;
  } catch (err) {
    console.error('Failed to load employee details:', err);
    errorMsg.value = err.message || 'Unable to load employee details.';
  } finally {
    loading.value = false;
  }
}

function handleCapacitySaved() {
  loadEmployeeDetails();
}

function goBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/dashboard');
  }
}

// Utilization coloring
function getUtilBadgeClass(pct) {
  if (pct == null) return 'badge-neutral';
  if (pct > 115) return 'badge-danger';
  if (pct >= 100) return 'badge-warning';
  if (pct >= 70) return 'badge-success';
  return 'badge-info';
}

function getRiskBadgeClass(risk) {
  switch (risk) {
    case 'BURNOUT_RISK':
      return 'badge-danger';
    case 'HIGH_LOAD':
      return 'badge-warning';
    case 'NORMAL':
    default:
      return 'badge-success';
  }
}

// Donut Chart data for ticket status breakdown
const donutLabels = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'STUCK', 'DONE', 'CANCELLED'];
const donutColors = [
  '#94a3b8', // TODO
  '#38bdf8', // IN_PROGRESS
  '#a855f7', // IN_REVIEW
  '#ef4444', // STUCK
  '#10b981', // DONE
  '#64748b'  // CANCELLED
];

const donutData = computed(() => {
  const counts = employeeData.value?.statusCounts || {};
  return [
    counts.TODO || 0,
    counts.IN_PROGRESS || 0,
    counts.IN_REVIEW || 0,
    counts.STUCK || 0,
    counts.DONE || 0,
    counts.CANCELLED || 0
  ];
});

const totalTicketsCount = computed(() => {
  return donutData.value.reduce((a, b) => a + b, 0);
});

// 4-Week Trend Chart data
const trendLabels = computed(() => {
  const trends = employeeData.value?.weeklyTrend || [];
  return trends.map(t => t.week);
});

const trendDatasets = computed(() => {
  const trends = employeeData.value?.weeklyTrend || [];
  return [
    {
      label: 'Planned (h)',
      data: trends.map(t => t.plannedHours),
      borderColor: '#38bdf8',
      backgroundColor: 'rgba(56, 189, 248, 0.1)',
      borderWidth: 2,
      fill: false
    },
    {
      label: 'Actual Tracked (h)',
      data: trends.map(t => t.actualHours),
      borderColor: '#a855f7',
      backgroundColor: 'rgba(168, 85, 247, 0.1)',
      borderWidth: 2,
      fill: false
    },
    {
      label: 'Capacity (h)',
      data: trends.map(t => t.capacityHours),
      borderColor: 'rgba(255, 255, 255, 0.3)',
      borderDash: [5, 5],
      borderWidth: 1.5,
      fill: false
    }
  ];
});
</script>

<template>
  <div class="employee-detail-view">
    <!-- Breadcrumb / Back button -->
    <div class="top-nav-bar">
      <button class="back-link" @click="goBack">
        <ArrowLeft :size="16" />
        <span>Back</span>
      </button>

      <div class="header-controls">
        <WeekSelector v-model="selectedWeek" />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state glass-card">
      <Loader2 :size="32" class="spin text-primary" />
      <p>Loading employee profile & telemetry...</p>
    </div>

    <!-- Error Banner -->
    <div v-else-if="errorMsg" class="error-banner glass-card">
      <AlertTriangle :size="24" class="text-danger" />
      <div>
        <h3>Unable to load employee</h3>
        <p>{{ errorMsg }}</p>
      </div>
      <button class="btn btn-secondary" @click="loadEmployeeDetails">Retry</button>
    </div>

    <template v-else-if="employeeData">
      <!-- Profile Header Card -->
      <div class="profile-header-card glass-card">
        <div class="profile-main-info">
          <div class="avatar-circle">
            {{ employeeData.user.name.charAt(0) }}
          </div>
          <div class="identity-group">
            <div class="name-row">
              <h1 class="employee-name">{{ employeeData.user.name }}</h1>
              <span class="status-badge" :class="employeeData.user.isActive ? 'active' : 'inactive'">
                {{ employeeData.user.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <div class="meta-row">
              <span class="user-handle">@{{ employeeData.user.username }}</span>
              <span class="meta-dot">•</span>
              <span class="user-title">{{ employeeData.user.title || 'Team Member' }}</span>
              <span class="meta-dot">•</span>
              <span class="user-dept">
                <Building2 :size="13" />
                {{ employeeData.user.departmentName || 'Group' }}
              </span>
              <span class="meta-dot">•</span>
              <RoleBadge :role="employeeData.user.role" />
            </div>
          </div>
        </div>
      </div>

      <!-- This-Week Summary Cards Grid -->
      <div class="kpi-grid">
        <!-- Weekly Capacity (Editable) -->
        <div class="kpi-card glass-card">
          <div class="kpi-header">
            <span class="kpi-label">Weekly Capacity</span>
            <Clock :size="16" class="text-subtle" />
          </div>
          <div class="kpi-body">
            <UserCapacityInput
              :user-id="employeeData.user.id"
              :user-department-id="employeeData.user.departmentId"
              :initial-text="String(employeeData.currentWorkload?.capacityHours || 40)"
              :week="selectedWeek"
              @saved="handleCapacitySaved"
            />
          </div>
          <span class="kpi-footer">Click badge to edit weekly capacity</span>
        </div>

        <!-- Planned Hours -->
        <div class="kpi-card glass-card">
          <div class="kpi-header">
            <span class="kpi-label">Planned Hours</span>
            <Calendar :size="16" class="text-subtle" />
          </div>
          <div class="kpi-body">
            <span class="kpi-value font-mono">{{ employeeData.currentWorkload?.plannedHours || 0 }}h</span>
            <span class="util-badge" :class="getUtilBadgeClass(employeeData.currentWorkload?.plannedUtilization)">
              {{ employeeData.currentWorkload?.plannedUtilization || 0 }}%
            </span>
          </div>
          <span class="kpi-footer">Due this week (Planned Util)</span>
        </div>

        <!-- Actual Tracked Hours -->
        <div class="kpi-card glass-card">
          <div class="kpi-header">
            <span class="kpi-label">Actual Tracked</span>
            <Activity :size="16" class="text-subtle" />
          </div>
          <div class="kpi-body">
            <span class="kpi-value font-mono">{{ employeeData.currentWorkload?.actualHours || 0 }}h</span>
            <span class="util-badge" :class="getUtilBadgeClass(employeeData.currentWorkload?.actualUtilization)">
              {{ employeeData.currentWorkload?.actualUtilization || 0 }}%
            </span>
          </div>
          <span class="kpi-footer">Logged via timers (Actual Util)</span>
        </div>

        <!-- Workload Risk State -->
        <div class="kpi-card glass-card">
          <div class="kpi-header">
            <span class="kpi-label">Risk Status</span>
            <ShieldAlert :size="16" class="text-subtle" />
          </div>
          <div class="kpi-body">
            <span class="risk-badge" :class="getRiskBadgeClass(employeeData.currentWorkload?.workloadRisk)">
              {{ employeeData.currentWorkload?.workloadRisk?.replace('_', ' ') }}
            </span>
          </div>
          <span class="kpi-footer">
            {{ employeeData.currentWorkload?.consecutiveWeeksOverCapacity || 0 }} consecutive weeks over cap
          </span>
        </div>
      </div>

      <!-- Workload Risk Card & Non-Diagnostic Disclaimer -->
      <div class="risk-overview-card glass-card">
        <div class="risk-card-top">
          <div class="risk-meta-left">
            <div class="risk-badge-big" :class="getRiskBadgeClass(employeeData.currentWorkload?.workloadRisk)">
              {{ employeeData.currentWorkload?.workloadRisk?.replace('_', ' ') }}
            </div>
            <div>
              <h3 class="risk-driver-title">Primary Driver: {{ employeeData.currentWorkload?.primaryRiskDriver || 'Healthy Workload' }}</h3>
              <p class="risk-driver-desc">
                Current capacity: {{ employeeData.currentWorkload?.capacityHours }}h |
                Planned tasks: {{ employeeData.currentWorkload?.plannedHours }}h |
                Recorded timer hours: {{ employeeData.currentWorkload?.actualHours }}h
              </p>
            </div>
          </div>
          <div class="consecutive-tag">
            <span class="consecutive-num">{{ employeeData.currentWorkload?.consecutiveWeeksOverCapacity || 0 }}</span>
            <span class="consecutive-label">Weeks Over Capacity</span>
          </div>
        </div>

        <!-- Mandatory Non-Diagnostic Disclaimer (prd.md §3.6 & §4.8) -->
        <div class="disclaimer-banner">
          <Info :size="16" class="disclaimer-icon" />
          <span class="disclaimer-text">
            <strong>Mandatory Notice:</strong> Workload risk indicators are based strictly on recorded hours and capacity thresholds. They do not constitute a clinical assessment or psychological evaluation of employee burnout.
          </span>
        </div>
      </div>

      <!-- Charts Row: Ticket Status Breakdown & 4-Week Trend -->
      <div class="charts-row">
        <!-- Ticket Status Breakdown Donut -->
        <div class="chart-card glass-card">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">Ticket Status Distribution</h3>
              <p class="chart-desc">{{ totalTicketsCount }} total tickets assigned across all clusters</p>
            </div>
          </div>

          <div class="donut-content">
            <DonutChart
              :labels="donutLabels"
              :data="donutData"
              :colors="donutColors"
              :height="200"
            />
          </div>

          <div class="status-chips-grid">
            <div v-for="(label, idx) in donutLabels" :key="label" class="status-chip">
              <span class="chip-color" :style="{ backgroundColor: donutColors[idx] }" />
              <span class="chip-name">{{ label }}</span>
              <span class="chip-count">{{ donutData[idx] }}</span>
            </div>
          </div>
        </div>

        <!-- 4-Week Utilization Trend Line Chart -->
        <div class="chart-card glass-card">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">4-Week Workload History & Trend</h3>
              <p class="chart-desc">Capacity vs Planned vs Actual logged hours</p>
            </div>
          </div>

          <div class="trend-content">
            <LineTrendChart
              :labels="trendLabels"
              :datasets="trendDatasets"
              :height="240"
              y-axis-label="Hours"
            />
          </div>
        </div>
      </div>

      <!-- 4-Week Workload History Table -->
      <div class="history-table-card glass-card">
        <div class="history-header">
          <h3 class="chart-title">4-Week Capacity Telemetry Breakdown</h3>
          <p class="chart-desc">Historical comparison of planned obligations and actual logged time</p>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Week</th>
                <th class="num-col">Capacity (h)</th>
                <th class="num-col">Planned (h)</th>
                <th class="num-col">Actual (h)</th>
                <th class="center-col">Planned Util %</th>
                <th class="center-col">Actual Util %</th>
                <th class="center-col">Risk Level</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in employeeData.weeklyTrend" :key="t.week">
                <td class="font-bold text-primary font-mono">{{ t.week }}</td>
                <td class="num-col font-mono">{{ t.capacityHours }}h</td>
                <td class="num-col font-mono">{{ t.plannedHours }}h</td>
                <td class="num-col font-mono">{{ t.actualHours }}h</td>
                <td class="center-col">
                  <span class="util-badge" :class="getUtilBadgeClass(t.plannedUtilization)">
                    {{ t.plannedUtilization }}%
                  </span>
                </td>
                <td class="center-col">
                  <span class="util-badge" :class="getUtilBadgeClass(t.actualUtilization)">
                    {{ t.actualUtilization }}%
                  </span>
                </td>
                <td class="center-col">
                  <span class="risk-badge" :class="getRiskBadgeClass(t.risk)">
                    {{ t.risk }}
                  </span>
                </td>
              </tr>
              <tr v-if="!employeeData.weeklyTrend || employeeData.weeklyTrend.length === 0">
                <td colspan="7" class="empty-table-cell">No history available for this user.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.employee-detail-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.top-nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: 1px solid var(--border-color);
  padding: 0.45rem 0.85rem;
  border-radius: var(--radius-md, 8px);
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.back-link:hover {
  background: var(--bg-hover, rgba(255, 255, 255, 0.05));
  color: var(--text-primary);
}

.profile-header-card {
  padding: 1.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.25rem;
}

.profile-main-info {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.avatar-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color, #2563eb), #7c3aed);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 800;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.identity-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.employee-name {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  margin: 0;
}

.status-badge {
  padding: 0.15rem 0.5rem;
  border-radius: 12px;
  font-size: 0.725rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.status-badge.active {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.status-badge.inactive {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  flex-wrap: wrap;
}

.user-handle {
  font-family: var(--font-mono, monospace);
  font-weight: 600;
}

.user-dept {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.meta-dot {
  opacity: 0.4;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.kpi-card {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.kpi-label {
  font-size: 0.775rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.04em;
}

.kpi-body {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.kpi-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
}

.kpi-footer {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.risk-overview-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.risk-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.risk-meta-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.risk-badge-big {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md, 8px);
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.risk-driver-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.risk-driver-desc {
  font-size: 0.825rem;
  color: var(--text-secondary);
  margin: 0.2rem 0 0;
}

.consecutive-tag {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--bg-subtle, #f8fafc);
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--border-color);
}

.consecutive-num {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--text-primary);
}

.consecutive-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.03em;
}

.disclaimer-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.85rem 1.15rem;
  background: rgba(6, 182, 212, 0.08);
  border: 1px solid rgba(6, 182, 212, 0.25);
  border-radius: var(--radius-md, 8px);
}

.disclaimer-icon {
  color: #0284c7;
  flex-shrink: 0;
  margin-top: 0.15rem;
}

.disclaimer-text {
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.disclaimer-text strong {
  color: var(--text-primary);
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1.6fr;
  gap: 1.25rem;
}

@media (max-width: 1024px) {
  .charts-row {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.chart-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.chart-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0.15rem 0 0;
}

.status-chips-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.status-chip {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  background: var(--bg-subtle, #f8fafc);
  font-size: 0.725rem;
}

.chip-color {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.chip-name {
  color: var(--text-secondary);
  font-weight: 600;
  flex: 1;
}

.chip-count {
  font-weight: 700;
  color: var(--text-primary);
}

.history-table-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-header {
  margin-bottom: 0.25rem;
}

.table-responsive {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.875rem;
}

.data-table th {
  background: var(--bg-subtle, #f8fafc);
  color: var(--text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.725rem;
  letter-spacing: 0.05em;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  white-space: nowrap;
  text-align: left;
}

.data-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--border-subtle, #f1f5f9);
  color: var(--text-primary);
  white-space: nowrap;
}

.num-col {
  text-align: right;
}

.center-col {
  text-align: center;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.util-badge {
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  font-size: 0.775rem;
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.risk-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.badge-info {
  background: #eff6ff;
  color: #1d4ed8;
}

.badge-success {
  background: #f0fdf4;
  color: #15803d;
}

.badge-warning {
  background: #fefce8;
  color: #a16207;
}

.badge-danger {
  background: #fef2f2;
  color: #b91c1c;
}

.loading-state {
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: var(--text-secondary);
}

.error-banner {
  padding: 2rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.empty-table-cell {
  text-align: center;
  padding: 2.5rem 1rem !important;
  color: var(--text-secondary);
  font-style: italic;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
