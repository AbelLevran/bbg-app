<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useWorkloadStore } from '@/stores/workload';
import { useTicketsStore } from '@/stores/tickets';
import WeekSelector from '@/components/common/WeekSelector.vue';
import WorkloadRiskCard from '@/components/workload/WorkloadRiskCard.vue';
import LineTrendChart from '@/components/charts/LineTrendChart.vue';
import SingleBarChart from '@/components/charts/SingleBarChart.vue';
import TicketTable from '@/components/tickets/TicketTable.vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
import PriorityBadge from '@/components/common/PriorityBadge.vue';
import {
  Clock, Calendar, AlertTriangle, CheckSquare, Plus,
  Layers, ArrowUpRight, CheckCircle2, Loader2, Info
} from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();
const workloadStore = useWorkloadStore();
const ticketsStore = useTicketsStore();

const selectedWeek = ref(workloadStore.selectedWeek);
const workload = ref(workloadStore.userWorkload || null);
const trendData = ref(workloadStore.userTrend || []);
const dailyData = ref(workloadStore.userDaily || []);
const myTickets = ref((ticketsStore.list || []).filter(t => t.assignedTo?.id === authStore.user?.id));
const loading = ref(!workloadStore.userWorkload);

const activeTickets = computed(() =>
  myTickets.value.filter(t => ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'STUCK'].includes(t.status))
);

const overdueTickets = computed(() =>
  myTickets.value.filter(t => t.isOverdue || (t.dueDate && new Date(t.dueDate) < new Date() && !['DONE', 'CANCELLED'].includes(t.status)))
);

// Group time tracked this week by ticket
const timeTrackedByTicket = computed(() => {
  const map = {};
  for (const t of myTickets.value) {
    if (t.actualMinutes && t.actualMinutes > 0) {
      map[t.id] = {
        id: t.id,
        ticketNumber: t.ticketNumber,
        title: t.title,
        status: t.status,
        priority: t.priority,
        actualMinutes: t.actualMinutes,
        actualHours: Number((t.actualMinutes / 60).toFixed(1)),
        estimatedMinutes: t.estimatedMinutes
      };
    }
  }
  return Object.values(map).sort((a, b) => b.actualMinutes - a.actualMinutes);
});

onMounted(async () => {
  await loadMyWork();
});

watch(selectedWeek, async (newWeek) => {
  workloadStore.setSelectedWeek(newWeek);
  await loadMyWork();
});

async function loadMyWork(force = false) {
  if (!authStore.user) return;
  const week = selectedWeek.value;
  const userId = authStore.user.id;

  // Optimistic Cache Hit: render preloaded data instantly (0ms latency!)
  if (workloadStore.userWorkload) {
    workload.value = workloadStore.userWorkload;
    trendData.value = workloadStore.userTrend || [];
    dailyData.value = workloadStore.userDaily || [];
    myTickets.value = (ticketsStore.list || []).filter(t => t.assignedTo?.id === userId);
    loading.value = false;
    if (!force) return;
  } else {
    loading.value = true;
  }

  try {
    // Parallel fetch: personal workload, 4-week trend, daily breakdown, and tickets
    const [wl, trend, daily] = await Promise.all([
      workloadStore.fetchUserWorkload(userId, week),
      workloadStore.fetchUserTrend(userId, week, 4),
      workloadStore.fetchUserDaily(userId, week),
      ticketsStore.fetchTickets()
    ]);

    workload.value = wl;
    trendData.value = trend;
    dailyData.value = daily;
    myTickets.value = (ticketsStore.list || []).filter(t => t.assignedTo?.id === userId);
  } catch (err) {
    console.error('Failed to load My Work data:', err);
  } finally {
    loading.value = false;
  }
}

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

const dailyChartLabels = computed(() =>
  dailyData.value.map(d => d.day)
);
const dailyChartValues = computed(() =>
  dailyData.value.map(d => d.hours)
);

function openTicket(id) {
  router.push(`/tickets/${id}`);
}
</script>

