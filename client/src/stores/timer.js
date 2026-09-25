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

  async function start(ticketId, ticketMeta = {}) {
    const prevTimer = activeTimer.value ? { ...activeTimer.value } : null;
    const prevClosedMs = closedSessionMs;
    const prevSessionStartTs = sessionStartTs;

    // Optimistic instant state update (0ms perceived latency!)
    activeTimer.value = {
      ticketId,
      ticketNumber: ticketMeta.ticketNumber || activeTimer.value?.ticketNumber || null,
      ticketTitle: ticketMeta.title || activeTimer.value?.ticketTitle || null,
      status: 'RUNNING',
      activeSessionStartedAt: new Date().toISOString()
    };
    sessionStartTs = Date.now();
    startTicking();
    _recompute();

    try {
      const res = await timerApi.start(ticketId);
      applyTimerState(res.timer);
      return res;
    } catch (err) {
      // Rollback on conflict or network failure
      activeTimer.value = prevTimer;
      closedSessionMs = prevClosedMs;
      sessionStartTs = prevSessionStartTs;
      if (prevTimer?.status === 'RUNNING') {
        startTicking();
      } else {
        stopTicking();
      }
      _recompute();
      throw err;
    }
  }

  async function pause(ticketId) {
    const prevTimer = activeTimer.value ? { ...activeTimer.value } : null;
    const prevClosedMs = closedSessionMs;
    const prevSessionStartTs = sessionStartTs;

    // Optimistically freeze clock and update state instantly
    if (sessionStartTs) {
      closedSessionMs += (Date.now() - sessionStartTs);
    }
    sessionStartTs = null;
    stopTicking();
    if (activeTimer.value) {
      activeTimer.value = { ...activeTimer.value, status: 'PAUSED' };
    }
    _recompute();

    try {
      const res = await timerApi.pause(ticketId);
      applyTimerState(res.timer);
      return res;
    } catch (err) {
      // Rollback
      activeTimer.value = prevTimer;
      closedSessionMs = prevClosedMs;
      sessionStartTs = prevSessionStartTs;
      if (prevTimer?.status === 'RUNNING') startTicking();
      _recompute();
      throw err;
    }
  }

  async function resume(ticketId) {
    const prevTimer = activeTimer.value ? { ...activeTimer.value } : null;
    const prevClosedMs = closedSessionMs;
    const prevSessionStartTs = sessionStartTs;

    // Optimistically set to running immediately
    activeTimer.value = {
      ...(activeTimer.value || {}),
      ticketId,
      status: 'RUNNING',
      activeSessionStartedAt: new Date().toISOString()
    };
    sessionStartTs = Date.now();
    startTicking();
    _recompute();

    try {
      const res = await timerApi.resume(ticketId);
      applyTimerState(res.timer);
      return res;
    } catch (err) {
      activeTimer.value = prevTimer;
      closedSessionMs = prevClosedMs;
      sessionStartTs = prevSessionStartTs;
      stopTicking();
      _recompute();
      throw err;
    }
  }

  async function stop(ticketId) {
    const prevTimer = activeTimer.value ? { ...activeTimer.value } : null;
    const prevClosedMs = closedSessionMs;
    const prevSessionStartTs = sessionStartTs;

    // Optimistically clear timer immediately
    activeTimer.value = null;
    closedSessionMs = 0;
    sessionStartTs = null;
    stopTicking();
    elapsedMs.value = 0;

    try {
      const res = await timerApi.stop(ticketId);
      return res;
    } catch (err) {
      activeTimer.value = prevTimer;
      closedSessionMs = prevClosedMs;
      sessionStartTs = prevSessionStartTs;
      if (prevTimer?.status === 'RUNNING') startTicking();
      _recompute();
      throw err;
    }
  }

  async function stopActive() {
    const prevTimer = activeTimer.value ? { ...activeTimer.value } : null;
    const prevClosedMs = closedSessionMs;
    const prevSessionStartTs = sessionStartTs;

    activeTimer.value = null;
    closedSessionMs = 0;
    sessionStartTs = null;
    stopTicking();
    elapsedMs.value = 0;

    try {
      const res = await timerApi.stopActive();
      return res;
    } catch (err) {
      activeTimer.value = prevTimer;
      closedSessionMs = prevClosedMs;
      sessionStartTs = prevSessionStartTs;
      if (prevTimer?.status === 'RUNNING') startTicking();
      _recompute();
      throw err;
    }
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
