<script setup>
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { Info, UserCheck, Clock, CheckCircle } from 'lucide-vue-next';

const authStore = useAuthStore();
const user = computed(() => authStore.user);
</script>

<template>
  <div class="my-work-view">
    <div class="view-header">
      <h1 class="page-title">My Work</h1>
      <p class="page-desc">Personal workload summary, active assignments, and tracked hours</p>
    </div>

    <!-- Mandatory Non-Diagnostic Disclaimer per prd.md §3.6 -->
    <div class="disclaimer-banner">
      <Info :size="18" class="disclaimer-icon" />
      <div>
        <strong>System Workload Signal Notice:</strong>
        This workload indicator is derived purely from system operational data (assigned tickets, estimates, tracked timer hours, active tickets, overdue work). It is <em>not</em> a medical diagnosis or a performance score.
      </div>
    </div>

    <div class="content-box glass-card">
      <div class="empty-state">
        <div class="icon-wrap">
          <UserCheck :size="28" />
        </div>
        <h3 class="title">Personal Workload Workspace (Phase 3 Scope)</h3>
        <p class="desc">
          Weekly workload trend chart (planned vs actual vs capacity for the last 4 weeks),
          active assigned tickets, overdue tasks, and weekly time session summaries will be wired here in Phase 3.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.my-work-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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

.disclaimer-icon {
  flex-shrink: 0;
  color: #38bdf8;
  margin-top: 0.1rem;
}

.content-box {
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

.icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(99, 102, 241, 0.1);
  color: var(--accent-indigo);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.6;
}
</style>
