<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import RoleBadge from '@/components/common/RoleBadge.vue';
import UserCapacityInput from './UserCapacityInput.vue';
import GroupedBarChart from '@/components/charts/GroupedBarChart.vue';
import { Users, Clock, AlertTriangle, ArrowUpRight } from 'lucide-vue-next';

const props = defineProps({
  dept: {
    type: Object,
    required: true
  },
  week: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['capacityChanged']);

const router = useRouter();

const members = computed(() => props.dept.members || []);

// Chart data: Member Weekly Hours vs Actual Tracked This Week
const memberChartLabels = computed(() =>
  members.value.map(m => m.user?.name || m.name || 'Member')
);

const memberChartDatasets = computed(() => [
  {
    label: 'Weekly Hours (Cap)',
    data: members.value.map(m => m.capacityHours || (m.capacityMinutes / 60) || 40),
    backgroundColor: 'rgba(56, 189, 248, 0.75)',
    borderRadius: 4
  },
  {
    label: 'Actual Tracked',
    data: members.value.map(m => m.actualHours || Number(((m.actualMinutes || 0) / 60).toFixed(1))),
    backgroundColor: 'rgba(168, 85, 247, 0.75)',
    borderRadius: 4
  }
]);

// Risk badge styling
function getRiskBadgeClass(level) {
  switch (level) {
    case 'EXTREME': return 'badge-extreme';
    case 'OVER': return 'badge-over';
    case 'HIGH': return 'badge-high';
    default: return 'badge-normal';
  }
}

function handleCapacitySaved() {
  emit('capacityChanged');
}

function navigateToEmployee(userId) {
  router.push(`/employees/${userId}`);
}
</script>

<template>
  <div class="dept-workload-card glass-card">
    <!-- Header -->
    <div class="card-header">
      <div class="dept-title-group">
        <h3 class="dept-name">{{ dept.department?.name || dept.name }} Department</h3>
        <span class="member-count-tag">
          <Users :size="13" />
          {{ members.length }} members
        </span>
      </div>

      <div class="header-right">
        <span class="risk-badge" :class="getRiskBadgeClass(dept.riskLevel)">
          {{ dept.riskLabel || dept.riskLevel }}
        </span>
      </div>
    </div>

    <!-- Progress Bar (Burnout Tracker uses actual_utilization per design.md §7.2) -->
    <div class="progress-wrap">
      <div class="progress-labels">
        <span class="p-label">Actual Tracked vs Weekly Hours</span>
        <span class="p-value">{{ dept.actualUtilizationPct }}% Status</span>
      </div>
      <div class="progress-track">
        <div
          class="progress-fill"
          :class="getRiskBadgeClass(dept.riskLevel)"
          :style="{ width: `${Math.min(100, dept.actualUtilizationPct)}%` }"
        />
      </div>
    </div>

    <!-- Dept Metrics Row -->
    <div class="metrics-strip">
      <div class="m-item">
        <span class="m-label">Sum of Weekly Hours</span>
        <span class="m-val">{{ dept.totalCapacityHours }}h</span>
      </div>
      <div class="m-item">
        <span class="m-label">Sum of Actual Tracked</span>
        <span class="m-val">{{ dept.totalActualHours }}h</span>
      </div>
      <div class="m-item">
        <span class="m-label">Actual Utilization</span>
        <span class="m-val font-mono">{{ dept.actualUtilizationPct }}%</span>
      </div>
      <div class="m-item" v-if="dept.overdueTickets > 0">
        <span class="m-label">Overdue Tickets</span>
        <span class="m-val text-danger">
          <AlertTriangle :size="14" class="inline-icon" />
          {{ dept.overdueTickets }}
        </span>
      </div>
    </div>

    <!-- Member Weekly Hours vs Actual Chart -->
    <div class="member-chart-section">
      <h4 class="section-title">Team Member Workload Distribution</h4>
      <GroupedBarChart
        :labels="memberChartLabels"
        :datasets="memberChartDatasets"
        :height="180"
        y-axis-label="Hours"
      />
    </div>

    <!-- Member Table with Editable Weekly Hours -->
    <div class="member-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Member</th>
            <th>Role</th>
            <th>Weekly Hours (Editable)</th>
            <th>Actual This Week</th>
            <th>Status %</th>
            <th>Workload Risk</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in members" :key="m.userId || m.user?.id">
            <td class="name-cell">
              <span class="emp-link" @click="navigateToEmployee(m.userId || m.user?.id)">
                <strong>{{ m.user?.name || m.name }}</strong>
                <ArrowUpRight :size="13" class="link-icon" />
              </span>
              <span class="emp-user">@{{ m.user?.username || m.username }}</span>
            </td>
            <td>
              <RoleBadge :role="m.user?.role || m.role" />
            </td>
            <td>
              <UserCapacityInput
                :user-id="m.userId || m.user?.id"
                :user-department-id="dept.department?.id || dept.id"
                :initial-text="m.capacityRawText || `${m.capacityHours || 40}h`"
                :week="week"
                @saved="handleCapacitySaved"
              />
            </td>
            <td class="font-mono">
              {{ m.actualHours }}h
            </td>
            <td class="font-mono font-bold">
              {{ m.actualUtilizationPct }}%
            </td>
            <td>
              <span class="risk-pill" :class="getRiskBadgeClass(m.riskLevel)">
                {{ m.riskLabel || m.riskLevel }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.dept-workload-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dept-title-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.dept-name {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary);
}

.member-count-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
}

.risk-badge {
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.3rem 0.75rem;
  border-radius: var(--radius-full);
}

.badge-normal {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}
.badge-high {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
}
.badge-over {
  background: rgba(249, 115, 22, 0.15);
  color: #fb923c;
  border: 1px solid rgba(249, 115, 22, 0.3);
}
.badge-extreme {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

/* Progress */
.progress-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.775rem;
  font-weight: 600;
}

.p-label {
  color: var(--text-secondary);
}

.p-value {
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.progress-track {
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.4s ease;
}

.progress-fill.badge-normal { background: #10b981; }
.progress-fill.badge-high { background: #f59e0b; }
.progress-fill.badge-over { background: #f97316; }
.progress-fill.badge-extreme { background: #ef4444; }

/* Metrics Strip */
.metrics-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.m-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.m-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.m-val {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.text-danger {
  color: #f87171 !important;
}

.inline-icon {
  display: inline;
  vertical-align: middle;
  margin-right: 0.2rem;
}

/* Chart */
.member-chart-section {
  padding-top: 0.5rem;
}

.section-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}

/* Table */
.member-table-wrap {
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

.name-cell {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.emp-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--text-primary);
  cursor: pointer;
  transition: color 0.15s ease;
}

.emp-link:hover {
  color: var(--accent-cyan);
}

.link-icon {
  opacity: 0.6;
}

.emp-user {
  font-size: 0.725rem;
  color: var(--text-muted);
}

.font-mono {
  font-family: var(--font-mono);
}

.font-bold {
  font-weight: 700;
}

.risk-pill {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-full);
  display: inline-block;
}
</style>
