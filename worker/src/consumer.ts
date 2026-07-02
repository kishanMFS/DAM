import amqp, { Channel, ConsumeMessage } from "amqplib";
import logger from "./utils/winston.js";
import path from "path";
import fs from "fs";
import { minio } from "./utils/minio.js";
import { processVideo } from "./services/videoProcessor.js";
import { processImage } from "./services/imageProcessor.js";

const rabbitMQhost = process.env.RABBITMQ_URL || "";

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
        console.error(
          errorMessage,
          error instanceof Error ? error.message : String(error),
        );
        logger.error(errorMessage, {
          message: error instanceof Error ? error.message : String(error),
        });
        process.exit(1); // Exit if connection fails
      }
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
          const task = JSON.parse(msg.content.toString());

          // Simulate processing/business logic
          setTimeout(async () => {
            console.log(task);
            const tempFile = path.join("temp", path.basename(task.objectName));

            await minio.fGetObject(task.bucket, task.objectName, tempFile);

            if (task.fileType.startsWith("video")) {
              await processVideo(task, tempFile);
            } else if (task.fileType.startsWith("image")) {
              await processImage(task, tempFile);
            }
            fs.unlinkSync(tempFile);

            // 4. Manual Acknowledgment
            channel.ack(msg);
          }, 2000);
        }
      },
      {
        noAck: false, // Explicitly require manual acknowledgments
      },
    );
  } catch (error) {
    const errorMessage = "rabbitmq consumer error";
    console.error(
      errorMessage,
      error instanceof Error ? error.message : String(error),
    );
    logger.error(errorMessage, {
      message: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
};

export default startWorker;
