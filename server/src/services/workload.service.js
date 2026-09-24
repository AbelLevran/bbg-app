import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Parses free-text capacity input per prd.md §3.6
 * Accepts: "38" (hours), "38h", "2280m"
 * Returns minutes as integer.
 */
export function parseCapacityText(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim().toLowerCase();

  // Minutes explicit: "2280m"
  const minMatch = trimmed.match(/^(\d+(?:\.\d+)?)m$/);
  if (minMatch) return Math.round(parseFloat(minMatch[1]));

  // Hours explicit: "38h"
  const hrMatch = trimmed.match(/^(\d+(?:\.\d+)?)h$/);
  if (hrMatch) return Math.round(parseFloat(hrMatch[1]) * 60);

  // Bare number treated as hours: "38"
  const numMatch = trimmed.match(/^(\d+(?:\.\d+)?)$/);
  if (numMatch) return Math.round(parseFloat(numMatch[1]) * 60);

  return null; // invalid
}

/**
 * Returns { start, end } for the ISO week containing `weekDate`.
 * week_start = Monday 00:00:00 UTC
 * week_end   = Sunday 23:59:59.999 UTC
 */
export function getWeekBounds(weekDate) {
  const d = new Date(weekDate);
  // Normalize to UTC midnight
  d.setUTCHours(0, 0, 0, 0);
  // Day of week (0=Sun, 1=Mon... 6=Sat) → shift to Mon=0
  const dow = (d.getUTCDay() + 6) % 7;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - dow);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

/**
 * Monday of the ISO week containing `weekDate` — "YYYY-MM-DD"
 */
export function weekStartDate(weekDate) {
  const { start } = getWeekBounds(weekDate);
  return start.toISOString().slice(0, 10);
}

/**
 * Monday Date object at 00:00:00 UTC for Prisma @db.Date field
 */
export function weekStartDateObject(weekDate) {
  const { start } = getWeekBounds(weekDate);
  return new Date(start.toISOString().slice(0, 10) + 'T00:00:00.000Z');
}

/**
 * Risk level from utilization %.
 * Uses planned_utilization for the general risk badge (design.md §7.2).
 */
export function getRiskLevel(pct) {
  if (pct > 120) return 'EXTREME';
  if (pct > 100) return 'OVER';
  if (pct >= 80) return 'HIGH';
  return 'NORMAL';
}

export function getRiskLabel(pct) {
  const level = getRiskLevel(pct);
  const map = {
    NORMAL: 'Normal',
    HIGH: 'High load',
    OVER: 'Over capacity',
    EXTREME: 'Extreme load'
  };
  return map[level] || level;
}

const DEFAULT_CAPACITY_MINUTES = 2400; // 40h

/**
 * Fetches capacity minutes & raw text for a user for a given week.
 * Falls back to 2400 (40h) if no override exists.
 */
export async function getCapacityInfo(userId, weekDate) {
  const dateObj = weekStartDateObject(weekDate);
  const override = await prisma.userCapacityOverride.findUnique({
    where: {
      user_id_week_start_date: {
        user_id: userId,
        week_start_date: dateObj
      }
    }
  });

  return {
    minutes: override ? override.minutes : DEFAULT_CAPACITY_MINUTES,
    hours: (override ? override.minutes : DEFAULT_CAPACITY_MINUTES) / 60,
    rawText: override ? override.raw_text : '40',
    isOverridden: !!override
  };
}

/**
 * Core per-user workload block per design.md §4.
 */
