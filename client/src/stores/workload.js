import { defineStore } from 'pinia';
import { ref } from 'vue';
import { workloadApi } from '@/api/workload';

export const useWorkloadStore = defineStore('workload', () => {
  const selectedWeek = ref(new Date().toISOString().slice(0, 10));
  const userWorkload = ref(null);
  const deptWorkload = ref(null);
  const groupWorkload = ref(null);
  const userTrend = ref([]);
  const userDaily = ref([]);
  const alerts = ref([]);
  const loading = ref(false);
  const error = ref(null);

  function setSelectedWeek(week) {
    selectedWeek.value = week;
  }

  async function fetchUserWorkload(userId, week = selectedWeek.value) {
    loading.value = true;
    error.value = null;
    try {
      const data = await workloadApi.getUserWorkload(userId, week);
      userWorkload.value = data;
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchDeptWorkload(deptId, week = selectedWeek.value) {
    loading.value = true;
    error.value = null;
    try {
      const data = await workloadApi.getDeptWorkload(deptId, week);
      deptWorkload.value = data;
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchGroupWorkload(week = selectedWeek.value) {
    loading.value = true;
    error.value = null;
    try {
      const data = await workloadApi.getGroupWorkload(week);
      groupWorkload.value = data;
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchUserTrend(userId, week = selectedWeek.value, weeks = 4) {
    try {
      const data = await workloadApi.getUserTrend(userId, week, weeks);
      userTrend.value = data;
      return data;
    } catch (err) {
      console.error('Failed to fetch user trend:', err);
      return [];
    }
  }

  async function fetchUserDaily(userId, week = selectedWeek.value) {
    try {
      const data = await workloadApi.getUserDaily(userId, week);
      userDaily.value = data;
      return data;
    } catch (err) {
      console.error('Failed to fetch user daily:', err);
      return [];
    }
  }

  async function fetchAlerts(week = selectedWeek.value) {
    try {
      const data = await workloadApi.getAlerts(week);
      alerts.value = data.sustainedHighWorkload || [];
      return alerts.value;
    } catch (err) {
      console.error('Failed to fetch workload alerts:', err);
      return [];
    }
  }

  async function setCapacity(userId, text, week = selectedWeek.value) {
    const res = await workloadApi.setCapacity(userId, week, text);
    return res;
  }

  return {
    selectedWeek,
    userWorkload,
    deptWorkload,
    groupWorkload,
    userTrend,
    userDaily,
    alerts,
    loading,
    error,
    setSelectedWeek,
    fetchUserWorkload,
    fetchDeptWorkload,
    fetchGroupWorkload,
    fetchUserTrend,
    fetchUserDaily,
    fetchAlerts,
    setCapacity
  };
});
