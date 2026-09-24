<script setup>
import { ref } from 'vue';
import { changePasswordApi } from '@/api/auth';
import { KeyRound, X, Check, AlertCircle, Loader2 } from 'lucide-vue-next';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'success']);

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const errorMessage = ref('');
const successMessage = ref('');
const isSubmitting = ref(false);

function resetForm() {
  currentPassword.value = '';
  newPassword.value = '';
  confirmPassword.value = '';
  errorMessage.value = '';
  successMessage.value = '';
}

function handleClose() {
  resetForm();
  emit('close');
}

async function handleSubmit() {
  errorMessage.value = '';
  successMessage.value = '';

  if (!currentPassword.value) {
    errorMessage.value = 'Password saat ini harus diisi.';
    return;
  }
  if (!newPassword.value || newPassword.value.length < 6) {
    errorMessage.value = 'Password baru minimal 6 karakter.';
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'Konfirmasi password baru tidak cocok.';
    return;
  }

  isSubmitting.value = true;
  try {
    await changePasswordApi(currentPassword.value, newPassword.value);
    successMessage.value = 'Password berhasil diubah!';
    setTimeout(() => {
      handleClose();
      emit('success');
    }, 1500);
  } catch (err) {
    errorMessage.value = err.message || 'Gagal mengubah password. Pastikan password saat ini benar.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-backdrop" @click.self="handleClose">
      <div class="modal-card glass-card">
        <div class="modal-header">
          <div class="header-left">
            <div class="icon-wrap">
              <KeyRound :size="18" />
            </div>
            <div>
              <h3 class="modal-title">Ganti Password</h3>
              <p class="modal-subtitle">Perbarui kata sandi akun Anda</p>
            </div>
          </div>
          <button class="btn-close" @click="handleClose">
            <X :size="18" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="modal-body">
          <div v-if="errorMessage" class="alert alert-error">
            <AlertCircle :size="16" />
            <span>{{ errorMessage }}</span>
          </div>

          <div v-if="successMessage" class="alert alert-success">
            <Check :size="16" />
            <span>{{ successMessage }}</span>
          </div>

          <div class="form-group">
            <label>Password Saat Ini</label>
            <input
              v-model="currentPassword"
              type="password"
              placeholder="Masukkan password lama"
              required
              autocomplete="current-password"
              class="input-field"
            />
          </div>

          <div class="form-group">
            <label>Password Baru</label>
            <input
              v-model="newPassword"
              type="password"
              placeholder="Minimal 6 karakter"
              required
              autocomplete="new-password"
              class="input-field"
            />
          </div>

          <div class="form-group">
            <label>Konfirmasi Password Baru</label>
            <input
              v-model="confirmPassword"
              type="password"
              placeholder="Ulangi password baru"
              required
              autocomplete="new-password"
              class="input-field"
            />
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="handleClose">
              Batal
            </button>
            <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
              <Loader2 v-if="isSubmitting" :size="16" class="spin" />
              <span v-else>Simpan Password Baru</span>
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
  background-color: rgba(15, 23, 42, 0.75);
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
  width: 100%;
  max-width: 440px;
  margin: auto;
  background: var(--bg-surface, #1e293b);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
  border-radius: var(--radius-xl, 16px);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
  padding: 1.75rem;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(2, 132, 199, 0.15);
  color: #38bdf8;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary, #ffffff);
  margin: 0;
}

.modal-subtitle {
  font-size: 0.775rem;
  color: var(--text-muted, #94a3b8);
  margin: 0.15rem 0 0;
}

.btn-close {
  background: transparent;
  border: none;
  color: var(--text-muted, #94a3b8);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.alert {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 0.85rem;
  border-radius: var(--radius-md, 8px);
  font-size: 0.825rem;
}

.alert-error {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.alert-success {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #34d399;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary, #cbd5e1);
}

.input-field {
  padding: 0.6rem 0.8rem;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
  background: rgba(15, 23, 42, 0.6);
  color: var(--text-primary, #ffffff);
  font-size: 0.875rem;
  outline: none;
  transition: all 0.15s ease;
}

.input-field:focus {
  border-color: #38bdf8;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
