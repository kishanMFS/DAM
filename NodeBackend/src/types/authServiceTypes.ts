interface User {
  id: string;
  email: string;
  password_hash: string;
  role_id: number;
  name: '';
}

interface loginBody {
  emailId?: string;
  password?: string;
}
interface JwtPayload {
  id: string;
  emailId: string;
}

export type RoleType = {
  id: number;
  name: string;
};

import type { CookieOptions } from 'express';

type LoginResult = { access_token: string; cookieOptions: CookieOptions } | null;

export type { User, loginBody, JwtPayload, LoginResult };
