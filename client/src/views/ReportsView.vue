<script setup>
import { FileBarChart, Download, Sparkles } from 'lucide-vue-next';
</script>

<template>
  <div class="reports-view">
    <div class="view-header">
      <div class="header-info">
        <h1 class="page-title">Executive Reports</h1>
        <p class="page-desc">Comprehensive group-level capacity, workload summaries, and CSV data exports (Head Group Exclusive)</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" disabled title="Available in Phase 4">
          <Download :size="16" />
          <span>Export CSV (Phase 4)</span>
        </button>
      </div>
    </div>

    <div class="content-box glass-card">
      <div class="empty-state">
        <div class="icon-wrap">
          <FileBarChart :size="28" />
        </div>
        <h3 class="title">Reports & CSV Export Domain (Phase 4 Scope)</h3>
        <p class="desc">
          Weekly Workload Report (featuring Employee, Role, Department, Capacity, Planned, Actual, Utilization, Active Tickets, Overdue, and Workload Risk)
          and Department Report tables with live CSV export capabilities will be implemented in Phase 4.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reports-view {
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
  background: rgba(16, 185, 129, 0.1);
  color: var(--accent-emerald);
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
