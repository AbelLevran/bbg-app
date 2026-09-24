<script setup>
import { ref } from 'vue';
import { AlertOctagon, X } from 'lucide-vue-next';

const props = defineProps({
  show: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'confirm']);

const reason = ref('');
const error = ref('');

function handleConfirm() {
  if (!reason.value.trim()) {
    error.value = 'Please provide a reason explaining why the ticket is stuck.';
    return;
  }
  emit('confirm', reason.value.trim());
  reason.value = '';
  error.value = '';
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <div class="modal-title-wrap">
          <div class="icon-wrap">
            <AlertOctagon :size="18" class="header-icon" />
          </div>
          <h3>Mark Ticket as Stuck</h3>
        </div>
        <button class="close-btn" @click="$emit('close')">
          <X :size="18" />
        </button>
      </div>

      <div class="modal-body">
        <p class="desc">
          When marking a ticket as <strong>Stuck</strong>, a clear reason is required so team members and leadership understand the blocker.
        </p>

        <div class="form-group">
          <label for="stuck-reason-input">Blocker / Reason <span class="required">*</span></label>
          <textarea
            id="stuck-reason-input"
            v-model="reason"
            rows="3"
            placeholder="Describe what is blocking this ticket (e.g., Awaiting client approval on design specs)..."
            class="textarea-control"
          ></textarea>
        </div>

        <div v-if="error" class="error-msg">
          {{ error }}
        </div>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" @click="$emit('close')">
          Cancel
        </button>
        <button type="button" class="btn btn-danger" @click="handleConfirm">
          Confirm Stuck
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.modal-container {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 440px;
  box-shadow: var(--shadow-lg);
  animation: modal-pop 0.2s ease-out;
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

.modal-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.icon-wrap {
  background: rgba(239, 68, 68, 0.15);
  padding: 0.35rem;
  border-radius: var(--radius-md);
  display: flex;
}

.header-icon {
  color: #ef4444;
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
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

.desc strong {
  color: #dc2626;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
}

.required {
  color: #ef4444;
}

.textarea-control {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  padding: 0.55rem 0.75rem;
  font-size: 0.85rem;
  outline: none;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.15s ease;
}

.textarea-control:focus {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
}

.error-msg {
  font-size: 0.8rem;
  color: #dc2626;
  background: #fef2f2;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid #fecaca;
}

.modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-subtle);
  background: #f8fafc;
}

.btn {
  padding: 0.55rem 1.1rem;
  font-size: 0.825rem;
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
.btn-secondary:hover { background: #f8fafc; color: var(--text-primary); }

.btn-danger {
  background: #dc2626;
  border: 1px solid #dc2626;
  color: #fff;
}
.btn-danger:hover { background: #b91c1c; }
</style>
