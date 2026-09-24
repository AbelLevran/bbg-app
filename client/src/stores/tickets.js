import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { ticketsApi } from '../api/tickets.js';

export const useTicketsStore = defineStore('tickets', () => {
  const list = ref([]);
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

  async function fetchTickets() {
    loading.value = true;
    error.value = null;
    try {
      const params = {};
      const f = filters.value;
      if (f.clusterType) params.clusterType = f.clusterType;
      if (f.search) params.search = f.search;
      if (f.status) params.status = f.status;
      if (f.priority) params.priority = f.priority;
      if (f.overdueOnly) params.overdueOnly = 'true';
      if (f.sortBy) params.sortBy = f.sortBy;
      if (f.sortDir) params.sortDir = f.sortDir;
      if (f.departmentId) params.departmentId = f.departmentId;
      if (f.assignedTo) params.assignedTo = f.assignedTo;

      const res = await ticketsApi.list(params);
      list.value = res.tickets || [];
    } catch (e) {
      error.value = e.message || 'Failed to load tickets';
    } finally {
      loading.value = false;
    }
  }

  async function fetchTicket(id) {
    loading.value = true;
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
    // Prepend to list optimistically
    list.value.unshift(res.ticket);
    return res.ticket;
  }

  async function updateTicket(id, data) {
    const res = await ticketsApi.update(id, data);
    const idx = list.value.findIndex(t => t.id === id);
    if (idx !== -1) list.value[idx] = res.ticket;
    if (currentTicket.value?.id === id) currentTicket.value = res.ticket;
    return res.ticket;
  }

  async function deleteTicket(id) {
    await ticketsApi.delete(id);
    list.value = list.value.filter(t => t.id !== id);
    if (currentTicket.value?.id === id) currentTicket.value = null;
  }

  async function changeStatus(id, status, stuckReason) {
    const res = await ticketsApi.changeStatus(id, status, stuckReason);
    const idx = list.value.findIndex(t => t.id === id);
    if (idx !== -1) list.value[idx] = res.ticket;
    if (currentTicket.value?.id === id) currentTicket.value = res.ticket;
    return res.ticket;
  }

  function setFilter(key, value) {
    filters.value[key] = value;
  }

  function resetFilters() {
    filters.value = {
      clusterType: 'DAILY',
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

  const overdueCount = computed(() => list.value.filter(t => t.isOverdue).length);

  return {
    list, currentTicket, loading, error, filters,
    overdueCount,
    fetchTickets, fetchTicket,
    createTicket, updateTicket, deleteTicket, changeStatus,
    setFilter, resetFilters
  };
});
