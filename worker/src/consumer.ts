import "./config/env.js";
import amqp, { Channel, ConsumeMessage } from "amqplib";
import logger from "./utils/winston.js";
import path from "path";
import fs from "fs";
import { minio } from "./utils/minio.js";
import { processVideo } from "./services/videoProcessor.js";
import { processImage } from "./services/imageProcessor.js";
import type { MediaTask } from "@dam/shared-types";

const rabbitMQhost =
  process.env.RABBITMQ_URL ||
  (process.env.RABBITMQ_DEFAULT_USER && process.env.RABBITMQ_DEFAULT_PASS
    ? `amqp://${encodeURIComponent(process.env.RABBITMQ_DEFAULT_USER)}:${encodeURIComponent(process.env.RABBITMQ_DEFAULT_PASS)}@127.0.0.1:5672/${encodeURIComponent(process.env.RABBITMQ_DEFAULT_VHOST || "dam")}`
    : "");
const permanentTaskErrorCodes = new Set(["SOURCE_ASSET_NOT_FOUND"]);
const transientDatabaseErrorCodes = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "57P01",
  "57P02",
  "57P03",
]);

const isTransientDatabaseError = (error: unknown): boolean =>
  Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    transientDatabaseErrorCodes.has(error.code),
  );

const startWorker = async (): Promise<void> => {
  let connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
  let retries = 5;

  // Retry logic for RabbitMQ connection
  while (retries > 0) {
    try {
      console.log(`Connecting to RabbitMQ (attempt ${6 - retries}/5)...`);
      // 1. Connect to RabbitMQ Server
      connection = await amqp.connect(rabbitMQhost);
      console.log("Connected to RabbitMQ successfully");
      break;
    } catch (error) {
      retries--;
      if (retries === 0) {
        const errorMessage = "Failed to connect to RabbitMQ after 5 retries";
        logger.error(errorMessage, {
          message: error instanceof Error ? error.message : String(error),
        });
        process.exit(1); // Exit if connection fails
      }

      await new Promise((resolve) => setTimeout(resolve, 4000));
    }
  }

  if (!connection) {
    console.error("Failed to establish RabbitMQ connection");
    process.exit(1);
  }

  try {
    const channel: Channel = await connection.createChannel();

    const queueName = "task_queue";
    await channel.assertQueue(queueName, { durable: true });

    // 2. Fair dispatch configuration
    // Don't give more than 1 message to a worker at a time until processed
    channel.prefetch(1);

    // 3. Consume messages

    channel.consume(
      queueName,
      (msg: ConsumeMessage | null) => {
        if (msg !== null) {
          let task: MediaTask;
          try {
            task = JSON.parse(msg.content.toString()) as MediaTask;
          } catch (error) {
            logger.error("Worker received an invalid task message", {
              message: error instanceof Error ? error.message : String(error),
            });
            channel.nack(msg, false, false);
            return;
          }

          void (async () => {
            const tempFile = path.join("temp", path.basename(task.objectName));

            try {
              await minio.fGetObject(task.bucket, task.objectName, tempFile);

              if (task.fileType.startsWith("video")) {
                await processVideo(task, tempFile);
              } else if (task.fileType.startsWith("image")) {
                await processImage(task, tempFile);
              }
            } finally {
              try {
                await fs.promises.unlink(tempFile);
              } catch (error) {
                if (
                  !(
                    error instanceof Error &&
                    "code" in error &&
                    error.code === "ENOENT"
                  )
                ) {
                  throw error;
                }
              }
            }

            channel.ack(msg);
          })().catch((error: unknown) => {
            const errorCode =
              error && typeof error === "object" && "code" in error
                ? String(error.code)
                : undefined;
            const permanentTaskError = permanentTaskErrorCodes.has(
              errorCode || "",
            );
            const requeue =
              !permanentTaskError && isTransientDatabaseError(error);
            logger.error("Worker task processing failed", {
              requeued: requeue,
              message: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
              taskId: task.fileid,
            });
            const rejectMessage = () => {
              try {
                channel.nack(msg, false, requeue);
              } catch (nackError) {
                logger.error("Unable to reject failed worker task", {
                  message:
                    nackError instanceof Error
                      ? nackError.message
                      : String(nackError),
                  taskId: task.fileid,
                });
              }
            };
            if (requeue) setTimeout(rejectMessage, 5000);
            else rejectMessage();
          });
        }
      },
      {
        noAck: false, // Explicitly require manual acknowledgments
      },
    );
  } catch (error) {
    const errorMessage = "rabbitmq consumer error";
    logger.error(errorMessage, {
      message: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
};

export default startWorker;
