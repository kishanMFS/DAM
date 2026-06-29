import amqp from 'amqplib';
import logger from '../utils/winston.js';
import { MediaTask } from '../types/assetTypes.js';

const rabbitMQhost = process.env.RABBITMQ_URL || '';

const sendTask = async (task: MediaTask): Promise<void> => {
  try {
    // 1. Connect to RabbitMQ Server
    const connection = await amqp.connect(rabbitMQhost);
    const channel = await connection.createChannel();

    // 2. Assert Queue (Creates it if it does not exist)
    const queueName = 'task_queue';
    await channel.assertQueue(queueName, { durable: true });

    // 3. Define and send payload as a Buffer
    const payload = JSON.stringify(task);

    console.log(payload);

    channel.sendToQueue(queueName, Buffer.from(payload), {
      persistent: true, // Saves message to disk so it survives broker restarts
    });

    // 4. Close the connection gracefully
    await channel.close();
    await connection.close();
  } catch (error) {
    const errorMessage = 'rabbitmq Producer error';
    logger.error(errorMessage, {
      message: error instanceof Error ? error.message : String(error),
      // stack: error instanceof Error ? error.stack : undefined,
      // body: req.body,
    });
  }
};

export default sendTask;
