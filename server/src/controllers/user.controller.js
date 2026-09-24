import * as userService from '../services/user.service.js';

export async function resetPassword(req, res, next) {
  try {
    const { id } = req.params;
    const result = await userService.resetPassword({
      targetUserId: id,
      requesterUser: req.user
    });

    res.json({
      success: true,
      message: 'Temporary password generated successfully',
      temporaryPassword: result.temporaryPassword,
      user: result.user
    });
  } catch (error) {
    next(error);
  }
}

export async function getEmployeeDetail(req, res, next) {
  try {
    const { id } = req.params;
    const weekDate = req.query.week;
    const data = await userService.getEmployeeDetail({ userId: id, weekDate });
    res.json({
      success: true,
      ...data
    });
  } catch (error) {
    next(error);
  }
}

