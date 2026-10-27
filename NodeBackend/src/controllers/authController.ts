import type { Request, Response } from 'express';
import * as authService from '@/services/authService.js';
import type { loginBody } from '@/types/authServiceTypes.js';

export const loginUser = async (
  req: Request<Record<string, string>, unknown, loginBody>,
  res: Response,
): Promise<void> => {
  const { email, password } = req.body;
  const loginUserResponse = await authService.loginUser(email, password);
  if (!loginUserResponse) {
    res.status(401).json({ message: 'Invalid credentials', success: false });
    return;
  }
  const response = { user: loginUserResponse.userData, success: true };
  res.cookie('access_token', loginUserResponse.access_token, loginUserResponse.cookieOptions);
  res.status(200).json(response);
};

export const logoutUser = (_req: Request, res: Response): void => {
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export const verifyToken = (req: Request, res: Response): void => {
  const token = req.cookies.access_token;
  if (!token) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  const verifyResult = authService.verifyToken(token);
  if (!verifyResult.isValid) {
    res.status(403).json(verifyResult);
    return;
  }
  res.status(200).json(verifyResult);
};
