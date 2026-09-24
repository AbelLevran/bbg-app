<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useWorkloadStore } from '@/stores/workload';
import { reportsApi } from '@/api/reports';
import WeekSelector from '@/components/common/WeekSelector.vue';
import {
  FileBarChart,
  Building2,
  Users,
  Download,
  Search,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Loader2
} from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();
const workloadStore = useWorkloadStore();

const activeTab = ref('weekly'); // 'weekly' | 'department'
const selectedWeek = ref(workloadStore.selectedWeek);
const searchQuery = ref('');
const loading = ref(true);
const isExporting = ref(false);
const errorMsg = ref('');

const weeklyData = ref([]);
const departmentData = ref([]);

onMounted(async () => {
  await loadReports();
});

watch(selectedWeek, async (newWeek) => {
  workloadStore.setSelectedWeek(newWeek);
  await loadReports();
});

async function loadReports() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const [weeklyRes, deptRes] = await Promise.all([
      reportsApi.getWeeklyWorkload(selectedWeek.value),
      reportsApi.getDepartmentReport(selectedWeek.value)
    ]);
    weeklyData.value = weeklyRes.rows || [];
    departmentData.value = deptRes.rows || [];
  } catch (err) {
    console.error('Failed to load reports:', err);
    errorMsg.value = err.message || 'Unable to load report data';
  } finally {
    loading.value = false;
  }
}

// Filtered weekly workload rows
const filteredWeeklyRows = computed(() => {
  if (!searchQuery.value) return weeklyData.value;
  const q = searchQuery.value.toLowerCase();
  return weeklyData.value.filter(
    r =>
      r.employee?.toLowerCase().includes(q) ||
      r.department?.toLowerCase().includes(q) ||
      r.role?.toLowerCase().includes(q)
  );
});

// Filtered department rows
const filteredDeptRows = computed(() => {
  if (!searchQuery.value) return departmentData.value;
  const q = searchQuery.value.toLowerCase();
  return departmentData.value.filter(r => r.department?.toLowerCase().includes(q));
});

function navigateToEmployee(userId) {
  if (userId) {
    router.push(`/employees/${userId}`);
  }
}

