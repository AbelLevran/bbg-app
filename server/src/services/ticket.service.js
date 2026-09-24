import prisma from '../db/prisma.js';

// Format a user for ticket responses (minimal shape)
export function formatUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    title: user.title,
    departmentId: user.department_id,
    departmentName: user.department?.name || null
  };
}

// Format a ticket for API responses, computing derived fields
export function formatTicket(ticket, nowMs = Date.now()) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(ticket.due_date);

  const isOverdue =
    dueDate < today &&
    !['DONE', 'CANCELLED'].includes(ticket.status);

  // Actual minutes: sum of all closed sessions + any open session elapsed
  let actualMinutes = 0;
  if (ticket.time_sessions) {
    for (const s of ticket.time_sessions) {
      if (s.ended_at) {
        actualMinutes += s.duration_minutes;
      } else {
        // Open session: compute elapsed
        const elapsed = Math.floor((nowMs - new Date(s.started_at).getTime()) / 60000);
        actualMinutes += elapsed;
      }
    }
  }

  return {
    id: ticket.id,
    ticketNumber: ticket.ticket_number,
    title: ticket.title,
    description: ticket.description,
    createdBy: formatUser(ticket.creator),
    requestedBy: formatUser(ticket.requester),
    assignedTo: formatUser(ticket.assignee),
    departmentId: ticket.assignee?.department_id || null,
    departmentName: ticket.assignee?.department?.name || null,
    priority: ticket.priority,
    status: ticket.status,
    stuckReason: ticket.stuck_reason,
    estimatedMinutes: ticket.estimated_minutes,
    actualMinutes,
    dueDate: ticket.due_date,
    isOverdue,
    recurrenceGroupId: ticket.recurrence_group_id,
    recurrenceFrequency: ticket.recurrence_frequency,
    seriesLabel: ticket.series_label,
    clusterType: ticket.cluster_type,
    clusterName: ticket.cluster_name,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at
  };
}

// Base include for ticket queries
const TICKET_INCLUDE = {
  creator: { include: { department: { select: { id: true, name: true } } } },
  requester: { include: { department: { select: { id: true, name: true } } } },
  assignee: { include: { department: { select: { id: true, name: true } } } },
  time_sessions: {
    orderBy: { started_at: 'asc' }
  }
};

// Determine the WHERE clause for role-based visibility scoping (design.md §5)
function visibilityScope(user) {
  if (user.role === 'HEAD_GROUP') return {};
  if (user.role === 'DEPARTMENT_HEAD') {
    return {
      assignee: { department_id: user.department_id }
    };
  }
  // MEMBER: only own tickets
  return { assigned_to: user.id };
}

