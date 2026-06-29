import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        emailID: string;
        iat: number;
        exp: number;
      };
    }
  }
}

export {};
