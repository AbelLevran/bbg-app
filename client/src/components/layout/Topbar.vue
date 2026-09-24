<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useTimerStore } from '@/stores/timer';
import RoleBadge from '@/components/common/RoleBadge.vue';
import ChangePasswordModal from '@/components/auth/ChangePasswordModal.vue';
import { LogOut, Timer, Building2, User, KeyRound, Menu } from 'lucide-vue-next';

const emit = defineEmits(['toggleMenu']);

const router = useRouter();
const authStore = useAuthStore();
const timerStore = useTimerStore();

const showChangePasswordModal = ref(false);
const user = computed(() => authStore.user);

const userInitials = computed(() => {
  if (!user.value?.name) return 'U';
  return user.value.name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
});

onMounted(() => {
  if (authStore.isAuthenticated) {
    timerStore.fetchActive();
  }
});

function goToActiveTicket() {
  if (timerStore.activeTimer?.ticketId) {
    router.push(`/tickets/${timerStore.activeTimer.ticketId}`);
  }
}

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>

<template>
  <header class="topbar">
    <div class="topbar-left">
      <button
        class="mobile-toggle-btn"
        title="Open navigation menu"
        aria-label="Open navigation menu"
        @click="emit('toggleMenu')"
      >
        <Menu :size="19" />
      </button>

      <!-- Breadcrumb / Active Context -->
      <div class="context-indicator">
        <span class="org-tag">BBG</span>
        <span class="separator">/</span>
        <span class="active-title">{{ $route.meta.title || 'Overview' }}</span>
      </div>
    </div>

    <div class="topbar-right">
      <!-- Active Timer Widget -->
      <div
        class="timer-widget-shell"
        :class="{
          'timer-running': timerStore.isRunning,
          'timer-paused': timerStore.isPaused,
          'clickable': timerStore.hasActiveTimer
        }"
        :title="timerStore.hasActiveTimer ? `Click to view ${timerStore.activeTimer.ticketNumber || 'ticket'}` : 'No active timer'"
        @click="goToActiveTicket"
      >
        <div class="timer-icon-wrap">
          <Timer :size="16" class="timer-icon" />
        </div>
        <div class="timer-info">
          <span v-if="timerStore.hasActiveTimer" class="timer-ticket-num">
            {{ timerStore.activeTimer.ticketNumber }}
          </span>
          <span class="timer-status">
            {{ timerStore.isRunning ? 'RUNNING' : (timerStore.isPaused ? 'PAUSED' : 'IDLE') }}
          </span>
          <span class="timer-elapsed">
            {{ timerStore.hasActiveTimer ? timerStore.elapsedFormatted : '--:--:--' }}
          </span>
        </div>
      </div>

      <!-- User Profile Badge & Logout -->
      <div class="user-profile-section">
        <div class="user-avatar" :title="user?.name">
          {{ userInitials }}
        </div>

        <div class="user-details">
          <div class="user-name-line">
            <span class="user-name">{{ user?.name || 'User' }}</span>
            <RoleBadge v-if="user?.role" :role="user.role" size="sm" />
          </div>
          <div class="user-subline">
            <span v-if="user?.departmentName" class="dept-badge">
              <Building2 :size="11" />
              {{ user.departmentName }}
            </span>
            <span v-else class="dept-badge">
              <Building2 :size="11" />
              Group Oversight
            </span>
            <span class="dot-sep">•</span>
            <span class="user-title">{{ user?.title || 'Staff' }}</span>
          </div>
        </div>

        <button
          class="btn btn-password"
          title="Ganti Password Akun"
          @click="showChangePasswordModal = true"
        >
          <KeyRound :size="15" />
          <span class="password-text">Password</span>
        </button>

        <button
          id="btn-logout"
          class="btn btn-logout"
          title="Sign out of your BBG account"
          :disabled="authStore.isLoading"
          @click="handleLogout"
        >
          <LogOut :size="16" />
          <span class="logout-text">Log out</span>
        </button>
      </div>
    </div>

    <!-- Self-Service Change Password Modal -->
    <ChangePasswordModal
      :show="showChangePasswordModal"
      @close="showChangePasswordModal = false"
    />
  </header>
</template>

<style scoped>
.topbar {
  height: 64px;
  background: #ffffff;
  border-bottom: 1px solid var(--border-subtle);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.75rem;
  position: sticky;
  top: 0;
  z-index: 40;
}

