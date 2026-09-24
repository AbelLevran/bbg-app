import prisma from '../db/prisma.js';

// In-memory cache with 20s TTL to eliminate redundant remote DB round-trips
const workloadCache = new Map();
const CACHE_TTL_MS = 20000;

export function clearWorkloadCache() {
  workloadCache.clear();
}

function getFromCache(key) {
  const item = workloadCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    workloadCache.delete(key);
    return null;
  }
  return item.data;
}

function setToCache(key, data, ttlMs = CACHE_TTL_MS) {
  workloadCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

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
  const cacheKey = `user_${userId}_${weekStartDate(weekDate)}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const { start, end } = getWeekBounds(weekDate);

  // Run user capacity, planned sum, closed sessions sum, open session, active count, overdue count concurrently
  const [capInfo, plannedResult, closedSessions, openSession, activeTicketCount, overdueTicketCount] = await Promise.all([
    getCapacityInfo(userId, weekDate),
    prisma.ticket.aggregate({
      _sum: { estimated_minutes: true },
      where: {
        assigned_to: userId,
        status: { not: 'CANCELLED' },
        due_date: { gte: start, lte: end }
      }
    }),
    prisma.timeSession.aggregate({
      _sum: { duration_minutes: true },
      where: {
        user_id: userId,
        started_at: { gte: start, lte: end },
        ended_at: { not: null }
      }
    }),
    prisma.timeSession.findFirst({
      where: {
        user_id: userId,
        started_at: { gte: start, lte: end },
        ended_at: null
      }
    }),
    prisma.ticket.count({
      where: {
        assigned_to: userId,
        status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'STUCK'] }
      }
    }),
    prisma.ticket.count({
      where: {
        assigned_to: userId,
        due_date: { lt: new Date() },
        status: { notIn: ['DONE', 'CANCELLED'] }
      }
    })
  ]);

  const capacityMinutes = capInfo.minutes;
  const plannedMinutes = plannedResult._sum.estimated_minutes || 0;
  const closedMinutes = closedSessions._sum.duration_minutes || 0;
  const openMinutes = openSession
    ? Math.max(0, Math.floor((Date.now() - new Date(openSession.started_at).getTime()) / 60000))
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

  const result = {
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

  setToCache(cacheKey, result);
  return result;
}

/**
 * High-performance Group-wide workload rollup.
 * Replaces ~90 queries with 5 concurrent bulk queries and in-memory rollup.
 */
export async function getGroupWorkload(weekDate) {
  const cacheKey = `group_${weekStartDate(weekDate)}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const { start, end } = getWeekBounds(weekDate);
  const dateObj = weekStartDateObject(weekDate);

  // 5 bulk queries executed concurrently
  const [departments, allUsers, overrides, tickets, sessions] = await Promise.all([
    prisma.department.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    }),
    prisma.user.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        title: true,
        department_id: true,
        department: { select: { id: true, name: true } }
      }
    }),
    prisma.userCapacityOverride.findMany({
      where: { week_start_date: dateObj }
    }),
    prisma.ticket.findMany({
      select: {
        id: true,
        assigned_to: true,
        estimated_minutes: true,
        status: true,
        due_date: true
      }
    }),
    prisma.timeSession.findMany({
      where: { started_at: { gte: start, lte: end } },
      select: {
        id: true,
        user_id: true,
        duration_minutes: true,
        started_at: true,
        ended_at: true
      }
    })
  ]);

  const overrideMap = new Map(overrides.map(o => [o.user_id, o]));

  // Index tickets by user
  const ticketsByUser = new Map();
  for (const t of tickets) {
    if (!ticketsByUser.has(t.assigned_to)) {
      ticketsByUser.set(t.assigned_to, []);
    }
    ticketsByUser.get(t.assigned_to).push(t);
  }

  // Index sessions by user
  const sessionsByUser = new Map();
  for (const s of sessions) {
    if (!sessionsByUser.has(s.user_id)) {
      sessionsByUser.set(s.user_id, []);
    }
    sessionsByUser.get(s.user_id).push(s);
  }

  const now = new Date();

  function computeMemberRow(u) {
    const override = overrideMap.get(u.id);
    const capacityMinutes = override ? override.minutes : DEFAULT_CAPACITY_MINUTES;
    const capacityRawText = override ? override.raw_text : '40';
    const isCapacityOverridden = !!override;

    const uTickets = ticketsByUser.get(u.id) || [];
    let plannedMinutes = 0;
    let activeTicketCount = 0;
    let overdueTicketCount = 0;

    for (const t of uTickets) {
      const tDue = new Date(t.due_date);
      if (t.status !== 'CANCELLED' && tDue >= start && tDue <= end) {
        plannedMinutes += t.estimated_minutes || 0;
      }
      if (['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'STUCK'].includes(t.status)) {
        activeTicketCount++;
      }
      if (tDue < now && !['DONE', 'CANCELLED'].includes(t.status)) {
        overdueTicketCount++;
      }
    }

    const uSessions = sessionsByUser.get(u.id) || [];
    let actualMinutes = 0;
    for (const s of uSessions) {
      if (s.ended_at) {
        actualMinutes += s.duration_minutes || 0;
      } else {
        actualMinutes += Math.max(0, Math.floor((Date.now() - new Date(s.started_at).getTime()) / 60000));
      }
    }

    const plannedUtilizationPct = capacityMinutes > 0
      ? Math.round((plannedMinutes / capacityMinutes) * 100) : 0;
    const actualUtilizationPct = capacityMinutes > 0
      ? Math.round((actualMinutes / capacityMinutes) * 100) : 0;
    const remainingCapacityMinutes = capacityMinutes - plannedMinutes;

    return {
      userId: u.id,
      user: u,
      name: u.name,
      username: u.username,
      role: u.role,
      title: u.title,
      departmentId: u.department_id,
      departmentName: u.department?.name,
      weekStart: start.toISOString(),
      weekEnd: end.toISOString(),
      capacityMinutes,
      capacityHours: capacityMinutes / 60,
      capacityRawText,
      isCapacityOverridden,
      plannedMinutes,
      plannedHours: Number((plannedMinutes / 60).toFixed(1)),
      actualMinutes,
      actualHours: Number((actualMinutes / 60).toFixed(1)),
      plannedUtilizationPct,
      actualUtilizationPct,
      remainingCapacityMinutes,
      remainingCapacityHours: Number((remainingCapacityMinutes / 60).toFixed(1)),
      riskLevel: getRiskLevel(plannedUtilizationPct),
      riskLabel: getRiskLabel(plannedUtilizationPct),
      activeTicketCount,
      overdueTicketCount
    };
  }

  const allMemberRows = allUsers.map(u => computeMemberRow(u));

  // Department rollups
  const deptRows = departments.map(d => {
    const dMembers = allMemberRows.filter(m => m.departmentId === d.id);
    const totalCapacity = dMembers.reduce((s, r) => s + r.capacityMinutes, 0);
    const totalPlanned = dMembers.reduce((s, r) => s + r.plannedMinutes, 0);
    const totalActual = dMembers.reduce((s, r) => s + r.actualMinutes, 0);

    const dPlannedPct = totalCapacity > 0 ? Math.round((totalPlanned / totalCapacity) * 100) : 0;
    const dActualPct = totalCapacity > 0 ? Math.round((totalActual / totalCapacity) * 100) : 0;

    const dMemberIds = new Set(dMembers.map(m => m.userId));
    const dTickets = tickets.filter(t => dMemberIds.has(t.assigned_to));

    const totalTicketsCount = dTickets.length;
    const activeTicketsCount = dTickets.filter(t => ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'STUCK'].includes(t.status)).length;
    const completedTicketsCount = dTickets.filter(t => t.status === 'DONE').length;
    const overdueTicketsCount = dTickets.filter(t => new Date(t.due_date) < now && !['DONE', 'CANCELLED'].includes(t.status)).length;

    return {
      department: d,
      weekStart: start.toISOString(),
      weekEnd: end.toISOString(),
      totalCapacityMinutes: totalCapacity,
      totalCapacityHours: Number((totalCapacity / 60).toFixed(1)),
      totalPlannedMinutes: totalPlanned,
      totalPlannedHours: Number((totalPlanned / 60).toFixed(1)),
      totalActualMinutes: totalActual,
      totalActualHours: Number((totalActual / 60).toFixed(1)),
      plannedUtilizationPct: dPlannedPct,
      actualUtilizationPct: dActualPct,
      riskLevel: getRiskLevel(dPlannedPct),
      riskLabel: getRiskLabel(dPlannedPct),
      totalTickets: totalTicketsCount,
      activeTickets: activeTicketsCount,
      completedTickets: completedTicketsCount,
      overdueTickets: overdueTicketsCount,
      members: dMembers
    };
  });

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

  const result = {
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
    members: allMemberRows.filter(m => m.role !== 'HEAD_GROUP')
  };

  setToCache(cacheKey, result);
  return result;
}

