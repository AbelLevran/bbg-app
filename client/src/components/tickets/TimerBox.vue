<script setup>
import { computed } from 'vue';
import { useTimerStore } from '@/stores/timer';
import { Play, Pause, StopCircle, RotateCcw, Loader2 } from 'lucide-vue-next';

const props = defineProps({
  ticketId:  { type: String, required: true },
  assignedToId: { type: String, required: true },
  currentUserId: { type: String, required: true },
  estimatedMinutes: { type: Number, default: 0 },
  actualMinutes: { type: Number, default: 0 },
  ticketNumber: { type: String, default: '' },
  ticketTitle: { type: String, default: '' }
});

const emit = defineEmits(['conflict', 'stopped', 'refreshTicket']);

const timerStore = useTimerStore();

const isMyTimer = computed(() => timerStore.activeTimer?.ticketId === props.ticketId);
const isRunning = computed(() => isMyTimer.value && timerStore.activeTimer?.status === 'RUNNING');
const isPaused  = computed(() => isMyTimer.value && timerStore.activeTimer?.status === 'PAUSED');
const isIdle    = computed(() => !isMyTimer.value || !timerStore.activeTimer);
const canOperate = computed(() => props.assignedToId === props.currentUserId);

const loading = computed(() => false);

const progress = computed(() => {
  if (!props.estimatedMinutes) return 0;
  return Math.min(100, Math.round((props.actualMinutes / props.estimatedMinutes) * 100));
});

async function handleStart() {
  try {
    await timerStore.start(props.ticketId, {
      ticketNumber: props.ticketNumber,
      title: props.ticketTitle
    });
  } catch (err) {
    if (err?.status === 409 || (err?.message?.includes('409') || err?.conflict)) {
      emit('conflict', err.conflict || timerStore.activeTimer);
    }
  }
}

async function handlePause()  { await timerStore.pause(props.ticketId);  emit('refreshTicket'); }
async function handleResume() { await timerStore.resume(props.ticketId); }
async function handleStop()   {
  await timerStore.stop(props.ticketId);
  emit('stopped');
  emit('refreshTicket');
}
</script>

<template>
  <div class="timer-box">
    <!-- Header -->
    <div class="timer-header">
      <span class="timer-label">Work Timer</span>
      <div class="timer-status-dot" :class="{ running: isRunning, paused: isPaused }" />
    </div>

    <!-- Elapsed display -->
    <div class="timer-display" :class="{ running: isRunning, paused: isPaused }">
      {{ isMyTimer ? timerStore.elapsedFormatted : '00:00:00' }}
    </div>

    <!-- Status label -->
    <div class="timer-state-label">
      <span v-if="isRunning" class="state running">● RUNNING</span>
      <span v-else-if="isPaused" class="state paused">⏸ PAUSED</span>
      <span v-else class="state idle">IDLE</span>
    </div>

    <!-- Progress bar -->
    <div class="progress-track" :title="`${progress}% of estimate`">
      <div class="progress-fill" :style="{ width: `${progress}%` }" :class="{ over: progress >= 100 }" />
    </div>
    <div class="progress-label">{{ progress }}% of estimate ({{ estimatedMinutes }}m)</div>

    <!-- Controls -->
    <div v-if="canOperate" class="timer-controls">
      <!-- Idle: show Start -->
      <button v-if="isIdle" id="btn-timer-start" class="btn-timer btn-start" @click="handleStart">
        <Play :size="16" />
        Start Timer
      </button>

      <!-- Running: show Pause + Stop -->
      <template v-else-if="isRunning">
        <button id="btn-timer-pause" class="btn-timer btn-pause" @click="handlePause">
          <Pause :size="16" />
          Pause
        </button>
        <button id="btn-timer-stop" class="btn-timer btn-stop" @click="handleStop">
          <StopCircle :size="16" />
          Stop
        </button>
      </template>

      <!-- Paused: show Resume + Stop -->
      <template v-else-if="isPaused">
        <button id="btn-timer-resume" class="btn-timer btn-resume" @click="handleResume">
          <RotateCcw :size="16" />
          Resume
        </button>
        <button id="btn-timer-stop" class="btn-timer btn-stop" @click="handleStop">
          <StopCircle :size="16" />
          Stop
        </button>
      </template>
    </div>

    <div v-else class="no-operate-msg">
      Only the assigned user can operate this timer.
    </div>
  </div>
</template>

<style scoped>
.timer-box {
  background: #ffffff;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.5rem 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: var(--shadow-sm);
}

.timer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.timer-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.timer-status-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--border-medium);
}
.timer-status-dot.running {
  background: #16a34a;
  box-shadow: 0 0 8px rgba(22, 163, 74, 0.5);
  animation: pulse-dot 1.5s ease-in-out infinite;
}
.timer-status-dot.paused { background: #d97706; }

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.2); }
}

.timer-display {
  font-family: var(--font-mono);
  font-size: 2.4rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.05em;
  transition: color 0.3s ease;
}
.timer-display.running { color: #16a34a; }
.timer-display.paused  { color: #d97706; }

.timer-state-label .state {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}
.state.running { color: #16a34a; }
.state.paused  { color: #d97706; }
.state.idle    { color: var(--text-muted); }

.progress-track {
  height: 6px;
  background: #e2e8f0;
  border-radius: var(--radius-full);
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00a0a0, #00b5b5);
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}
.progress-fill.over { background: linear-gradient(90deg, #ef4444, #f97316); }
.progress-label { font-size: 0.7rem; color: var(--text-muted); }

.timer-controls {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.btn-timer {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1rem;
  border-radius: var(--radius-md);
  font-size: 0.825rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  flex: 1;
  justify-content: center;
  min-width: 100px;
}
.btn-start  { background: rgba(34,197,94,0.15);  border-color: rgba(34,197,94,0.35);  color: #4ade80; }
.btn-start:hover  { background: rgba(34,197,94,0.25); }
.btn-pause  { background: rgba(234,179,8,0.15);  border-color: rgba(234,179,8,0.35);  color: #facc15; }
.btn-pause:hover  { background: rgba(234,179,8,0.25); }
.btn-resume { background: rgba(59,130,246,0.15); border-color: rgba(59,130,246,0.35); color: #60a5fa; }
.btn-resume:hover { background: rgba(59,130,246,0.25); }
.btn-stop   { background: rgba(239,68,68,0.15);  border-color: rgba(239,68,68,0.35);  color: #f87171; flex: 0 0 auto; }
.btn-stop:hover   { background: rgba(239,68,68,0.25); }

.no-operate-msg {
  font-size: 0.775rem;
  color: var(--text-muted);
  font-style: italic;
  text-align: center;
  padding: 0.5rem;
}
</style>
