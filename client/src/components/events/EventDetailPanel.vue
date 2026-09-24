<script setup>
import { ref, onMounted } from 'vue';
import { eventsApi } from '@/api/events';
import TicketTable from '@/components/tickets/TicketTable.vue';
import {
  ArrowLeft,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  Loader2
} from 'lucide-vue-next';

const props = defineProps({
  eventName: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['back', 'openTicket', 'editTicket', 'deleteTicket']);

const loading = ref(true);
const eventData = ref(null);
const tickets = ref([]);

onMounted(async () => {
  await loadEventTickets();
});

async function loadEventTickets() {
  loading.value = true;
  try {
    const res = await eventsApi.getEventTickets(props.eventName);
    eventData.value = res;
    tickets.value = res.tickets || [];
  } catch (err) {
    console.error('Failed to load event tickets:', err);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="event-detail-panel">
    <!-- Back to gallery bar -->
    <div class="top-nav">
      <button class="back-btn" @click="emit('back')">
        <ArrowLeft :size="16" />
        <span>Back to Events Gallery</span>
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <Loader2 :size="24" class="spinning" />
      <span>Loading initiative details...</span>
    </div>

    <template v-else-if="eventData">
      <!-- Event Overview Summary Card -->
      <div class="summary-card glass-card">
        <div class="summary-top">
          <div class="title-group">
            <span class="initiative-tag">INITIATIVE DETAIL</span>
            <h2 class="initiative-title">{{ eventName }}</h2>
            <div class="dept-pills">
              <span
                v-for="dept in eventData.summary.departments"
                :key="dept"
                class="dept-pill"
              >
                <Building2 :size="12" />
                {{ dept }}
              </span>
            </div>
          </div>

          <div class="progress-col">
            <div class="progress-num font-mono">
              {{ eventData.summary.progressPct }}%
            </div>
            <span class="progress-label">Overall Completion</span>
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: `${eventData.summary.progressPct}%` }"
              />
            </div>
          </div>
        </div>

        <!-- Metrics Row -->
        <div class="metrics-row">
          <div class="metric-box">
            <span class="m-val">{{ eventData.summary.total }}</span>
            <span class="m-lbl">Total Tasks</span>
          </div>
          <div class="metric-box text-done">
            <span class="m-val">{{ eventData.summary.done }}</span>
            <span class="m-lbl">Completed</span>
          </div>
          <div class="metric-box text-active">
            <span class="m-val">{{ eventData.summary.active }}</span>
            <span class="m-lbl">Active</span>
          </div>
          <div v-if="eventData.summary.stuck > 0" class="metric-box text-stuck">
            <span class="m-val">{{ eventData.summary.stuck }}</span>
            <span class="m-lbl">Stuck</span>
          </div>
          <div v-if="eventData.summary.overdue > 0" class="metric-box text-overdue">
            <span class="m-val">{{ eventData.summary.overdue }}</span>
            <span class="m-lbl">Overdue</span>
          </div>
        </div>

        <!-- Contributors Strip -->
        <div v-if="eventData.summary.contributors?.length" class="contributors-strip">
          <span class="c-label">
            <Users :size="13" />
            Contributors:
          </span>
          <div class="c-chips">
            <span
              v-for="c in eventData.summary.contributors"
              :key="c.id"
              class="c-chip"
            >
              {{ c.name }}
            </span>
          </div>
        </div>
      </div>

      <!-- Tickets Table for this Event -->
      <div class="event-tickets-section">
        <h3 class="section-title">Event Work Units ({{ tickets.length }})</h3>
        <div class="table-container glass-card">
          <TicketTable
            :tickets="tickets"
            @open="emit('openTicket', $event)"
            @edit="emit('editTicket', $event)"
            @delete="emit('deleteTicket', $event)"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.event-detail-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.top-nav {
  display: flex;
  align-items: center;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.85rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.summary-card {
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.summary-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
}

.title-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.initiative-tag {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--accent-cyan);
  letter-spacing: 0.05em;
}

.initiative-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.2;
}

.dept-pills {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.25rem;
}

.dept-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  padding: 0.2rem 0.6rem;
  background: rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-full);
  color: var(--text-secondary);
}

.progress-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 160px;
}

.progress-num {
  font-size: 1.75rem;
  font-weight: 800;
  color: #34d399;
}

.progress-label {
  font-size: 0.725rem;
  color: var(--text-muted);
  margin-bottom: 0.4rem;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #06b6d4, #10b981);
}

/* Metrics */
.metrics-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.metric-box {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.m-val {
  font-size: 1.25rem;
  font-weight: 800;
  font-family: var(--font-mono);
  color: var(--text-primary);
}

.m-lbl {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-weight: 600;
}

.text-done .m-val { color: #34d399; }
.text-active .m-val { color: #38bdf8; }
.text-stuck .m-val { color: #f87171; }
.text-overdue .m-val { color: #fbbf24; }

/* Contributors */
.contributors-strip {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.c-label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 600;
  color: var(--text-muted);
}

.c-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.c-chip {
  padding: 0.2rem 0.5rem;
  background: rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  color: var(--text-primary);
}

.section-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
}

.table-container {
  overflow: hidden;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 3rem;
  color: var(--text-muted);
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