/**
 * Department-level workload rollup. Reuses bulk group workload for instant response.
 */
export async function getDepartmentWorkload(deptId, weekDate) {
  const group = await getGroupWorkload(weekDate);
  const dept = group.departments.find(d => d.department.id === deptId);
  if (dept) return dept;

  const d = await prisma.department.findUnique({
    where: { id: deptId },
    select: { id: true, name: true }
  });

  return {
    department: d || { id: deptId, name: 'Unknown' },
    weekStart: group.weekStart,
    weekEnd: group.weekEnd,
    totalCapacityMinutes: 0,
    totalCapacityHours: 0,
    totalPlannedMinutes: 0,
    totalPlannedHours: 0,
    totalActualMinutes: 0,
    totalActualHours: 0,
    plannedUtilizationPct: 0,
    actualUtilizationPct: 0,
    riskLevel: 'NORMAL',
    riskLabel: 'Normal',
    totalTickets: 0,
    activeTickets: 0,
    completedTickets: 0,
    overdueTickets: 0,
    members: []
  };
}

/**
 * Sustained high workload: planned_utilization > 100% for 2+ consecutive weeks.
 * Replaces 300+ queries with 3 bulk queries and in-memory 4-week window calculation.
 */
export async function getSustainedHighWorkload(weekDate) {
  const cacheKey = `sustained_${weekStartDate(weekDate)}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const { start } = getWeekBounds(weekDate);

  // 4-week window start (start - 21 days)
  const fourWeeksStart = new Date(start);
  fourWeeksStart.setUTCDate(start.getUTCDate() - 21);
  const fourWeeksEnd = new Date(start);
  fourWeeksEnd.setUTCDate(start.getUTCDate() + 6);
  fourWeeksEnd.setUTCHours(23, 59, 59, 999);

  const [users, overrides, tickets] = await Promise.all([
    prisma.user.findMany({
      where: { is_active: true, role: { not: 'HEAD_GROUP' } },
      select: {
        id: true,
        name: true,
        username: true,
        department_id: true,
        department: { select: { id: true, name: true } }
      }
    }),
    prisma.userCapacityOverride.findMany({
      where: {
        week_start_date: {
          gte: new Date(fourWeeksStart.toISOString().slice(0, 10)),
          lte: new Date(start.toISOString().slice(0, 10))
        }
      }
    }),
    prisma.ticket.findMany({
      where: {
        status: { not: 'CANCELLED' },
        due_date: { gte: fourWeeksStart, lte: fourWeeksEnd }
      },
      select: {
        assigned_to: true,
        estimated_minutes: true,
        due_date: true
      }
    })
  ]);

  const sustained = [];
  for (const u of users) {
    let highCount = 0;
    for (let w = 0; w < 4; w++) {
      const wStart = new Date(start);
      wStart.setUTCDate(start.getUTCDate() - w * 7);
      const wEnd = new Date(wStart);
      wEnd.setUTCDate(wStart.getUTCDate() + 6);
      wEnd.setUTCHours(23, 59, 59, 999);

      const wDateIso = wStart.toISOString().slice(0, 10);
      const ov = overrides.find(o => o.user_id === u.id && o.week_start_date.toISOString().slice(0, 10) === wDateIso);
      const cap = ov ? ov.minutes : DEFAULT_CAPACITY_MINUTES;

      let planned = 0;
      for (const t of tickets) {
        if (t.assigned_to === u.id) {
          const td = new Date(t.due_date);
          if (td >= wStart && td <= wEnd) {
            planned += t.estimated_minutes || 0;
          }
        }
      }

      const util = cap > 0 ? (planned / cap) * 100 : 0;
      if (util > 100) {
        highCount++;
      } else {
        break; // consecutive broken
      }
    }

    if (highCount >= 2) {
      const currentWorkload = await getUserWorkload(u.id, weekDate);
      sustained.push({
        user: u,
        consecutiveWeeks: highCount,
        ...currentWorkload
      });
    }
  }

  setToCache(cacheKey, sustained);
  return sustained;
}

/**
 * Multi-week trend for a user (concurrent resolution).
 */
export async function getUserWeeklyTrend(userId, weekDate, numWeeks = 4) {
  const cacheKey = `trend_${userId}_${weekStartDate(weekDate)}_${numWeeks}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const { start } = getWeekBounds(weekDate);
  const weekDates = [];
  for (let i = numWeeks - 1; i >= 0; i--) {
    const w = new Date(start);
    w.setUTCDate(start.getUTCDate() - i * 7);
    weekDates.push(w);
  }

  const weeks = await Promise.all(
    weekDates.map(async (w) => {
      const wl = await getUserWorkload(userId, w);
      return {
        weekLabel: `W ${w.toISOString().slice(5, 10)}`,
        weekStart: wl.weekStart,
        capacityHours: wl.capacityHours,
        plannedHours: wl.plannedHours,
        actualHours: wl.actualHours,
        plannedUtilizationPct: wl.plannedUtilizationPct,
        actualUtilizationPct: wl.actualUtilizationPct,
        riskLevel: wl.riskLevel
      };
    })
  );

  setToCache(cacheKey, weeks);
  return weeks;
}

