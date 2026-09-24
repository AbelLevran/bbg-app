import {
  getUserWorkload,
  getDepartmentWorkload,
  getGroupWorkload,
  setCapacityOverride,
  getSustainedHighWorkload,
  getUserWeeklyTrend,
  getUserDailyWorkload
} from '../services/workload.service.js';

// GET /workload/user/:userId?week=YYYY-MM-DD
export async function getUserWorkloadHandler(req, res) {
  try {
    const { userId } = req.params;
    const week = req.query.week || new Date().toISOString().slice(0, 10);
    const data = await getUserWorkload(userId, week);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

// GET /workload/user/:userId/trend?week=YYYY-MM-DD&weeks=4
export async function getUserTrendHandler(req, res) {
  try {
    const { userId } = req.params;
    const week = req.query.week || new Date().toISOString().slice(0, 10);
    const weeks = parseInt(req.query.weeks) || 4;
    const data = await getUserWeeklyTrend(userId, week, weeks);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

// GET /workload/user/:userId/daily?week=YYYY-MM-DD
export async function getUserDailyHandler(req, res) {
  try {
    const { userId } = req.params;
    const week = req.query.week || new Date().toISOString().slice(0, 10);
    const data = await getUserDailyWorkload(userId, week);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

// GET /workload/department/:deptId?week=YYYY-MM-DD
export async function getDeptWorkloadHandler(req, res) {
  try {
    const { deptId } = req.params;
    const week = req.query.week || new Date().toISOString().slice(0, 10);
    const data = await getDepartmentWorkload(deptId, week);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

// GET /workload/group?week=YYYY-MM-DD
export async function getGroupWorkloadHandler(req, res) {
  try {
    const week = req.query.week || new Date().toISOString().slice(0, 10);
    const data = await getGroupWorkload(week);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

// GET /workload/alerts?week=YYYY-MM-DD
export async function getWorkloadAlertsHandler(req, res) {
  try {
    const week = req.query.week || new Date().toISOString().slice(0, 10);
    const sustained = await getSustainedHighWorkload(week);
    res.json({ sustainedHighWorkload: sustained });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

// PUT /users/:userId/capacity?week=YYYY-MM-DD or PUT /workload/capacity/:userId body: { text }
export async function setCapacityHandler(req, res) {
  try {
    const { userId } = req.params;
    const week = req.query.week || new Date().toISOString().slice(0, 10);
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    const override = await setCapacityOverride(req.user.id, userId, week, text);
    res.json({ success: true, override });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}
