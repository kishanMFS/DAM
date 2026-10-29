import '../config/env.js';
import amqp, { type ChannelModel, type ConfirmChannel } from 'amqplib';
import logger from '../utils/winston.js';
import type { MediaTask } from '@dam/shared-types';

const rabbitMQhost = process.env.RABBITMQ_URL || '';
const queueName = 'task_queue';

let connection: ChannelModel | null = null;
let connectionPromise: Promise<ChannelModel> | null = null;
let channel: ConfirmChannel | null = null;
let channelPromise: Promise<ConfirmChannel> | null = null;

const getConnection = async (): Promise<ChannelModel> => {
  if (connection) return connection;
  if (connectionPromise) return connectionPromise;
  if (!rabbitMQhost) {
    throw new Error('RABBITMQ_URL is not configured');
  }

  connectionPromise = amqp
    .connect(rabbitMQhost)
    .then((newConnection) => {
      connection = newConnection;
      newConnection.on('error', (error) => {
        logger.error('rabbitmq Producer connection error', {
          message: error.message,
        });
      });
      newConnection.on('close', () => {
        if (connection === newConnection) {
          connection = null;
          channel = null;
          channelPromise = null;
        }
      });
      return newConnection;
    })
    .finally(() => {
      connectionPromise = null;
    });

  return connectionPromise;
};

const getChannel = async (): Promise<ConfirmChannel> => {
  if (channel) return channel;
  if (channelPromise) return channelPromise;

  channelPromise = getConnection()
    .then(async (activeConnection) => {
      const newChannel = await activeConnection.createConfirmChannel();
      await newChannel.assertQueue(queueName, { durable: true });
      newChannel.on('error', (error) => {
        logger.error('rabbitmq Producer channel error', {
          message: error.message,
        });
      });
      newChannel.on('close', () => {
        if (channel === newChannel) {
          channel = null;
          channelPromise = null;
        }
      });
      channel = newChannel;
      return newChannel;
    })
    .finally(() => {
      channelPromise = null;
    });

  return channelPromise;
};

const sendTask = async (task: MediaTask): Promise<void> => {
  try {
    const activeChannel = await getChannel();
    await new Promise<void>((resolve, reject) => {
      activeChannel.sendToQueue(
        queueName,
        Buffer.from(JSON.stringify(task)),
        { persistent: true },
        (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        },
      );
    });
  } catch (error) {
    logger.error('rabbitmq Producer error', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};

export const closeProducer = async (): Promise<void> => {
  const activeChannel = channel;
  const activeConnection = connection;
  channel = null;
  connection = null;
  channelPromise = null;
  connectionPromise = null;

  try {
    if (activeChannel) await activeChannel.close();
  } finally {
    if (activeConnection) await activeConnection.close();
  }
};

export default sendTask;
