import db from '@/utils/db.js';
import type { User, RoleType } from '@/types/authServiceTypes.js';

export const findUserByEmail = async (emailId: string): Promise<User | null> => {
  const user = await db.oneOrNone<User>(
    `   SELECT  id, email, password_hash, role_id
        FROM    users 
        WHERE   1=1
                AND email = $1
                AND is_active = true
    `,
    [emailId],
  );

  return user;
};

export const getUserType = async (roleId: number): Promise<RoleType | null> => {
  const userType = await db.oneOrNone<RoleType>(
    `
      SELECT  id, 
              name
      FROM    roles
      WHERE   1=1
              AND id = $1
    `,
    [roleId],
  );

  return userType;
};
