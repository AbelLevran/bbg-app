import * as authService from '../services/auth.service.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const result = await authService.login({ username, password });

    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

    res.json({
      success: true,
      accessToken: result.accessToken,
      user: result.user
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const result = await authService.refresh(refreshToken);

    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

    res.json({
      success: true,
      accessToken: result.accessToken,
      user: result.user
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    await authService.logout(refreshToken);

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await authService.getMe(req.user.id);
    res.json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
}
