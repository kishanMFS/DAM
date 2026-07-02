import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        emailID: string;
        iat: number;
        exp: number;
        role: string;
      };
    }
  }
}

export {};
