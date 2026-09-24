<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useWorkloadStore } from '@/stores/workload';
import { useTicketsStore } from '@/stores/tickets';
import { orgApi } from '@/api/org';
import RoleBadge from '@/components/common/RoleBadge.vue';
import WeekSelector from '@/components/common/WeekSelector.vue';
import KpiCard from '@/components/common/KpiCard.vue';
import WorkloadRiskCard from '@/components/workload/WorkloadRiskCard.vue';
import GroupedBarChart from '@/components/charts/GroupedBarChart.vue';
import LineTrendChart from '@/components/charts/LineTrendChart.vue';
import SingleBarChart from '@/components/charts/SingleBarChart.vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
import PriorityBadge from '@/components/common/PriorityBadge.vue';
import {
  CheckCircle2, Clock, AlertTriangle, Users, Building2,
  Calendar, ShieldAlert, ArrowUpRight, CheckSquare, Plus,
  Layers, Filter, Info, Loader2
} from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();
const workloadStore = useWorkloadStore();
const ticketsStore = useTicketsStore();

const user = computed(() => authStore.user);
const selectedWeek = ref(workloadStore.selectedWeek);

// Reference data
const departments = ref([]);
const usersList = ref([]);

// Filter states for Head Group
const selectedDeptId = ref('');
const selectedEmpId = ref('');
const selectedRiskFilter = ref('ALL'); // ALL, NORMAL, HIGH, OVER, EXTREME

// Dashboard states
const groupData = ref(null);
const deptData = ref(null);
const memberData = ref(null);
const sustainedAlerts = ref([]);
const memberActiveTickets = ref([]);
const trendData = ref([]);
const dailyData = ref([]);
const loading = ref(true);

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

onMounted(async () => {
  if (authStore.isHeadGroup) {
    try {
      const dRes = await orgApi.getDepartments();
      departments.value = dRes.departments || [];
      const uRes = await orgApi.getUsers();
      usersList.value = uRes.users || [];
    } catch {
      // ignore
    }
  }
  await loadDashboardData();
});

watch(selectedWeek, async (newWeek) => {
  workloadStore.setSelectedWeek(newWeek);
  await loadDashboardData();
});

async function loadDashboardData() {
  loading.value = true;
  try {
    const week = selectedWeek.value;

    if (authStore.isHeadGroup) {
      // Load group data concurrently in parallel
      const [gData, alerts, trend, daily] = await Promise.all([
        workloadStore.fetchGroupWorkload(week),
        workloadStore.fetchAlerts(week),
        workloadStore.fetchUserTrend(authStore.user.id, week, 4),
        workloadStore.fetchUserDaily(authStore.user.id, week)
      ]);
      groupData.value = gData;
      sustainedAlerts.value = alerts;
      trendData.value = trend;
      dailyData.value = daily;
    } else if (authStore.isDepartmentHead) {
      // Load department data concurrently in parallel
      const deptId = authStore.user.departmentId;
      const [dData, trend, daily, alerts] = await Promise.all([
        workloadStore.fetchDeptWorkload(deptId, week),
        workloadStore.fetchUserTrend(authStore.user.id, week, 4),
        workloadStore.fetchUserDaily(authStore.user.id, week),
        workloadStore.fetchAlerts(week)
      ]);
      deptData.value = dData;
      trendData.value = trend;
      dailyData.value = daily;
      sustainedAlerts.value = alerts;
    } else {
      // MEMBER: personal data concurrently in parallel
      const [mData, trend, daily, _] = await Promise.all([
        workloadStore.fetchUserWorkload(authStore.user.id, week),
        workloadStore.fetchUserTrend(authStore.user.id, week, 4),
        workloadStore.fetchUserDaily(authStore.user.id, week),
        ticketsStore.fetchTickets()
      ]);
      memberData.value = mData;
      trendData.value = trend;
      dailyData.value = daily;
      memberActiveTickets.value = (ticketsStore.list || []).filter(t =>
        ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'STUCK'].includes(t.status)
      );
    }
  } catch (err) {
    console.error('Failed to load dashboard data:', err);
  } finally {
    loading.value = false;
  }
}

