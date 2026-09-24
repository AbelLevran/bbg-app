<script setup>
import { computed } from 'vue';
import { History, Activity } from 'lucide-vue-next';

const props = defineProps({
  logs: { type: Array, default: () => [] }
});

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
</script>

<template>
  <div class="activity-log-box">
    <div class="header">
      <div class="title-wrap">
        <History :size="16" class="title-icon" />
        <h4>Activity Log</h4>
      </div>
      <span class="count-badge">{{ logs.length }} events</span>
    </div>

    <div v-if="logs.length === 0" class="empty-state">
      No activity recorded yet.
    </div>

    <div v-else class="timeline">
      <div v-for="log in logs" :key="log.id" class="timeline-item">
        <div class="timeline-dot" />
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="log-desc">{{ log.description }}</span>
            <span class="log-time">{{ formatDate(log.createdAt) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.activity-log-box {
  background: #ffffff;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.5rem 1.75rem;
  box-shadow: var(--shadow-sm);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.title-icon {
  color: var(--bsi-teal);
}

.header h4 {
  font-size: 0.925rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.count-badge {
  font-size: 0.725rem;
  color: var(--text-secondary);
  background: #f1f5f9;
  border: 1px solid var(--border-subtle);
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-full);
}

.empty-state {
  font-size: 0.825rem;
  color: var(--text-muted);
  font-style: italic;
  padding: 1.5rem 0;
  text-align: center;
}

.timeline {
  display: flex;
  flex-direction: column;
  position: relative;
  padding-left: 1.25rem;
}

.timeline::before {
  content: '';
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 4px;
  width: 2px;
  background: var(--border-subtle);
}

.timeline-item {
  position: relative;
  padding-bottom: 0.85rem;
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-dot {
  position: absolute;
  left: -1.25rem;
  top: 5px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--bsi-teal);
  border: 2px solid #ffffff;
  box-shadow: 0 0 0 1px var(--bsi-teal);
}

.timeline-content {
  font-size: 0.8rem;
}

.timeline-header {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.log-desc {
  color: var(--text-secondary);
  line-height: 1.4;
}

.log-time {
  font-size: 0.7rem;
  color: var(--text-muted);
}
</style>
