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
  // Parallel fetch: check ticket and user's current timer simultaneously
  const [ticket, existing] = await Promise.all([
    prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, assigned_to: true, status: true }
    }),
    prisma.activeTimer.findUnique({
      where: { user_id: user.id },
      include: TIMER_INCLUDE
    })
  ]);

  if (!ticket) { const err = new Error('Ticket not found'); err.statusCode = 404; throw err; }
  if (ticket.assigned_to !== user.id) {
    const err = new Error('Only the assigned user can operate this ticket\'s timer');
    err.statusCode = 403; throw err;
  }

  if (existing && existing.ticket_id !== ticketId) {
    const err = new Error('You already have an active timer on another ticket');
    err.statusCode = 409;
    err.conflict = formatActiveTimer(existing);
    throw err;
  }

  if (existing && existing.ticket_id === ticketId) {
    if (existing.status === 'PAUSED') {
      return resumeTimer({ ticketId, user });
    }
    return formatActiveTimer(existing);
  }

  // Atomically create session and upsert active timer
  const timer = await prisma.$transaction(async (tx) => {
    const session = await tx.timeSession.create({
      data: {
        ticket_id: ticketId,
        user_id: user.id,
        started_at: new Date(),
        source: 'TIMER'
      }
    });

    return tx.activeTimer.upsert({
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
  });

  // Non-blocking activity log (fire-and-forget to avoid round-trip latency)
  void prisma.activityLog.create({
    data: {
      ticket_id: ticketId,
      user_id: user.id,
      type: 'TIMER_STARTED',
      description: `Timer started by ${user.name}`
    }
  }).catch(err => console.error('[ActivityLog] failed to log timer start:', err.message));

  return formatActiveTimer(timer);
}

// ─── PAUSE ────────────────────────────────────────────────────────────────

export async function pauseTimer({ ticketId, user }) {
  // Parallel fetch: check ticket and active timer with active_session in one go
  const [ticket, existing] = await Promise.all([
    prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, assigned_to: true }
    }),
    prisma.activeTimer.findUnique({
      where: { user_id: user.id },
      include: {
        ...TIMER_INCLUDE,
        active_session: { select: { id: true, started_at: true } }
      }
    })
  ]);

  if (!ticket) { const err = new Error('Ticket not found'); err.statusCode = 404; throw err; }
  if (ticket.assigned_to !== user.id) {
    const err = new Error('Only the assigned user can operate this ticket\'s timer');
    err.statusCode = 403; throw err;
  }

  if (!existing || existing.ticket_id !== ticketId) {
    const err = new Error('No active timer for this ticket'); err.statusCode = 400; throw err;
  }
  if (existing.status === 'PAUSED') {
    const err = new Error('Timer is already paused'); err.statusCode = 400; throw err;
  }

  const endedAt = new Date();
  const startedAt = existing.active_session?.started_at || existing.updated_at;
  const durationMinutes = computeDuration(startedAt);

  // Close session & update active_timer in a single round-trip transaction
  const operations = [];
  if (existing.active_session_id) {
    operations.push(
      prisma.timeSession.update({
        where: { id: existing.active_session_id },
        data: { ended_at: endedAt, duration_minutes: durationMinutes }
      })
    );
  }
  operations.push(
    prisma.activeTimer.update({
      where: { user_id: user.id },
      data: { status: 'PAUSED', active_session_id: null },
      include: TIMER_INCLUDE
    })
  );

  const results = await prisma.$transaction(operations);
  const timer = results[results.length - 1];

  // Non-blocking activity log
  void prisma.activityLog.create({
    data: {
      ticket_id: ticketId,
      user_id: user.id,
      type: 'TIMER_PAUSED',
      description: `Timer paused by ${user.name} (${durationMinutes}m this session)`
    }
  }).catch(err => console.error('[ActivityLog] failed to log timer pause:', err.message));

  return formatActiveTimer(timer);
}

// ─── RESUME ───────────────────────────────────────────────────────────────

