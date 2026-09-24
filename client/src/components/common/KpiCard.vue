<script setup>
defineProps({
  label: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number],
    required: true
  },
  subnote: {
    type: String,
    default: ''
  },
  variant: {
    type: String,
    default: 'blue' // blue, purple, emerald, amber, rose, cyan
  },
  clickable: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['click']);
</script>

<template>
  <div
    class="kpi-card glass-card"
    :class="[
      `variant-${variant}`,
      { 'is-clickable': clickable, 'is-active': active }
    ]"
    @click="clickable && emit('click')"
  >
    <div class="kpi-top">
      <span class="kpi-label">{{ label }}</span>
      <div class="kpi-icon-wrap">
        <slot name="icon" />
      </div>
    </div>
    <div class="kpi-value">
      {{ value }}
    </div>
    <div v-if="subnote" class="kpi-note">
      {{ subnote }}
    </div>
  </div>
</template>

<style scoped>
.kpi-card {
  padding: 1.25rem 1.4rem;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.kpi-card.is-clickable {
  cursor: pointer;
}

.kpi-card.is-clickable:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.2);
}

.kpi-card.is-active {
  border-color: var(--accent-cyan);
  box-shadow: 0 0 20px rgba(6, 182, 212, 0.25);
}

.kpi-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.6rem;
}

.kpi-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.01em;
}

.kpi-icon-wrap {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.kpi-value {
  font-size: 1.85rem;
  font-weight: 800;
  font-family: var(--font-mono);
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  line-height: 1.1;
}

.kpi-note {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* Color Variants */
.variant-blue .kpi-icon-wrap {
  background: rgba(2, 132, 199, 0.15);
  color: #38bdf8;
}
.variant-blue.is-active {
  border-color: #38bdf8;
  box-shadow: 0 0 16px rgba(56, 189, 248, 0.25);
}

.variant-purple .kpi-icon-wrap {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
}
.variant-purple.is-active {
  border-color: #c084fc;
  box-shadow: 0 0 16px rgba(192, 132, 252, 0.25);
}

.variant-emerald .kpi-icon-wrap {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}
.variant-emerald.is-active {
  border-color: #34d399;
  box-shadow: 0 0 16px rgba(52, 211, 153, 0.25);
}

.variant-amber .kpi-icon-wrap {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}
.variant-amber.is-active {
  border-color: #fbbf24;
  box-shadow: 0 0 16px rgba(251, 191, 36, 0.25);
}

.variant-rose .kpi-icon-wrap {
  background: rgba(244, 63, 94, 0.15);
  color: #fb7185;
}
.variant-rose.is-active {
  border-color: #fb7185;
  box-shadow: 0 0 16px rgba(251, 113, 133, 0.25);
}

.variant-cyan .kpi-icon-wrap {
  background: rgba(6, 182, 212, 0.15);
  color: #67e8f9;
}
.variant-cyan.is-active {
  border-color: #67e8f9;
  box-shadow: 0 0 16px rgba(103, 232, 249, 0.25);
}
</style>