// ========================
// HEAD GROUP COMPUTED
// ========================
const filteredGroupMembers = computed(() => {
  if (!groupData.value?.members) return [];
  let list = groupData.value.members;

  if (selectedDeptId.value) {
    list = list.filter(m => m.user?.department_id === selectedDeptId.value);
  }
  if (selectedEmpId.value) {
    list = list.filter(m => (m.userId || m.user?.id) === selectedEmpId.value);
  }
  if (selectedRiskFilter.value !== 'ALL') {
    list = list.filter(m => m.riskLevel === selectedRiskFilter.value);
  }
  return list;
});

const riskOverviewCounts = computed(() => {
  const all = groupData.value?.members || [];
  return {
    NORMAL: all.filter(m => m.riskLevel === 'NORMAL').length,
    HIGH: all.filter(m => m.riskLevel === 'HIGH').length,
    OVER: all.filter(m => m.riskLevel === 'OVER').length,
    EXTREME: all.filter(m => m.riskLevel === 'EXTREME').length
  };
});

const deptChartLabels = computed(() =>
  (groupData.value?.departments || []).map(d => d.department?.name || d.name)
);

const deptChartDatasets = computed(() => [
  {
    label: 'Planned (h)',
    data: (groupData.value?.departments || []).map(d => d.totalPlannedHours),
    backgroundColor: 'rgba(56, 189, 248, 0.75)',
    borderRadius: 6
  },
  {
    label: 'Actual Tracked (h)',
    data: (groupData.value?.departments || []).map(d => d.totalActualHours),
    backgroundColor: 'rgba(168, 85, 247, 0.75)',
    borderRadius: 6
  },
  {
    label: 'Capacity (h)',
    data: (groupData.value?.departments || []).map(d => d.totalCapacityHours),
    backgroundColor: 'rgba(16, 185, 129, 0.5)',
    borderRadius: 6
  }
]);

// Trend Line Chart data
const trendChartLabels = computed(() =>
  trendData.value.map(t => t.weekLabel)
);

const trendChartDatasets = computed(() => [
  {
    label: 'Planned (h)',
    data: trendData.value.map(t => t.plannedHours),
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    fill: true
  },
  {
    label: 'Actual Tracked (h)',
    data: trendData.value.map(t => t.actualHours),
    borderColor: '#a855f7',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    fill: true
  },
  {
    label: 'Capacity (h)',
    data: trendData.value.map(t => t.capacityHours),
    borderColor: '#10b981',
    borderDash: [5, 5],
    fill: false
  }
]);

// Daily bar chart
const dailyChartLabels = computed(() =>
  dailyData.value.map(d => d.day)
);
const dailyChartValues = computed(() =>
  dailyData.value.map(d => d.hours)
);

function navigateToEmployee(id) {
  if (id) router.push(`/employees/${id}`);
}

function openTicket(id) {
  router.push(`/tickets/${id}`);
}
</script>