export async function getUserWorkload(userId, weekDate) {
  const { start, end } = getWeekBounds(weekDate);
  const capInfo = await getCapacityInfo(userId, weekDate);
  const capacityMinutes = capInfo.minutes;

  // Planned: tickets whose dueDate falls in this week, not CANCELLED
  const plannedResult = await prisma.ticket.aggregate({
    _sum: { estimated_minutes: true },
    where: {
      assigned_to: userId,
      status: { not: 'CANCELLED' },
      due_date: { gte: start, lte: end }
    }
  });
  const plannedMinutes = plannedResult._sum.estimated_minutes || 0;

  // Actual: closed time sessions started in this week + open session elapsed
  const closedSessions = await prisma.timeSession.aggregate({
    _sum: { duration_minutes: true },
    where: {
      user_id: userId,
      started_at: { gte: start, lte: end },
      ended_at: { not: null }
    }
  });
  const closedMinutes = closedSessions._sum.duration_minutes || 0;

  // Check for an open (running) session in this week
  const openSession = await prisma.timeSession.findFirst({
    where: {
      user_id: userId,
      started_at: { gte: start, lte: end },
      ended_at: null
    }
  });
  const openMinutes = openSession
    ? Math.floor((Date.now() - new Date(openSession.started_at).getTime()) / 60000)
    : 0;

  const actualMinutes = closedMinutes + openMinutes;

  const plannedUtilizationPct = capacityMinutes > 0
    ? Math.round((plannedMinutes / capacityMinutes) * 100)
    : 0;
  const actualUtilizationPct = capacityMinutes > 0
    ? Math.round((actualMinutes / capacityMinutes) * 100)
    : 0;
  const remainingCapacityMinutes = capacityMinutes - plannedMinutes;
  const riskLevel = getRiskLevel(plannedUtilizationPct);

  // Active tickets: status in TODO/IN_PROGRESS/IN_REVIEW/STUCK
  const activeTicketCount = await prisma.ticket.count({
    where: {
      assigned_to: userId,
      status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'STUCK'] }
    }
  });

  // Overdue: dueDate < now AND status not DONE/CANCELLED
  const overdueTicketCount = await prisma.ticket.count({
    where: {
      assigned_to: userId,
      due_date: { lt: new Date() },
      status: { notIn: ['DONE', 'CANCELLED'] }
    }
  });

  return {
    userId,
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    capacityMinutes,
    capacityHours: capacityMinutes / 60,
    capacityRawText: capInfo.rawText,
    isCapacityOverridden: capInfo.isOverridden,
    plannedMinutes,
    plannedHours: Number((plannedMinutes / 60).toFixed(1)),
    actualMinutes,
    actualHours: Number((actualMinutes / 60).toFixed(1)),
    plannedUtilizationPct,
    actualUtilizationPct,
    remainingCapacityMinutes,
    remainingCapacityHours: Number((remainingCapacityMinutes / 60).toFixed(1)),
    riskLevel,
    riskLabel: getRiskLabel(plannedUtilizationPct),
    activeTicketCount,
    overdueTicketCount
  };
}

/**
 * Department-level workload rollup for a given week.
 */
export async function getDepartmentWorkload(deptId, weekDate) {
  const { start, end } = getWeekBounds(weekDate);

  const dept = await prisma.department.findUnique({
    where: { id: deptId },
    select: { id: true, name: true }
  });

  const members = await prisma.user.findMany({
    where: { department_id: deptId, is_active: true },
    select: { id: true, name: true, username: true, role: true, title: true }
  });

  const memberRows = await Promise.all(
    members.map(async (m) => {
      const wl = await getUserWorkload(m.id, weekDate);
      return { user: m, ...wl };
    })
  );

  // Department rollup is sum of members
  const totalCapacity = memberRows.reduce((s, r) => s + r.capacityMinutes, 0);
  const totalPlanned = memberRows.reduce((s, r) => s + r.plannedMinutes, 0);
  const totalActual = memberRows.reduce((s, r) => s + r.actualMinutes, 0);
  const deptPlannedUtilizationPct = totalCapacity > 0
    ? Math.round((totalPlanned / totalCapacity) * 100) : 0;
  const deptActualUtilizationPct = totalCapacity > 0
    ? Math.round((totalActual / totalCapacity) * 100) : 0;
  const deptRiskLevel = getRiskLevel(deptPlannedUtilizationPct);

  // Count active and overdue across department
  const memberIds = members.map(m => m.id);
  const totalTickets = await prisma.ticket.count({
    where: { assigned_to: { in: memberIds } }
  });
  const activeTickets = await prisma.ticket.count({
    where: {
      assigned_to: { in: memberIds },
      status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'STUCK'] }
    }
  });
  const completedTickets = await prisma.ticket.count({
    where: { assigned_to: { in: memberIds }, status: 'DONE' }
  });
  const overdueTickets = await prisma.ticket.count({
    where: {
      assigned_to: { in: memberIds },
      due_date: { lt: new Date() },
      status: { notIn: ['DONE', 'CANCELLED'] }
    }
  });

  return {
    department: dept,
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    totalCapacityMinutes: totalCapacity,
    totalCapacityHours: Number((totalCapacity / 60).toFixed(1)),
    totalPlannedMinutes: totalPlanned,
    totalPlannedHours: Number((totalPlanned / 60).toFixed(1)),
    totalActualMinutes: totalActual,
    totalActualHours: Number((totalActual / 60).toFixed(1)),
    plannedUtilizationPct: deptPlannedUtilizationPct,
    actualUtilizationPct: deptActualUtilizationPct,
    riskLevel: deptRiskLevel,
    riskLabel: getRiskLabel(deptPlannedUtilizationPct),
    totalTickets,
    activeTickets,
    completedTickets,
    overdueTickets,
    members: memberRows
  };
}

