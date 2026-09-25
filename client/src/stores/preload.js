import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useTimerStore } from './timer.js';
import { useTicketsStore } from './tickets.js';
import { useOrgStore } from './org.js';
import { useWorkloadStore } from './workload.js';
import { reportsApi } from '@/api/reports.js';
import { eventsApi } from '@/api/events.js';

export const usePreloadStore = defineStore('preload', () => {
  const isWarmedUp = ref(false);
  const isPreloading = ref(false);
  const progress = ref(0);
  const statusMessage = ref('');
  const reportsCache = ref({
    weekly: {},
    department: {}
  });

  function getCachedReports(week) {
    return {
      weekly: reportsCache.value.weekly[week] || null,
      department: reportsCache.value.department[week] || null
    };
  }

  function setCachedReports(week, weekly, department) {
    if (weekly) reportsCache.value.weekly[week] = weekly;
    if (department) reportsCache.value.department[week] = department;
  }

  async function warmup(user) {
    if (!user) return;
    isPreloading.value = true;
    progress.value = 10;
    statusMessage.value = 'Initializing session & user profile...';

    const timerStore = useTimerStore();
    const ticketsStore = useTicketsStore();
    const orgStore = useOrgStore();
    const workloadStore = useWorkloadStore();
    const week = workloadStore.selectedWeek || new Date().toISOString().slice(0, 10);

    try {
      // ─── Phase 1: Core Navigation Data (Tickets, Active Timer, Departments) ───
      progress.value = 25;
      statusMessage.value = 'Syncing tickets, active timer & departments...';

      const phase1Promises = [
        timerStore.fetchActive().catch(() => {}),
        ticketsStore.fetchTickets().catch(() => {}),
        orgStore.fetchDepartments().catch(() => {}),
        eventsApi.getEvents().catch(() => [])
      ];

      await Promise.all(phase1Promises);

      // ─── Phase 2: Workload & Analytics Data ─────────────────────────────────
      progress.value = 60;
      statusMessage.value = 'Loading workload analytics & burnout metrics...';

      const phase2Promises = [];

      if (user.role === 'HEAD_GROUP') {
        phase2Promises.push(workloadStore.fetchGroupWorkload(week).catch(() => null));
        phase2Promises.push(workloadStore.fetchAlerts(week).catch(() => []));
        phase2Promises.push(workloadStore.fetchUserTrend(user.id, week, 4).catch(() => []));
        phase2Promises.push(workloadStore.fetchUserDaily(user.id, week).catch(() => []));
        // Pre-cache reports for HEAD_GROUP
        phase2Promises.push(
          reportsApi.getWeeklyWorkload(week).then(res => {
            if (res?.rows) reportsCache.value.weekly[week] = res.rows;
          }).catch(() => {})
        );
        phase2Promises.push(
          reportsApi.getDepartmentReport(week).then(res => {
            if (res?.rows) reportsCache.value.department[week] = res.rows;
          }).catch(() => {})
        );
      } else if (user.role === 'DEPARTMENT_HEAD') {
        if (user.departmentId) {
          phase2Promises.push(workloadStore.fetchDeptWorkload(user.departmentId, week).catch(() => null));
        }
        phase2Promises.push(workloadStore.fetchGroupWorkload(week).catch(() => null));
        phase2Promises.push(workloadStore.fetchAlerts(week).catch(() => []));
        phase2Promises.push(workloadStore.fetchUserWorkload(user.id, week).catch(() => null));
        phase2Promises.push(workloadStore.fetchUserTrend(user.id, week, 4).catch(() => []));
        phase2Promises.push(workloadStore.fetchUserDaily(user.id, week).catch(() => []));
      } else {
        // MEMBER
        phase2Promises.push(workloadStore.fetchUserWorkload(user.id, week).catch(() => null));
        phase2Promises.push(workloadStore.fetchGroupWorkload(week).catch(() => null));
        phase2Promises.push(workloadStore.fetchUserTrend(user.id, week, 4).catch(() => []));
        phase2Promises.push(workloadStore.fetchUserDaily(user.id, week).catch(() => []));
      }

      await Promise.all(phase2Promises);

      // ─── Phase 3: Completion ────────────────────────────────────────────────
      progress.value = 95;
      statusMessage.value = 'Validating cache & preparing workspace...';

      // Brief pause for visual smoothness
      await new Promise(resolve => setTimeout(resolve, 250));

      progress.value = 100;
      statusMessage.value = 'Workspace ready!';
      isWarmedUp.value = true;
    } catch (err) {
      console.warn('Preload warmup warning:', err);
    } finally {
      setTimeout(() => {
        isPreloading.value = false;
      }, 300);
    }
  }

  function $reset() {
    isWarmedUp.value = false;
    isPreloading.value = false;
    progress.value = 0;
    statusMessage.value = '';
    reportsCache.value = { weekly: {}, department: {} };
  }

  return {
    isWarmedUp,
    isPreloading,
    progress,
    statusMessage,
    reportsCache,
    getCachedReports,
    setCachedReports,
    warmup,
    $reset
  };
});
