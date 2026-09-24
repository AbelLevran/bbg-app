<script setup>
const props = defineProps({
  status: { type: String, required: true }
});

const CONFIG = {
  TODO:        { label: 'To Do',       class: 'status-todo' },
  IN_PROGRESS: { label: 'In Progress', class: 'status-inprogress' },
  IN_REVIEW:   { label: 'In Review',   class: 'status-review' },
  STUCK:       { label: 'Stuck',       class: 'status-stuck' },
  DONE:        { label: 'Done',        class: 'status-done' },
  CANCELLED:   { label: 'Cancelled',   class: 'status-cancelled' }
};

const cfg = CONFIG[props.status] || { label: props.status, class: 'status-todo' };
</script>

<template>
  <span class="status-badge" :class="cfg.class">{{ cfg.label }}</span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-full);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.status-todo       { background: rgba(100,116,139,0.18); color: #94a3b8; border: 1px solid rgba(100,116,139,0.3); }
.status-inprogress { background: rgba(59,130,246,0.15);  color: #60a5fa; border: 1px solid rgba(59,130,246,0.3); }
.status-review     { background: rgba(168,85,247,0.15);  color: #c084fc; border: 1px solid rgba(168,85,247,0.3); }
.status-stuck      { background: rgba(239,68,68,0.15);   color: #f87171; border: 1px solid rgba(239,68,68,0.3); }
.status-done       { background: rgba(34,197,94,0.15);   color: #4ade80; border: 1px solid rgba(34,197,94,0.3); }
.status-cancelled  { background: rgba(107,114,128,0.12); color: #6b7280; border: 1px solid rgba(107,114,128,0.25); }
</style>
