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
