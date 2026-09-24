import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { timerApi } from '../api/timer.js';

export const useTimerStore = defineStore('timer', () => {
  const activeTimer = ref(null);   // { ticketId, ticketNumber, ticketTitle, status, activeSessionStartedAt }
  const elapsedMs = ref(0);         // Total elapsed ms (closed sessions + current)
  const ticking = ref(false);
  let tickInterval = null;

  // Accumulated ms from closed sessions for the current ticket (fetched from ticket detail)
  let closedSessionMs = 0;
  let sessionStartTs = null;        // Timestamp when current session started (ms)

  function setClosedMs(ms) {
    closedSessionMs = ms;
    _recompute();
  }

  function _recompute() {
    if (activeTimer.value?.status === 'RUNNING' && sessionStartTs) {
      elapsedMs.value = closedSessionMs + (Date.now() - sessionStartTs);
    } else {
      elapsedMs.value = closedSessionMs;
    }
  }

  function startTicking() {
    if (tickInterval) return;
    ticking.value = true;
    tickInterval = setInterval(() => {
      _recompute();
    }, 1000);
  }

  function stopTicking() {
    if (tickInterval) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
    ticking.value = false;
  }

  function applyTimerState(timer) {
    activeTimer.value = timer;
    if (timer?.status === 'RUNNING' && timer.activeSessionStartedAt) {
      sessionStartTs = new Date(timer.activeSessionStartedAt).getTime();
      startTicking();
    } else {
      sessionStartTs = null;
      stopTicking();
      _recompute();
    }
  }

  async function fetchActive() {
    try {
      const res = await timerApi.getActive();
      applyTimerState(res.timer);
    } catch {
      // silent
    }
  }

  async function start(ticketId) {
    const res = await timerApi.start(ticketId);
    applyTimerState(res.timer);
    return res;
  }

  async function pause(ticketId) {
    const res = await timerApi.pause(ticketId);
    applyTimerState(res.timer);
    return res;
  }

  async function resume(ticketId) {
    const res = await timerApi.resume(ticketId);
    applyTimerState(res.timer);
    return res;
  }

  async function stop(ticketId) {
    const res = await timerApi.stop(ticketId);
    activeTimer.value = null;
    closedSessionMs = 0;
    sessionStartTs = null;
    stopTicking();
    elapsedMs.value = 0;
    return res;
  }

  async function stopActive() {
    const res = await timerApi.stopActive();
    activeTimer.value = null;
    closedSessionMs = 0;
    sessionStartTs = null;
    stopTicking();
    elapsedMs.value = 0;
    return res;
  }

  // Formatted elapsed string: HH:MM:SS
  const elapsedFormatted = computed(() => {
    const totalSec = Math.floor(elapsedMs.value / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  });

  const isRunning = computed(() => activeTimer.value?.status === 'RUNNING');
  const isPaused = computed(() => activeTimer.value?.status === 'PAUSED');
  const hasActiveTimer = computed(() => !!activeTimer.value);

  function $reset() {
    stopTicking();
    activeTimer.value = null;
    elapsedMs.value = 0;
    closedSessionMs = 0;
    sessionStartTs = null;
  }

  return {
    activeTimer, elapsedMs, elapsedFormatted, ticking,
    isRunning, isPaused, hasActiveTimer,
    fetchActive, start, pause, resume, stop, stopActive,
    applyTimerState, setClosedMs,
    $reset
  };
});
