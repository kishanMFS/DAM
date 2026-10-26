import pgPromise from "pg-promise";
import env from "@/config/env.js";

const dbURL = env.DB_URL || "";

const pgp = pgPromise();
const db = pgp({
  connectionString: dbURL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  keepAlive: true,
});

db.$pool.on("error", (error: Error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

export const closeDatabase = async (): Promise<void> => {
  await db.$pool.end();
};

export async function verifyDatabaseConnection(): Promise<void> {
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await db.one("SELECT 1");
      console.log("Database connection successful");
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error("Unable to connect to PostgreSQL after retries", {
          cause: error,
        });
      }

      console.error(
        `Database connection attempt ${attempt}/${maxAttempts} failed:`,
        error,
      );
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
}

export default db;
