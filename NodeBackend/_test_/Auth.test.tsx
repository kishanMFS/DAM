import jwt from 'jsonwebtoken';
import * as authService from '../src/services/authService';

describe('authService test cases', () => {
  const password = 'Password123!';

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('loginUser returns null when user is not found', async () => {
    const result = await authService.loginUser('missing@example.com', password);

    expect(result).toBeNull();
  });

  test('loginUser returns null when password is invalid', async () => {
    const result = await authService.loginUser('john@mail.com', 'wrong-password');

    expect(result).toBeNull();
  });

  test('loginUser authenticates valid user and returns a token', async () => {
    const result = await authService.loginUser('john@mail.com', 'changeme');

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
    const loginResult = await authService.loginUser('john@mail.com', 'changeme');

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
