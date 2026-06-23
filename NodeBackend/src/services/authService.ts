import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
// import type { User } from '@/types/authServiceTypes.js';
import { findUserByEmail } from '@/models/authModel.js';
import env from '@/config/env.js';
import type { CookieOptions } from 'express';

type cookieOptionsType = CookieOptions;

const JWT_SECRET: string = env.JWT_SECRET;
const JWT_EXPIRES_IN: SignOptions['expiresIn'] =
  (env.JWT_EXPIRES_IN as SignOptions['expiresIn']) || '2h';

interface UserJwtPayload extends JwtPayload {
  id: number;
  emailId: string;
}

// type cookieOptionsType = {
//   httpOnly?: boolean;
//   secure?: boolean;
//   sameSite?: string;
//   maxAge?: number;
// };

export const loginUser = async (
  emailId: string,
  password: string,
): Promise<{ access_token: string; cookieOptions: cookieOptionsType } | null> => {
  const user = await findUserByEmail(emailId);

  if (!user) {
    return null;
  }
  // bcrypt.hash('admin123', 10)
  // password was created using bcrypt with salt rounds of 10, so we need to compare the hashed password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return null;
  }

  const token = jwt.sign({ id: user.user_id, emailId: user.email_id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
  const cookieOptions: cookieOptionsType = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 3600000, // Cookie expiration in milliseconds (1 hour)
  };

  return { access_token: token, cookieOptions };
};

export const verifyToken = (token: string): { isValid: boolean; message: string } => {
  const result = {
    isValid: false,
    message: '',
  };
  try {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        result.message = err.message;
      } else {
        const user = decoded as UserJwtPayload;
        if (user.id !== undefined && user.emailId) {
          result.isValid = true;
          result.message = 'Valid Token';
        } else {
          result.message = 'Invalid Token';
        }
      }
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      result.message = err.message;
    }
  }

  return result;
};