<template>
  <div class="dashboard-view">
    <!-- Header with Week Selector & Greeting -->
    <div class="dashboard-header glass-card">
      <div class="header-main">
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

      <div class="header-right-controls">
        <WeekSelector v-model="selectedWeek" />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !groupData && !deptData && !memberData" class="loading-state">
      <Loader2 :size="28" class="spinning icon-cyan" />
      <span>Loading workload intelligence...</span>
    </div>

    <!-- ============================================== -->
    <!-- ROLE 1: HEAD GROUP EXECUTIVE DASHBOARD (prd.md §4.4) -->
    <!-- ============================================== -->
    <template v-else-if="authStore.isHeadGroup && groupData">
      <!-- Factual Alerts Section -->
      <div v-if="groupData.overdueTickets > 0 || sustainedAlerts.length > 0" class="alerts-container">
        <div v-if="groupData.overdueTickets > 0" class="alert-box alert-warning">
          <AlertTriangle :size="18" class="alert-icon" />
          <div class="alert-text">
            <strong>{{ groupData.overdueTickets }} ticket(s) are overdue</strong> across the organization. Review assigned initiatives to prevent project delays.
          </div>
        </div>

        <div v-if="sustainedAlerts.length > 0" class="alert-box alert-danger">
          <ShieldAlert :size="18" class="alert-icon" />
          <div class="alert-text">
            <strong>Workload Signal:</strong> {{ sustainedAlerts.length }} team member(s) have sustained planned workload above 100% capacity for 2+ consecutive weeks:
            <span class="names-list">
              {{ sustainedAlerts.map(a => a.user?.name).join(', ') }}.
            </span>
          </div>
        </div>
      </div>

      <!-- Global Filter Bar for Head Group -->
      <div class="filter-bar glass-card">
        <div class="filter-item">
          <label><Building2 :size="13" /> Department:</label>
          <select v-model="selectedDeptId" class="filter-select">
            <option value="">All 4 Departments</option>
            <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </div>

        <div class="filter-item">
          <label><Users :size="13" /> Employee:</label>
          <select v-model="selectedEmpId" class="filter-select">
            <option value="">All Team Members</option>
            <option v-for="u in usersList" :key="u.id" :value="u.id">
              {{ u.name }} ({{ u.department?.name || 'Group' }})
            </option>
          </select>
        </div>

        <button
          v-if="selectedDeptId || selectedEmpId || selectedRiskFilter !== 'ALL'"
          class="btn-reset-filters"
          @click="selectedDeptId = ''; selectedEmpId = ''; selectedRiskFilter = 'ALL'"
        >
          Reset Filters
        </button>
      </div>

      <!-- KPI Metrics Grid (Tickets & Workload) -->
      <div class="kpi-grid">
        <KpiCard
          label="Total Tickets"
          :value="groupData.totalTickets"
          subnote="Across all departments"
          variant="blue"
        >
          <template #icon><CheckSquare :size="18" /></template>
        </KpiCard>

        <KpiCard
          label="Active Tickets"
          :value="groupData.activeTickets"
          subnote="In queue, in progress, stuck"
          variant="cyan"
        >
          <template #icon><Clock :size="18" /></template>
        </KpiCard>

        <KpiCard
          label="Completed"
          :value="groupData.completedTickets"
          subnote="Tickets marked Done"
          variant="emerald"
        >
          <template #icon><CheckCircle2 :size="18" /></template>
        </KpiCard>

        <KpiCard
          label="Overdue Tickets"
          :value="groupData.overdueTickets"
          subnote="Passed due date"
          variant="rose"
        >
          <template #icon><AlertTriangle :size="18" /></template>
        </KpiCard>

        <KpiCard
          label="Planned Workload"
          :value="`${groupData.totalPlannedHours}h`"
          subnote="Tickets due this week"
          variant="blue"
        >
          <template #icon><Calendar :size="18" /></template>
        </KpiCard>

        <KpiCard
          label="Actual Tracked"
          :value="`${groupData.totalActualHours}h`"
          subnote="Live timers + manual entries"
          variant="purple"
        >
          <template #icon><Clock :size="18" /></template>
        </KpiCard>

        <KpiCard
          label="Group Capacity"
          :value="`${groupData.totalCapacityHours}h`"
          subnote="Sum of member weekly hours"
          variant="emerald"
        >
          <template #icon><Users :size="18" /></template>
        </KpiCard>

        <KpiCard
          label="Planned Utilization"
          :value="`${groupData.plannedUtilizationPct}%`"
          :subnote="`Overall status: ${groupData.riskLabel}`"
          :variant="groupData.plannedUtilizationPct > 100 ? 'rose' : groupData.plannedUtilizationPct >= 80 ? 'amber' : 'emerald'"
        >
          <template #icon><Layers :size="18" /></template>
        </KpiCard>
      </div>

      <!-- Workload Risk Overview Tiles (Clickable Filter Buttons) -->
      <div class="risk-overview-section">
        <div class="section-top">
          <h3 class="section-title">Workload Risk Overview</h3>
          <span class="section-hint">Click a tile to filter the Employee Workload table below</span>
        </div>

        <div class="risk-tiles-grid">
          <div
            class="risk-tile tile-normal"
            :class="{ active: selectedRiskFilter === 'NORMAL' }"
            @click="selectedRiskFilter = selectedRiskFilter === 'NORMAL' ? 'ALL' : 'NORMAL'"
          >
            <div class="tile-top">
              <span class="tile-label">Normal</span>
              <CheckCircle2 :size="16" />
            </div>
            <div class="tile-count font-mono">{{ riskOverviewCounts.NORMAL }}</div>
            <div class="tile-desc">&lt; 80% Capacity</div>
          </div>

          <div
            class="risk-tile tile-high"
            :class="{ active: selectedRiskFilter === 'HIGH' }"
            @click="selectedRiskFilter = selectedRiskFilter === 'HIGH' ? 'ALL' : 'HIGH'"
          >
            <div class="tile-top">
              <span class="tile-label">High Load</span>
              <AlertTriangle :size="16" />
            </div>
            <div class="tile-count font-mono">{{ riskOverviewCounts.HIGH }}</div>
            <div class="tile-desc">80% – 100% Capacity</div>
          </div>

          <div
            class="risk-tile tile-over"
            :class="{ active: selectedRiskFilter === 'OVER' }"
            @click="selectedRiskFilter = selectedRiskFilter === 'OVER' ? 'ALL' : 'OVER'"
          >
            <div class="tile-top">
              <span class="tile-label">Over Capacity</span>
              <AlertTriangle :size="16" />
            </div>
            <div class="tile-count font-mono">{{ riskOverviewCounts.OVER }}</div>
            <div class="tile-desc">100% – 120% Capacity</div>
          </div>

          <div
            class="risk-tile tile-extreme"
            :class="{ active: selectedRiskFilter === 'EXTREME' }"
            @click="selectedRiskFilter = selectedRiskFilter === 'EXTREME' ? 'ALL' : 'EXTREME'"
          >
            <div class="tile-top">
              <span class="tile-label">Extreme Load</span>
              <ShieldAlert :size="16" />
            </div>
            <div class="tile-count font-mono">{{ riskOverviewCounts.EXTREME }}</div>
            <div class="tile-desc">&gt; 120% Capacity</div>
          </div>
        </div>
      </div>

      <!-- Charts Row: Planned vs Actual by Department + Weekly Workload Trend -->
      <div class="charts-grid-2">
        <div class="chart-card glass-card">
          <div class="chart-header">
            <h3 class="chart-title">Planned vs Actual Workload by Department</h3>
            <span class="chart-subtitle">Aggregated totals across all 4 departments</span>
          </div>
          <GroupedBarChart
            :labels="deptChartLabels"
            :datasets="deptChartDatasets"
            :height="240"
            y-axis-label="Hours"
          />
        </div>

        <div class="chart-card glass-card">
          <div class="chart-header">
            <h3 class="chart-title">Weekly Workload Trend (Last 4 Weeks)</h3>
            <span class="chart-subtitle">Executive trajectory of planned effort vs tracked actuals</span>
          </div>
          <LineTrendChart
            :labels="trendChartLabels"
            :datasets="trendChartDatasets"
            :height="240"
            y-axis-label="Hours"
          />
        </div>
      </div>

      <!-- Daily Workload + Department Progress Bars -->
      <div class="charts-grid-2">
        <div class="chart-card glass-card">
          <div class="chart-header">
            <h3 class="chart-title">Daily Workload Distribution (Mon–Sun)</h3>
            <span class="chart-subtitle">Tracked hours by day for current week</span>
          </div>
          <SingleBarChart
            :labels="dailyChartLabels"
            :data="dailyChartValues"
            label="Hours Tracked"
            :height="220"
          />
        </div>

        <div class="chart-card glass-card">
          <div class="chart-header">
            <h3 class="chart-title">Department Workload Capacity</h3>
            <span class="chart-subtitle">Planned utilization progress per department</span>
          </div>
          <div class="dept-progress-list">
            <div
              v-for="d in groupData.departments"
              :key="d.department?.id || d.name"
              class="dept-progress-item"
            >
              <div class="dp-header">
                <span class="dp-name">{{ d.department?.name || d.name }}</span>
                <span class="dp-util font-mono">{{ d.plannedUtilizationPct }}% Planned</span>
              </div>
              <div class="dp-track">
                <div
                  class="dp-fill"
                  :style="{
                    width: `${Math.min(100, d.plannedUtilizationPct)}%`,
                    backgroundColor: d.plannedUtilizationPct > 100 ? '#ef4444' : d.plannedUtilizationPct >= 80 ? '#f59e0b' : '#10b981'
                  }"
                />
              </div>
              <div class="dp-footer">
                <span>{{ d.totalPlannedHours }}h planned / {{ d.totalCapacityHours }}h capacity</span>
                <span>{{ d.totalActualHours }}h actual</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Employee Workload Monitoring Table (prd.md §4.4: monitoring view, not ranking) -->
      <div class="table-card glass-card">
        <div class="table-header">
          <div>
            <h3 class="table-title">Employee Workload Directory</h3>
            <p class="table-subtitle">Operational monitoring view. Click any row to view individual profile details.</p>
          </div>
          <span v-if="selectedRiskFilter !== 'ALL'" class="active-filter-badge">
            Filtered by: {{ selectedRiskFilter }} Load ({{ filteredGroupMembers.length }} employees)
          </span>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Department</th>
                <th>Weekly Cap</th>
                <th>Planned</th>
                <th>Actual</th>
                <th>Planned Util %</th>
                <th>Active</th>
                <th>Overdue</th>
                <th>Workload Risk</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="m in filteredGroupMembers"
                :key="m.userId || m.user?.id"
                class="clickable-row"
                @click="navigateToEmployee(m.userId || m.user?.id)"
              >
                <td class="emp-name-cell">
                  <strong>{{ m.user?.name || m.name }}</strong>
                  <span class="emp-username">@{{ m.user?.username || m.username }}</span>
                </td>
                <td><RoleBadge :role="m.user?.role || m.role" /></td>
                <td>{{ m.user?.department?.name || 'Group' }}</td>
                <td class="font-mono">{{ m.capacityHours }}h</td>
                <td class="font-mono">{{ m.plannedHours }}h</td>
                <td class="font-mono">{{ m.actualHours }}h</td>
                <td class="font-mono font-bold">{{ m.plannedUtilizationPct }}%</td>
                <td>{{ m.activeTicketCount }}</td>
                <td :class="{ 'text-danger font-bold': m.overdueTicketCount > 0 }">{{ m.overdueTicketCount }}</td>
                <td>
                  <span
                    class="risk-chip"
                    :class="`risk-${(m.riskLevel || 'NORMAL').toLowerCase()}`"
                  >
                    {{ m.riskLabel || m.riskLevel }}
                  </span>
                </td>
              </tr>
              <tr v-if="filteredGroupMembers.length === 0">
                <td colspan="10" class="empty-table-cell">
                  No employees match the selected criteria.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ============================================== -->
    <!-- ROLE 2: DEPARTMENT HEAD DASHBOARD (prd.md §4.4) -->
    <!-- ============================================== -->
    <template v-else-if="authStore.isDepartmentHead && deptData">
      <!-- Dept Alerts -->
      <div v-if="deptData.overdueTickets > 0 || sustainedAlerts.length > 0" class="alerts-container">
        <div v-if="deptData.overdueTickets > 0" class="alert-box alert-warning">
          <AlertTriangle :size="18" class="alert-icon" />
          <div class="alert-text">
            <strong>{{ deptData.overdueTickets }} ticket(s) are overdue</strong> in {{ deptData.department?.name }} department.
          </div>
        </div>
      </div>

      <!-- Scoped KPI Cards -->
      <div class="kpi-grid">
        <KpiCard
          label="Team Tickets"
          :value="deptData.totalTickets"
          subnote="Department total"
          variant="blue"
        >
          <template #icon><CheckSquare :size="18" /></template>
        </KpiCard>

        <KpiCard
          label="Active Tickets"
          :value="deptData.activeTickets"
          subnote="In progress / in queue"
          variant="cyan"
        >
          <template #icon><Clock :size="18" /></template>
        </KpiCard>

        <KpiCard
          label="Completed"
          :value="deptData.completedTickets"
          subnote="Tickets marked Done"
          variant="emerald"
        >
          <template #icon><CheckCircle2 :size="18" /></template>
        </KpiCard>

        <KpiCard
          label="Overdue Tickets"
          :value="deptData.overdueTickets"
          subnote="Past target date"
          variant="rose"
        >
          <template #icon><AlertTriangle :size="18" /></template>
        </KpiCard>

        <KpiCard
          label="Planned Workload"
          :value="`${deptData.totalPlannedHours}h`"
          subnote="Tickets due this week"
          variant="blue"
        >
          <template #icon><Calendar :size="18" /></template>
        </KpiCard>

        <KpiCard
          label="Actual Tracked"
          :value="`${deptData.totalActualHours}h`"
          subnote="Sum of team sessions"
          variant="purple"
        >
          <template #icon><Clock :size="18" /></template>
        </KpiCard>

        <KpiCard
          label="Team Capacity"
          :value="`${deptData.totalCapacityHours}h`"
          subnote="Sum of member weekly hours"
          variant="emerald"
        >
          <template #icon><Users :size="18" /></template>
        </KpiCard>

        <KpiCard
          label="Planned Utilization"
          :value="`${deptData.plannedUtilizationPct}%`"
          :subnote="`Team Status: ${deptData.riskLabel}`"
          :variant="deptData.plannedUtilizationPct > 100 ? 'rose' : deptData.plannedUtilizationPct >= 80 ? 'amber' : 'emerald'"
        >
          <template #icon><Layers :size="18" /></template>
        </KpiCard>
      </div>

      <!-- Charts Grid -->
      <div class="charts-grid-2">
        <div class="chart-card glass-card">
          <div class="chart-header">
            <h3 class="chart-title">Team Workload Distribution</h3>
            <span class="chart-subtitle">Planned vs Actual Tracked for {{ deptData.department?.name }}</span>
          </div>
          <GroupedBarChart
            :labels="deptData.members.map(m => m.user?.name || m.name)"
            :datasets="[
              {
                label: 'Planned (h)',
                data: deptData.members.map(m => m.plannedHours),
                backgroundColor: 'rgba(56, 189, 248, 0.75)',
                borderRadius: 6
              },
              {
                label: 'Actual Tracked (h)',
                data: deptData.members.map(m => m.actualHours),
                backgroundColor: 'rgba(168, 85, 247, 0.75)',
                borderRadius: 6
              }
            ]"
            :height="240"
            y-axis-label="Hours"
          />
        </div>

        <div class="chart-card glass-card">
          <div class="chart-header">
            <h3 class="chart-title">4-Week Department Trend</h3>
            <span class="chart-subtitle">Trajectory over last month</span>
          </div>
          <LineTrendChart
            :labels="trendChartLabels"
            :datasets="trendChartDatasets"
            :height="240"
            y-axis-label="Hours"
          />
        </div>
      </div>

      <!-- Team Members Workload Table -->
      <div class="table-card glass-card">
        <div class="table-header">
          <div>
            <h3 class="table-title">Team Member Workload</h3>
            <p class="table-subtitle">Click member name to review personal work history.</p>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Weekly Hours</th>
                <th>Planned</th>
                <th>Actual</th>
                <th>Planned Util %</th>
                <th>Active</th>
                <th>Overdue</th>
                <th>Workload Risk</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="m in deptData.members"
                :key="m.userId || m.user?.id"
                class="clickable-row"
                @click="navigateToEmployee(m.userId || m.user?.id)"
              >
                <td><strong>{{ m.user?.name || m.name }}</strong></td>
                <td><RoleBadge :role="m.user?.role || m.role" /></td>
                <td class="font-mono">{{ m.capacityHours }}h</td>
                <td class="font-mono">{{ m.plannedHours }}h</td>
                <td class="font-mono">{{ m.actualHours }}h</td>
                <td class="font-mono font-bold">{{ m.plannedUtilizationPct }}%</td>
                <td>{{ m.activeTicketCount }}</td>
                <td :class="{ 'text-danger font-bold': m.overdueTicketCount > 0 }">{{ m.overdueTicketCount }}</td>
                <td>
                  <span class="risk-chip" :class="`risk-${(m.riskLevel || 'NORMAL').toLowerCase()}`">
                    {{ m.riskLabel || m.riskLevel }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ============================================== -->
    <!-- ROLE 3: MEMBER PERSONAL DASHBOARD (prd.md §4.4) -->
    <!-- ============================================== -->
    <template v-else-if="memberData">
      <!-- Personal Workload Risk Card with Mandatory Disclaimer -->
      <WorkloadRiskCard
        :workload="memberData"
        title="My Workload & Capacity Snapshot"
        :show-disclaimer="true"
      />

      <!-- This-Week Snapshot KPI Grid -->
      <div class="kpi-grid">
        <KpiCard
          label="Weekly Capacity"
          :value="`${memberData.capacityHours}h`"
          subnote="Configured working hours"
          variant="emerald"
        >
          <template #icon><Clock :size="18" /></template>
        </KpiCard>

        <KpiCard
          label="Planned Workload"
          :value="`${memberData.plannedHours}h`"
          subnote="Tickets due this week"
          variant="blue"
        >
          <template #icon><Calendar :size="18" /></template>
        </KpiCard>

        <KpiCard
          label="Actual Tracked"
          :value="`${memberData.actualHours}h`"
          :subnote="`${memberData.actualUtilizationPct}% of capacity`"
          variant="purple"
        >
          <template #icon><Clock :size="18" /></template>
        </KpiCard>

        <KpiCard
          label="Remaining Capacity"
          :value="`${memberData.remainingCapacityHours}h`"
          subnote="Free capacity buffer"
          :variant="memberData.remainingCapacityHours < 0 ? 'rose' : 'cyan'"
        >
          <template #icon><Layers :size="18" /></template>
        </KpiCard>

        <KpiCard
          label="Active Tasks"
          :value="memberData.activeTicketCount"
          subnote="In queue / in progress"
          variant="blue"
        >
          <template #icon><CheckSquare :size="18" /></template>
        </KpiCard>

        <KpiCard
          label="Overdue Tasks"
          :value="memberData.overdueTicketCount"
          subnote="Requires attention"
          variant="rose"
        >
          <template #icon><AlertTriangle :size="18" /></template>
        </KpiCard>
      </div>

      <!-- My Active Tickets List -->
      <div class="table-card glass-card">
        <div class="table-header">
          <div>
            <h3 class="table-title">My Active Tasks ({{ memberActiveTickets.length }})</h3>
            <p class="table-subtitle">Tasks assigned to you requiring action</p>
          </div>
          <button class="btn btn-primary btn-sm" @click="router.push('/tickets/new')">
            <Plus :size="14" />
            <span>New Task</span>
          </button>
        </div>

        <div class="tasks-compact-list">
          <div
            v-for="t in memberActiveTickets"
            :key="t.id"
            class="task-row clickable-row"
            @click="openTicket(t.id)"
          >
            <div class="t-left">
              <span class="t-num font-mono">{{ t.ticketNumber }}</span>
              <div class="t-details">
                <span class="t-title">{{ t.title }}</span>
                <span class="t-meta">Due: {{ new Date(t.dueDate).toLocaleDateString() }} • Est: {{ t.estimatedMinutes }}m</span>
              </div>
            </div>

            <div class="t-right">
              <PriorityBadge :priority="t.priority" />
              <StatusBadge :status="t.status" />
              <ArrowUpRight :size="16" class="icon-nav" />
            </div>
          </div>

          <div v-if="memberActiveTickets.length === 0" class="empty-tasks">
            <CheckCircle2 :size="28" class="text-emerald" />
            <p>You have no active tasks currently in your queue. Great job!</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.dashboard-header {
  padding: 1.5rem 1.75rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1.5rem;
  background: #ffffff;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
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
  background: #f1f5f9;
  border: 1px solid var(--border-subtle);
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

/* Alerts */
.alerts-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.alert-box {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
}

.alert-warning {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  color: #fbbf24;
}

.alert-danger {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #f87171;
}

.alert-text {
  color: var(--text-primary);
  line-height: 1.4;
}

.names-list {
  color: #f87171;
  font-weight: 600;
}

/* Filter Bar */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 0.85rem 1.25rem;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.825rem;
  color: var(--text-secondary);
}

.filter-select {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 0.825rem;
  padding: 0.35rem 0.75rem;
  outline: none;
}

.btn-reset-filters {
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--bsi-teal-dark);
  font-size: 0.775rem;
  font-weight: 600;
  padding: 0.35rem 0.75rem;
  cursor: pointer;
}

