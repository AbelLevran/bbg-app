import prisma from '../db/prisma.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeDuration(startedAt) {
  return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000));
}

function formatActiveTimer(timer) {
  if (!timer) return null;
  return {
    userId: timer.user_id,
    ticketId: timer.ticket_id,
    ticketNumber: timer.ticket?.ticket_number || null,
    ticketTitle: timer.ticket?.title || null,
    status: timer.status,
    activeSessionId: timer.active_session_id,
    activeSessionStartedAt: timer.active_session?.started_at || null,
    updatedAt: timer.updated_at
  };
}

const TIMER_INCLUDE = {
  ticket: { select: { id: true, ticket_number: true, title: true } },
  active_session: { select: { id: true, started_at: true } }
};

// ─── Get active timer ─────────────────────────────────────────────────────

export async function getActiveTimer(userId) {
  const timer = await prisma.activeTimer.findUnique({
    where: { user_id: userId },
    include: TIMER_INCLUDE
  });
  return formatActiveTimer(timer);
}

// ─── START ────────────────────────────────────────────────────────────────

export async function startTimer({ ticketId, user }) {
  // Only assignee may operate timer (design.md §3.4)
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) { const err = new Error('Ticket not found'); err.statusCode = 404; throw err; }
  if (ticket.assigned_to !== user.id) {
    const err = new Error('Only the assigned user can operate this ticket\'s timer');
    err.statusCode = 403; throw err;
  }

  // Check for existing active timer on a DIFFERENT ticket (one-active-timer rule)
  const existing = await prisma.activeTimer.findUnique({
    where: { user_id: user.id },
    include: TIMER_INCLUDE
  });

  if (existing && existing.ticket_id !== ticketId) {
    const err = new Error('You already have an active timer on another ticket');
    err.statusCode = 409;
    err.conflict = formatActiveTimer(existing);
    throw err;
  }

  if (existing && existing.ticket_id === ticketId) {
    // Already running/paused on this ticket — treat as no-op or re-start from paused
    // If PAUSED, treat as resume
    if (existing.status === 'PAUSED') {
      return resumeTimer({ ticketId, user });
    }
    // Already RUNNING — return current state
    return formatActiveTimer(existing);
  }

  // Create a new time session row
  const session = await prisma.timeSession.create({
    data: {
      ticket_id: ticketId,
      user_id: user.id,
      started_at: new Date(),
      source: 'TIMER'
    }
  });

  // Upsert active_timers row
  const timer = await prisma.activeTimer.upsert({
    where: { user_id: user.id },
    create: {
      user_id: user.id,
      ticket_id: ticketId,
      status: 'RUNNING',
      active_session_id: session.id
    },
    update: {
      ticket_id: ticketId,
      status: 'RUNNING',
      active_session_id: session.id
    },
    include: TIMER_INCLUDE
  });

  await prisma.activityLog.create({
    data: {
      ticket_id: ticketId,
      user_id: user.id,
      type: 'TIMER_STARTED',
      description: `Timer started by ${user.name}`
    }
  });

  return formatActiveTimer(timer);
}

// ─── PAUSE ────────────────────────────────────────────────────────────────

export async function pauseTimer({ ticketId, user }) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) { const err = new Error('Ticket not found'); err.statusCode = 404; throw err; }
  if (ticket.assigned_to !== user.id) {
    const err = new Error('Only the assigned user can operate this ticket\'s timer');
    err.statusCode = 403; throw err;
  }

  const existing = await prisma.activeTimer.findUnique({
    where: { user_id: user.id }
  });

  if (!existing || existing.ticket_id !== ticketId) {
    const err = new Error('No active timer for this ticket'); err.statusCode = 400; throw err;
  }
  if (existing.status === 'PAUSED') {
    const err = new Error('Timer is already paused'); err.statusCode = 400; throw err;
  }

  // Close the active session
  const endedAt = new Date();
  const session = await prisma.timeSession.findUnique({ where: { id: existing.active_session_id } });
  const durationMinutes = computeDuration(session.started_at);

  await prisma.timeSession.update({
    where: { id: existing.active_session_id },
    data: { ended_at: endedAt, duration_minutes: durationMinutes }
  });

  // Update active_timers to PAUSED, clear session ref
  const timer = await prisma.activeTimer.update({
    where: { user_id: user.id },
    data: { status: 'PAUSED', active_session_id: null },
    include: TIMER_INCLUDE
  });

  await prisma.activityLog.create({
    data: {
      ticket_id: ticketId,
      user_id: user.id,
      type: 'TIMER_PAUSED',
      description: `Timer paused by ${user.name} (${durationMinutes}m this session)`
    }
  });

  return formatActiveTimer(timer);
}

// ─── RESUME ───────────────────────────────────────────────────────────────