export async function resumeTimer({ ticketId, user }) {
  const [ticket, existing] = await Promise.all([
    prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, assigned_to: true }
    }),
    prisma.activeTimer.findUnique({
      where: { user_id: user.id }
    })
  ]);

  if (!ticket) { const err = new Error('Ticket not found'); err.statusCode = 404; throw err; }
  if (ticket.assigned_to !== user.id) {
    const err = new Error('Only the assigned user can operate this ticket\'s timer');
    err.statusCode = 403; throw err;
  }

  if (!existing || existing.ticket_id !== ticketId) {
    const err = new Error('No active timer for this ticket'); err.statusCode = 400; throw err;
  }
  if (existing.status === 'RUNNING') {
    const err = new Error('Timer is already running'); err.statusCode = 400; throw err;
  }

  // Atomically create new session and update active timer
  const timer = await prisma.$transaction(async (tx) => {
    const session = await tx.timeSession.create({
      data: {
        ticket_id: ticketId,
        user_id: user.id,
        started_at: new Date(),
        source: 'TIMER'
      }
    });

    return tx.activeTimer.update({
      where: { user_id: user.id },
      data: { status: 'RUNNING', active_session_id: session.id },
      include: TIMER_INCLUDE
    });
  });

  // Non-blocking activity log
  void prisma.activityLog.create({
    data: {
      ticket_id: ticketId,
      user_id: user.id,
      type: 'TIMER_RESUMED',
      description: `Timer resumed by ${user.name}`
    }
  }).catch(err => console.error('[ActivityLog] failed to log timer resume:', err.message));

  return formatActiveTimer(timer);
}

// ─── STOP ─────────────────────────────────────────────────────────────────

export async function stopTimer({ ticketId, user }) {
  const [ticket, existing] = await Promise.all([
    prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, assigned_to: true }
    }),
    prisma.activeTimer.findUnique({
      where: { user_id: user.id },
      include: {
        active_session: { select: { id: true, started_at: true } }
      }
    })
  ]);

  if (!ticket) { const err = new Error('Ticket not found'); err.statusCode = 404; throw err; }
  if (ticket.assigned_to !== user.id) {
    const err = new Error('Only the assigned user can operate this ticket\'s timer');
    err.statusCode = 403; throw err;
  }

  if (!existing || existing.ticket_id !== ticketId) {
    const err = new Error('No active timer for this ticket'); err.statusCode = 400; throw err;
  }

  // Batch close session and delete active_timer in single transaction
  const operations = [];
  if (existing.status === 'RUNNING' && existing.active_session_id) {
    const endedAt = new Date();
    const startedAt = existing.active_session?.started_at || existing.updated_at;
    const durationMinutes = computeDuration(startedAt);
    operations.push(
      prisma.timeSession.update({
        where: { id: existing.active_session_id },
        data: { ended_at: endedAt, duration_minutes: durationMinutes }
      })
    );
  }
  operations.push(prisma.activeTimer.delete({ where: { user_id: user.id } }));

  await prisma.$transaction(operations);

  // Non-blocking activity log
  void prisma.activityLog.create({
    data: {
      ticket_id: ticketId,
      user_id: user.id,
      type: 'TIMER_STOPPED',
      description: `Timer stopped by ${user.name}`
    }
  }).catch(err => console.error('[ActivityLog] failed to log timer stop:', err.message));

  return { status: 'IDLE', ticketId };
}

// ─── STOP any active timer (for "Stop Current & Start New" conflict resolution)

export async function stopActiveTimer(user) {
  const existing = await prisma.activeTimer.findUnique({
    where: { user_id: user.id },
    include: {
      active_session: { select: { id: true, started_at: true } }
    }
  });
  if (!existing) return null;

  const operations = [];
  if (existing.status === 'RUNNING' && existing.active_session_id) {
    const startedAt = existing.active_session?.started_at || existing.updated_at;
    const durationMinutes = computeDuration(startedAt);
    operations.push(
      prisma.timeSession.update({
        where: { id: existing.active_session_id },
        data: { ended_at: new Date(), duration_minutes: durationMinutes }
      })
    );
  }
  operations.push(prisma.activeTimer.delete({ where: { user_id: user.id } }));

  await prisma.$transaction(operations);

  // Non-blocking activity log
  void prisma.activityLog.create({
    data: {
      ticket_id: existing.ticket_id,
      user_id: user.id,
      type: 'TIMER_STOPPED',
      description: `Timer force-stopped by ${user.name} (switching to another ticket)`
    }
  }).catch(err => console.error('[ActivityLog] failed to log timer force-stop:', err.message));

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