export async function listTickets({ user, query }) {
  const { clusterType, search, status, priority, overdueOnly, sortBy, sortDir, departmentId, assignedTo } = query;

  const baseScope = visibilityScope(user);

  const where = {
    ...baseScope,
    cluster_type: clusterType === 'EVENT' ? 'EVENT' : 'DAILY'
  };

  // Additional filters
  if (status) where.status = status;
  if (priority) where.priority = priority;

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { ticket_number: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Department filter (HEAD_GROUP only per design.md §5)
  if (departmentId && user.role === 'HEAD_GROUP') {
    where.assignee = { department_id: departmentId };
  }

  if (assignedTo && user.role !== 'MEMBER') {
    where.assigned_to = assignedTo;
  }

  // Determine sort
  const validSortFields = {
    due_date: { due_date: sortDir === 'asc' ? 'asc' : 'desc' },
    priority: { priority: sortDir === 'asc' ? 'asc' : 'desc' },
    estimated_minutes: { estimated_minutes: sortDir === 'asc' ? 'asc' : 'desc' },
    created_at: { created_at: sortDir === 'asc' ? 'asc' : 'desc' }
  };
  const orderBy = validSortFields[sortBy] || { created_at: 'desc' };

  const tickets = await prisma.ticket.findMany({
    where,
    include: TICKET_INCLUDE,
    orderBy
  });

  const nowMs = Date.now();
  let result = tickets.map(t => formatTicket(t, nowMs));

  if (overdueOnly === 'true') {
    result = result.filter(t => t.isOverdue);
  }

  return result;
}

export async function getTicket({ id, user }) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      ...TICKET_INCLUDE,
      activity_logs: {
        include: { user: { select: { id: true, name: true, username: true } } },
        orderBy: { created_at: 'asc' }
      }
    }
  });

  if (!ticket) {
    const err = new Error('Ticket not found'); err.statusCode = 404; throw err;
  }

  // Verify visibility
  const scope = visibilityScope(user);
  if (scope.assigned_to && ticket.assigned_to !== scope.assigned_to) {
    const err = new Error('Forbidden'); err.statusCode = 403; throw err;
  }
  if (scope.assignee?.department_id && ticket.assignee?.department_id !== scope.assignee.department_id) {
    const err = new Error('Forbidden'); err.statusCode = 403; throw err;
  }

  const formatted = formatTicket(ticket);
  formatted.activityLogs = ticket.activity_logs.map(log => ({
    id: log.id,
    type: log.type,
    description: log.description,
    user: log.user,
    createdAt: log.created_at
  }));

  // Group time sessions by day
  const sessions = ticket.time_sessions.map(s => ({
    id: s.id,
    startedAt: s.started_at,
    endedAt: s.ended_at,
    durationMinutes: s.ended_at
      ? s.duration_minutes
      : Math.floor((Date.now() - new Date(s.started_at).getTime()) / 60000),
    source: s.source,
    manualReason: s.manual_reason
  }));
  formatted.timeSessions = sessions;

  return formatted;
}

export async function createTicket({ user, data }) {
  const { generateTicketNumber } = await import('../utils/ticketNumber.js');

  const {
    title, description, requestedBy, assignedTo,
    priority, estimatedMinutes, dueDate,
    clusterType, clusterName
  } = data;

  // Validate assignedTo permission (design.md §5)
  await validateAssignedTo({ user, assignedToId: assignedTo });

  const ticketNumber = await generateTicketNumber();

  const ticket = await prisma.ticket.create({
    data: {
      ticket_number: ticketNumber,
      title,
      description: description || null,
      created_by: user.id,
      requested_by: requestedBy,
      assigned_to: assignedTo,
      priority,
      status: 'TODO',
      estimated_minutes: estimatedMinutes,
      due_date: new Date(dueDate),
      cluster_type: clusterType || 'DAILY',
      cluster_name: clusterType === 'EVENT' ? clusterName : null
    },
    include: TICKET_INCLUDE
  });

  // Activity log
  await prisma.activityLog.create({
    data: {
      ticket_id: ticket.id,
      user_id: user.id,
      type: 'CREATED',
      description: `Ticket ${ticketNumber} created by ${user.name}`
    }
  });

  return formatTicket(ticket);
}

export async function updateTicket({ id, user, data }) {
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) { const err = new Error('Ticket not found'); err.statusCode = 404; throw err; }

  // Ownership check: only creator may edit (prd.md §4.3.4)
  if (ticket.created_by !== user.id) {
    const err = new Error('Only the ticket creator can edit this ticket'); err.statusCode = 403; throw err;
  }

  const { title, description, requestedBy, assignedTo, priority, estimatedMinutes, dueDate, clusterType, clusterName } = data;

  if (assignedTo && assignedTo !== ticket.assigned_to) {
    await validateAssignedTo({ user, assignedToId: assignedTo });
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(requestedBy !== undefined && { requested_by: requestedBy }),
      ...(assignedTo !== undefined && { assigned_to: assignedTo }),
      ...(priority !== undefined && { priority }),
      ...(estimatedMinutes !== undefined && { estimated_minutes: estimatedMinutes }),
      ...(dueDate !== undefined && { due_date: new Date(dueDate) }),
      ...(clusterType !== undefined && { cluster_type: clusterType }),
      ...(clusterName !== undefined && { cluster_name: clusterType === 'EVENT' ? clusterName : null })
    },
    include: TICKET_INCLUDE
  });

  await prisma.activityLog.create({
    data: {
      ticket_id: id,
      user_id: user.id,
      type: 'UPDATED',
      description: `Ticket updated by ${user.name}`
    }
  });

  return formatTicket(updated);
}

