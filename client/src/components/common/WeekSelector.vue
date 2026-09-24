<script setup>
import { computed } from 'vue';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw } from 'lucide-vue-next';

const props = defineProps({
  modelValue: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

// Calculate Mon–Sun boundaries
const weekInfo = computed(() => {
  const d = new Date(props.modelValue);
  const dow = (d.getUTCDay() + 6) % 7;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - dow);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const startFormatted = monday.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
  const endFormatted = sunday.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return {
    monday,
    sunday,
    label: `${startFormatted} – ${endFormatted}`,
    mondayIso: monday.toISOString().slice(0, 10)
  };
});

const isCurrentWeek = computed(() => {
  const today = new Date();
  const dow = (today.getUTCDay() + 6) % 7;
  const currentMonday = new Date(today);
  currentMonday.setUTCDate(today.getUTCDate() - dow);
  return currentMonday.toISOString().slice(0, 10) === weekInfo.value.mondayIso;
});

function prevWeek() {
  const prev = new Date(weekInfo.value.monday);
  prev.setUTCDate(prev.getUTCDate() - 7);
  const iso = prev.toISOString().slice(0, 10);
  emit('update:modelValue', iso);
  emit('change', iso);
}

function nextWeek() {
  const next = new Date(weekInfo.value.monday);
  next.setUTCDate(next.getUTCDate() + 7);
  const iso = next.toISOString().slice(0, 10);
  emit('update:modelValue', iso);
  emit('change', iso);
}

function resetThisWeek() {
  const today = new Date().toISOString().slice(0, 10);
  emit('update:modelValue', today);
  emit('change', today);
}
</script>

<template>
  <div class="week-selector">
    <div class="selector-controls">
      <button class="nav-btn" title="Previous Week" @click="prevWeek">
        <ChevronLeft :size="16" />
      </button>

      <div class="week-display">
        <CalendarIcon :size="15" class="calendar-icon" />
        <span class="week-label">{{ weekInfo.label }}</span>
      </div>

      <button class="nav-btn" title="Next Week" @click="nextWeek">
        <ChevronRight :size="16" />
      </button>
    </div>

    <button
      v-if="!isCurrentWeek"
      class="reset-btn"
      title="Go to current week"
      @click="resetThisWeek"
    >
      <RotateCcw :size="13" />
      <span>This Week</span>
    </button>
  </div>
</template>

<style scoped>
.week-selector {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.selector-controls {
  display: inline-flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.2rem;
  box-shadow: var(--shadow-sm);
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.nav-btn:hover {
  color: var(--bsi-teal-dark);
  background: var(--bg-surface-hover);
}

.week-display {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 0.6rem;
}

.calendar-icon {
  color: var(--bsi-teal);
}

.week-label {
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-mono);
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.reset-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--bsi-teal-dark);
  background: var(--bsi-teal-light);
  border: 1px solid rgba(0, 160, 160, 0.3);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s ease;
}

.reset-btn:hover {
  background: rgba(0, 160, 160, 0.18);
  border-color: rgba(0, 160, 160, 0.45);
}
</style>