.btn-reset-filters:hover {
  background: var(--bsi-teal-light);
  border-color: var(--bsi-teal);
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

/* Risk Overview Tiles */
.risk-overview-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
}

.section-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.risk-tiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.risk-tile {
  padding: 1.15rem 1.25rem;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  box-shadow: var(--shadow-sm);
}

.risk-tile:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.risk-tile.active {
  box-shadow: 0 0 0 2px currentColor;
}

.tile-normal {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #15803d;
}
.tile-normal.active {
  border-color: #15803d;
}

.tile-high {
  background: var(--bsi-gold-light);
  border-color: rgba(240, 180, 60, 0.4);
  color: #b47806;
}
.tile-high.active {
  border-color: #b47806;
}

.tile-over {
  background: #fff7ed;
  border-color: #fed7aa;
  color: #c2410c;
}
.tile-over.active {
  border-color: #c2410c;
}

.tile-extreme {
  background: #fef2f2;
  border-color: #fecaca;
  color: #b91c1c;
}
.tile-extreme.active {
  border-color: #b91c1c;
}

.tile-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.tile-count {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-primary);
}

.tile-desc {
  font-size: 0.725rem;
  color: var(--text-muted);
}

/* Charts Grid */
.charts-grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.25rem;
}

.chart-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.chart-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.chart-subtitle {
  font-size: 0.775rem;
  color: var(--text-muted);
  margin-top: 0.2rem;
}

