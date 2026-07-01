

import amqp from 'amqplib';
import logger from './utils/winston.js';
import path from "path";
import fs from "fs";
import { minio } from './utils/minio.js';
import { processVideo } from "./services/videoProcessor.js";
import { processImage } from "./services/imageProcessor.js";

const rabbitMQhost = process.env.RABBITMQ_URL || '';
// const destination = 'temp';

const startWorker = async (): Promise<void> => {
    try {
        // 1. Connect to RabbitMQ Server
        const connection = await amqp.connect(rabbitMQhost);
        const channel = await connection.createChannel();

        const queueName = 'task_queue';
        await channel.assertQueue(queueName, { durable: true });

        // 2. Fair dispatch configuration
        // Don't give more than 1 message to a worker at a time until processed
        channel.prefetch(1); 

        // 3. Consume messages
        channel.consume(queueName, (msg) => {
            
            if (msg !== null) {
                const task = JSON.parse(msg.content.toString());

                // Simulate processing/business logic
                setTimeout(async () => {

                    console.log(task)
                    const tempFile = path.join(
                        "temp",
                        path.basename(task.objectName)
                    );
                    
                    await minio.fGetObject(
                        task.bucket,
                        task.objectName,
                        tempFile
                    );

                    if(task.fileType.startsWith("video")){
                        await processVideo(task,tempFile);
                    }else if(task.fileType.startsWith("image")){
                        await processImage(task,tempFile);
                    }
                    fs.unlinkSync(tempFile);
                    
                    // 4. Manual Acknowledgment
                    channel.ack(msg); 
                }, 2000);
            }
        }, {
            noAck: false // Explicitly require manual acknowledgments
        });

    } catch (error) {
        console.log(error.message)
        const errorMessage = 'rabbitmq consumer error';
        logger.error(errorMessage, {
            message: error instanceof Error ? error.message : String(error),
            // stack: error instanceof Error ? error.stack : undefined,
            // body: req.body,
        });
    }
}

export default startWorker;
