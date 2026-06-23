import db from '@/utils/db.js';
import type { User } from '@/types/authServiceTypes.js';

export const findUserByEmail = async (emailId: string): Promise<User | null> => {
  const user = await db.oneOrNone<User>(
    `   SELECT  user_id, email_id, password
        FROM    tbl_users 
        WHERE   1=1
                AND email_id = $1
                AND is_active = true
                AND is_deleted = false
        `,
    [emailId],
  );

  return user;
};