function getUtilizationClass(rate) {
  if (rate == null) return 'badge-neutral';
  if (rate > 115) return 'badge-danger';
  if (rate >= 100) return 'badge-warning';
  if (rate >= 70) return 'badge-success';
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

function formatRole(role) {
  if (role === 'HEAD_GROUP') return 'Head Group';
  if (role === 'DEPARTMENT_HEAD') return 'Dept Head';
  if (role === 'MEMBER') return 'Member';
  return role || '—';
}

async function exportCsv() {
  if (isExporting.value) return;
  isExporting.value = true;
  try {
    const isWeekly = activeTab.value === 'weekly';
    const endpoint = isWeekly
      ? reportsApi.getWeeklyWorkloadCsvUrl(selectedWeek.value)
      : reportsApi.getDepartmentCsvUrl(selectedWeek.value);

    const filename = isWeekly
      ? `weekly-workload-${selectedWeek.value}.csv`
      : `department-report-${selectedWeek.value}.csv`;

    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  } catch (err) {
    console.error('CSV export failed:', err);
    alert('Failed to export CSV: ' + err.message);
  } finally {
    isExporting.value = false;
  }
}
</script>

<template>
  <div class="reports-view">
    <!-- Top Header -->
    <div class="view-header">
      <div class="header-info">
        <h1 class="page-title">Executive Reports</h1>
        <p class="page-desc">
          Official group capacity summaries, workload distributions, and raw CSV exports (Head Group Exclusive)
        </p>
      </div>

      <div class="header-actions">
        <WeekSelector v-model="selectedWeek" />
        <button
          class="btn btn-primary"
          :disabled="isExporting || loading"
          @click="exportCsv"
        >
          <Loader2 v-if="isExporting" :size="16" class="spin" />
          <Download v-else :size="16" />
          <span>Export {{ activeTab === 'weekly' ? 'Workload' : 'Department' }} CSV</span>
        </button>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="errorMsg" class="error-banner">
      <AlertTriangle :size="18" />
      <span>{{ errorMsg }}</span>
    </div>

    <!-- Controls Bar: Tabs & Search Filter -->
    <div class="controls-card glass-card">
      <div class="tab-pills">
        <button
          class="tab-pill"
          :class="{ active: activeTab === 'weekly' }"
          @click="activeTab = 'weekly'"
        >
          <Users :size="16" />
          <span>Weekly Workload Report</span>
          <span class="count-tag">{{ weeklyData.length }}</span>
        </button>

        <button
          class="tab-pill"
          :class="{ active: activeTab === 'department' }"
          @click="activeTab = 'department'"
        >
          <Building2 :size="16" />
          <span>Department Report</span>
          <span class="count-tag">{{ departmentData.length }}</span>
        </button>
      </div>

      <div class="search-wrap">
        <Search :size="16" class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Filter by name, department, role..."
          class="search-input"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state glass-card">
      <Loader2 :size="32" class="spin text-primary" />
      <p>Generating reports for week of {{ selectedWeek }}...</p>
    </div>

    <!-- Tab 1: Weekly Workload Report Table -->
    <div v-else-if="activeTab === 'weekly'" class="table-container glass-card">
      <div class="table-header-meta">
        <div>
          <h2 class="table-title">Weekly Individual Workload Summary</h2>
          <p class="table-subtitle">Click on any employee row to open their complete individual profile and risk history.</p>
        </div>
        <span class="meta-tag">Week: {{ selectedWeek }}</span>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Role</th>
              <th>Dept</th>
              <th class="num-col">Capacity</th>
              <th class="num-col">Planned</th>
              <th class="num-col">Actual</th>
              <th class="center-col">Planned Util</th>
              <th class="center-col">Actual Util</th>
              <th class="num-col">Active</th>
              <th class="num-col">Overdue</th>
              <th class="center-col">Workload Risk</th>
              <th class="action-col"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in filteredWeeklyRows"
              :key="row.userId"
              class="clickable-row"
              @click="navigateToEmployee(row.userId)"
            >
              <td class="font-medium text-primary-link">
                {{ row.employee }}
                <span class="text-subtle">(@{{ row.username }})</span>
              </td>
              <td>{{ formatRole(row.role) }}</td>
              <td>
                <span class="dept-badge">{{ row.department }}</span>
              </td>
              <td class="num-col font-mono">{{ row.capacityHours }}h</td>
              <td class="num-col font-mono">{{ row.plannedHours }}h</td>
              <td class="num-col font-mono">{{ row.actualHours }}h</td>
              <td class="center-col">
                <span class="util-badge" :class="getUtilizationClass(row.plannedUtilization)">
                  {{ row.plannedUtilization }}%
                </span>
              </td>
              <td class="center-col">
                <span class="util-badge" :class="getUtilizationClass(row.actualUtilization)">
                  {{ row.actualUtilization }}%
                </span>
              </td>
              <td class="num-col font-mono font-medium">{{ row.activeTickets }}</td>
              <td class="num-col font-mono" :class="{ 'text-danger font-bold': row.overdue > 0 }">
                {{ row.overdue }}
              </td>
              <td class="center-col">
                <span class="risk-badge" :class="getRiskBadgeClass(row.workloadRisk)">
                  {{ row.workloadRisk?.replace('_', ' ') }}
                </span>
              </td>
              <td class="action-col">
                <ExternalLink :size="14" class="row-arrow" />
              </td>
            </tr>

            <tr v-if="filteredWeeklyRows.length === 0">
              <td colspan="12" class="empty-table-cell">
                No employee records match the filter criteria for this week.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab 2: Department Report Table -->
    <div v-else-if="activeTab === 'department'" class="table-container glass-card">
      <div class="table-header-meta">
        <div>
          <h2 class="table-title">Department Aggregate Performance & Capacity</h2>
          <p class="table-subtitle">Consolidated operational metrics, ticket throughput, and departmental capacity utilization.</p>
        </div>
        <span class="meta-tag">Week: {{ selectedWeek }}</span>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Department</th>
              <th class="num-col">Members</th>
              <th class="num-col">Total Tickets</th>
              <th class="num-col">Completed</th>
              <th class="num-col">Active</th>
              <th class="num-col">Overdue</th>
              <th class="num-col">Planned (h)</th>
              <th class="num-col">Actual (h)</th>
              <th class="num-col">Capacity (h)</th>
              <th class="center-col">Utilization %</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredDeptRows" :key="row.departmentId">
              <td class="font-bold text-primary">
                {{ row.department }}
              </td>
              <td class="num-col font-mono">{{ row.memberCount }}</td>
              <td class="num-col font-mono font-medium">{{ row.totalTickets }}</td>
              <td class="num-col font-mono text-success">{{ row.completed }}</td>
              <td class="num-col font-mono">{{ row.active }}</td>
              <td class="num-col font-mono" :class="{ 'text-danger font-bold': row.overdue > 0 }">
                {{ row.overdue }}
              </td>
              <td class="num-col font-mono">{{ row.plannedHours }}h</td>
              <td class="num-col font-mono">{{ row.actualHours }}h</td>
              <td class="num-col font-mono font-medium">{{ row.capacityHours }}h</td>
              <td class="center-col">
                <span class="util-badge" :class="getUtilizationClass(row.utilization)">
                  {{ row.utilization }}%
                </span>
              </td>
            </tr>

            <tr v-if="filteredDeptRows.length === 0">
              <td colspan="10" class="empty-table-cell">
                No department records found for this week.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reports-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.page-title {
  font-size: 1.625rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.page-desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.controls-card {
  padding: 0.875rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.tab-pills {
  display: flex;
  gap: 0.5rem;
}

.tab-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md, 8px);
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-pill:hover {
  background: var(--bg-hover, rgba(255, 255, 255, 0.05));
  color: var(--text-primary);
}

.tab-pill.active {
  background: var(--primary-color, #2563eb);
  color: #ffffff;
}

.count-tag {
  background: rgba(255, 255, 255, 0.2);
  color: inherit;
  padding: 0.1rem 0.45rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
}

.tab-pill:not(.active) .count-tag {
  background: var(--bg-subtle, #f1f5f9);
  color: var(--text-secondary);
}

.search-wrap {
  position: relative;
  min-width: 280px;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2.25rem;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 0.875rem;
  outline: none;
}

.search-input:focus {
  border-color: var(--primary-color, #2563eb);
}

.table-container {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.table-header-meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.table-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
}

.table-subtitle {
  font-size: 0.815rem;
  color: var(--text-secondary);
  margin-top: 0.15rem;
}

.meta-tag {
  background: var(--bg-subtle, #f1f5f9);
  color: var(--text-secondary);
  padding: 0.25rem 0.65rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
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
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--border-subtle, #f1f5f9);
  color: var(--text-primary);
  white-space: nowrap;
}

.clickable-row {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.clickable-row:hover {
  background: var(--bg-hover, rgba(37, 99, 235, 0.04));
}

.text-primary-link {
  color: var(--primary-color, #2563eb);
}

.text-subtle {
  color: var(--text-secondary);
  font-size: 0.8rem;
  margin-left: 0.25rem;
}

.dept-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  background: var(--bg-subtle, #f1f5f9);
  color: var(--text-secondary);
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.num-col {
  text-align: right;
}

.center-col {
  text-align: center;
}

.action-col {
  width: 36px;
  text-align: center;
}

.row-arrow {
  color: var(--text-secondary);
  opacity: 0.4;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.clickable-row:hover .row-arrow {
  opacity: 1;
  transform: translateX(2px);
  color: var(--primary-color, #2563eb);
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

.text-danger {
  color: #dc2626;
}

.text-success {
  color: #16a34a;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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

.empty-table-cell {
  text-align: center;
  padding: 3rem 1rem !important;
  color: var(--text-secondary);
  font-style: italic;
}

.error-banner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md, 8px);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .view-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .header-actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }
  .controls-card {
    flex-direction: column;
    align-items: stretch;
  }
  .search-wrap {
    min-width: 100%;
  }
}
</style>
