<script setup>
import { CheckCircle2, Clock, AlertTriangle, AlertCircle, Building2, Users, ArrowRight } from 'lucide-vue-next';

defineProps({
  events: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['selectEvent']);
</script>

<template>
  <div class="event-gallery-container">
    <div v-if="loading" class="empty-state">
      <span>Loading events and initiatives...</span>
    </div>

    <div v-else-if="events.length === 0" class="empty-state">
      <Building2 :size="36" class="empty-icon" />
      <h3 class="empty-title">No Events Found</h3>
      <p class="empty-desc">Create a ticket with cluster type "Event" to start tracking initiatives.</p>
    </div>

    <div v-else class="event-cards-grid">
      <div
        v-for="ev in events"
        :key="ev.clusterName"
        class="event-card glass-card"
        @click="emit('selectEvent', ev.clusterName)"
      >
        <div class="card-top">
          <div class="name-block">
            <span class="initiative-badge">INITIATIVE</span>
            <h3 class="event-name">{{ ev.clusterName }}</h3>
          </div>
          <div class="progress-badge font-mono">
            {{ ev.progressPct }}% Complete
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="progress-track">
          <div
            class="progress-fill"
            :style="{ width: `${ev.progressPct}%` }"
          />
        </div>

        <!-- Metric Badges Row -->
        <div class="stats-row">
          <div class="stat-item" title="Total tickets in event">
            <span class="stat-count">{{ ev.total }}</span>
            <span class="stat-label">Total</span>
          </div>
          <div class="stat-item text-done" title="Completed tickets">
            <span class="stat-count">{{ ev.done }}</span>
            <span class="stat-label">Done</span>
          </div>
          <div class="stat-item text-active" title="Active tickets">
            <span class="stat-count">{{ ev.active }}</span>
            <span class="stat-label">Active</span>
          </div>
          <div v-if="ev.stuck > 0" class="stat-item text-stuck" title="Stuck blockers">
            <span class="stat-count">{{ ev.stuck }}</span>
            <span class="stat-label">Stuck</span>
          </div>
          <div v-if="ev.overdue > 0" class="stat-item text-overdue" title="Overdue tickets">
            <span class="stat-count">{{ ev.overdue }}</span>
            <span class="stat-label">Overdue</span>
          </div>
        </div>

        <!-- Footer: Departments and Action -->
        <div class="card-footer">
          <div class="departments-list">
            <span
              v-for="dept in ev.departments"
              :key="dept"
              class="dept-tag"
            >
              <Building2 :size="11" />
              {{ dept }}
            </span>
            <span v-if="ev.departments.length === 0" class="dept-tag text-muted">
              General
            </span>
          </div>

          <div class="view-cta">
            <span>View Tickets</span>
            <ArrowRight :size="14" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.event-gallery-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.event-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.25rem;
}

.event-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.event-card:hover {
  transform: translateY(-3px);
  border-color: rgba(6, 182, 212, 0.4);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 0 15px rgba(6, 182, 212, 0.15);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}

.name-block {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.initiative-badge {
  font-size: 0.675rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--accent-cyan);
  text-transform: uppercase;
}

.event-name {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.25;
}

.progress-badge {
  font-size: 0.8rem;
  font-weight: 700;
  color: #34d399;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.25);
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-full);
  white-space: nowrap;
}

/* Progress */
.progress-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #06b6d4, #10b981);
  border-radius: var(--radius-full);
  transition: width 0.4s ease;
}

/* Stats */
.stats-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.6rem 0.8rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.stat-count {
  font-size: 1.1rem;
  font-weight: 800;
  font-family: var(--font-mono);
  color: var(--text-primary);
}

.stat-label {
  font-size: 0.675rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-weight: 600;
}

.text-done .stat-count { color: #34d399; }
.text-active .stat-count { color: #38bdf8; }
.text-stuck .stat-count { color: #f87171; }
.text-overdue .stat-count { color: #fbbf24; }

/* Footer */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.25rem;
}

.departments-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.dept-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.725rem;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
}

.view-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--accent-cyan);
  white-space: nowrap;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  color: var(--text-muted);
}

.empty-icon {
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.35rem;
}

.empty-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  max-width: 400px;
}
</style>