export async function deleteTicket({ id, user }) {
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) { const err = new Error('Ticket not found'); err.statusCode = 404; throw err; }

  // Ownership check: only creator may delete (prd.md §4.3.4)
  if (ticket.created_by !== user.id) {
    const err = new Error('Only the ticket creator can delete this ticket'); err.statusCode = 403; throw err;
  }

  // Hard delete — cascades time_sessions and activity_logs via FK ON DELETE CASCADE
  await prisma.ticket.delete({ where: { id } });
  return { success: true };
}

export async function changeStatus({ id, user, status, stuckReason }) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { assignee: { include: { department: true } } }
  });
  if (!ticket) { const err = new Error('Ticket not found'); err.statusCode = 404; throw err; }

  // Status-change permission: assignee, dept head of ticket's dept, or head group (prd.md §4.3.4)
  const canChange =
    user.role === 'HEAD_GROUP' ||
    ticket.assigned_to === user.id ||
    (user.role === 'DEPARTMENT_HEAD' && ticket.assignee?.department_id === user.department_id);

  if (!canChange) {
    const err = new Error('You do not have permission to change this ticket\'s status'); err.statusCode = 403; throw err;
  }

  if (status === 'STUCK' && !stuckReason) {
    const err = new Error('A reason is required when marking a ticket as Stuck'); err.statusCode = 400; throw err;
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: {
      status,
      stuck_reason: status === 'STUCK' ? stuckReason : null
    },
    include: TICKET_INCLUDE
  });

  const desc = status === 'STUCK'
    ? `Status changed to ${status} by ${user.name}: "${stuckReason}"`
    : `Status changed to ${status} by ${user.name}`;

  await prisma.activityLog.create({
    data: { ticket_id: id, user_id: user.id, type: 'STATUS_CHANGED', description: desc }
  });

  return formatTicket(updated);
}

// Validate assignedTo per role (design.md §4.3.1)
async function validateAssignedTo({ user, assignedToId }) {
  if (user.role === 'HEAD_GROUP') return; // can assign to anyone

  const target = await prisma.user.findUnique({ where: { id: assignedToId } });
  if (!target) { const err = new Error('Assigned user not found'); err.statusCode = 400; throw err; }

  if (user.role === 'DEPARTMENT_HEAD') {
    // Can assign to self or own department members
    if (target.id !== user.id && target.department_id !== user.department_id) {
      const err = new Error('Department Heads can only assign to themselves or members of their department');
      err.statusCode = 403; throw err;
    }
  } else {
    // MEMBER: can only assign to self
    if (target.id !== user.id) {
      const err = new Error('Members can only assign tickets to themselves');
      err.statusCode = 403; throw err;
    }
  }
}

/**
 * Creates a recurring series of N independent tickets sharing a recurrenceGroupId.
 * prd.md §3.7, design.md §5
 */