<template>
  <div class="my-work-view">
    <!-- Header with Week Selector -->
    <div class="view-header glass-card">
      <div class="header-main">
        <h1 class="page-title">My Work</h1>
        <p class="page-desc">Personal workload summary, active assignments, and tracked hours</p>
      </div>
      <div class="header-controls">
        <WeekSelector v-model="selectedWeek" />
      </div>
    </div>

    <div v-if="loading && !workload" class="loading-state">
      <Loader2 :size="28" class="spinning icon-cyan" />
      <span>Loading your personal workspace...</span>
    </div>

    <template v-else-if="workload">
      <!-- 1. Personal Workload Risk Card with Mandatory Non-Diagnostic Disclaimer -->
      <WorkloadRiskCard
        :workload="workload"
        title="Weekly Capacity & Workload Status"
        :show-disclaimer="true"
      />

      <!-- 2. Charts Row: 4-Week Trend + Daily Distribution -->
      <div class="charts-grid">
        <div class="chart-card glass-card">
          <div class="chart-header">
            <h3 class="chart-title">4-Week Workload Trajectory</h3>
            <span class="chart-subtitle">Planned work vs tracked actuals vs weekly capacity</span>
          </div>
          <LineTrendChart
            :labels="trendChartLabels"
            :datasets="trendChartDatasets"
            :height="220"
            y-axis-label="Hours"
          />
        </div>

        <div class="chart-card glass-card">
          <div class="chart-header">
            <h3 class="chart-title">Daily Hours Logged (Current Week)</h3>
            <span class="chart-subtitle">Tracked effort Monday through Sunday</span>
          </div>
          <SingleBarChart
            :labels="dailyChartLabels"
            :data="dailyChartValues"
            label="Hours Tracked"
            :height="220"
            color="rgba(168, 85, 247, 0.8)"
          />
        </div>
      </div>

      <!-- 3. Overdue Tickets Table (if any exist) -->
      <div v-if="overdueTickets.length > 0" class="section-card glass-card alert-border">
        <div class="section-header">
          <div class="title-with-badge">
            <AlertTriangle :size="18" class="text-danger" />
            <h3 class="section-title">Overdue Tasks ({{ overdueTickets.length }})</h3>
          </div>
          <span class="badge-danger">Requires Immediate Attention</span>
        </div>

        <div class="table-responsive">
          <TicketTable
            :tickets="overdueTickets"
            @open="openTicket"
          />
        </div>
      </div>

      <!-- 4. Active Assigned Tickets Table -->
      <div class="section-card glass-card">
        <div class="section-header">
          <div>
            <h3 class="section-title">My Active Tasks ({{ activeTickets.length }})</h3>
            <p class="section-desc">Open tickets assigned to you in the current queue</p>
          </div>
          <button class="btn btn-primary btn-sm" @click="router.push('/tickets/new')">
            <Plus :size="14" />
            <span>New Task</span>
          </button>
        </div>

        <div class="table-responsive">
          <TicketTable
            :tickets="activeTickets"
            @open="openTicket"
          />
        </div>
      </div>

      <!-- 5. Time Tracked this Week (grouped by ticket) -->
      <div class="section-card glass-card">
        <div class="section-header">
          <div>
            <h3 class="section-title">Weekly Time Logged by Ticket</h3>
            <p class="section-desc">Summary of hours recorded across active and completed tickets this week</p>
          </div>
          <span class="total-tracked-chip font-mono">
            Total Tracked: {{ workload.actualHours }}h
          </span>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ticket #</th>
                <th>Task Title</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Estimated</th>
                <th>Time Logged</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in timeTrackedByTicket"
                :key="item.id"
                class="clickable-row"
                @click="openTicket(item.id)"
              >
                <td class="font-mono font-bold">{{ item.ticketNumber }}</td>
                <td>{{ item.title }}</td>
                <td><PriorityBadge :priority="item.priority" /></td>
                <td><StatusBadge :status="item.status" /></td>
                <td class="font-mono">{{ item.estimatedMinutes }}m</td>
                <td class="font-mono text-purple font-bold">
                  {{ Math.floor(item.actualMinutes / 60) }}h {{ String(item.actualMinutes % 60).padStart(2, '0') }}m
                </td>
                <td>
                  <button class="btn btn-outline btn-xs" @click.stop="openTicket(item.id)">
                    <span>Open</span>
                    <ArrowUpRight :size="12" />
                  </button>
                </td>
              </tr>
              <tr v-if="timeTrackedByTicket.length === 0">
                <td colspan="7" class="empty-table-cell">
                  No time sessions logged for the selected week.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.my-work-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.view-header {
  padding: 1.5rem 1.75rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1.5rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.page-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

/* Charts Grid */
.charts-grid {
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

/* Section Cards */
.section-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.alert-border {
  border-left: 4px solid #ef4444;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.title-with-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
}

.section-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 0.2rem;
}

.badge-danger {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.65rem;
  border-radius: var(--radius-full);
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.total-tracked-chip {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--accent-cyan);
  background: rgba(6, 182, 212, 0.1);
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid rgba(6, 182, 212, 0.25);
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
}

.data-table td {
  padding: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
}

.clickable-row {
  cursor: pointer;
  transition: background 0.15s ease;
}

.clickable-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.text-purple {
  color: #c084fc;
}

.text-danger {
  color: #f87171;
}

.empty-table-cell {
  text-align: center;
  padding: 2.5rem;
  color: var(--text-muted);
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
  .view-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
    padding: 1.25rem 1rem;
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }

  .section-card {
    padding: 1.25rem 1rem;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
}
</style>