export async function resumeTimer({ ticketId, user }) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) { const err = new Error('Ticket not found'); err.statusCode = 404; throw err; }
  if (ticket.assigned_to !== user.id) {
    const err = new Error('Only the assigned user can operate this ticket\'s timer');
    err.statusCode = 403; throw err;
  }

  const existing = await prisma.activeTimer.findUnique({ where: { user_id: user.id } });
  if (!existing || existing.ticket_id !== ticketId) {
    const err = new Error('No active timer for this ticket'); err.statusCode = 400; throw err;
  }
  if (existing.status === 'RUNNING') {
    const err = new Error('Timer is already running'); err.statusCode = 400; throw err;
  }

  // Open a NEW session row (per design.md §3.4 — resume opens a new row, doesn't reopen the old one)
  const session = await prisma.timeSession.create({
    data: {
      ticket_id: ticketId,
      user_id: user.id,
      started_at: new Date(),
      source: 'TIMER'
    }
  });

  const timer = await prisma.activeTimer.update({
    where: { user_id: user.id },
    data: { status: 'RUNNING', active_session_id: session.id },
    include: TIMER_INCLUDE
  });

  await prisma.activityLog.create({
    data: {
      ticket_id: ticketId,
      user_id: user.id,
      type: 'TIMER_RESUMED',
      description: `Timer resumed by ${user.name}`
    }
  });

  return formatActiveTimer(timer);
}

// ─── STOP ─────────────────────────────────────────────────────────────────

export async function stopTimer({ ticketId, user }) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) { const err = new Error('Ticket not found'); err.statusCode = 404; throw err; }
  if (ticket.assigned_to !== user.id) {
    const err = new Error('Only the assigned user can operate this ticket\'s timer');
    err.statusCode = 403; throw err;
  }

  const existing = await prisma.activeTimer.findUnique({ where: { user_id: user.id } });
  if (!existing || existing.ticket_id !== ticketId) {
    const err = new Error('No active timer for this ticket'); err.statusCode = 400; throw err;
  }

  // If RUNNING, close the session first
  if (existing.status === 'RUNNING' && existing.active_session_id) {
    const session = await prisma.timeSession.findUnique({ where: { id: existing.active_session_id } });
    if (session) {
      const endedAt = new Date();
      const durationMinutes = computeDuration(session.started_at);
      await prisma.timeSession.update({
        where: { id: existing.active_session_id },
        data: { ended_at: endedAt, duration_minutes: durationMinutes }
      });
    }
  }

  // Delete the active_timers row (back to IDLE)
  await prisma.activeTimer.delete({ where: { user_id: user.id } });

  await prisma.activityLog.create({
    data: {
      ticket_id: ticketId,
      user_id: user.id,
      type: 'TIMER_STOPPED',
      description: `Timer stopped by ${user.name}`
    }
  });

  return { status: 'IDLE', ticketId };
}

// ─── STOP any active timer (for "Stop Current & Start New" conflict resolution)

export async function stopActiveTimer(user) {
  const existing = await prisma.activeTimer.findUnique({ where: { user_id: user.id } });
  if (!existing) return null;

  if (existing.status === 'RUNNING' && existing.active_session_id) {
    const session = await prisma.timeSession.findUnique({ where: { id: existing.active_session_id } });
    if (session) {
      const durationMinutes = computeDuration(session.started_at);
      await prisma.timeSession.update({
        where: { id: existing.active_session_id },
        data: { ended_at: new Date(), duration_minutes: durationMinutes }
      });
    }
  }

  await prisma.activeTimer.delete({ where: { user_id: user.id } });

  await prisma.activityLog.create({
    data: {
      ticket_id: existing.ticket_id,
      user_id: user.id,
      type: 'TIMER_STOPPED',
      description: `Timer force-stopped by ${user.name} (switching to another ticket)`
    }
  });

  return { stoppedTicketId: existing.ticket_id };
}

// ─── MANUAL TIME ENTRY ────────────────────────────────────────────────────

export async function addManualTime({ ticketId, user, minutes, reason }) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) { const err = new Error('Ticket not found'); err.statusCode = 404; throw err; }
  if (ticket.assigned_to !== user.id) {
    const err = new Error('Only the assigned user can add manual time to this ticket');
    err.statusCode = 403; throw err;
  }
  if (!reason || !reason.trim()) {
    const err = new Error('A reason is required for manual time entry'); err.statusCode = 400; throw err;
  }
  if (!minutes || minutes <= 0) {
    const err = new Error('Duration must be greater than 0'); err.statusCode = 400; throw err;
  }

  const startedAt = new Date();
  const endedAt = new Date(startedAt.getTime() + minutes * 60000);

  const session = await prisma.timeSession.create({
    data: {
      ticket_id: ticketId,
      user_id: user.id,
      started_at: startedAt,
      ended_at: endedAt,
      duration_minutes: minutes,
      source: 'MANUAL',
      manual_reason: reason.trim()
    }
  });

  await prisma.activityLog.create({
    data: {
      ticket_id: ticketId,
      user_id: user.id,
      type: 'MANUAL_TIME_ADDED',
      description: `Manual time of ${minutes}m added by ${user.name}: "${reason.trim()}"`
    }
  });

  return {
    id: session.id,
    startedAt: session.started_at,
    endedAt: session.ended_at,
    durationMinutes: session.duration_minutes,
    source: session.source,
    manualReason: session.manual_reason
  };
}
