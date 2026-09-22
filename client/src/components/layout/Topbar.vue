<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import RoleBadge from '@/components/common/RoleBadge.vue';
import { LogOut, Timer, Building2, User } from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();

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

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>

<template>
  <header class="topbar">
    <div class="topbar-left">
      <!-- Breadcrumb / Active Context -->
      <div class="context-indicator">
        <span class="org-tag">BBG System</span>
        <span class="separator">/</span>
        <span class="active-title">{{ $route.meta.title || 'Overview' }}</span>
      </div>
    </div>

    <div class="topbar-right">
      <!-- Active Timer Widget (Widget Shell for Prompt 2) -->
      <div class="timer-widget-shell" title="Active Timer (Prompt 2)">
        <div class="timer-icon-wrap">
          <Timer :size="16" class="timer-icon" />
        </div>
        <div class="timer-info">
          <span class="timer-status">Timer</span>
          <span class="timer-elapsed">IDLE</span>
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
  </header>
</template>

<style scoped>
.topbar {
  height: 64px;
  background: rgba(17, 24, 39, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-subtle);
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
  color: var(--text-muted);
  font-weight: 500;
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
  background: rgba(26, 34, 52, 0.6);
  border: 1px solid var(--border-subtle);
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.timer-icon-wrap {
  color: var(--accent-cyan);
  display: flex;
  align-items: center;
}

.timer-info {
  display: flex;
  align-items: center;
  gap: 0.35rem;
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
  background: linear-gradient(135deg, #0284c7 0%, #6366f1 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  box-shadow: 0 0 12px rgba(2, 132, 199, 0.3);
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

.btn-logout {
  background: rgba(244, 63, 94, 0.08);
  border: 1px solid rgba(244, 63, 94, 0.2);
  color: #fb7185;
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-logout:hover:not(:disabled) {
  background: rgba(244, 63, 94, 0.18);
  border-color: rgba(244, 63, 94, 0.4);
  color: #ffffff;
}

@media (max-width: 768px) {
  .logout-text {
    display: none;
  }
  .user-subline {
    display: none;
  }
}
</style>
