import prisma from '../db/prisma.js';

export async function getDepartments(req, res, next) {
  try {
    const departments = await prisma.department.findMany({
      include: {
        head_user: { select: { id: true, name: true, username: true } },
        members: { select: { id: true, name: true, username: true, role: true, title: true } }
      },
      orderBy: { name: 'asc' }
    });

    const result = departments.map(d => ({
      id: d.id,
      name: d.name,
      headUser: d.head_user,
      members: d.members,
      memberCount: d.members.length
    }));

    res.json({ success: true, departments: result });
  } catch (err) { next(err); }
}

export async function getUsers(req, res, next) {
  try {
    const { departmentId, excludeSelf } = req.query;
    const where = { is_active: true };
    if (departmentId) where.department_id = departmentId;
    if (excludeSelf === 'true') {
      where.id = { not: req.user.id };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        title: true,
        department_id: true,
        department: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, users });
  } catch (err) { next(err); }
}
