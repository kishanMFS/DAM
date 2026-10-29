import dotenv from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const rootDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const envFile = `.env.${process.env.NODE_ENV || "development"}`;
dotenv.config({
  path: [resolve(rootDirectory, envFile), resolve(rootDirectory, ".env")],
});

const env = {
  DB_URL: process.env.DB_URL || "",
  DB_HOST: process.env.DB_HOST || "127.0.0.1",
  DB_PORT: Number(process.env.DB_PORT || 5433),
  DB_NAME: process.env.DB_NAME || process.env.POSTGRES_DB,
  DB_USER: process.env.DB_USER || process.env.POSTGRES_USER,
  DB_PASSWORD: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD,
  isProd: process.env.NODE_ENV === "production",
};

export default env;
