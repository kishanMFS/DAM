import startWorker from "./consumer.js";

import { initializeMinio } from "./utils/minio.js";

async function start() {
  console.log("Starting Worker...");

  // initialize minio bucket
  await initializeMinio();
  await startWorker();
}

start();

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
