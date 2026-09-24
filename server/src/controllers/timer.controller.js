import * as timerService from '../services/timer.service.js';

export async function getActiveTimer(req, res, next) {
  try {
    const timer = await timerService.getActiveTimer(req.user.id);
    res.json({ success: true, timer });
  } catch (err) { next(err); }
}

export async function startTimer(req, res, next) {
  try {
    const timer = await timerService.startTimer({ ticketId: req.params.id, user: req.user });
    res.json({ success: true, timer });
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({ success: false, message: err.message, conflict: err.conflict });
    }
    next(err);
  }
}

export async function pauseTimer(req, res, next) {
  try {
    const timer = await timerService.pauseTimer({ ticketId: req.params.id, user: req.user });
    res.json({ success: true, timer });
  } catch (err) { next(err); }
}

export async function resumeTimer(req, res, next) {
  try {
    const timer = await timerService.resumeTimer({ ticketId: req.params.id, user: req.user });
    res.json({ success: true, timer });
  } catch (err) { next(err); }
}

export async function stopTimer(req, res, next) {
  try {
    const result = await timerService.stopTimer({ ticketId: req.params.id, user: req.user });
    res.json({ success: true, result });
  } catch (err) { next(err); }
}

export async function stopActiveTimer(req, res, next) {
  try {
    const result = await timerService.stopActiveTimer(req.user);
    res.json({ success: true, result });
  } catch (err) { next(err); }
}

export async function addManualTime(req, res, next) {
  try {
    const { minutes, reason } = req.body;
    const session = await timerService.addManualTime({ ticketId: req.params.id, user: req.user, minutes, reason });
    res.status(201).json({ success: true, session });
  } catch (err) { next(err); }
}
