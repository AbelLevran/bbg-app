<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useTicketsStore } from '@/stores/tickets';
import { ticketsApi } from '@/api/tickets';
import { orgApi } from '@/api/org';
import { ArrowLeft, PlusCircle, Calendar, Clock, AlertCircle, Repeat } from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();
const ticketsStore = useTicketsStore();

const users = ref([]);
const loadingUsers = ref(false);
const submitting = ref(false);
const error = ref('');

// Form model
const form = ref({
  title: '',
  description: '',
  requestedBy: '',
  assignedTo: '',
  priority: 'MEDIUM',
  estimatedMinutes: 60,
  dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow default
  clusterType: 'DAILY',
  clusterName: ''
});

const customEstimate = ref('');
const isCustomEstimate = ref(false);

// Recurring Series state (prd.md §3.7)
const isRecurring = ref(false);
const recurrenceFrequency = ref('DAILY');
const occurrencesCount = ref(5);

const estimatePresets = [
  { label: '30m', val: 30 },
  { label: '1h', val: 60 },
  { label: '2h', val: 120 },
  { label: '4h', val: 240 },
  { label: '8h', val: 480 }
];

function selectEstimatePreset(val) {
  form.value.estimatedMinutes = val;
  isCustomEstimate.value = false;
  customEstimate.value = '';
}

function handleCustomEstimate() {
  isCustomEstimate.value = true;
  const parsed = parseInt(customEstimate.value, 10);
  if (!isNaN(parsed) && parsed > 0) {
    form.value.estimatedMinutes = parsed;
  }
}

// Scoped assignable users
const assignableUsers = computed(() => {
  const current = authStore.user;
  if (!current) return [];

  if (current.role === 'HEAD_GROUP') {
    return users.value;
  }
  if (current.role === 'DEPARTMENT_HEAD') {
    return users.value.filter(u => u.id === current.id || u.department_id === current.departmentId);
  }
  // MEMBER: only self
  return users.value.filter(u => u.id === current.id);
});

onMounted(async () => {
  loadingUsers.value = true;
  try {
    const res = await orgApi.getUsers();
    users.value = res.users || [];

    // Defaults
    if (authStore.user) {
      form.value.requestedBy = authStore.user.id;
      form.value.assignedTo = authStore.user.id;
    }
  } catch (err) {
    error.value = 'Failed to load user lists';
  } finally {
    loadingUsers.value = false;
  }
});

