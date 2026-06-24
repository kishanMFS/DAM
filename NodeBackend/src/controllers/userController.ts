import type { Request, Response } from 'express';
import * as authService from '@/services/authService.js';
import type { loginBody } from '@/types/authServiceTypes.js';

export const loginController = async (req: Request<loginBody>, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (email === undefined || password === undefined) {
    res.status(400).json({ message: 'Email and password are required' });
    return;
  }
  const loginUserResponse = await authService.loginUser(email, password);
  if (!loginUserResponse) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }
  const response = { access_token: loginUserResponse.access_token };
  res.cookie('access_token', response.access_token, loginUserResponse.cookieOptions);
  res.status(200).json(response);
};


