<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ticketsApi } from '@/api/tickets';
import StatusBadge from '@/components/common/StatusBadge.vue';
import PriorityBadge from '@/components/common/PriorityBadge.vue';
import { Repeat, Plus, Clock, Loader2, ArrowRight } from 'lucide-vue-next';

const props = defineProps({
  ticket: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['occurrenceAdded']);

const router = useRouter();
const siblings = ref([]);
const loading = ref(true);
const adding = ref(false);

const seriesLabel = computed(() => props.ticket.seriesLabel || 'Recurring Series');
const frequency = computed(() => props.ticket.recurrenceFrequency || 'DAILY');

const totalTrackedMinutes = computed(() =>
  siblings.value.reduce((sum, t) => sum + (t.actualMinutes || 0), 0)
);

const totalTrackedFormatted = computed(() => {
  const mins = totalTrackedMinutes.value;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
});

onMounted(async () => {
  await loadSiblings();
});

async function loadSiblings() {
  if (!props.ticket.id) return;
  loading.value = true;
  try {
    const res = await ticketsApi.getSiblings(props.ticket.id);
    siblings.value = res.tickets || [];
  } catch (err) {
    console.error('Failed to load siblings:', err);
  } finally {
    loading.value = false;
  }
}

async function handleAddNext() {
  if (adding.value) return;
  adding.value = true;
  try {
    const res = await ticketsApi.addNextOccurrence(props.ticket.id);
    await loadSiblings();
    emit('occurrenceAdded', res.ticket);
  } catch (err) {
    alert(err.message || 'Failed to add next occurrence');
  } finally {
    adding.value = false;
  }
}

function openSibling(id) {
  router.push(`/tickets/${id}`);
}
</script>

<template>
  <div class="recurring-panel glass-card">
    <div class="panel-header">
      <div class="header-left">
        <div class="panel-badge">
          <Repeat :size="14" />
          <span>{{ frequency }} RECURRING SERIES</span>
        </div>
        <h3 class="panel-title">{{ seriesLabel }}</h3>
      </div>

      <button
        class="btn btn-secondary add-btn"
        :disabled="adding"
        @click="handleAddNext"
      >
        <Loader2 v-if="adding" :size="14" class="spinning" />
        <Plus v-else :size="14" />
        <span>Add Next Occurrence</span>
      </button>
    </div>

    <!-- Series Summary Strip -->
    <div class="series-summary">
      <div class="summary-item">
        <span class="s-label">Total Occurrences</span>
        <span class="s-val">{{ siblings.length }}</span>
      </div>
      <div class="summary-item">
        <span class="s-label">Total Time Tracked (Series)</span>
        <span class="s-val text-cyan">
          <Clock :size="14" class="inline-icon" />
          {{ totalTrackedFormatted }}
        </span>
      </div>
    </div>

    <!-- Occurrences List -->
    <div class="occurrences-list">
      <div v-if="loading" class="loading-state">
        <Loader2 :size="18" class="spinning" />
        <span>Loading series occurrences...</span>
      </div>

      <div
        v-else
        v-for="(sib, idx) in siblings"
        :key="sib.id"
        class="occurrence-item"
        :class="{ 'current-ticket': sib.id === ticket.id }"
        @click="openSibling(sib.id)"
      >
        <div class="occ-left">
          <span class="occ-index">#{{ idx + 1 }}</span>
          <div class="occ-info">
            <span class="occ-title">{{ sib.title }}</span>
            <span class="occ-meta">{{ sib.ticketNumber }} • Due: {{ new Date(sib.dueDate).toLocaleDateString() }}</span>
          </div>
        </div>

        <div class="occ-right">
          <span class="occ-time font-mono">
            {{ Math.floor(sib.actualMinutes / 60) }}h {{ String(sib.actualMinutes % 60).padStart(2, '0') }}m
          </span>
          <StatusBadge :status="sib.status" />
          <span v-if="sib.id === ticket.id" class="current-tag">Viewing</span>
          <ArrowRight v-else :size="14" class="nav-arrow" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.recurring-panel {
  padding: 1.75rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  border-left: 4px solid var(--bsi-teal);
  background: #ffffff;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.panel-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.725rem;
  font-weight: 700;
  color: var(--bsi-teal-dark);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.35rem;
}

.panel-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  padding: 0.4rem 0.8rem;
}

.series-summary {
  display: flex;
  gap: 2rem;
  padding: 0.85rem 1.15rem;
  background: #f8fafc;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.s-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-weight: 600;
}

.s-val {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.text-cyan {
  color: var(--bsi-teal-dark);
}

.inline-icon {
  display: inline;
  vertical-align: middle;
  margin-right: 0.25rem;
}

/* Occurrences List */
.occurrences-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.occurrence-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #ffffff;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s ease;
}

.occurrence-item:hover {
  background: #f8fafc;
  border-color: var(--bsi-teal);
}

.occurrence-item.current-ticket {
  background: var(--bsi-teal-light);
  border-color: rgba(0, 160, 160, 0.4);
}

.occ-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.occ-index {
  font-size: 0.75rem;
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--text-muted);
  width: 24px;
}

.occ-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.occ-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.occ-meta {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.occ-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.occ-time {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.current-tag {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
  background: rgba(0, 160, 160, 0.15);
  color: var(--bsi-teal-dark);
}

.nav-arrow {
  color: var(--text-muted);
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  color: var(--text-muted);
  font-size: 0.825rem;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
