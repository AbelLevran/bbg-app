<script setup>
import { useRouter } from 'vue-router';
import { AlertCircle, Play, X, ExternalLink } from 'lucide-vue-next';

const props = defineProps({
  show: { type: Boolean, default: false },
  conflict: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['close', 'stopAndStart']);
const router = useRouter();

function goToActiveTicket() {
  if (props.conflict?.ticketId) {
    emit('close');
    router.push(`/tickets/${props.conflict.ticketId}`);
  }
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <div class="modal-title-wrap">
          <div class="icon-wrap">
            <AlertCircle :size="20" class="warning-icon" />
          </div>
          <h3>Active Timer Conflict</h3>
        </div>
        <button class="close-btn" @click="$emit('close')">
          <X :size="18" />
        </button>
      </div>

      <div class="modal-body">
        <p class="conflict-message">
          You already have an active timer running on another ticket. Per system policy, you can only track time on one ticket at a time.
        </p>

        <div class="ticket-preview-card" v-if="conflict?.ticketNumber || conflict?.ticketTitle">
          <div class="ticket-tag">{{ conflict.ticketNumber || 'TICKET' }}</div>
          <div class="ticket-name">{{ conflict.ticketTitle || 'Untitled Ticket' }}</div>
          <div class="ticket-status-pill">Status: {{ conflict.status || 'RUNNING' }}</div>
        </div>

        <p class="prompt-text">What would you like to do?</p>
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" @click="$emit('close')">
          Cancel
        </button>
        <button class="btn btn-outline" @click="goToActiveTicket">
          <ExternalLink :size="15" />
          View Active Ticket
        </button>
        <button class="btn btn-primary-stop" @click="$emit('stopAndStart')">
          <Play :size="15" />
          Stop & Start Here
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
  background: #111827;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
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
  gap: 0.75rem;
}

.icon-wrap {
  background: rgba(245, 158, 11, 0.15);
  padding: 0.4rem;
  border-radius: var(--radius-md);
  display: flex;
}

.warning-icon {
  color: #f59e0b;
}

.modal-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
}
.close-btn:hover { color: var(--text-primary); }

.modal-body {
  padding: 1.5rem;
}

.conflict-message {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 1.25rem;
}

.ticket-preview-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.9rem 1rem;
  margin-bottom: 1.25rem;
}

.ticket-tag {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--accent-cyan);
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.ticket-name {
  font-size: 0.925rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.4rem;
}

.ticket-status-pill {
  font-size: 0.75rem;
  color: #facc15;
}

.prompt-text {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary);
}

.modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-subtle);
  background: rgba(0, 0, 0, 0.2);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.85rem;
  font-size: 0.825rem;
  font-weight: 500;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
}
.btn-secondary:hover { background: rgba(255, 255, 255, 0.05); color: var(--text-primary); }

.btn-outline {
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #a5b4fc;
}
.btn-outline:hover { background: rgba(99, 102, 241, 0.2); color: #fff; }

.btn-primary-stop {
  background: #0284c7;
  border: 1px solid #0284c7;
  color: #fff;
}
.btn-primary-stop:hover { background: #0369a1; }
</style>
