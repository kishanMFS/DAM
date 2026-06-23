import type { Request, Response, NextFunction } from 'express';
import jwt, { VerifyErrors, JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

interface JwtUser extends JwtPayload {
  id: number;
  emailID: string;
  iat: number;
  exp: number;
}

const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.cookies.access_token;
  if (!token) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  jwt.verify(
    token,
    JWT_SECRET,
    (err: VerifyErrors | null, decoded: string | JwtPayload | undefined) => {
      if (err) {
        res.status(403).json({ message: 'Invalid token' });
        return;
      }
      req.user = decoded as JwtUser;
      next();
    },
  );
};

export default authenticateToken;
