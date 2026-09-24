<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useWorkloadStore } from '@/stores/workload';
import WeekSelector from '@/components/common/WeekSelector.vue';
import DeptWorkloadCard from '@/components/workload/DeptWorkloadCard.vue';
import GroupedBarChart from '@/components/charts/GroupedBarChart.vue';
import {
  Activity, Info, Building2, Users, AlertTriangle, Loader2
} from 'lucide-vue-next';

const authStore = useAuthStore();
const workloadStore = useWorkloadStore();

const selectedWeek = ref(workloadStore.selectedWeek);
const selectedDeptFilter = ref(''); // Head Group only filter
const groupData = ref(null);
const loading = ref(true);

onMounted(async () => {
  await loadTrackerData();
});

watch(selectedWeek, async (newWeek) => {
  workloadStore.setSelectedWeek(newWeek);
  await loadTrackerData();
});

async function loadTrackerData() {
  loading.value = true;
  try {
    const data = await workloadStore.fetchGroupWorkload(selectedWeek.value);
    groupData.value = data;
  } catch (err) {
    console.error('Failed to load burnout tracker data:', err);
  } finally {
    loading.value = false;
  }
}

// Filtered departments: Head Group can filter by dept; other roles always see all 4 depts
const displayedDepartments = computed(() => {
  if (!groupData.value?.departments) return [];
  if (authStore.isHeadGroup && selectedDeptFilter.value) {
    return groupData.value.departments.filter(
      d => (d.department?.id || d.id) === selectedDeptFilter.value
    );
  }
  return groupData.value.departments;
});

// Summary visualization: Weekly Hours (Capacity) vs Actual Tracked by Department
const deptSummaryLabels = computed(() =>
  (groupData.value?.departments || []).map(d => d.department?.name || d.name)
);

const deptSummaryDatasets = computed(() => [
  {
    label: 'Weekly Hours (Capacity)',
    data: (groupData.value?.departments || []).map(d => d.totalCapacityHours),
    backgroundColor: 'rgba(56, 189, 248, 0.75)',
    borderRadius: 6
  },
  {
    label: 'Actual Tracked (h)',
    data: (groupData.value?.departments || []).map(d => d.totalActualHours),
    backgroundColor: 'rgba(168, 85, 247, 0.75)',
    borderRadius: 6
  }
]);
</script>

<template>
  <div class="burnout-tracker-view">
    <!-- Header with Week Selector & Head Group Dept Filter -->
    <div class="view-header glass-card">
      <div class="header-info">
        <h1 class="page-title">Burnout Tracker</h1>
        <p class="page-desc">Transparent group-wide capacity, actual workload, and strain monitoring across all 4 departments</p>
      </div>

      <div class="header-actions">
        <!-- Department Filter: Head Group ONLY per prd.md §4.6 -->
        <div v-if="authStore.isHeadGroup" class="dept-filter-wrap">
          <label><Building2 :size="13" /> Department:</label>
          <select v-model="selectedDeptFilter" class="filter-select">
            <option value="">All 4 Departments</option>
            <option
              v-for="d in groupData?.departments || []"
              :key="d.department?.id || d.id"
              :value="d.department?.id || d.id"
            >
              {{ d.department?.name || d.name }}
            </option>
          </select>
        </div>

        <WeekSelector v-model="selectedWeek" />
      </div>
    </div>

    <!-- Mandatory Non-Diagnostic Disclaimer per prd.md §3.6 -->
    <div class="disclaimer-banner">
      <Info :size="18" class="disclaimer-icon" />
      <div class="disclaimer-text">
        <strong>System Workload Signal Notice:</strong>
        This workload indicator is derived purely from system operational data (assigned tickets, estimates, tracked timer hours, active tickets, overdue work). It is a workflow coordination signal, <em>not</em> a medical diagnosis or employee performance score.
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !groupData" class="loading-state">
      <Loader2 :size="28" class="spinning icon-cyan" />
      <span>Loading Burnout Tracker data across all departments...</span>
    </div>

    <template v-else-if="groupData">
      <!-- Summary Chart: Weekly Hours vs Actual by Department (prd.md §4.6) -->
      <div class="summary-chart-card glass-card">
        <div class="chart-header">
          <div>
            <h3 class="chart-title">Weekly Working Hours vs Actual Tracked by Department</h3>
            <p class="chart-desc">Comparison of available team capacity against recorded effort across all departments</p>
          </div>
          <span class="font-mono text-cyan font-bold">
            Group Actual Utilization: {{ groupData.actualUtilizationPct }}%
          </span>
        </div>

        <GroupedBarChart
          :labels="deptSummaryLabels"
          :datasets="deptSummaryDatasets"
          :height="220"
          y-axis-label="Hours"
        />
      </div>

      <!-- Department Cards Grid (4 Cards, or filtered by Head Group) -->
      <div class="departments-grid">
        <DeptWorkloadCard
          v-for="dept in displayedDepartments"
          :key="dept.department?.id || dept.id"
          :dept="dept"
          :week="selectedWeek"
          @capacity-changed="loadTrackerData"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.burnout-tracker-view {
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
  flex-wrap: wrap;
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.dept-filter-wrap {
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

/* Disclaimer Banner */
.disclaimer-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: var(--bsi-teal-light);
  border: 1px solid rgba(0, 160, 160, 0.25);
  border-radius: var(--radius-md);
}

.disclaimer-icon {
  color: var(--bsi-teal);
  flex-shrink: 0;
  margin-top: 0.15rem;
}

.disclaimer-text {
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.disclaimer-text strong {
  color: var(--text-primary);
}

/* Summary Chart */
.summary-chart-card {
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
}

.chart-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 0.2rem;
}

.text-cyan {
  color: var(--bsi-teal-dark);
}

.font-bold {
  font-weight: 700;
}

/* Department Cards Grid */
.departments-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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
  color: var(--bsi-teal);
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
