<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import {
  LayoutDashboard,
  CheckSquare,
  UserCheck,
  Activity,
  FileBarChart,
  Layers
} from 'lucide-vue-next';

const route = useRoute();
const authStore = useAuthStore();

const userRole = computed(() => authStore.role);

// Compute tickets navigation label per role (prd.md §4.2)
const ticketsLabel = computed(() => {
  if (userRole.value === 'HEAD_GROUP') return 'Tickets';
  if (userRole.value === 'DEPARTMENT_HEAD') return 'Team Tickets';
  return 'My Tickets';
});

// Dynamic navigation list matching prd.md §4.2 role table
const navItems = computed(() => {
  const items = [
    {
      name: 'dashboard',
      path: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      visible: true
    },
    {
      name: 'tickets',
      path: '/tickets',
      label: ticketsLabel.value,
      icon: CheckSquare,
      visible: true
    },
    {
      name: 'my-work',
      path: '/my-work',
      label: 'My Work',
      icon: UserCheck,
      // Blocked & hidden for HEAD_GROUP (prd.md §3.9, §4.2)
      visible: userRole.value !== 'HEAD_GROUP'
    },
    {
      name: 'burnout-tracker',
      path: '/burnout-tracker',
      label: 'Burnout Tracker',
      icon: Activity,
      visible: true
    },
    {
      name: 'reports',
      path: '/reports',
      label: 'Reports',
      icon: FileBarChart,
      // Visible for HEAD_GROUP only (prd.md §4.2, §4.7)
      visible: userRole.value === 'HEAD_GROUP'
    }
  ];

  return items.filter(item => item.visible);
});

function isActive(itemPath) {
  if (itemPath === '/dashboard') {
    return route.path === '/dashboard';
  }
  return route.path.startsWith(itemPath);
}
</script>

<template>
  <aside class="sidebar">
    <!-- Brand Header -->
    <div class="sidebar-brand">
      <div class="brand-logo">
        <Layers :size="22" class="brand-icon" />
      </div>
      <div class="brand-text">
        <span class="brand-name">BBG SYSTEM</span>
        <span class="brand-subtitle">Work & Burnout Tracker</span>
      </div>
    </div>

    <!-- Navigation Menu -->
    <nav class="sidebar-nav">
      <div class="nav-section-title">Main Navigation</div>
      <ul class="nav-list">
        <li v-for="item in navItems" :key="item.path" class="nav-item">
          <router-link
            :to="item.path"
            :class="['nav-link', { active: isActive(item.path) }]"
            :id="`nav-link-${item.name}`"
          >
            <component :is="item.icon" :size="18" class="nav-icon" />
            <span class="nav-label">{{ item.label }}</span>
          </router-link>
        </li>
      </ul>
    </nav>

    <!-- Footer Information -->
    <div class="sidebar-footer">
      <div class="org-chip">
        <div class="status-indicator"></div>
        <div class="org-details">
          <span class="org-name">BBG Group</span>
          <span class="org-note">4 Depts • 15 Members</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 260px;
  min-height: 100vh;
  background: #ffffff;
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  height: 100vh;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.02);
}

.sidebar-brand {
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  border-bottom: 1px solid var(--border-subtle);
}

.brand-logo {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #00a0a0 0%, #008787 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 160, 160, 0.3);
  border: 1px solid rgba(240, 180, 60, 0.4);
}

.brand-icon {
  color: #ffffff;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--text-primary);
}

.brand-subtitle {
  font-size: 0.7rem;
  color: var(--bsi-teal-dark, #006f6f);
  font-weight: 600;
}

.sidebar-nav {
  padding: 1.5rem 1rem;
  flex: 1;
  overflow-y: auto;
}

.nav-section-title {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  font-weight: 700;
  padding: 0 0.75rem 0.6rem;
}

.nav-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.65rem 0.85rem;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
}

.nav-link:hover {
  background: #f8fafc;
  color: var(--bsi-teal-dark, #006f6f);
}

.nav-link.active {
  background: var(--bsi-teal-light, #e6f6f6);
  border-color: rgba(0, 160, 160, 0.25);
  color: #007777;
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(0, 160, 160, 0.08);
}

.nav-icon {
  flex-shrink: 0;
}

.sidebar-footer {
  padding: 1.25rem 1rem;
  border-top: 1px solid var(--border-subtle);
}

.org-chip {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--bg-surface-elevated, #f8fafc);
  padding: 0.75rem 0.85rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--bsi-gold, #f0b43c);
  box-shadow: 0 0 8px rgba(240, 180, 60, 0.6);
}

.org-details {
  display: flex;
  flex-direction: column;
}

.org-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
}

.org-note {
  font-size: 0.7rem;
  color: var(--text-muted);
}
</style>
