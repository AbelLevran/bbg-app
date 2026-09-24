<script setup>
const props = defineProps({
  priority: { type: String, required: true }
});
const CONFIG = {
  HIGH:   { label: 'High',   class: 'prio-high' },
  MEDIUM: { label: 'Medium', class: 'prio-medium' },
  LOW:    { label: 'Low',    class: 'prio-low' }
};
const cfg = CONFIG[props.priority] || { label: props.priority, class: 'prio-low' };
</script>

<template>
  <span class="priority-badge" :class="cfg.class">{{ cfg.label }}</span>
</template>

<style scoped>
.priority-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.18rem 0.55rem;
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  white-space: nowrap;
}
.prio-high   { background: rgba(239,68,68,0.18);  color: #f87171; border: 1px solid rgba(239,68,68,0.35); }
.prio-medium { background: rgba(234,179,8,0.15);  color: #facc15; border: 1px solid rgba(234,179,8,0.3); }
.prio-low    { background: rgba(34,197,94,0.12);  color: #4ade80; border: 1px solid rgba(34,197,94,0.25); }
</style>