async function handleSubmit() {
  error.value = '';
  if (!form.value.title.trim()) {
    error.value = 'Title is required.';
    return;
  }
  if (!form.value.requestedBy) {
    error.value = 'Requested By is required.';
    return;
  }
  if (!form.value.assignedTo) {
    error.value = 'Assigned To is required.';
    return;
  }
  if (form.value.clusterType === 'EVENT' && !form.value.clusterName.trim()) {
    error.value = 'Event cluster name is required when Cluster Type is Event.';
    return;
  }

  const finalEst = isCustomEstimate.value ? parseInt(customEstimate.value, 10) : form.value.estimatedMinutes;
  if (!finalEst || finalEst <= 0) {
    error.value = 'Estimated time must be greater than 0 minutes.';
    return;
  }

  submitting.value = true;
  try {
    if (isRecurring.value) {
      const recurringPayload = {
        seriesLabel: form.value.title.trim(),
        frequency: recurrenceFrequency.value,
        occurrences: parseInt(occurrencesCount.value, 10) || 5,
        startDueDate: form.value.dueDate,
        requestedBy: form.value.requestedBy,
        assignedTo: form.value.assignedTo,
        priority: form.value.priority,
        estimatedMinutes: finalEst,
        description: form.value.description.trim() || undefined,
        clusterType: form.value.clusterType,
        clusterName: form.value.clusterType === 'EVENT' ? form.value.clusterName.trim() : undefined
      };

      await ticketsApi.createRecurringSeries(recurringPayload);
      router.push('/tickets');
    } else {
      const payload = {
        title: form.value.title.trim(),
        description: form.value.description.trim() || undefined,
        requestedBy: form.value.requestedBy,
        assignedTo: form.value.assignedTo,
        priority: form.value.priority,
        estimatedMinutes: finalEst,
        dueDate: form.value.dueDate,
        clusterType: form.value.clusterType,
        clusterName: form.value.clusterType === 'EVENT' ? form.value.clusterName.trim() : undefined
      };

      const newTicket = await ticketsStore.createTicket(payload);
      router.push(`/tickets/${newTicket.id}`);
    }
  } catch (err) {
    error.value = err.message || 'Failed to create ticket';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="new-ticket-page">
    <div class="page-top">
      <button class="btn-back" @click="router.push('/tickets')">
        <ArrowLeft :size="16" />
        Back to Tickets
      </button>
      <h2 class="page-title">Create New Ticket</h2>
      <p class="page-subtitle">Add a task to the queue and allocate estimated effort.</p>
    </div>

    <form class="ticket-form-card" @submit.prevent="handleSubmit">
      <div v-if="error" class="error-banner">
        <AlertCircle :size="16" />
        <span>{{ error }}</span>
      </div>

      <!-- Title -->
      <div class="form-group">
        <label for="ticket-title">Title <span class="required">*</span></label>
        <input
          id="ticket-title"
          v-model="form.title"
          type="text"
          placeholder="e.g. Audit Q3 Retail branch operations"
          class="input-control"
          required
        />
      </div>

      <!-- Description -->
      <div class="form-group">
        <label for="ticket-desc">Description</label>
        <textarea
          id="ticket-desc"
          v-model="form.description"
          rows="3"
          placeholder="Add detailed scope, requirements, or links..."
          class="input-control textarea-control"
        ></textarea>
      </div>

      <!-- Row: Requested By & Assigned To -->
      <div class="form-row">
        <div class="form-group col">
          <label for="requested-by">Requested By <span class="required">*</span></label>
          <select id="requested-by" v-model="form.requestedBy" class="select-control" required>
            <option disabled value="">Select requester...</option>
            <option v-for="u in users" :key="u.id" :value="u.id">
              {{ u.name }} ({{ u.department?.name || 'Group' }})
            </option>
          </select>
        </div>

        <div class="form-group col">
          <label for="assigned-to">Assigned To <span class="required">*</span></label>
          <select id="assigned-to" v-model="form.assignedTo" class="select-control" required>
            <option disabled value="">Select assignee...</option>
            <option v-for="u in assignableUsers" :key="u.id" :value="u.id">
              {{ u.name }} ({{ u.title }})
            </option>
          </select>
          <span v-if="authStore.role === 'MEMBER'" class="role-hint">
            Members can only assign tickets to themselves.
          </span>
          <span v-else-if="authStore.role === 'DEPARTMENT_HEAD'" class="role-hint">
            Department Heads can assign within their department.
          </span>
        </div>
      </div>

      <!-- Row: Priority & Due Date -->
      <div class="form-row">
        <div class="form-group col">
          <label>Priority</label>
          <div class="priority-selector">
            <label class="prio-opt" :class="{ active: form.priority === 'LOW' }">
              <input v-model="form.priority" type="radio" value="LOW" />
              Low
            </label>
            <label class="prio-opt" :class="{ active: form.priority === 'MEDIUM' }">
              <input v-model="form.priority" type="radio" value="MEDIUM" />
              Medium
            </label>
            <label class="prio-opt" :class="{ active: form.priority === 'HIGH' }">
              <input v-model="form.priority" type="radio" value="HIGH" />
              High
            </label>
          </div>
        </div>

        <div class="form-group col">
          <label for="due-date">Due Date <span class="required">*</span></label>
          <div class="date-input-wrap">
            <Calendar :size="16" class="field-icon" />
            <input
              id="due-date"
              v-model="form.dueDate"
              type="date"
              class="input-control with-icon"
              required
            />
          </div>
        </div>
      </div>

      <!-- Estimated Time -->
      <div class="form-group">
        <label>Estimated Effort (Duration)</label>
        <div class="presets-row">
          <button
            v-for="p in estimatePresets"
            :key="p.val"
            type="button"
            class="preset-chip"
            :class="{ active: !isCustomEstimate && form.estimatedMinutes === p.val }"
            @click="selectEstimatePreset(p.val)"
          >
            {{ p.label }}
          </button>
          <input
            v-model="customEstimate"
            type="number"
            min="1"
            placeholder="Custom mins"
            class="custom-mins-input"
            @input="handleCustomEstimate"
          />
        </div>
      </div>

      <!-- Cluster Type & Cluster Name -->
      <div class="form-row">
        <div class="form-group col">
          <label>Task Cluster</label>
          <div class="cluster-toggle">
            <button
              type="button"
              class="cluster-btn"
              :class="{ active: form.clusterType === 'DAILY' }"
              @click="form.clusterType = 'DAILY'"
            >
              Daily Task
            </button>
            <button
              type="button"
              class="cluster-btn"
              :class="{ active: form.clusterType === 'EVENT' }"
              @click="form.clusterType = 'EVENT'"
            >
              Event Task
            </button>
          </div>
        </div>

        <div v-if="form.clusterType === 'EVENT'" class="form-group col">
          <label for="event-name">Event Name <span class="required">*</span></label>
          <input
            id="event-name"
            v-model="form.clusterName"
            type="text"
            placeholder="e.g. Q4 Townhall, Expo 2026"
            class="input-control"
            required
          />
        </div>
      </div>

      <!-- Recurring Series Toggle (prd.md §3.7) -->
      <div class="recurring-section glass-card">
        <div class="recurring-header">
          <label class="toggle-label">
            <input v-model="isRecurring" type="checkbox" class="toggle-checkbox" />
            <span class="toggle-switch"></span>
            <div class="toggle-text">
              <span class="t-title"><Repeat :size="14" class="inline-icon" /> Make this a recurring series</span>
              <span class="t-desc">Generates a batch of independent, linked occurrences on a cadence</span>
            </div>
          </label>
        </div>

        <div v-if="isRecurring" class="recurring-fields">
          <div class="form-row">
            <div class="form-group col">
              <label>Frequency</label>
              <div class="cluster-toggle">
                <button
                  type="button"
                  class="cluster-btn"
                  :class="{ active: recurrenceFrequency === 'DAILY' }"
                  @click="recurrenceFrequency = 'DAILY'"
                >
                  Daily
                </button>
                <button
                  type="button"
                  class="cluster-btn"
                  :class="{ active: recurrenceFrequency === 'WEEKLY' }"
                  @click="recurrenceFrequency = 'WEEKLY'"
                >
                  Weekly
                </button>
              </div>
            </div>

            <div class="form-group col">
              <label for="occ-count">Number of Occurrences</label>
              <input
                id="occ-count"
                v-model.number="occurrencesCount"
                type="number"
                min="1"
                max="30"
                class="input-control"
                placeholder="5"
                required
              />
              <span class="role-hint">Creates {{ occurrencesCount }} independent occurrences starting from {{ form.dueDate }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="router.push('/tickets')">
          Cancel
        </button>
        <button type="submit" class="btn btn-primary" :disabled="submitting">
          <PlusCircle :size="16" />
          {{ submitting ? 'Creating Ticket...' : 'Create Ticket' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.new-ticket-page {
  max-width: 820px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
}

.page-top {
  margin-bottom: 2rem;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0;
  margin-bottom: 0.75rem;
  transition: color 0.15s ease;
}
.btn-back:hover { color: var(--text-primary); }

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.25rem;
}

.page-subtitle {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0;
}

.ticket-form-card {
  background: #ffffff;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 2.25rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  box-shadow: var(--shadow-sm);
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.85rem 1.15rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-md);
  color: #dc2626;
  font-size: 0.85rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--text-primary);
}

.required { color: #ef4444; }

.role-hint {
  font-size: 0.725rem;
  color: var(--text-muted);
  font-style: italic;
}

.form-row {
  display: flex;
  gap: 1.5rem;
}

.col {
  flex: 1;
}

.input-control, .select-control, .textarea-control {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  padding: 0.65rem 0.85rem;
  font-size: 0.875rem;
  outline: none;
  transition: all 0.2s ease;
}

.input-control:focus, .select-control:focus, .textarea-control:focus {
  border-color: var(--bsi-teal);
  box-shadow: 0 0 0 3px rgba(0, 160, 160, 0.15);
}

.select-control {
  cursor: pointer;
}
.select-control option {
  background: #ffffff;
  color: var(--text-primary);
}

.textarea-control {
  resize: vertical;
  min-height: 90px;
  line-height: 1.5;
}

.date-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.field-icon {
  position: absolute;
  left: 0.75rem;
  color: var(--bsi-teal);
  pointer-events: none;
}

.with-icon {
  padding-left: 2.25rem !important;
  width: 100%;
}

.priority-selector {
  display: flex;
  gap: 0.65rem;
}

.prio-opt {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.65rem;
  background: #f8fafc;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 0.825rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.prio-opt:hover {
  background: #f1f5f9;
  color: var(--text-primary);
}

.prio-opt input {
  display: none;
}

.prio-opt.active {
  background: var(--bsi-teal-light);
  border-color: var(--bsi-teal);
  color: var(--bsi-teal-dark);
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 160, 160, 0.15);
}

.presets-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.preset-chip {
  background: #f8fafc;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  padding: 0.45rem 0.85rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-chip:hover {
  background: #f1f5f9;
  color: var(--text-primary);
  border-color: var(--border-medium);
}

.preset-chip.active {
  background: var(--bsi-teal-light);
  border-color: var(--bsi-teal);
  color: var(--bsi-teal-dark);
  font-weight: 700;
}

.custom-mins-input {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  padding: 0.45rem 0.75rem;
  font-size: 0.8rem;
  width: 130px;
  outline: none;
  transition: all 0.2s ease;
}
.custom-mins-input:focus {
  border-color: var(--bsi-teal);
  box-shadow: 0 0 0 3px rgba(0, 160, 160, 0.15);
}

.cluster-toggle {
  display: flex;
  background: #f1f5f9;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.25rem;
  gap: 0.25rem;
}

.cluster-btn {
  flex: 1;
  padding: 0.55rem;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.825rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cluster-btn:hover {
  color: var(--text-primary);
}

.cluster-btn.active {
  background: var(--bsi-teal);
  color: #ffffff;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(0, 160, 160, 0.25);
}

/* Recurring Series Section */
.recurring-section {
  background: #f8fafc;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.35rem 1.6rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.recurring-header {
  display: flex;
  align-items: center;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  cursor: pointer;
  user-select: none;
  width: 100%;
}

.toggle-checkbox {
  display: none;
}

.toggle-switch {
  width: 42px;
  height: 24px;
  background: #cbd5e1;
  border-radius: var(--radius-full);
  position: relative;
  transition: all 0.25s ease;
  flex-shrink: 0;
}

.toggle-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: #ffffff;
  border-radius: 50%;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-checkbox:checked + .toggle-switch {
  background: var(--bsi-teal);
}

.toggle-checkbox:checked + .toggle-switch::after {
  transform: translateX(18px);
}

.toggle-text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.t-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.t-desc {
  font-size: 0.775rem;
  color: var(--text-muted);
}

.inline-icon {
  color: var(--bsi-teal);
}

.recurring-fields {
  padding-top: 1.25rem;
  border-top: 1px dashed var(--border-color);
}

.form-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1.75rem;
  border-top: 1px solid var(--border-subtle);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 1.4rem;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s ease;
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

.btn-primary {
  background: linear-gradient(135deg, #00a0a0 0%, #008787 100%);
  border: 1px solid #008787;
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 160, 160, 0.25);
}
.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #00b5b5 0%, #00a0a0 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(0, 160, 160, 0.35);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
