<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { Layers, Lock, User, AlertCircle, ArrowRight, CheckCircle2, ShieldCheck, Briefcase } from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const username = ref('');
const password = ref('');
const errorMessage = ref('');
const showQuickPicker = ref(true);

const quickUsers = [
  { username: 'ahmad', name: 'Ahmad Fauzi', role: 'HEAD_GROUP', badge: 'Head Group', dept: 'Oversight' },
  { username: 'budi', name: 'Budi Santoso', role: 'DEPARTMENT_HEAD', badge: 'Dept Head', dept: 'BMS' },
  { username: 'citra', name: 'Citra Dewi', role: 'MEMBER', badge: 'Member', dept: 'BMS' },
  { username: 'fajar', name: 'Fajar Nugraha', role: 'DEPARTMENT_HEAD', badge: 'Dept Head', dept: 'Retail' },
  { username: 'indri', name: 'Indri Safitri', role: 'DEPARTMENT_HEAD', badge: 'Dept Head', dept: 'Wholesale' },
  { username: 'maya', name: 'Maya Anggraini', role: 'DEPARTMENT_HEAD', badge: 'Dept Head', dept: 'Production' }
];

function pickUser(u) {
  username.value = u.username;
  password.value = 'password123';
  errorMessage.value = '';
}

async function handleLogin() {
  if (!username.value || !password.value) {
    errorMessage.value = 'Please enter both username and password.';
    return;
  }

  errorMessage.value = '';
  try {
    await authStore.login(username.value, password.value);
    const redirectPath = route.query.redirect || '/dashboard';
    router.push(redirectPath);
  } catch (err) {
    errorMessage.value = err.message || 'Authentication failed. Please check credentials.';
  }
}
</script>

<template>
  <div class="login-page">
    <div class="glow-orb glow-orb-1"></div>
    <div class="glow-orb glow-orb-2"></div>

    <div class="login-container">
      <!-- Brand Header -->
      <div class="login-header">
        <div class="brand-badge">
          <Layers :size="28" class="brand-icon" />
        </div>
        <h1 class="system-title">BBG System</h1>
        <p class="system-desc">Group Work Management & Burnout Tracker</p>
      </div>

      <!-- Login Form Card -->
      <div class="login-card glass-card">
        <h2 class="card-title">Sign In</h2>
        <p class="card-subtitle">Enter your organization credentials</p>

        <!-- Error Alert -->
        <div v-if="errorMessage" class="error-alert">
          <AlertCircle :size="16" class="error-icon" />
          <span>{{ errorMessage }}</span>
        </div>

        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <label for="input-username" class="form-label">Username</label>
            <div class="input-wrap">
              <User :size="16" class="input-icon" />
              <input
                id="input-username"
                v-model="username"
                type="text"
                class="input-field with-icon"
                placeholder="e.g. ahmad, budi, citra"
                autocomplete="username"
                required
              />
            </div>
          </div>

          <div class="form-group">
            <label for="input-password" class="form-label">Password</label>
            <div class="input-wrap">
              <Lock :size="16" class="input-icon" />
              <input
                id="input-password"
                v-model="password"
                type="password"
                class="input-field with-icon"
                placeholder="Enter password"
                autocomplete="current-password"
                required
              />
            </div>
          </div>

          <button
            id="btn-login-submit"
            type="submit"
            class="btn btn-primary btn-submit"
            :disabled="authStore.isLoading"
          >
            <span v-if="!authStore.isLoading">Sign In</span>
            <span v-else>Authenticating...</span>
            <ArrowRight v-if="!authStore.isLoading" :size="16" />
          </button>
        </form>

        <!-- Quick Select Seed Users (Dev Helper) -->
        <div class="quick-pick-section">
          <div class="quick-pick-header" @click="showQuickPicker = !showQuickPicker">
            <span>Quick Select Test Account (15 Seeded Users)</span>
            <span class="toggle-text">{{ showQuickPicker ? 'Hide' : 'Show' }}</span>
          </div>

          <div v-if="showQuickPicker" class="quick-users-grid">
            <button
              v-for="u in quickUsers"
              :key="u.username"
              type="button"
              class="quick-user-btn"
              :class="{ active: username === u.username }"
              @click="pickUser(u)"
            >
              <div class="quick-user-top">
                <span class="quick-user-username">{{ u.username }}</span>
                <span class="quick-role-pill" :class="`pill-${u.role.toLowerCase()}`">{{ u.badge }}</span>
              </div>
              <div class="quick-user-bottom">
                <span class="quick-user-name">{{ u.name }}</span>
                <span class="quick-dept">{{ u.dept }}</span>
              </div>
            </button>
          </div>
          <p class="quick-note">All seeded user accounts use password: <code>password123</code></p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-app);
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
}

/* Background glows */
.glow-orb {
  position: absolute;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  filter: blur(120px);
  pointer-events: none;
  opacity: 0.15;
}
.glow-orb-1 {
  background: #0284c7;
  top: -100px;
  left: -100px;
}
.glow-orb-2 {
  background: #6366f1;
  bottom: -100px;
  right: -100px;
}

.login-container {
  width: 100%;
  max-width: 480px;
  position: relative;
  z-index: 10;
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.brand-badge {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  box-shadow: 0 0 24px rgba(2, 132, 199, 0.4);
  margin-bottom: 1rem;
}

.system-title {
  font-size: 1.65rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.system-desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.login-card {
  padding: 2.25rem 2rem;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
}

.card-subtitle {
  font-size: 0.825rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
  margin-bottom: 1.5rem;
}

.error-alert {
  background: rgba(244, 63, 94, 0.1);
  border: 1px solid rgba(244, 63, 94, 0.3);
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: #fb7185;
  font-size: 0.825rem;
  margin-bottom: 1.25rem;
}

.error-icon {
  flex-shrink: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 0.875rem;
  color: var(--text-muted);
  pointer-events: none;
}

.input-field.with-icon {
  padding-left: 2.5rem;
}

.btn-submit {
  width: 100%;
  padding: 0.75rem;
  font-size: 0.925rem;
  margin-top: 0.5rem;
}

/* Quick Pick Section */
.quick-pick-section {
  margin-top: 1.75rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border-subtle);
}

.quick-pick-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  cursor: pointer;
  margin-bottom: 0.75rem;
}

.quick-pick-header:hover {
  color: var(--text-secondary);
}

.toggle-text {
  color: var(--brand-primary);
  font-weight: 600;
}

.quick-users-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.quick-user-btn {
  background: var(--bg-surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.55rem 0.65rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.quick-user-btn:hover {
  background: var(--bg-surface-hover);
  border-color: var(--border-medium);
}

.quick-user-btn.active {
  border-color: var(--brand-primary);
  background: rgba(2, 132, 199, 0.15);
}

.quick-user-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quick-user-username {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-primary);
}

.quick-role-pill {
  font-size: 0.65rem;
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-full);
  font-weight: 600;
}

.pill-head_group {
  background: rgba(168, 85, 247, 0.2);
  color: #d8b4fe;
}
.pill-department_head {
  background: rgba(14, 165, 233, 0.2);
  color: #7dd3fc;
}
.pill-member {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
}

.quick-user-bottom {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: var(--text-muted);
}

.quick-user-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 90px;
}

.quick-dept {
  font-weight: 600;
  color: var(--text-secondary);
}

.quick-note {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-align: center;
}

.quick-note code {
  font-family: var(--font-mono);
  color: var(--text-secondary);
  background: var(--bg-surface-elevated);
  padding: 0.1rem 0.3rem;
  border-radius: var(--radius-sm);
}
</style>