/**
 * Group-wide workload — all 4 departments.
 */
export async function getGroupWorkload(weekDate) {
  const { start, end } = getWeekBounds(weekDate);
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true }
  });

  const deptRows = await Promise.all(
    departments.map((d) => getDepartmentWorkload(d.id, weekDate))
  );

  const totalCapacity = deptRows.reduce((s, d) => s + d.totalCapacityMinutes, 0);
  const totalPlanned = deptRows.reduce((s, d) => s + d.totalPlannedMinutes, 0);
  const totalActual = deptRows.reduce((s, d) => s + d.totalActualMinutes, 0);
  const totalTickets = deptRows.reduce((s, d) => s + d.totalTickets, 0);
  const activeTickets = deptRows.reduce((s, d) => s + d.activeTickets, 0);
  const completedTickets = deptRows.reduce((s, d) => s + d.completedTickets, 0);
  const overdueTickets = deptRows.reduce((s, d) => s + d.overdueTickets, 0);

  const groupPlannedUtilizationPct = totalCapacity > 0
    ? Math.round((totalPlanned / totalCapacity) * 100) : 0;
  const groupActualUtilizationPct = totalCapacity > 0
    ? Math.round((totalActual / totalCapacity) * 100) : 0;

  // Flatten all members for group-wide overview
  const allMembers = deptRows.flatMap(d => d.members);

  return {
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    totalCapacityMinutes: totalCapacity,
    totalCapacityHours: Number((totalCapacity / 60).toFixed(1)),
    totalPlannedMinutes: totalPlanned,
    totalPlannedHours: Number((totalPlanned / 60).toFixed(1)),
    totalActualMinutes: totalActual,
    totalActualHours: Number((totalActual / 60).toFixed(1)),
    plannedUtilizationPct: groupPlannedUtilizationPct,
    actualUtilizationPct: groupActualUtilizationPct,
    riskLevel: getRiskLevel(groupPlannedUtilizationPct),
    riskLabel: getRiskLabel(groupPlannedUtilizationPct),
    totalTickets,
    activeTickets,
    completedTickets,
    overdueTickets,
    departments: deptRows,
    members: allMembers
  };
}

/**
 * Sustained high workload: planned_utilization > 100% for 2+ consecutive weeks.
 */
