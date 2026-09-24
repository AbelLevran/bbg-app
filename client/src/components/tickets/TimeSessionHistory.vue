<script setup>
import { computed } from 'vue';
import { Clock, Timer, Edit } from 'lucide-vue-next';

const props = defineProps({
  sessions: { type: Array, default: () => [] }
});

function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTimeOnly(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Group sessions by Date (YYYY-MM-DD)
const groupedSessions = computed(() => {
  const groups = {};
  // Sort reverse chrono
  const sorted = [...props.sessions].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));

  for (const s of sorted) {
    const d = new Date(s.startedAt);
    const dateKey = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: dateKey,
        totalMinutes: 0,
        items: []
      };
    }
    groups[dateKey].items.push(s);
    groups[dateKey].totalMinutes += (s.durationMinutes || 0);
  }

  return Object.values(groups);
});
</script>

<template>
  <div class="session-history">
    <div class="header">
      <div class="title-wrap">
        <Clock :size="16" class="title-icon" />
        <h4>Time Sessions History</h4>
      </div>
      <span class="total-sessions-badge">{{ sessions.length }} sessions</span>
    </div>

    <div v-if="sessions.length === 0" class="empty-state">
      No recorded time sessions yet.
    </div>

    <div v-else class="groups-list">
      <div v-for="group in groupedSessions" :key="group.date" class="date-group">
        <div class="group-header">
          <span class="group-date">{{ group.date }}</span>
          <span class="group-total">Total: {{ formatDuration(group.totalMinutes) }}</span>
        </div>

        <div class="session-items">
          <div v-for="s in group.items" :key="s.id" class="session-card">
            <div class="session-meta">
              <span
                class="source-badge"
                :class="s.source === 'TIMER' ? 'badge-timer' : 'badge-manual'"
              >
                <component :is="s.source === 'TIMER' ? Timer : Edit" :size="12" />
                {{ s.source }}
              </span>

              <span class="time-range">
                {{ formatTimeOnly(s.startedAt) }}
                <template v-if="s.endedAt"> – {{ formatTimeOnly(s.endedAt) }}</template>
                <template v-else> (in progress)</template>
              </span>
            </div>

            <div class="session-right">
              <span v-if="s.manualReason" class="manual-reason" :title="s.manualReason">
                "{{ s.manualReason }}"
              </span>
              <span class="duration-tag">{{ formatDuration(s.durationMinutes) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.session-history {
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

.total-sessions-badge {
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

.groups-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.date-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--border-subtle);
}

.group-total {
  color: var(--bsi-teal-dark);
  font-weight: 700;
}

.session-items {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.session-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8fafc;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.55rem 0.85rem;
  font-size: 0.8rem;
}

.session-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.source-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.15rem 0.45rem;
  border-radius: var(--radius-sm);
}

.badge-timer {
  background: rgba(14, 165, 233, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(14, 165, 233, 0.3);
}

.badge-manual {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.3);
}

.time-range {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.session-right {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.manual-reason {
  font-size: 0.75rem;
  color: var(--text-secondary);
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-style: italic;
}

.duration-tag {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.8rem;
}
</style>
