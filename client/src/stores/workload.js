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

  // In-Memory Client Cache with 5-minute TTL
  const CACHE_TTL = 5 * 60 * 1000;
  const cache = {
    userWorkload: new Map(),
    deptWorkload: new Map(),
    groupWorkload: new Map(),
    userTrend: new Map(),
    userDaily: new Map(),
    alerts: new Map()
  };

  function isFresh(entry) {
    return entry && (Date.now() - entry.timestamp < CACHE_TTL);
  }

  function setSelectedWeek(week) {
    selectedWeek.value = week;
  }

  function invalidateCache() {
    cache.userWorkload.clear();
    cache.deptWorkload.clear();
    cache.groupWorkload.clear();
    cache.userTrend.clear();
    cache.userDaily.clear();
    cache.alerts.clear();
  }

  async function fetchUserWorkload(userId, week = selectedWeek.value, force = false) {
    const key = `${userId}_${week}`;
    const cached = cache.userWorkload.get(key);
    if (!force && isFresh(cached)) {
      userWorkload.value = cached.data;
      return cached.data;
    }

    if (!userWorkload.value) loading.value = true;
    error.value = null;
    try {
      const data = await workloadApi.getUserWorkload(userId, week);
      userWorkload.value = data;
      cache.userWorkload.set(key, { data, timestamp: Date.now() });
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchDeptWorkload(deptId, week = selectedWeek.value, force = false) {
    const key = `${deptId}_${week}`;
    const cached = cache.deptWorkload.get(key);
    if (!force && isFresh(cached)) {
      deptWorkload.value = cached.data;
      return cached.data;
    }

    if (!deptWorkload.value) loading.value = true;
    error.value = null;
    try {
      const data = await workloadApi.getDeptWorkload(deptId, week);
      deptWorkload.value = data;
      cache.deptWorkload.set(key, { data, timestamp: Date.now() });
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchGroupWorkload(week = selectedWeek.value, force = false) {
    const cached = cache.groupWorkload.get(week);
    if (!force && isFresh(cached)) {
      groupWorkload.value = cached.data;
      return cached.data;
    }

    if (!groupWorkload.value) loading.value = true;
    error.value = null;
    try {
      const data = await workloadApi.getGroupWorkload(week);
      groupWorkload.value = data;
      cache.groupWorkload.set(week, { data, timestamp: Date.now() });
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchUserTrend(userId, week = selectedWeek.value, weeks = 4, force = false) {
    const key = `${userId}_${week}_${weeks}`;
    const cached = cache.userTrend.get(key);
    if (!force && isFresh(cached)) {
      userTrend.value = cached.data;
      return cached.data;
    }

    try {
      const data = await workloadApi.getUserTrend(userId, week, weeks);
      userTrend.value = data;
      cache.userTrend.set(key, { data, timestamp: Date.now() });
      return data;
    } catch (err) {
      console.error('Failed to fetch user trend:', err);
      return [];
    }
  }

  async function fetchUserDaily(userId, week = selectedWeek.value, force = false) {
    const key = `${userId}_${week}`;
    const cached = cache.userDaily.get(key);
    if (!force && isFresh(cached)) {
      userDaily.value = cached.data;
      return cached.data;
    }

    try {
      const data = await workloadApi.getUserDaily(userId, week);
      userDaily.value = data;
      cache.userDaily.set(key, { data, timestamp: Date.now() });
      return data;
    } catch (err) {
      console.error('Failed to fetch user daily:', err);
      return [];
    }
  }

  async function fetchAlerts(week = selectedWeek.value, force = false) {
    const cached = cache.alerts.get(week);
    if (!force && isFresh(cached)) {
      alerts.value = cached.data;
      return cached.data;
    }

    try {
      const data = await workloadApi.getAlerts(week);
      const list = data.sustainedHighWorkload || [];
      alerts.value = list;
      cache.alerts.set(week, { data: list, timestamp: Date.now() });
      return list;
    } catch (err) {
      console.error('Failed to fetch workload alerts:', err);
      return [];
    }
  }

  async function setCapacity(userId, text, week = selectedWeek.value) {
    const res = await workloadApi.setCapacity(userId, week, text);
    invalidateCache();
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
    invalidateCache,
    fetchUserWorkload,
    fetchDeptWorkload,
    fetchGroupWorkload,
    fetchUserTrend,
    fetchUserDaily,
    fetchAlerts,
    setCapacity
  };
});
