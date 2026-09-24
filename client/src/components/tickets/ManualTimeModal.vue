<script setup>
import { ref } from 'vue';
import { Clock, X } from 'lucide-vue-next';

const props = defineProps({
  show: { type: Boolean, default: false },
  ticketId: { type: String, required: true }
});

const emit = defineEmits(['close', 'submit']);

const minutes = ref(30);
const customMinutes = ref('');
const isCustom = ref(false);
const reason = ref('');
const error = ref('');

const presets = [15, 30, 60, 120];

function selectPreset(val) {
  minutes.value = val;
  isCustom.value = false;
  customMinutes.value = '';
}

function handleCustomInput() {
  isCustom.value = true;
  const parsed = parseInt(customMinutes.value, 10);
  if (!isNaN(parsed) && parsed > 0) {
    minutes.value = parsed;
  }
}

function handleSubmit() {
  error.value = '';
  const finalMinutes = isCustom.value ? parseInt(customMinutes.value, 10) : minutes.value;

  if (!finalMinutes || finalMinutes <= 0) {
    error.value = 'Please specify a valid duration in minutes.';
    return;
  }

  if (!reason.value.trim()) {
    error.value = 'A reason for manual entry is required.';
    return;
  }

  emit('submit', {
    minutes: finalMinutes,
    reason: reason.value.trim()
  });

  // reset form
  reason.value = '';
  isCustom.value = false;
  customMinutes.value = '';
  minutes.value = 30;
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <div class="modal-title-wrap">
          <Clock :size="18" class="header-icon" />
          <h3>Add Manual Time</h3>
        </div>
        <button class="close-btn" @click="$emit('close')">
          <X :size="18" />
        </button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label>Select Duration</label>
          <div class="preset-grid">
            <button
              v-for="p in presets"
              :key="p"
              type="button"
              class="preset-btn"
              :class="{ active: !isCustom && minutes === p }"
              @click="selectPreset(p)"
            >
              {{ p >= 60 ? `${p / 60}h` : `${p}m` }}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label for="custom-duration">Or Custom Duration (minutes)</label>
          <input
            id="custom-duration"
            v-model="customMinutes"
            type="number"
            min="1"
            placeholder="e.g. 45"
            class="input-control"
            @input="handleCustomInput"
          />
        </div>

        <div class="form-group">
          <label for="manual-reason">Reason / Description <span class="required">*</span></label>
          <textarea
            id="manual-reason"
            v-model="reason"
            rows="3"
            placeholder="Why was this time tracked manually? (e.g., Offline client meeting)"
            class="input-control textarea-control"
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
        <button type="button" class="btn btn-primary" @click="handleSubmit">
          Log Time
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

.header-icon {
  color: var(--bsi-teal);
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
  gap: 1.1rem;
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

.preset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.preset-btn {
  background: #f8fafc;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  padding: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}

.preset-btn:hover {
  background: #f1f5f9;
  color: var(--text-primary);
  border-color: var(--border-medium);
}

.preset-btn.active {
  background: var(--bsi-teal-light);
  border-color: var(--bsi-teal);
  color: var(--bsi-teal-dark);
  font-weight: 700;
}

.input-control {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  padding: 0.55rem 0.75rem;
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.15s ease;
}

.input-control:focus, .textarea-control:focus {
  border-color: var(--bsi-teal);
  box-shadow: 0 0 0 3px rgba(0, 160, 160, 0.15);
}

.textarea-control {
  resize: vertical;
  min-height: 70px;
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

.btn-primary {
  background: linear-gradient(135deg, #00a0a0 0%, #008787 100%);
  border: 1px solid #008787;
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 160, 160, 0.25);
}
.btn-primary:hover {
  background: linear-gradient(135deg, #00b5b5 0%, #00a0a0 100%);
}
</style>
