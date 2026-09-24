<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { changePasswordApi } from '@/api/auth';

const authStore = useAuthStore();

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const errorMsg = ref('');
const isSubmitting = ref(false);

async function handleSubmit() {
  errorMsg.value = '';

  if (!currentPassword.value) {
    errorMsg.value = 'Please enter your current or temporary password.';
    return;
  }
  if (!newPassword.value || newPassword.value.length < 6) {
    errorMsg.value = 'New password must be at least 6 characters long.';
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = 'Passwords do not match.';
    return;
  }

  isSubmitting.value = true;
  try {
    const updatedUser = await changePasswordApi(currentPassword.value, newPassword.value);
    authStore.updateUser(updatedUser);
  } catch (err) {
    errorMsg.value = err.message || 'Failed to update password. Please check your current password.';
  } finally {
    isSubmitting.value = false;
  }
}

async function handleLogout() {
  await authStore.logout();
}
</script>

<template>
  <Teleport to="body">
    <div v-if="authStore.user?.mustChangePassword" class="modal-backdrop">
      <div class="modal-card glass-card">
        <div class="modal-header">
          <div class="icon-circle">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <div>
            <h2>Security Action Required</h2>
            <p class="subtitle">Please update your temporary password to continue.</p>
          </div>
        </div>

        <div class="notice-box">
          An administrator recently reset your credentials or requested a password change. For security reasons, you cannot access your account until you set a new secure password.
        </div>

        <form @submit.prevent="handleSubmit" class="form-body">
          <div v-if="errorMsg" class="error-banner">
            {{ errorMsg }}
          </div>

          <div class="form-group">
            <label>Current / Temporary Password</label>
            <input
              v-model="currentPassword"
              type="password"
              placeholder="Enter temporary password"
              autocomplete="current-password"
              required
              class="input-field"
            />
          </div>

          <div class="form-group">
            <label>New Password</label>
            <input
              v-model="newPassword"
              type="password"
              placeholder="At least 6 characters"
              autocomplete="new-password"
              required
              class="input-field"
            />
          </div>

          <div class="form-group">
            <label>Confirm New Password</label>
            <input
              v-model="confirmPassword"
              type="password"
              placeholder="Re-enter new password"
              autocomplete="new-password"
              required
              class="input-field"
            />
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="handleLogout">
              Log Out
            </button>
            <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
              {{ isSubmitting ? 'Updating Password...' : 'Save & Continue' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  box-sizing: border-box;
}

.modal-card {
  background: var(--bg-surface, #1e293b);
  border-radius: var(--radius-xl, 16px);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
  width: 100%;
  max-width: 480px;
  margin: auto;
  padding: 2rem;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.icon-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--warning-bg, #fef3c7);
  color: var(--warning-text, #d97706);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modal-header h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary, #ffffff);
  margin: 0;
}

.subtitle {
  font-size: 0.875rem;
  color: var(--text-muted, #94a3b8);
  margin: 0.25rem 0 0;
}

.notice-box {
  background: rgba(2, 132, 199, 0.1);
  border-left: 4px solid var(--primary-color, #38bdf8);
  padding: 0.875rem 1rem;
  border-radius: var(--radius-md, 8px);
  font-size: 0.875rem;
  color: var(--text-secondary, #cbd5e1);
  line-height: 1.5;
  margin-bottom: 1.5rem;
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.error-banner {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  font-size: 0.875rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md, 8px);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary, #cbd5e1);
}

.input-field {
  padding: 0.65rem 0.875rem;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.15));
  background: rgba(15, 23, 42, 0.6);
  font-size: 0.95rem;
  color: var(--text-primary, #ffffff);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.input-field:focus {
  border-color: var(--primary-color, #38bdf8);
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.btn {
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius-md, 8px);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
}

.btn-primary {
  background: var(--primary-color, #2563eb);
  color: #ffffff;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover, #1d4ed8);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-hover, #f1f5f9);
  color: var(--text-secondary, #64748b);
  border: 1px solid var(--border-color, #e2e8f0);
}

.btn-secondary:hover {
  background: #e2e8f0;
  color: var(--text-primary, #0f172a);
}
</style>