.topbar-left {
  display: flex;
  align-items: center;
}

.context-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.org-tag {
  color: var(--bsi-teal);
  font-weight: 700;
  letter-spacing: 0.02em;
}

.separator {
  color: var(--border-medium);
}

.active-title {
  color: var(--text-primary);
  font-weight: 600;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

/* Timer Widget Shell */
.timer-widget-shell {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: #f8fafc;
  border: 1px solid var(--border-subtle);
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.timer-widget-shell.clickable {
  cursor: pointer;
}
.timer-widget-shell.clickable:hover {
  background: #f1f5f9;
  border-color: var(--border-medium);
}

.timer-widget-shell.timer-running {
  background: var(--bsi-teal-light);
  border-color: rgba(0, 160, 160, 0.35);
}
.timer-widget-shell.timer-running .timer-icon-wrap {
  color: var(--bsi-teal);
  animation: pulse-icon 1.5s ease-in-out infinite;
}
.timer-widget-shell.timer-running .timer-status {
  color: var(--bsi-teal-dark);
  font-weight: 700;
}
.timer-widget-shell.timer-running .timer-elapsed {
  color: var(--bsi-teal-dark);
}

.timer-widget-shell.timer-paused {
  background: var(--bsi-gold-light);
  border-color: rgba(240, 180, 60, 0.4);
}
.timer-widget-shell.timer-paused .timer-icon-wrap {
  color: var(--bsi-gold-dark);
}
.timer-widget-shell.timer-paused .timer-status {
  color: var(--bsi-gold-dark);
}
.timer-widget-shell.timer-paused .timer-elapsed {
  color: var(--bsi-gold-dark);
}

@keyframes pulse-icon {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

.timer-icon-wrap {
  color: var(--bsi-teal);
  display: flex;
  align-items: center;
}

.timer-info {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.timer-ticket-num {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--bsi-teal-dark);
}

.timer-status {
  color: var(--text-muted);
}

.timer-elapsed {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--text-secondary);
}

/* User Profile Section */
.user-profile-section {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding-left: 0.85rem;
  border-left: 1px solid var(--border-subtle);
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00a0a0 0%, #f0b43c 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0, 160, 160, 0.25);
  flex-shrink: 0;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.user-subline {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.725rem;
  color: var(--text-muted);
}

.dept-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--text-secondary);
}

.dot-sep {
  opacity: 0.5;
}

.user-title {
  color: var(--text-muted);
}

.btn-password {
  background: var(--bsi-teal-light);
  border: 1px solid rgba(0, 160, 160, 0.25);
  color: var(--bsi-teal-dark);
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.2s ease;
}

.btn-password:hover {
  background: rgba(0, 160, 160, 0.16);
  border-color: rgba(0, 160, 160, 0.4);
  color: #004d4d;
}

.btn-logout {
  background: rgba(244, 63, 94, 0.08);
  border: 1px solid rgba(244, 63, 94, 0.2);
  color: #e11d48;
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.2s ease;
}

.btn-logout:hover:not(:disabled) {
  background: rgba(244, 63, 94, 0.15);
  border-color: rgba(244, 63, 94, 0.35);
  color: #be123c;
}

.mobile-toggle-btn {
  display: none;
  background: transparent;
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-right: 0.75rem;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.mobile-toggle-btn:hover {
  background: #f1f5f9;
  border-color: var(--border-medium);
  color: var(--bsi-teal-dark);
}

@media (max-width: 768px) {
  .topbar {
    height: 56px;
    padding: 0 0.85rem;
  }

  .mobile-toggle-btn {
    display: inline-flex;
  }

  .org-tag,
  .separator {
    display: none;
  }

  .topbar-right {
    gap: 0.45rem;
  }

  .user-profile-section {
    padding-left: 0.45rem;
    gap: 0.45rem;
  }

  .user-details {
    display: none;
  }

  .password-text,
  .logout-text {
    display: none;
  }

  .btn-password,
  .btn-logout {
    padding: 0.4rem 0.55rem;
  }

  .timer-widget-shell {
    padding: 0.3rem 0.55rem;
  }

  .timer-ticket-num,
  .timer-status {
    display: none;
  }
}

@media (max-width: 480px) {
  .active-title {
    max-width: 110px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.825rem;
  }
}
</style>
