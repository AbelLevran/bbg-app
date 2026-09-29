import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { ticketsApi } from '../api/tickets.js';

export const useTicketsStore = defineStore('tickets', () => {
  // Raw unfiltered list from server (per cluster type, role-scoped on server)
  const _rawList = ref([]);
  const currentTicket = ref(null);
  const loading = ref(false);
  const error = ref(null);

  // Filters state
  const filters = ref({
    clusterType: 'DAILY',
    search: '',
    status: '',
    priority: '',
    overdueOnly: false,
    sortBy: 'created_at',
    sortDir: 'desc',
    departmentId: '',
    assignedTo: ''
  });

  let lastFetchedCluster = null;
  let lastFetchedTime = 0;
  const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

  function invalidateCache() {
    lastFetchedTime = 0;
    lastFetchedCluster = null;
  }

  // ─── Client-Side Filtered + Sorted List (instant, zero network) ────────────
  const list = computed(() => {
    let result = [..._rawList.value];
    const f = filters.value;

    // Search filter (title + ticketNumber)
    if (f.search) {
      const q = f.search.toLowerCase();
      result = result.filter(t =>
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.ticketNumber && t.ticketNumber.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (f.status) {
      result = result.filter(t => t.status === f.status);
    }

    // Priority filter
    if (f.priority) {
      result = result.filter(t => t.priority === f.priority);
    }

    // Department filter
    if (f.departmentId) {
      result = result.filter(t => t.departmentId === f.departmentId);
    }

    // Assigned To filter
    if (f.assignedTo) {
      result = result.filter(t => t.assignedTo?.id === f.assignedTo);
    }

    // Overdue filter
    if (f.overdueOnly) {
      result = result.filter(t => t.isOverdue);
    }

    // Sort
    const sortField = f.sortBy || 'created_at';
    const dir = f.sortDir === 'asc' ? 1 : -1;

    result.sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case 'due_date':
          aVal = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          bVal = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          break;
        case 'priority': {
          const pMap = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          aVal = pMap[a.priority] || 0;
          bVal = pMap[b.priority] || 0;
          break;
        }
        case 'estimated_minutes':
          aVal = a.estimatedMinutes || 0;
          bVal = b.estimatedMinutes || 0;
          break;
        default: // created_at
          aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      }
      if (aVal < bVal) return -1 * dir;
      if (aVal > bVal) return 1 * dir;
      return 0;
    });

    return result;
  });

  // Unfiltered list for views that need all data (Dashboard, MyWork)
  const rawList = computed(() => _rawList.value);

  async function fetchTickets(force = false) {
    const clusterType = filters.value.clusterType || 'DAILY';
    const isFresh = (Date.now() - lastFetchedTime < CACHE_TTL);

    // If cache is fresh and cluster hasn't changed, skip network call
    if (!force && _rawList.value.length > 0 && clusterType === lastFetchedCluster && isFresh) {
      return list.value;
    }

    // Only show full loading spinner if list is completely empty
    if (_rawList.value.length === 0) {
      loading.value = true;
    }
    error.value = null;
    try {
      // Only send clusterType to server; server handles role-based visibility scoping
      const res = await ticketsApi.list({ clusterType });
      _rawList.value = res.tickets || [];
      lastFetchedCluster = clusterType;
      lastFetchedTime = Date.now();
      return list.value;
    } catch (e) {
      error.value = e.message || 'Failed to load tickets';
    } finally {
      loading.value = false;
    }
  }

  async function fetchTicket(id, silent = false) {
    // Stale-While-Revalidate: prefill from cached list for instant display
    if (!currentTicket.value || currentTicket.value.id !== id) {
      const cached = _rawList.value.find(t => t.id === id);
      if (cached) {
        currentTicket.value = cached;
      }
    }

    if (!silent && !currentTicket.value) loading.value = true;
    error.value = null;
    try {
      const res = await ticketsApi.get(id);
      currentTicket.value = res.ticket;
      return res.ticket;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function createTicket(data) {
    const res = await ticketsApi.create(data);
    // Prepend to raw list
    _rawList.value.unshift(res.ticket);
    invalidateCache();
    return res.ticket;
  }

  async function updateTicket(id, data) {
    // ─── Optimistic Update (instant UI) ───
    const prevRaw = _rawList.value.slice();
    const prevCurrent = currentTicket.value ? { ...currentTicket.value } : null;

    const idx = _rawList.value.findIndex(t => t.id === id);
    if (idx !== -1) {
      _rawList.value[idx] = { ..._rawList.value[idx], ...data };
    }
    if (currentTicket.value?.id === id) {
      currentTicket.value = { ...currentTicket.value, ...data };
    }

    try {
      const res = await ticketsApi.update(id, data);
      // Reconcile with authoritative server response
      const idx2 = _rawList.value.findIndex(t => t.id === id);
      if (idx2 !== -1) _rawList.value[idx2] = res.ticket;
      if (currentTicket.value?.id === id) currentTicket.value = res.ticket;
      invalidateCache();
      return res.ticket;
    } catch (err) {
      // Rollback on failure
      _rawList.value = prevRaw;
      currentTicket.value = prevCurrent;
      throw err;
    }
  }

  async function deleteTicket(id) {
    // ─── Optimistic Remove (instant UI) ───
    const prevRaw = _rawList.value.slice();
    _rawList.value = _rawList.value.filter(t => t.id !== id);
    if (currentTicket.value?.id === id) currentTicket.value = null;

    try {
      await ticketsApi.delete(id);
      invalidateCache();
    } catch (err) {
      // Rollback on failure
      _rawList.value = prevRaw;
      throw err;
    }
  }

  async function changeStatus(id, status, stuckReason) {
    // ─── Optimistic Update (instant UI) ───
    const prevRaw = _rawList.value.slice();
    const prevCurrent = currentTicket.value ? { ...currentTicket.value } : null;

    const patch = { status };
    if (stuckReason) patch.stuckReason = stuckReason;

    const idx = _rawList.value.findIndex(t => t.id === id);
    if (idx !== -1) {
      _rawList.value[idx] = { ..._rawList.value[idx], ...patch };
    }
    if (currentTicket.value?.id === id) {
      currentTicket.value = { ...currentTicket.value, ...patch };
    }

    try {
      const res = await ticketsApi.changeStatus(id, status, stuckReason);
      // Reconcile with authoritative server response
      const idx2 = _rawList.value.findIndex(t => t.id === id);
      if (idx2 !== -1) _rawList.value[idx2] = res.ticket;
      if (currentTicket.value?.id === id) currentTicket.value = res.ticket;
      invalidateCache();
      return res.ticket;
    } catch (err) {
      // Rollback on failure
      _rawList.value = prevRaw;
      currentTicket.value = prevCurrent;
      throw err;
    }
  }

  function setFilter(key, value) {
    filters.value[key] = value;
  }

  function resetFilters() {
    filters.value = {
      clusterType: filters.value.clusterType, // preserve current cluster type
      search: '',
      status: '',
      priority: '',
      overdueOnly: false,
      sortBy: 'created_at',
      sortDir: 'desc',
      departmentId: '',
      assignedTo: ''
    };
  }

  const overdueCount = computed(() => _rawList.value.filter(t => t.isOverdue).length);

  return {
    list, rawList, currentTicket, loading, error, filters,
    overdueCount,
    fetchTickets, fetchTicket, invalidateCache,
    createTicket, updateTicket, deleteTicket, changeStatus,
    setFilter, resetFilters
  };
});
