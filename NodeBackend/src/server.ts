import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import env from './config/env.js';
import errorHandler from './middleware/errorHandler.js';
import cookies from 'cookie-parser';
import helmet from 'helmet';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { initializeMinio } from './utils/minio.js';
import { closeProducer } from './utils/producer.js';
import { closeDatabase } from './utils/db.js';

// initialize minio bucket
initializeMinio();

const [unexpectedRequest, addErrorToRequestLog, globalErrorHandler] = errorHandler();
import authRoutes from './routes/authRoutes.js';
// import userRoutes from './routes/userRoutes.js';
import assetRoutes from './routes/assetRoutes.js';

import corsOptions from './config/corsOptions.js';
import { apiRateLimiter, authRateLimiter } from './middleware/rateLimiter.js';

const app: express.Application = express();
const PORT = Number(env.PORT);
const httpServer = createServer(app);

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  }),
);

app.get('/health/live', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookies());

// Global Rate Limiting
app.use('/api', apiRateLimiter);

// Routes
app.use('/api/auth', authRateLimiter, authRoutes);
// app.use('/api/users', userRoutes);
app.use('/api/assets', assetRoutes);

const swaggerRoot = process.cwd().endsWith('NodeBackend') ? '.' : './NodeBackend';
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DAM API',
      version: '1.0.0',
      description: 'Authentication and digital asset management API.',
    },
    servers: [{ url: '/api' }],
    tags: [
      { name: 'Auth', description: 'Session authentication' },
      { name: 'Assets', description: 'Asset upload, listing, and management' },
    ],
    components: {
      securitySchemes: {
        accessToken: { type: 'apiKey', in: 'cookie', name: 'access_token' },
      },
      schemas: {
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', format: 'password' },
          },
        },
        AssetUpload: {
          type: 'object',
          required: ['objectName', 'originalName', 'fileType', 'size'],
          properties: {
            objectName: { type: 'string' },
            originalName: { type: 'string' },
            fileType: { type: 'string' },
            size: { type: 'number', description: 'Size in megabytes' },
          },
        },
        PresignedFile: {
          type: 'object',
          required: ['fileName', 'mimeType'],
          properties: {
            fileName: { type: 'string' },
            mimeType: { type: 'string' },
          },
        },
      },
    },
  },
  apis: [`${swaggerRoot}/src/routes/*.ts`, `${swaggerRoot}/dist/routes/*.js`],
};
const swaggerDocs = swaggerJsdoc(swaggerOptions);

app.get('/api-docs.json', (_request, response) => {
  response.json(swaggerDocs);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
// Error handling middleware
app.use(unexpectedRequest);
app.use(addErrorToRequestLog);
app.use(globalErrorHandler);

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});

const shutdown = (signal: NodeJS.Signals) => {
  console.log(`Received ${signal}, shutting down HTTP server`);
  httpServer.close((error) => {
    void Promise.all([closeProducer(), closeDatabase()])
      .then(() => {
        if (error) {
          console.error('HTTP server shutdown failed', error);
          process.exitCode = 1;
          return;
        }
        console.log('HTTP server, RabbitMQ producer, and PostgreSQL pool shut down');
      })
      .catch((shutdownError: unknown) => {
        console.error('Application shutdown failed', shutdownError);
        process.exitCode = 1;
      });
  });
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
