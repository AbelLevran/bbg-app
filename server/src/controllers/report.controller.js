import { PrismaClient } from '@prisma/client';
import { getUserWorkload, getWeekBounds, weekStartDateObject, getRiskLabel } from '../services/workload.service.js';

const prisma = new PrismaClient();

function minutesToHours(min) {
  return (min / 60).toFixed(1);
}

async function buildWeeklyWorkloadRows(weekDate) {
  const users = await prisma.user.findMany({
    where: { is_active: true },
    include: { department: true },
    orderBy: [{ department: { name: 'asc' } }, { name: 'asc' }]
  });

  const rows = await Promise.all(users.map(async (u) => {
    const wl = await getUserWorkload(u.id, weekDate);
    return {
      id: u.id,
      userId: u.id,
      name: u.name,
      employee: u.name,
      username: u.username,
      role: u.role,
      department: u.department?.name || 'N/A',
      capacityMinutes: wl.capacityMinutes,
      capacityHours: wl.capacityHours,
      plannedMinutes: wl.plannedMinutes,
      plannedHours: wl.plannedHours,
      actualMinutes: wl.actualMinutes,
      actualHours: wl.actualHours,
      plannedUtilization: wl.plannedUtilizationPct,
      plannedUtilizationPct: wl.plannedUtilizationPct,
      actualUtilization: wl.actualUtilizationPct,
      actualUtilizationPct: wl.actualUtilizationPct,
      activeTickets: wl.activeTicketCount,
      activeTicketCount: wl.activeTicketCount,
      overdue: wl.overdueTicketCount,
      overdueTicketCount: wl.overdueTicketCount,
      workloadRisk: wl.riskLevel,
      riskLevel: wl.riskLevel,
      riskLabel: wl.riskLabel
    };
  }));
  return rows;
}

async function buildDeptReportRows(weekDate) {
  const { start, end } = getWeekBounds(weekDate);
  const depts = await prisma.department.findMany({ orderBy: { name: 'asc' } });

  const rows = await Promise.all(depts.map(async (d) => {
    const members = await prisma.user.findMany({
      where: { department_id: d.id, is_active: true }
    });
    const userIds = members.map(m => m.id);

    // total tickets (assigned to dept members)
    const totalTickets = await prisma.ticket.count({ where: { assigned_to: { in: userIds } } });
    const completed = await prisma.ticket.count({ where: { assigned_to: { in: userIds }, status: 'DONE' } });
    const active = await prisma.ticket.count({
      where: {
        assigned_to: { in: userIds },
        status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'STUCK'] }
      }
    });
    const overdue = await prisma.ticket.count({
      where: {
        assigned_to: { in: userIds },
        due_date: { lt: new Date() },
        status: { notIn: ['DONE', 'CANCELLED'] }
      }
    });

    // Planned hours: sum estimated_minutes for tickets due this week
    const plannedAgg = await prisma.ticket.aggregate({
      _sum: { estimated_minutes: true },
      where: {
        assigned_to: { in: userIds },
        status: { not: 'CANCELLED' },
        due_date: { gte: start, lte: end }
      }
    });
    const plannedMinutes = plannedAgg._sum.estimated_minutes || 0;

    // Actual hours: sessions started this week
    const actualAgg = await prisma.timeSession.aggregate({
      _sum: { duration_minutes: true },
      where: {
        user_id: { in: userIds },
        started_at: { gte: start, lte: end },
        ended_at: { not: null }
      }
    });
    const actualMinutes = actualAgg._sum.duration_minutes || 0;

    // Capacity: sum of member capacities
    const weekStartDateObj = weekStartDateObject(weekDate);
    let totalCapacity = 0;
    for (const uid of userIds) {
      const ov = await prisma.userCapacityOverride.findUnique({
        where: { user_id_week_start_date: { user_id: uid, week_start_date: weekStartDateObj } }
      });
      totalCapacity += ov ? ov.minutes : 2400;
    }

    const utilPct = totalCapacity > 0 ? Math.round((plannedMinutes / totalCapacity) * 100) : 0;

    return {
      departmentId: d.id,
      department: d.name,
      totalTickets,
      completed,
      active,
      overdue,
      plannedMinutes,
      plannedHours: Number((plannedMinutes / 60).toFixed(1)),
      actualMinutes,
      actualHours: Number((actualMinutes / 60).toFixed(1)),
      capacityMinutes: totalCapacity,
      capacityHours: Number((totalCapacity / 60).toFixed(1)),
      utilization: utilPct,
      utilizationPct: utilPct,
      memberCount: members.length
    };
  }));
  return rows;
}

// GET /reports/weekly-workload?week=YYYY-MM-DD
export async function weeklyWorkloadReport(req, res) {
  try {
    if (req.user.role !== 'HEAD_GROUP') return res.status(403).json({ error: 'Forbidden' });
    const week = req.query.week || new Date().toISOString().slice(0, 10);
    const rows = await buildWeeklyWorkloadRows(week);
    res.json({ week, rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /reports/weekly-workload.csv
export async function weeklyWorkloadCsv(req, res) {
  try {
    if (req.user.role !== 'HEAD_GROUP') return res.status(403).json({ error: 'Forbidden' });
    const week = req.query.week || new Date().toISOString().slice(0, 10);
    const rows = await buildWeeklyWorkloadRows(week);

    const header = 'Employee,Username,Role,Department,Capacity (h),Planned (h),Actual (h),Planned Util %,Actual Util %,Active Tickets,Overdue,Workload Risk\n';
    const body = rows.map(r =>
      [
        r.name,
        r.username,
        r.role,
        r.department,
        minutesToHours(r.capacityMinutes),
        minutesToHours(r.plannedMinutes),
        minutesToHours(r.actualMinutes),
        r.plannedUtilizationPct + '%',
        r.actualUtilizationPct + '%',
        r.activeTicketCount,
        r.overdueTicketCount,
        r.riskLabel
      ].map(v => `"${v}"`).join(',')
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="weekly-workload-${week}.csv"`);
    res.send(header + body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /reports/department?week=YYYY-MM-DD
export async function departmentReport(req, res) {
  try {
    if (req.user.role !== 'HEAD_GROUP') return res.status(403).json({ error: 'Forbidden' });
    const week = req.query.week || new Date().toISOString().slice(0, 10);
    const rows = await buildDeptReportRows(week);
    res.json({ week, rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /reports/department.csv
export async function departmentCsv(req, res) {
  try {
    if (req.user.role !== 'HEAD_GROUP') return res.status(403).json({ error: 'Forbidden' });
    const week = req.query.week || new Date().toISOString().slice(0, 10);
    const rows = await buildDeptReportRows(week);

    const header = 'Department,Member Count,Total Tickets,Completed,Active,Overdue,Planned (h),Actual (h),Capacity (h),Utilization %\n';
    const body = rows.map(r =>
      [
        r.department,
        r.memberCount,
        r.totalTickets,
        r.completed,
        r.active,
        r.overdue,
        minutesToHours(r.plannedMinutes),
        minutesToHours(r.actualMinutes),
        minutesToHours(r.capacityMinutes),
        r.utilizationPct + '%'
      ].map(v => `"${v}"`).join(',')
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="department-report-${week}.csv"`);
    res.send(header + body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