/* Dept Progress Bars */
.dept-progress-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.dept-progress-item {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.dp-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  font-weight: 600;
}

.dp-name { color: var(--text-primary); }
.dp-util { color: var(--text-secondary); }

.dp-track {
  height: 8px;
  background: #e2e8f0;
  border-radius: var(--radius-full);
  overflow: hidden;
}

.dp-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.4s ease;
}

.dp-footer {
  display: flex;
  justify-content: space-between;
  font-size: 0.725rem;
  color: var(--text-muted);
}

/* Table Card */
.table-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.table-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
}

.table-subtitle {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 0.2rem;
}

.active-filter-badge {
  font-size: 0.775rem;
  padding: 0.25rem 0.65rem;
  border-radius: var(--radius-full);
  background: var(--bsi-teal-light);
  color: var(--bsi-teal-dark);
  border: 1px solid rgba(0, 160, 160, 0.35);
  font-weight: 600;
}

.table-responsive {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.data-table th {
  text-align: left;
  padding: 0.6rem 0.75rem;
  font-size: 0.725rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border-color);
  background: #f8fafc;
}

.data-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-secondary);
}

.clickable-row {
  cursor: pointer;
  transition: background 0.15s ease;
}

.clickable-row:hover {
  background: var(--bg-surface-hover);
}

