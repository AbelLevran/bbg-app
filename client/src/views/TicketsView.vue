<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useTicketsStore } from '@/stores/tickets';
import { orgApi } from '@/api/org';
import { eventsApi } from '@/api/events';
import TicketTable from '@/components/tickets/TicketTable.vue';
import TicketFiltersBar from '@/components/tickets/TicketFiltersBar.vue';
import EventGallery from '@/components/events/EventGallery.vue';
import EventDetailPanel from '@/components/events/EventDetailPanel.vue';
import { CheckSquare, Calendar, Plus, AlertTriangle, Trash2, X, RefreshCw } from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();
const ticketsStore = useTicketsStore();

const departments = ref([]);
const activeTab = ref('DAILY');
const ticketToDelete = ref(null);
const deleteConfirmText = ref('');
const deleting = ref(false);

// Events state
const eventsList = ref([]);
const loadingEvents = ref(false);
const selectedEventName = ref(null);

const ticketsTitle = computed(() => {
  if (authStore.isHeadGroup) return 'Tickets (Group-Wide)';
  if (authStore.isDepartmentHead) return `Team Tickets (${authStore.departmentName})`;
  return 'My Tickets';
});

onMounted(async () => {
  if (authStore.isHeadGroup) {
    try {
      const res = await orgApi.getDepartments();
      departments.value = res.departments || [];
    } catch {
      // ignore
    }
  }
  loadTickets();
  loadEvents();
});

watch(activeTab, (val) => {
  if (val === 'DAILY') {
    ticketsStore.setFilter('clusterType', 'DAILY');
    loadTickets();
  } else {
    selectedEventName.value = null;
    loadEvents();
  }
});

function loadTickets() {
  ticketsStore.setFilter('clusterType', 'DAILY');
  ticketsStore.fetchTickets();
}

async function loadEvents() {
  loadingEvents.value = true;
  try {
    const res = await eventsApi.getEvents();
    eventsList.value = res || [];
  } catch (err) {
    console.error('Failed to load events:', err);
  } finally {
    loadingEvents.value = false;
  }
}

function handleFiltersUpdate(newFilters) {
  ticketsStore.filters = { ...newFilters };
  loadTickets();
}

function handleSort(field, dir) {
  ticketsStore.setFilter('sortBy', field);
  ticketsStore.setFilter('sortDir', dir);
  loadTickets();
}

function handleOpen(id) {
  router.push(`/tickets/${id}`);
}

function handleEdit(ticket) {
  router.push(`/tickets/${ticket.id}`);
}

function handleDeleteClick(ticket) {
  ticketToDelete.value = ticket;
  deleteConfirmText.value = '';
}

async function confirmDelete() {
  if (!ticketToDelete.value || deleteConfirmText.value !== 'DELETE') return;
  deleting.value = true;
  try {
    await ticketsStore.deleteTicket(ticketToDelete.value.id);
    ticketToDelete.value = null;
    deleteConfirmText.value = '';
    if (activeTab.value === 'EVENT') {
      loadEvents();
    }
  } catch (err) {
    alert(err.message || 'Failed to delete ticket');
  } finally {
    deleting.value = false;
  }
}

function handleSelectEvent(name) {
  selectedEventName.value = name;
}
</script>

