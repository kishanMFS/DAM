import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import * as authService from '../src/services/authService.js';
import { findUserByEmail, getUserType } from '../src/models/authModel.js';
import type { User, RoleType } from '../src/types/authServiceTypes.js';

import { describe, test, expect, beforeAll, beforeEach, jest } from '@jest/globals';

jest.mock('../src/models/authModel.js', () => ({
  findUserByEmail: jest.fn(),
  getUserType: jest.fn(),
}));

describe('authService test cases', () => {
  const password = 'Password123!';
  const mockedFindUserByEmail = jest.mocked(findUserByEmail);
  const mockedGetUserType = jest.mocked(getUserType);
  let passwordHash: string;

  const user: User = {
    id: 'user-id',
    email: 'john@mail.com',
    password_hash: '',
    role_id: 1,
    name: '',
  };
  const userType: RoleType = { id: 1, name: 'ADMIN' };

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(password, 4);
    user.password_hash = passwordHash;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('loginUser returns null when user is not found', async () => {
    mockedFindUserByEmail.mockResolvedValue(null);

    const result = await authService.loginUser('missing@example.com', password);

    expect(result).toBeNull();
    expect(mockedGetUserType).not.toHaveBeenCalled();
  });

  test('loginUser returns null when password is invalid', async () => {
    mockedFindUserByEmail.mockResolvedValue(user);
    mockedGetUserType.mockResolvedValue(userType);

    const result = await authService.loginUser('john@mail.com', 'wrong-password');

    expect(result).toBeNull();
  });

  test('loginUser authenticates valid user and returns a token', async () => {
    mockedFindUserByEmail.mockResolvedValue(user);
    mockedGetUserType.mockResolvedValue(userType);

    const result = await authService.loginUser('john@mail.com', password);

    expect(result).not.toBeNull();
    expect(result?.access_token).toBeTruthy();
    expect(result?.userData).toEqual(
      expect.objectContaining({
        roleid: expect.any(Number),
        role: expect.any(String),
      }),
    );
    expect(result?.cookieOptions).toMatchObject({ httpOnly: true });

    const decoded = jwt.verify(
      result!.access_token,
      process.env.JWT_SECRET || 'your_jwt_secret_key',
    ) as jwt.JwtPayload;

    expect(decoded).toMatchObject({
      emailId: 'john@mail.com',
      role: expect.any(String),
    });
  });

  test('verifyToken validates a token issued for valid email', async () => {
    mockedFindUserByEmail.mockResolvedValue(user);
    mockedGetUserType.mockResolvedValue(userType);

    const loginResult = await authService.loginUser('john@mail.com', password);

    expect(loginResult).not.toBeNull();

    const verification = authService.verifyToken(loginResult!.access_token);

    expect(verification.isValid).toBe(true);
    expect(verification.message).toBe('Valid Token');
    expect(verification.role).toBeDefined();
  });

  test('verifyToken returns invalid for an unsigned token', () => {
    const result = authService.verifyToken('not-a-real-token');

    expect(result.isValid).toBe(false);
    expect(result.message).toContain('jwt malformed');
  });

  test('verifyToken returns invalid when token payload is missing required fields', () => {
    const token = jwt.sign(
      { data: 'no-user-fields' },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      {
        expiresIn: '1h',
      },
    );

    const result = authService.verifyToken(token);

    expect(result.isValid).toBe(false);
    expect(result.message).toBe('Invalid Token');
  });
});
