<script setup>
import { computed } from 'vue';
import { AlertTriangle, CheckCircle, Info, ShieldAlert } from 'lucide-vue-next';

const props = defineProps({
  workload: {
    type: Object,
    required: true
  },
  title: {
    type: String,
    default: 'Workload & Capacity Status'
  },
  showDisclaimer: {
    type: Boolean,
    default: true
  }
});

const riskLevel = computed(() => props.workload?.riskLevel || 'NORMAL');
const plannedUtil = computed(() => props.workload?.plannedUtilizationPct || 0);
const actualUtil = computed(() => props.workload?.actualUtilizationPct || 0);
const capacityHours = computed(() => props.workload?.capacityHours || 40);
const plannedHours = computed(() => props.workload?.plannedHours || 0);
const actualHours = computed(() => props.workload?.actualHours || 0);
const remainingHours = computed(() => props.workload?.remainingCapacityHours || (capacityHours.value - plannedHours.value));

const riskConfig = computed(() => {
  switch (riskLevel.value) {
    case 'EXTREME':
      return {
        label: 'Extreme Load',
        colorClass: 'risk-extreme',
        icon: ShieldAlert,
        desc: 'Planned workload exceeds 120% of capacity. Immediate rebalancing recommended.'
      };
    case 'OVER':
      return {
        label: 'Over Capacity',
        colorClass: 'risk-over',
        icon: AlertTriangle,
        desc: 'Planned workload exceeds weekly capacity (100% – 120%). Monitor deadline risks.'
      };
    case 'HIGH':
      return {
        label: 'High Load',
        colorClass: 'risk-high',
        icon: AlertTriangle,
        desc: 'Capacity is near peak utilization (80% – 100%). Sustainable with active management.'
      };
    default:
      return {
        label: 'Normal',
        colorClass: 'risk-normal',
        icon: CheckCircle,
        desc: 'Healthy workload distribution under 80% capacity.'
      };
  }
});

// Bar progress percentage capped at 100% for the visual width, with overflow handling
const progressWidth = computed(() => Math.min(100, plannedUtil.value));
</script>

<template>
  <div class="workload-risk-card glass-card" :class="riskConfig.colorClass">
    <div class="card-header">
      <div class="header-left">
        <h3 class="card-title">{{ title }}</h3>
        <p class="card-subtitle">{{ riskConfig.desc }}</p>
      </div>
      <div class="risk-badge">
        <component :is="riskConfig.icon" :size="15" />
        <span>{{ riskConfig.label }}</span>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="meter-section">
      <div class="meter-labels">
        <span class="meter-label">Planned Utilization</span>
        <span class="meter-value">{{ plannedUtil }}% of capacity</span>
      </div>
      <div class="meter-track">
        <div
          class="meter-fill"
          :style="{ width: `${progressWidth}%` }"
        />
        <!-- 100% Capacity Marker -->
        <div class="marker-100" title="100% Capacity Limit" />
      </div>
    </div>

    <!-- Stats Breakdown Grid -->
    <div class="stats-row">
      <div class="stat-col">
        <span class="stat-name">Weekly Capacity</span>
        <span class="stat-num">{{ capacityHours }}h</span>
      </div>
      <div class="stat-col">
        <span class="stat-name">Planned (Due this week)</span>
        <span class="stat-num">{{ plannedHours }}h</span>
      </div>
      <div class="stat-col">
        <span class="stat-name">Actual Tracked</span>
        <span class="stat-num">{{ actualHours }}h <small class="text-muted">({{ actualUtil }}%)</small></span>
      </div>
      <div class="stat-col">
        <span class="stat-name">Remaining Capacity</span>
        <span class="stat-num" :class="{ 'text-danger': remainingHours < 0 }">
          {{ remainingHours >= 0 ? `${remainingHours}h` : `${remainingHours}h (Deficit)` }}
        </span>
      </div>
    </div>

    <!-- Mandatory Non-Diagnostic Disclaimer per prd.md §3.6 -->
    <div v-if="showDisclaimer" class="disclaimer-box">
      <Info :size="14" class="disclaimer-icon" />
      <span class="disclaimer-text">
        <strong>Notice:</strong> This signal is derived from system workload data (assigned tasks, estimates, tracked hours, active tickets, and deadlines). It is a workflow monitoring signal, <em>not</em> a medical diagnosis or employee performance evaluation.
      </span>
    </div>
  </div>
</template>

<style scoped>
.workload-risk-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  border-left: 4px solid transparent;
}

.risk-normal {
  border-left-color: #10b981;
}
.risk-high {
  border-left-color: #f59e0b;
}
.risk-over {
  border-left-color: #f97316;
}
.risk-extreme {
  border-left-color: #ef4444;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.card-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
}

.card-subtitle {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 0.2rem;
}

.risk-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.risk-normal .risk-badge {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}
.risk-high .risk-badge {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
}
.risk-over .risk-badge {
  background: rgba(249, 115, 22, 0.15);
  color: #fb923c;
  border: 1px solid rgba(249, 115, 22, 0.3);
}
.risk-extreme .risk-badge {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

/* Meter */
.meter-section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.meter-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  font-weight: 600;
}

.meter-label {
  color: var(--text-secondary);
}

.meter-value {
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.meter-track {
  position: relative;
  height: 10px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-full);
  overflow: visible;
}

.meter-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.4s ease;
}

.risk-normal .meter-fill {
  background: linear-gradient(90deg, #10b981, #34d399);
}
.risk-high .meter-fill {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}
.risk-over .meter-fill {
  background: linear-gradient(90deg, #f97316, #fb923c);
}
.risk-extreme .meter-fill {
  background: linear-gradient(90deg, #ef4444, #f87171);
}

.marker-100 {
  position: absolute;
  right: 0;
  top: -2px;
  bottom: -2px;
  width: 2px;
  background: rgba(255, 255, 255, 0.4);
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  padding: 0.9rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.stat-col {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.stat-name {
  font-size: 0.725rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.stat-num {
  font-size: 1.15rem;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--text-primary);
}

.text-danger {
  color: #f87171 !important;
}

/* Mandatory Disclaimer */
.disclaimer-box {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  background: rgba(6, 182, 212, 0.06);
  border: 1px solid rgba(6, 182, 212, 0.18);
  border-radius: var(--radius-md);
}

.disclaimer-icon {
  color: var(--accent-cyan);
  flex-shrink: 0;
  margin-top: 0.15rem;
}

.disclaimer-text {
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--text-secondary);
}

.disclaimer-text strong {
  color: var(--text-primary);
}
</style>
