interface User {
  user_id: string;
  email_id: string;
  password: string;
}

interface loginBody {
  emailId?: string;
  password?: string;
}
interface JwtPayload {
  id: string;
  emailId: string;
}

import type { CookieOptions } from 'express';

type LoginResult = { access_token: string; cookieOptions: CookieOptions } | null;

export type { User, loginBody, JwtPayload, LoginResult };