.emp-name-cell {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.emp-name-cell strong {
  color: var(--text-primary);
}

.emp-username {
  font-size: 0.725rem;
  color: var(--text-muted);
}

.risk-chip {
  font-size: 0.725rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-full);
}

.risk-normal { background: #dcfce7; color: #15803d; }
.risk-high { background: var(--bsi-gold-light); color: #b47806; }
.risk-over { background: #ffedd5; color: #c2410c; }
.risk-extreme { background: #fee2e2; color: #b91c1c; }

.empty-table-cell {
  text-align: center;
  padding: 2.5rem;
  color: var(--text-muted);
}

/* Compact Tasks List for Member */
.tasks-compact-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.task-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.85rem 1.15rem;
  background: #ffffff;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: all 0.15s ease;
}

.task-row:hover {
  border-color: var(--bsi-teal);
  background: #f8fafc;
}

.t-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.t-num {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  width: 60px;
}

.t-details {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.t-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.t-meta {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.t-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.icon-nav {
  color: var(--text-muted);
  transition: transform 0.15s ease;
}

.task-row:hover .icon-nav {
  transform: translate(2px, -2px);
  color: var(--accent-cyan);
}

.empty-tasks {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 3rem 1rem;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 5rem 2rem;
  color: var(--text-muted);
}

.icon-cyan {
  color: var(--accent-cyan);
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: stretch;
    padding: 1.25rem 1rem;
    gap: 1.25rem;
  }

  .header-topline {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .page-title {
    font-size: 1.3rem;
  }

  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .risk-tiles-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .charts-grid-2 {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .chart-card {
    padding: 1.25rem 1rem;
  }

  .table-card {
    padding: 1.25rem 1rem;
  }

  .table-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .task-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.85rem;
    padding: 1rem;
  }

  .t-right {
    width: 100%;
    justify-content: space-between;
  }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
    padding: 1rem;
  }

  .filter-item {
    width: 100%;
    justify-content: space-between;
  }

  .filter-select {
    flex: 1;
    max-width: 220px;
  }
}

@media (max-width: 480px) {
  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .risk-tiles-grid {
    grid-template-columns: 1fr;
  }
}
</style>
