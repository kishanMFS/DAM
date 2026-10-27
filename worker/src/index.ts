import startWorker from "./consumer.js";
import logger from "./utils/winston.js";
import { verifyDatabaseConnection } from "./utils/db.js";
import { initializeMinio } from "./utils/minio.js";

async function start() {
  console.log("Starting Worker...");

  // initialize minio bucket
  await initializeMinio();
  await verifyDatabaseConnection();
  await startWorker();
}

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

void start().catch((error: unknown) => {
  logger.error("Worker startup failed", {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exitCode = 1;
});
