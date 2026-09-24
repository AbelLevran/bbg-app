import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();
router.use(authenticate);

/**
 * Build the base ticket where clause for role-based scoping.
 * (mirrors ticket.service.js scope logic for cluster_type = EVENT)
 */
function buildScopeWhere(user) {
  const base = { cluster_type: 'EVENT' };
  if (user.role === 'HEAD_GROUP') return base;
  if (user.role === 'DEPARTMENT_HEAD') {
    return {
      ...base,
      assignee: { department_id: user.department_id }
    };
  }
  // MEMBER: own tickets only
  return { ...base, assigned_to: user.id };
}

// GET /events — gallery: one card per distinct cluster_name visible to user
router.get('/', async (req, res) => {
  try {
    const scopeWhere = buildScopeWhere(req.user);

    // Distinct event tickets in scope
    const tickets = await prisma.ticket.findMany({
      where: scopeWhere,
      select: {
        cluster_name: true,
        status: true,
        due_date: true,
        assignee: {
          select: {
            id: true,
            name: true,
            username: true,
            department: { select: { id: true, name: true } }
          }
        }
      }
    });

    // Group by cluster_name
    const map = {};
    for (const t of tickets) {
      if (!t.cluster_name) continue;
      if (!map[t.cluster_name]) {
        map[t.cluster_name] = {
          clusterName: t.cluster_name,
          total: 0,
          done: 0,
          active: 0,
          stuck: 0,
          overdue: 0,
          departments: new Set(),
          contributors: new Map()
        };
      }
      const e = map[t.cluster_name];
      e.total++;
      if (t.status === 'DONE') e.done++;
      if (['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'STUCK'].includes(t.status)) e.active++;
      if (t.status === 'STUCK') e.stuck++;

      const isOverdue = t.due_date && new Date(t.due_date) < new Date()
        && !['DONE', 'CANCELLED'].includes(t.status);
      if (isOverdue) e.overdue++;

      if (t.assignee?.department?.name) {
        e.departments.add(t.assignee.department.name);
      }
      if (t.assignee) {
        e.contributors.set(t.assignee.id, {
          id: t.assignee.id,
          name: t.assignee.name,
          username: t.assignee.username
        });
      }
    }

    const result = Object.values(map).map(e => ({
      clusterName: e.clusterName,
      total: e.total,
      done: e.done,
      active: e.active,
      stuck: e.stuck,
      overdue: e.overdue,
      progressPct: e.total > 0 ? Math.round((e.done / e.total) * 100) : 0,
      departments: [...e.departments],
      contributors: [...e.contributors.values()]
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /events/:name/tickets — tickets for a specific event, role-scoped
router.get('/:name/tickets', async (req, res) => {
  try {
    const eventName = decodeURIComponent(req.params.name);
    const scopeWhere = buildScopeWhere(req.user);
    const where = { ...scopeWhere, cluster_name: eventName };

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, username: true } },
        requester: { select: { id: true, name: true, username: true } },
        assignee: {
          select: {
            id: true,
            name: true,
            username: true,
            department: { select: { id: true, name: true } }
          }
        },
        _count: { select: { time_sessions: true } }
      },
      orderBy: { due_date: 'asc' }
    });

    // Compute actualMinutes per ticket
    const enriched = await Promise.all(tickets.map(async (t) => {
      const agg = await prisma.timeSession.aggregate({
        _sum: { duration_minutes: true },
        where: { ticket_id: t.id, ended_at: { not: null } }
      });
      const actualMinutes = agg._sum.duration_minutes || 0;
      const overdue = t.due_date && new Date(t.due_date) < new Date()
        && !['DONE', 'CANCELLED'].includes(t.status);

      return {
        id: t.id,
        ticketNumber: t.ticket_number,
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: t.status,
        stuckReason: t.stuck_reason,
        estimatedMinutes: t.estimated_minutes,
        actualMinutes,
        dueDate: t.due_date.toISOString(),
        createdAt: t.created_at.toISOString(),
        clusterType: t.cluster_type,
        clusterName: t.cluster_name,
        recurrenceGroupId: t.recurrence_group_id,
        recurrenceFrequency: t.recurrence_frequency,
        seriesLabel: t.series_label,
        createdBy: t.creator,
        requestedBy: t.requester,
        assignedTo: t.assignee,
        department: t.assignee?.department || null,
        overdue
      };
    }));

    // Summary stats
    const total = enriched.length;
    const done = enriched.filter(t => t.status === 'DONE').length;
    const active = enriched.filter(t => ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'STUCK'].includes(t.status)).length;
    const stuck = enriched.filter(t => t.status === 'STUCK').length;
    const overdue = enriched.filter(t => t.overdue).length;
    const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;

    const depts = [...new Set(enriched.map(t => t.department?.name).filter(Boolean))];
    const contributors = [...new Map(enriched.map(t => [t.assignedTo.id, t.assignedTo])).values()];

    res.json({
      clusterName: eventName,
      summary: { total, done, active, stuck, overdue, progressPct, departments: depts, contributors },
      tickets: enriched
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
