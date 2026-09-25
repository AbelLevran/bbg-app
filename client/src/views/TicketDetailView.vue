<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useTicketsStore } from '@/stores/tickets';
import { useTimerStore } from '@/stores/timer';
import { timerApi } from '@/api/timer';
import StatusBadge from '@/components/common/StatusBadge.vue';
import PriorityBadge from '@/components/common/PriorityBadge.vue';
import TimerBox from '@/components/tickets/TimerBox.vue';
import ConflictTimerModal from '@/components/tickets/ConflictTimerModal.vue';
import ManualTimeModal from '@/components/tickets/ManualTimeModal.vue';
import StuckReasonModal from '@/components/tickets/StuckReasonModal.vue';
import TimeSessionHistory from '@/components/tickets/TimeSessionHistory.vue';
import ActivityLogList from '@/components/tickets/ActivityLogList.vue';
import RecurringSeriesPanel from '@/components/tickets/RecurringSeriesPanel.vue';
import {
  ArrowLeft, Edit3, Trash2, Clock, Calendar, User, Building2,
  AlertTriangle, AlertOctagon, PlusCircle, CheckCircle2, X
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const ticketsStore = useTicketsStore();
const timerStore = useTimerStore();

const ticketId = computed(() => route.params.id);
const ticket = computed(() => ticketsStore.currentTicket);
const loading = computed(() => ticketsStore.loading);
const error = computed(() => ticketsStore.error);

// Modal states
const showConflictModal = ref(false);
const conflictData = ref(null);
const showManualModal = ref(false);
const showStuckModal = ref(false);
const showDeleteModal = ref(false);
const deleteConfirmText = ref('');
const showEditModal = ref(false);


// Edit Form
const editForm = ref({
  title: '',
  description: '',
  priority: 'MEDIUM',
  estimatedMinutes: 60,
  dueDate: ''
});
const editSubmitting = ref(false);

const isOwner = computed(() => {
  return ticket.value?.createdBy?.id === authStore.user?.id;
});

const canChangeStatus = computed(() => {
  const current = authStore.user;
  if (!current || !ticket.value) return false;
  return (
    current.role === 'HEAD_GROUP' ||
    ticket.value.assignedTo?.id === current.id ||
    (current.role === 'DEPARTMENT_HEAD' && ticket.value.departmentId === current.departmentId)
  );
});

async function loadTicket(silent = true) {
  try {
    const t = await ticketsStore.fetchTicket(ticketId.value, silent);
    // Sync closed session minutes to timer store if this ticket is active
    if (timerStore.activeTimer?.ticketId === t.id) {
      let closedMs = 0;
      if (t.timeSessions) {
        for (const s of t.timeSessions) {
          if (s.endedAt) closedMs += (s.durationMinutes * 60000);
        }
      }
      timerStore.setClosedMs(closedMs);
    }
  } catch (err) {
    // handled in store
  }
}

onMounted(() => {
  loadTicket(false);
});

// Status change handler
async function handleStatusSelect(newStatus) {
  if (newStatus === 'STUCK') {
    showStuckModal.value = true;
    return;
  }
  try {
    await ticketsStore.changeStatus(ticketId.value, newStatus);
    loadTicket();
  } catch (err) {
    alert(err.message || 'Failed to update status');
  }
}

async function handleStuckConfirm(reason) {
  showStuckModal.value = false;
  try {
    await ticketsStore.changeStatus(ticketId.value, 'STUCK', reason);
    loadTicket();
  } catch (err) {
    alert(err.message || 'Failed to mark ticket as stuck');
  }
}

// Conflict handling
function handleTimerConflict(conflict) {
  conflictData.value = conflict;
  showConflictModal.value = true;
}

async function handleStopAndStart() {
  showConflictModal.value = false;
  try {
    await timerStore.stopActive();
    await timerStore.start(ticketId.value);
    loadTicket();
  } catch (err) {
    alert(err.message || 'Failed to switch active timer');
  }
}

// Manual time submission
async function handleManualSubmit({ minutes, reason }) {
  try {
    await timerApi.addManualTime(ticketId.value, minutes, reason);
    showManualModal.value = false;
    loadTicket();
  } catch (err) {
    alert(err.message || 'Failed to log manual time');
  }
}

// Edit Ticket
function openEditModal() {
  if (!ticket.value) return;
  editForm.value = {
    title: ticket.value.title,
    description: ticket.value.description || '',
    priority: ticket.value.priority,
    estimatedMinutes: ticket.value.estimatedMinutes,
    dueDate: ticket.value.dueDate ? new Date(ticket.value.dueDate).toISOString().split('T')[0] : ''
  };
  showEditModal.value = true;
}

async function handleEditSubmit() {
  editSubmitting.value = true;
  try {
    await ticketsStore.updateTicket(ticketId.value, {
      title: editForm.value.title.trim(),
      description: editForm.value.description.trim() || undefined,
      priority: editForm.value.priority,
      estimatedMinutes: parseInt(editForm.value.estimatedMinutes, 10),
      dueDate: editForm.value.dueDate
    });
    showEditModal.value = false;
    loadTicket();
  } catch (err) {
    alert(err.message || 'Failed to update ticket');
  } finally {
    editSubmitting.value = false;
  }
}

// Delete Ticket
async function confirmDelete() {
  if (deleteConfirmText.value !== 'DELETE') return;
  try {
    await ticketsStore.deleteTicket(ticketId.value);
    showDeleteModal.value = false;
    router.push('/tickets');
  } catch (err) {
    alert(err.message || 'Failed to delete ticket');
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatMinutes(m) {
  if (!m && m !== 0) return '0m';
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0) return `${min}m`;
  if (min === 0) return `${h}h`;
  return `${h}h ${min}m`;
}
</script>

<template>
  <div class="ticket-detail-view">
    <!-- Back button -->
    <div class="top-nav">
      <button class="btn-back" @click="router.push('/tickets')">
        <ArrowLeft :size="16" />
        Back to Tickets
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !ticket" class="loading-box">
      <span>Loading ticket details...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-box">
      <AlertTriangle :size="24" class="error-icon" />
      <h3>Error Loading Ticket</h3>
      <p>{{ error }}</p>
      <button class="btn btn-secondary" @click="router.push('/tickets')">Return to Tickets</button>
    </div>

    <!-- Main Content -->
    <div v-else-if="ticket" class="detail-container">
      <!-- Header Banner -->
      <div class="ticket-header-card">
        <div class="header-top">
          <div class="ticket-id-row">
            <span class="ticket-number">{{ ticket.ticketNumber }}</span>
            <span v-if="ticket.clusterType === 'EVENT'" class="cluster-tag">
              Event: {{ ticket.clusterName || 'Initiative' }}
            </span>
            <span v-if="ticket.recurrenceGroupId" class="recurring-tag">↺ Recurring Series</span>
          </div>

          <div class="header-actions">
            <template v-if="isOwner">
              <button class="btn btn-secondary btn-sm" @click="openEditModal">
                <Edit3 :size="14" />
                Edit
              </button>
              <button class="btn btn-danger-outline btn-sm" @click="showDeleteModal = true">
                <Trash2 :size="14" />
                Delete
              </button>
            </template>
          </div>
        </div>

        <h1 class="ticket-title">{{ ticket.title }}</h1>

        <div class="badges-row">
          <PriorityBadge :priority="ticket.priority" />
          <StatusBadge :status="ticket.status" />
          <span v-if="ticket.isOverdue" class="overdue-badge">
            <AlertTriangle :size="12" /> Overdue
          </span>
        </div>

        <!-- Stuck Reason Banner -->
        <div v-if="ticket.status === 'STUCK' && ticket.stuckReason" class="stuck-banner">
          <AlertOctagon :size="18" class="stuck-icon" />
          <div class="stuck-text">
            <strong>Stuck Blocker:</strong> {{ ticket.stuckReason }}
          </div>
        </div>
      </div>

      <!-- Recurring Series Panel if ticket belongs to a series (prd.md §3.7) -->
      <RecurringSeriesPanel
        v-if="ticket.recurrenceGroupId"
        :ticket="ticket"
        @occurrence-added="loadTicket"
      />

      <!-- Two-Column Layout -->
      <div class="detail-columns">
        <!-- Left Column: Details, Status, Sessions -->
        <div class="col-left">
          <!-- Description -->
          <div class="card section-card">
            <h4 class="section-title">Description</h4>
            <p v-if="ticket.description" class="desc-content">{{ ticket.description }}</p>
            <p v-else class="empty-desc">No description provided.</p>
          </div>

          <!-- Ticket Meta Grid -->
          <div class="card meta-grid-card">
            <div class="meta-item">
              <span class="meta-label"><User :size="14" /> Assigned To</span>
              <span class="meta-val highlight">{{ ticket.assignedTo?.name || '—' }}</span>
              <span class="meta-sub">{{ ticket.assignedTo?.title || '' }}</span>
            </div>

            <div class="meta-item">
              <span class="meta-label"><User :size="14" /> Requested By</span>
              <span class="meta-val">{{ ticket.requestedBy?.name || '—' }}</span>
            </div>

            <div class="meta-item">
              <span class="meta-label"><Building2 :size="14" /> Department</span>
              <span class="meta-val">{{ ticket.departmentName || '—' }}</span>
            </div>

            <div class="meta-item">
              <span class="meta-label"><Calendar :size="14" /> Due Date</span>
              <span class="meta-val" :class="{ 'overdue-val': ticket.isOverdue }">
                {{ formatDate(ticket.dueDate) }}
              </span>
            </div>

            <div class="meta-item">
              <span class="meta-label">Created By</span>
              <span class="meta-val">{{ ticket.createdBy?.name || '—' }}</span>
            </div>

            <div class="meta-item">
              <span class="meta-label">Created At</span>
              <span class="meta-val">{{ formatDate(ticket.createdAt) }}</span>
            </div>
          </div>

          <!-- Status Control -->
          <div v-if="canChangeStatus" class="card section-card">
            <h4 class="section-title">Update Status</h4>
            <div class="status-buttons-grid">
              <button
                class="status-choice-btn"
                :class="{ active: ticket.status === 'TODO' }"
                @click="handleStatusSelect('TODO')"
              >
                To Do
              </button>
              <button
                class="status-choice-btn"
                :class="{ active: ticket.status === 'IN_PROGRESS' }"
                @click="handleStatusSelect('IN_PROGRESS')"
              >
                In Progress
              </button>
              <button
                class="status-choice-btn"
                :class="{ active: ticket.status === 'IN_REVIEW' }"
                @click="handleStatusSelect('IN_REVIEW')"
              >
                In Review
              </button>
              <button
                class="status-choice-btn btn-stuck"
                :class="{ active: ticket.status === 'STUCK' }"
                @click="handleStatusSelect('STUCK')"
              >
                Stuck
              </button>
              <button
                class="status-choice-btn btn-done"
                :class="{ active: ticket.status === 'DONE' }"
                @click="handleStatusSelect('DONE')"
              >
                Done
              </button>
              <button
                class="status-choice-btn"
                :class="{ active: ticket.status === 'CANCELLED' }"
                @click="handleStatusSelect('CANCELLED')"
              >
                Cancelled
              </button>
            </div>
          </div>

          <!-- Work Time Analysis -->
          <div class="card section-card">
            <div class="section-header-row">
              <h4 class="section-title">Work Time Analysis</h4>
              <button class="btn btn-outline-cyan btn-sm" @click="showManualModal = true">
                <PlusCircle :size="13" />
                Add Manual Time
              </button>
            </div>

            <div class="time-stats-row">
              <div class="time-stat">
                <span class="stat-label">Estimated</span>
                <span class="stat-num">{{ formatMinutes(ticket.estimatedMinutes) }}</span>
              </div>
              <div class="time-stat">
                <span class="stat-label">Actual Tracked</span>
                <span class="stat-num" :class="{ 'over-budget': ticket.actualMinutes > ticket.estimatedMinutes }">
                  {{ formatMinutes(ticket.actualMinutes) }}
                </span>
              </div>
              <div class="time-stat">
                <span class="stat-label">Variance</span>
                <span
                  class="stat-num"
                  :class="ticket.actualMinutes > ticket.estimatedMinutes ? 'over-budget' : 'under-budget'"
                >
                  {{ ticket.actualMinutes > ticket.estimatedMinutes ? '+' : '' }}{{ formatMinutes(ticket.actualMinutes - ticket.estimatedMinutes) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Time Sessions History Component -->
          <TimeSessionHistory :sessions="ticket.timeSessions || []" />
        </div>

        <!-- Right Column: Timer & Activity Log -->
        <div class="col-right">
          <!-- Real Timer Box -->
          <TimerBox
            :ticket-id="ticket.id"
            :assigned-to-id="ticket.assignedTo?.id || ''"
            :current-user-id="authStore.user?.id || ''"
            :estimated-minutes="ticket.estimatedMinutes"
            :actual-minutes="ticket.actualMinutes"
            :ticket-number="ticket.ticketNumber"
            :ticket-title="ticket.title"
            @conflict="handleTimerConflict"
            @refresh-ticket="loadTicket"
          />

          <!-- Activity Log List -->
          <ActivityLogList :logs="ticket.activityLogs || []" />
        </div>
      </div>
    </div>

    <!-- Conflict Timer Modal -->
    <ConflictTimerModal
      :show="showConflictModal"
      :conflict="conflictData"
      @close="showConflictModal = false"
      @stop-and-start="handleStopAndStart"
    />

    <!-- Manual Time Modal -->
    <ManualTimeModal
      :show="showManualModal"
      :ticket-id="ticketId"
      @close="showManualModal = false"
      @submit="handleManualSubmit"
    />

    <!-- Stuck Reason Modal -->
    <StuckReasonModal
      :show="showStuckModal"
      @close="showStuckModal = false"
      @confirm="handleStuckConfirm"
    />

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <h3>Delete Ticket</h3>
          <button class="close-btn" @click="showDeleteModal = false"><X :size="18" /></button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to delete <strong>{{ ticket.ticketNumber }}</strong>?</p>
          <p v-if="ticket.recurrenceGroupId" class="series-notice" style="padding: 0.65rem 0.85rem; background: rgba(6, 182, 212, 0.08); border: 1px solid rgba(6, 182, 212, 0.2); border-radius: var(--radius-md); font-size: 0.8rem; color: var(--text-secondary);">
            <strong>Recurring ticket notice:</strong> This ticket is part of a recurring series. Deleting it will remove <em>only this occurrence</em>, not the entire series.
          </p>
          <p style="color: #f87171; font-size: 0.825rem;">
            This action cannot be undone. All recorded time sessions and logs will also be permanently deleted.
          </p>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">
            To confirm, please type <strong>DELETE</strong> below:
          </p>
          <input
            v-model="deleteConfirmText"
            type="text"
            placeholder="Type DELETE to confirm"
            style="width: 100%; padding: 0.6rem 0.85rem; background: rgba(0, 0, 0, 0.3); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-primary); font-family: var(--font-mono); font-size: 0.9rem; outline: none;"
          />
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showDeleteModal = false">Cancel</button>
          <button class="btn btn-danger" :disabled="deleteConfirmText !== 'DELETE'" @click="confirmDelete">Confirm Delete</button>
        </div>
      </div>
    </div>

    <!-- Edit Ticket Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal-card edit-card">
        <div class="modal-header">
          <h3>Edit Ticket</h3>
          <button class="close-btn" @click="showEditModal = false"><X :size="18" /></button>
        </div>
        <form class="modal-body" @submit.prevent="handleEditSubmit">
          <div class="form-group">
            <label>Title</label>
            <input v-model="editForm.title" type="text" class="input-control" required />
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea v-model="editForm.description" rows="3" class="input-control textarea-control"></textarea>
          </div>
          <div class="form-row">
            <div class="form-group col">
              <label>Priority</label>
              <select v-model="editForm.priority" class="select-control">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div class="form-group col">
              <label>Estimated Effort (mins)</label>
              <input v-model="editForm.estimatedMinutes" type="number" min="1" class="input-control" required />
            </div>
          </div>
          <div class="form-group">
            <label>Due Date</label>
            <input v-model="editForm.dueDate" type="date" class="input-control" required />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showEditModal = false">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="editSubmitting">
              {{ editSubmitting ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ticket-detail-view {
  max-width: 1140px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.top-nav {
  display: flex;
  align-items: center;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s ease;
}
.btn-back:hover { color: var(--bsi-teal-dark); }

.loading-box, .error-box {
  padding: 4rem;
  text-align: center;
  color: var(--text-muted);
}

.error-icon {
  color: #ef4444;
  margin-bottom: 1rem;
}

.ticket-header-card {
  background: #ffffff;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.75rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  box-shadow: var(--shadow-sm);
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ticket-id-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.ticket-number {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--bsi-teal-dark);
  background: var(--bsi-teal-light);
  border: 1px solid rgba(0, 160, 160, 0.25);
  border-radius: var(--radius-sm);
  padding: 0.15rem 0.55rem;
}

.cluster-tag {
  font-size: 0.725rem;
  font-weight: 600;
  background: #f1f5f9;
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-full);
}

.recurring-tag {
  font-size: 0.725rem;
  font-weight: 600;
  background: var(--bsi-teal-light);
  color: var(--bsi-teal-dark);
  border: 1px solid rgba(0, 160, 160, 0.3);
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-full);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.ticket-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.35;
  letter-spacing: -0.01em;
}

.badges-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.overdue-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.725rem;
  font-weight: 700;
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-full);
  padding: 0.2rem 0.6rem;
}

.stuck-banner {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-md);
  padding: 0.85rem 1.15rem;
  color: #b91c1c;
  font-size: 0.85rem;
}

.stuck-icon {
  color: #ef4444;
  flex-shrink: 0;
}

.detail-columns {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 1.75rem;
  align-items: start;
}

@media (max-width: 900px) {
  .detail-columns {
    grid-template-columns: 1fr;
  }
}

.col-left, .col-right {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.card {
  background: #ffffff;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.75rem 2rem;
  box-shadow: var(--shadow-sm);
}

.section-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0 0 1rem;
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}
.section-header-row .section-title { margin: 0; }

.desc-content {
  font-size: 0.925rem;
  color: var(--text-primary);
  line-height: 1.65;
  white-space: pre-line;
  margin: 0;
}

.empty-desc {
  font-size: 0.875rem;
  color: var(--text-muted);
  font-style: italic;
  margin: 0;
}

.meta-grid-card {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem 1.25rem;
}

@media (max-width: 600px) {
  .meta-grid-card {
    grid-template-columns: 1fr 1fr;
  }
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.meta-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.725rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.meta-val {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.meta-val.highlight {
  color: var(--bsi-teal-dark);
  font-weight: 700;
}

.meta-sub {
  font-size: 0.725rem;
  color: var(--text-muted);
}

.overdue-val {
  color: #dc2626 !important;
}

.status-buttons-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.6rem;
}

.status-choice-btn {
  background: #f8fafc;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.65rem 0.5rem;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}

.status-choice-btn:hover {
  background: #f1f5f9;
  color: var(--text-primary);
  border-color: var(--border-medium);
}

.status-choice-btn.active {
  background: var(--bsi-teal-light);
  border-color: var(--bsi-teal);
  color: var(--bsi-teal-dark);
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 160, 160, 0.2);
}

.status-choice-btn.btn-stuck.active {
  background: #fef2f2;
  border-color: #ef4444;
  color: #dc2626;
  box-shadow: 0 1px 3px rgba(239, 68, 68, 0.2);
}

.status-choice-btn.btn-done.active {
  background: #f0fdf4;
  border-color: #22c55e;
  color: #16a34a;
  box-shadow: 0 1px 3px rgba(34, 197, 94, 0.2);
}

.time-stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.time-stat {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  background: #f8fafc;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.85rem 1rem;
}

.stat-label {
  font-size: 0.725rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.stat-num {
  font-family: var(--font-mono);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
}

.over-budget { color: #dc2626; }
.under-budget { color: #16a34a; }

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 0.95rem;
  font-size: 0.825rem;
  font-weight: 600;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-sm {
  padding: 0.4rem 0.75rem;
  font-size: 0.775rem;
}

.btn-secondary {
  background: #ffffff;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}
.btn-secondary:hover {
  background: #f8fafc;
  color: var(--text-primary);
  border-color: var(--border-medium);
}

.btn-danger-outline {
  background: transparent;
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #dc2626;
}
.btn-danger-outline:hover {
  background: #fef2f2;
  border-color: #ef4444;
}

.btn-outline-cyan {
  background: var(--bsi-teal-light);
  border: 1px solid rgba(0, 160, 160, 0.35);
  color: var(--bsi-teal-dark);
}
.btn-outline-cyan:hover {
  background: rgba(0, 160, 160, 0.18);
  border-color: var(--bsi-teal);
}

.btn-primary {
  background: linear-gradient(135deg, #00a0a0 0%, #008787 100%);
  border: 1px solid #008787;
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 160, 160, 0.25);
}
.btn-primary:hover {
  background: linear-gradient(135deg, #00b5b5 0%, #00a0a0 100%);
}

.btn-danger {
  background: #dc2626;
  border: 1px solid #dc2626;
  color: #fff;
}
.btn-danger:hover { background: #b91c1c; }

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.modal-card {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 460px;
  box-shadow: var(--shadow-lg);
  animation: modal-pop 0.2s ease-out;
}

.edit-card {
  max-width: 560px;
}

@keyframes modal-pop {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-subtle);
}

.modal-header h3 {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
}
.close-btn:hover { color: var(--text-primary); }

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid var(--border-subtle);
  background: #f8fafc;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
}

.form-row {
  display: flex;
  gap: 1.25rem;
}
.col { flex: 1; }

.input-control, .select-control, .textarea-control {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  padding: 0.6rem 0.85rem;
  font-size: 0.875rem;
  outline: none;
  transition: all 0.15s ease;
}
.input-control:focus, .select-control:focus, .textarea-control:focus {
  border-color: var(--bsi-teal);
  box-shadow: 0 0 0 3px rgba(0, 160, 160, 0.15);
}

.textarea-control {
  resize: vertical;
  min-height: 80px;
}

@media (max-width: 640px) {
  .ticket-detail-view {
    padding: 0.5rem 0 3rem;
    gap: 1.25rem;
  }

  .ticket-header-card {
    padding: 1.25rem 1rem;
    gap: 1rem;
  }

  .header-top {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .card {
    padding: 1.25rem 1rem;
    gap: 1rem;
  }

  .meta-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .status-choices {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .form-row {
    flex-direction: column;
    gap: 0.75rem;
  }
}
</style>