<template>
  <div class="tickets-view">
    <!-- Header -->
    <div class="view-header">
      <div class="header-info">
        <div class="title-row">
          <h1 class="page-title">{{ ticketsTitle }}</h1>
          <span v-if="ticketsStore.overdueCount > 0" class="overdue-banner-chip">
            <AlertTriangle :size="13" />
            {{ ticketsStore.overdueCount }} Overdue
          </span>
        </div>
        <p class="page-desc">Track, organize, and measure work units with live precision timers</p>
      </div>

      <div class="header-actions">
        <button
          class="btn btn-secondary"
          title="Refresh"
          @click="activeTab === 'DAILY' ? loadTickets() : loadEvents()"
        >
          <RefreshCw
            :size="15"
            :class="{ 'spinning': ticketsStore.loading || loadingEvents }"
          />
        </button>
        <button class="btn btn-primary" @click="router.push('/tickets/new')">
          <Plus :size="16" />
          <span>New Ticket</span>
        </button>
      </div>
    </div>

    <!-- Tabs Bar (Daily Tasks vs Events per prd.md §3.8) -->
    <div class="tabs-bar">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'DAILY' }"
        @click="activeTab = 'DAILY'"
      >
        <CheckSquare :size="16" />
        <span>Daily Tasks</span>
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'EVENT' }"
        @click="activeTab = 'EVENT'"
      >
        <Calendar :size="16" />
        <span>Events & Initiatives</span>
      </button>
    </div>

    <!-- TAB 1: DAILY TASKS -->
    <template v-if="activeTab === 'DAILY'">
      <!-- Filters Bar -->
      <TicketFiltersBar
        :filters="ticketsStore.filters"
        :departments="departments"
        :show-dept-filter="authStore.isHeadGroup"
        @update:filters="handleFiltersUpdate"
        @refresh="loadTickets"
      />

      <!-- Tickets Table or Empty / Loading -->
      <div class="table-container glass-card">
        <div v-if="ticketsStore.loading && ticketsStore.list.length === 0" class="loading-state">
          <RefreshCw :size="24" class="spinning icon-loading" />
          <span>Loading tickets...</span>
        </div>

        <TicketTable
          v-else
          :tickets="ticketsStore.list"
          :sort-by="ticketsStore.filters.sortBy"
          :sort-dir="ticketsStore.filters.sortDir"
          @sort="handleSort"
          @open="handleOpen"
          @edit="handleEdit"
          @delete="handleDeleteClick"
        />
      </div>
    </template>

    <!-- TAB 2: EVENTS & INITIATIVES -->
    <template v-else>
      <EventDetailPanel
        v-if="selectedEventName"
        :event-name="selectedEventName"
        @back="selectedEventName = null"
        @open-ticket="handleOpen"
        @edit-ticket="handleEdit"
        @delete-ticket="handleDeleteClick"
      />
      <EventGallery
        v-else
        :events="eventsList"
        :loading="loadingEvents"
        @select-event="handleSelectEvent"
      />
    </template>

    <!-- Delete Confirmation Modal with explicit DELETE text per prd.md §4.3.4 -->
    <div v-if="ticketToDelete" class="modal-overlay" @click.self="ticketToDelete = null">
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <Trash2 :size="18" class="delete-icon" />
            <h3>Delete Ticket</h3>
          </div>
          <button class="close-btn" @click="ticketToDelete = null">
            <X :size="18" />
          </button>
        </div>

        <div class="modal-body">
          <p>
            Are you sure you want to permanently delete <strong>{{ ticketToDelete.ticketNumber }}</strong>?
          </p>
          <p v-if="ticketToDelete.recurrenceGroupId" class="series-notice">
            <strong>Recurring ticket notice:</strong> This ticket is part of a recurring series. Deleting it will remove <em>only this occurrence</em>, not the entire series.
          </p>
          <p class="warning-text">
            This action cannot be undone. To confirm, please type <strong>DELETE</strong> below:
          </p>

          <input
            v-model="deleteConfirmText"
            type="text"
            class="confirm-input"
            placeholder="Type DELETE to confirm"
            autofocus
          />
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="ticketToDelete = null">
            Cancel
          </button>
          <button
            class="btn btn-danger"
            :disabled="deleteConfirmText !== 'DELETE' || deleting"
            @click="confirmDelete"
          >
            {{ deleting ? 'Deleting...' : 'Delete Ticket' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tickets-view {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.overdue-banner-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 700;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #f87171;
  border-radius: var(--radius-full);
}

.page-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* Tabs Bar */
.tabs-bar {
  display: inline-flex;
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 0.25rem;
  gap: 0.25rem;
  width: fit-content;
  box-shadow: var(--shadow-sm);
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.25rem;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn:hover {
  color: var(--bsi-teal-dark);
  background: var(--bg-surface-hover);
}

.tab-btn.active {
  background: var(--bsi-teal);
  color: #ffffff;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0, 160, 160, 0.3);
}

.table-container {
  overflow: hidden;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 4rem 2rem;
  color: var(--text-muted);
}

.icon-loading {
  color: var(--bsi-teal);
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-card {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 440px;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.modal-title-wrap h3 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.delete-icon {
  color: #f87171;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
}

.close-btn:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.modal-body strong {
  color: var(--text-primary);
}

.series-notice {
  padding: 0.65rem 0.85rem;
  background: var(--bsi-teal-light);
  border: 1px solid rgba(0, 160, 160, 0.25);
  border-radius: var(--radius-md);
  font-size: 0.8rem;
  color: var(--bsi-teal-dark);
}

.warning-text {
  color: #e11d48;
  font-size: 0.825rem;
}

.confirm-input {
  width: 100%;
  padding: 0.6rem 0.85rem;
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 0.9rem;
  outline: none;
  margin-top: 0.25rem;
}

.confirm-input:focus {
  border-color: #f43f5e;
  box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.15);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-top: 1px solid var(--border-color);
}
</style>
