<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { usePreloadStore } from '@/stores/preload';
import { Layers, Lock, User, AlertCircle, ArrowRight, CheckCircle2, ShieldCheck, Briefcase, Sparkles, Loader2 } from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const preloadStore = usePreloadStore();

const username = ref('');
const password = ref('');
const errorMessage = ref('');
const showQuickPicker = ref(false);

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
    const data = await authStore.login(username.value, password.value);
    // Warmup entire workspace before routing to dashboard
    await preloadStore.warmup(data.user);
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
        <h1 class="system-title">BBG GROUP</h1>
        <p class="system-desc">Group Work Management & Burnout Tracker</p>
      </div>

      <!-- Login Form Card -->
      <div class="login-card glass-card">
        <!-- Warmup Preload Screen (when user logs in successfully) -->
        <div v-if="preloadStore.isPreloading" class="warmup-container">
          <div class="warmup-icon-wrapper">
            <div class="pulse-ring"></div>
            <Layers :size="32" class="warmup-icon" />
          </div>

          <h2 class="warmup-title">Preparing Workspace</h2>
          <p class="warmup-desc">{{ preloadStore.statusMessage }}</p>

          <!-- Progress bar -->
          <div class="progress-track">
            <div class="progress-bar-fill" :style="{ width: `${preloadStore.progress}%` }"></div>
          </div>
          <div class="progress-meta">
            <span class="meta-label">
              <Loader2 :size="12" class="spin-icon" />
              Initial data synchronization...
            </span>
            <span class="progress-percentage">{{ preloadStore.progress }}%</span>
          </div>

          <div class="warmup-tip">
            <Sparkles :size="15" class="tip-icon" />
            <span>All modules are being pre-loaded so that page navigation will be <strong>instant, seamless, and lightning fast</strong>.</span>
          </div>
        </div>

        <!-- Standard Login View -->
        <template v-else>
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
              :disabled="authStore.isLoading || preloadStore.isPreloading"
            >
              <span v-if="!authStore.isLoading">Sign In</span>
              <span v-else>Authenticating...</span>
              <ArrowRight v-if="!authStore.isLoading" :size="16" />
            </button>
          </form>
        </template>

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
  opacity: 0.12;
}
.glow-orb-1 {
  background: #00a0a0;
  top: -100px;
  left: -100px;
}
.glow-orb-2 {
  background: #f0b43c;
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
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, #00a0a0 0%, #008787 100%);
  border: 2px solid rgba(240, 180, 60, 0.4);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 160, 160, 0.25);
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
  color: var(--bsi-teal);
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
  border-color: var(--bsi-teal);
  background: var(--bsi-teal-light);
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
  background: rgba(240, 180, 60, 0.15);
  color: #b47806;
}
.pill-department_head {
  background: var(--bsi-teal-light);
  color: var(--bsi-teal-dark);
}
.pill-member {
  background: #f0fdf4;
  color: #15803d;
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

/* ─── Warmup Screen Styles ────────────────────────────────────────── */
.warmup-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1.75rem 0.5rem 1rem;
  animation: fadeIn 0.4s ease-out;
}

.warmup-icon-wrapper {
  position: relative;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bsi-teal-light);
  border-radius: 50%;
  margin-bottom: 1.5rem;
}

.warmup-icon {
  color: var(--bsi-teal);
  position: relative;
  z-index: 2;
  animation: floatIcon 2s ease-in-out infinite;
}

.pulse-ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 2px solid var(--bsi-teal);
  opacity: 0.6;
  animation: pulseExpand 2s cubic-bezier(0.24, 0, 0.38, 1) infinite;
}

.warmup-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.35rem;
}

.warmup-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  min-height: 22px;
  margin-bottom: 1.5rem;
  transition: all 0.2s ease;
}

.progress-track {
  width: 100%;
  height: 8px;
  background: var(--bg-surface-elevated, #f1f5f9);
  border-radius: var(--radius-full);
  overflow: hidden;
  position: relative;
  margin-bottom: 0.5rem;
  border: 1px solid var(--border-subtle);
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--bsi-teal), #0284c7);
  border-radius: var(--radius-full);
  transition: width 0.35s ease;
  box-shadow: 0 0 12px rgba(0, 163, 157, 0.4);
}

.progress-meta {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 1.5rem;
}

.meta-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.spin-icon {
  animation: spin 1.2s linear infinite;
  color: var(--bsi-teal);
}

.progress-percentage {
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--bsi-teal-dark, #0f766e);
}

.warmup-tip {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: var(--radius-md);
  padding: 0.75rem 0.85rem;
  font-size: 0.76rem;
  color: #166534;
  line-height: 1.4;
  text-align: left;
}

.tip-icon {
  flex-shrink: 0;
  color: #15803d;
  margin-top: 1px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulseExpand {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.15); opacity: 0.2; }
  100% { transform: scale(0.95); opacity: 0.8; }
}

@keyframes floatIcon {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