/**
 * Daily workload breakdown for Monday-Sunday.
 * Replaces 7 sequential queries with 1 single query for the entire week.
 */
export async function getUserDailyWorkload(userId, weekDate) {
  const cacheKey = `daily_${userId}_${weekStartDate(weekDate)}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const { start, end } = getWeekBounds(weekDate);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const sessions = await prisma.timeSession.findMany({
    where: {
      user_id: userId,
      started_at: { gte: start, lte: end },
      ended_at: { not: null }
    },
    select: {
      duration_minutes: true,
      started_at: true
    }
  });

  const dailyMinutes = [0, 0, 0, 0, 0, 0, 0];
  for (const s of sessions) {
    const sDate = new Date(s.started_at);
    const dayIdx = (sDate.getUTCDay() + 6) % 7;
    dailyMinutes[dayIdx] += s.duration_minutes || 0;
  }

  const daily = [];
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(start);
    dayStart.setUTCDate(start.getUTCDate() + i);
    const mins = dailyMinutes[i];
    daily.push({
      day: days[i],
      date: dayStart.toISOString().slice(0, 10),
      minutes: mins,
      hours: Number((mins / 60).toFixed(1))
    });
  }

  setToCache(cacheKey, daily);
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

  clearWorkloadCache();
  return override;
}