export async function createRecurringSeries({ user, data }) {
  const { generateTicketNumber } = await import('../utils/ticketNumber.js');

  const {
    seriesLabel,
    frequency,      // 'DAILY' | 'WEEKLY'
    occurrences,   // integer ≥ 1
    startDueDate,  // ISO date string for first occurrence
    requestedBy,
    assignedTo,
    priority,
    estimatedMinutes,
    description,
    clusterType,
    clusterName
  } = data;

  await validateAssignedTo({ user, assignedToId: assignedTo });

  const recurrenceGroupId = crypto.randomUUID();
  const intervalDays = frequency === 'WEEKLY' ? 7 : 1;

  const createdTickets = [];
  const baseDate = new Date(startDueDate);

  for (let i = 0; i < occurrences; i++) {
    const dueDate = new Date(baseDate);
    dueDate.setUTCDate(baseDate.getUTCDate() + i * intervalDays);

    const ticketNumber = await generateTicketNumber();
    const title = `${seriesLabel} — ${dueDate.toISOString().slice(0, 10)}`;

    const ticket = await prisma.ticket.create({
      data: {
        ticket_number: ticketNumber,
        title,
        description: description || null,
        created_by: user.id,
        requested_by: requestedBy,
        assigned_to: assignedTo,
        priority,
        status: 'TODO',
        estimated_minutes: estimatedMinutes,
        due_date: dueDate,
        recurrence_group_id: recurrenceGroupId,
        recurrence_frequency: frequency,
        series_label: seriesLabel,
        cluster_type: clusterType || 'DAILY',
        cluster_name: clusterType === 'EVENT' ? clusterName : null
      },
      include: TICKET_INCLUDE
    });

    await prisma.activityLog.create({
      data: {
        ticket_id: ticket.id,
        user_id: user.id,
        type: 'CREATED',
        description: `Recurring ticket ${ticketNumber} ("${seriesLabel}" series, occurrence ${i + 1} of ${occurrences}) created by ${user.name}`
      }
    });

    createdTickets.push(formatTicket(ticket));
  }

  return { recurrenceGroupId, occurrences: createdTickets.length, tickets: createdTickets };
}

/**
 * Adds the next occurrence to an existing series.
 * Finds the latest dueDate in the series and creates +1 ticket.
 * prd.md §3.7
 */
export async function addNextOccurrence({ ticketId, user }) {
  const { generateTicketNumber } = await import('../utils/ticketNumber.js');

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) { const err = new Error('Ticket not found'); err.statusCode = 404; throw err; }
  if (!ticket.recurrence_group_id) {
    const err = new Error('This ticket is not part of a recurring series');
    err.statusCode = 400; throw err;
  }

  // Find the latest dueDate in the series
  const latest = await prisma.ticket.findFirst({
    where: { recurrence_group_id: ticket.recurrence_group_id },
    orderBy: { due_date: 'desc' }
  });

  const intervalDays = ticket.recurrence_frequency === 'WEEKLY' ? 7 : 1;
  const nextDueDate = new Date(latest.due_date);
  nextDueDate.setUTCDate(nextDueDate.getUTCDate() + intervalDays);

  const ticketNumber = await generateTicketNumber();
  const title = `${ticket.series_label} — ${nextDueDate.toISOString().slice(0, 10)}`;

  const newTicket = await prisma.ticket.create({
    data: {
      ticket_number: ticketNumber,
      title,
      description: ticket.description,
      created_by: user.id,
      requested_by: ticket.requested_by,
      assigned_to: ticket.assigned_to,
      priority: ticket.priority,
      status: 'TODO',
      estimated_minutes: ticket.estimated_minutes,
      due_date: nextDueDate,
      recurrence_group_id: ticket.recurrence_group_id,
      recurrence_frequency: ticket.recurrence_frequency,
      series_label: ticket.series_label,
      cluster_type: ticket.cluster_type,
      cluster_name: ticket.cluster_name
    },
    include: TICKET_INCLUDE
  });

  await prisma.activityLog.create({
    data: {
      ticket_id: newTicket.id,
      user_id: user.id,
      type: 'CREATED',
      description: `Next occurrence ${ticketNumber} added to "${ticket.series_label}" series by ${user.name}`
    }
  });

  return formatTicket(newTicket);
}

/**
 * Returns all tickets in the same recurrence series as the given ticket.
 */
export async function getSeriesSiblings(ticketId) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket?.recurrence_group_id) return [];

  const siblings = await prisma.ticket.findMany({
    where: { recurrence_group_id: ticket.recurrence_group_id },
    include: TICKET_INCLUDE,
    orderBy: { due_date: 'asc' }
  });

  return siblings.map(s => formatTicket(s));
}
