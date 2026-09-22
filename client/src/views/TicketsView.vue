<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { CheckSquare, Calendar, Sparkles, Filter, Plus } from 'lucide-vue-next';

const authStore = useAuthStore();
const activeTab = ref('daily');

const ticketsTitle = computed(() => {
  if (authStore.isHeadGroup) return 'Tickets (Group-Wide)';
  if (authStore.isDepartmentHead) return `Team Tickets (${authStore.departmentName})`;
  return 'My Tickets';
});
</script>

<template>
  <div class="tickets-view">
    <div class="view-header">
      <div class="header-info">
        <h1 class="page-title">{{ ticketsTitle }}</h1>
        <p class="page-desc">Track, organize, and measure work units with live precision timers</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" disabled title="Will be available in Phase 2">
          <Plus :size="16" />
          <span>New Ticket (Phase 2)</span>
        </button>
      </div>
    </div>

    <!-- Daily Task vs Events Tabs (prd.md §3.8) -->
    <div class="tabs-bar">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'daily' }"
        @click="activeTab = 'daily'"
      >
        <CheckSquare :size="16" />
        <span>Daily Tasks</span>
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'events' }"
        @click="activeTab = 'events'"
      >
        <Calendar :size="16" />
        <span>Events & Initiatives</span>
      </button>
    </div>

    <!-- Content Placeholder Shell -->
    <div class="tickets-content glass-card">
      <div class="empty-state">
        <div class="empty-icon-wrap">
          <Sparkles :size="28" class="empty-icon" />
        </div>
        <h3 class="empty-title">Ticketing Domain (Phase 2 Scope)</h3>
        <p class="empty-desc">
          Full ticket CRUD, Daily Task table with filters and sorting, Events gallery cards,
          ticket detail page with real timestamp timer (start/pause/resume/stop session splitting),
          and ownership-based edit/delete guards will be implemented in Phase 2.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tickets-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
}

.page-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.tabs-bar {
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: 0.5rem;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
}

.tab-btn.active {
  background: var(--bg-surface-elevated);
  border-color: var(--border-subtle);
  color: #38bdf8;
}

.tickets-content {
  min-height: 380px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  text-align: center;
  max-width: 480px;
  padding: 2rem 1rem;
}

.empty-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(56, 189, 248, 0.1);
  color: var(--accent-cyan);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.empty-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.empty-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.6;
}
</style>