export async function getSustainedHighWorkload(weekDate) {
  const { start } = getWeekBounds(weekDate);
  const users = await prisma.user.findMany({
    where: { is_active: true, role: { not: 'HEAD_GROUP' } },
    select: {
      id: true,
      name: true,
      username: true,
      department_id: true,
      department: { select: { id: true, name: true } }
    }
  });

  const sustained = [];
  for (const u of users) {
    let highCount = 0;
    for (let w = 0; w < 4; w++) {
      const wDate = new Date(start);
      wDate.setUTCDate(start.getUTCDate() - w * 7);
      const wl = await getUserWorkload(u.id, wDate);
      if (wl.plannedUtilizationPct > 100) {
        highCount++;
      } else {
        break; // not consecutive
      }
    }
    if (highCount >= 2) {
      const wl = await getUserWorkload(u.id, weekDate);
      sustained.push({
        user: u,
        consecutiveWeeks: highCount,
        ...wl
      });
    }
  }
  return sustained;
}

/**
 * Multi-week trend for a user (default 4 weeks ending at weekDate).
 */
export async function getUserWeeklyTrend(userId, weekDate, numWeeks = 4) {
  const { start } = getWeekBounds(weekDate);
  const weeks = [];

  for (let i = numWeeks - 1; i >= 0; i--) {
    const w = new Date(start);
    w.setUTCDate(start.getUTCDate() - i * 7);
    const wl = await getUserWorkload(userId, w);
    const weekLabel = `W ${w.toISOString().slice(5, 10)}`;
    weeks.push({
      weekLabel,
      weekStart: wl.weekStart,
      capacityHours: wl.capacityHours,
      plannedHours: wl.plannedHours,
      actualHours: wl.actualHours,
      plannedUtilizationPct: wl.plannedUtilizationPct,
      actualUtilizationPct: wl.actualUtilizationPct,
      riskLevel: wl.riskLevel
    });
  }

  return weeks;
}

/**
 * Daily workload breakdown for Monday-Sunday of a given week.
 */
export async function getUserDailyWorkload(userId, weekDate) {
  const { start } = getWeekBounds(weekDate);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const daily = [];

  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(start);
    dayStart.setUTCDate(start.getUTCDate() + i);
    dayStart.setUTCHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const agg = await prisma.timeSession.aggregate({
      _sum: { duration_minutes: true },
      where: {
        user_id: userId,
        started_at: { gte: dayStart, lte: dayEnd },
        ended_at: { not: null }
      }
    });

    const mins = agg._sum.duration_minutes || 0;
    daily.push({
      day: days[i],
      date: dayStart.toISOString().slice(0, 10),
      minutes: mins,
      hours: Number((mins / 60).toFixed(1))
    });
  }

  return daily;
}

/**
 * Sets a user's capacity override for a given week.
 * Enforces permission: self / own dept head / head group.
 */
export async function setCapacityOverride(requesterId, targetUserId, weekDate, rawText) {
  const minutes = parseCapacityText(rawText);
  if (minutes === null || minutes < 0) {
    const err = new Error('Invalid capacity value. Use e.g. "38", "38h", or "2280m".');
    err.status = 400;
    throw err;
  }

  // Permission check
  const requester = await prisma.user.findUnique({
    where: { id: requesterId },
    select: { role: true, department_id: true }
  });
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { department_id: true }
  });

  if (!requester || !target) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }

  const isSelf = requesterId === targetUserId;
  const isHeadGroup = requester.role === 'HEAD_GROUP';
  const isDeptHead = requester.role === 'DEPARTMENT_HEAD';
  const sameDept = requester.department_id === target.department_id;

  if (!isSelf && !isHeadGroup && !(isDeptHead && sameDept)) {
    const err = new Error("Forbidden: you can only edit your own capacity, your department members', or (Head Group) anyone's.");
    err.status = 403;
    throw err;
  }

  const dateObj = weekStartDateObject(weekDate);

  const override = await prisma.userCapacityOverride.upsert({
    where: {
      user_id_week_start_date: {
        user_id: targetUserId,
        week_start_date: dateObj
      }
    },
    update: {
      raw_text: rawText,
      minutes,
      updated_by: requesterId,
      updated_at: new Date()
    },
    create: {
      user_id: targetUserId,
      week_start_date: dateObj,
      raw_text: rawText,
      minutes,
      updated_by: requesterId
    }
  });

  return override;
}
