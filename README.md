# DAM

Digital Asset Management (DAM) Platform. Companies today generate and manage a large volume of digital assets — including images, videos, and documents — across multiple teams, projects, and marketing channels.

![DAM Architecture](architecture.svg)

## **Repository structure**

```
.
├── NodeBackend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.production
│   ├── _test_/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       ├── services/
│       ├── types/
│       └── utils/
├── ReactFrontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── babel.config.ts
│   ├── nginx.config
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── reducers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── store/
│   │   ├── styles/
│   │   └── types/
│   └── _test_/
├── worker/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── config/
│       ├── models/
│       ├── services/
│       ├── types/
│       └── utils/
├── db/
│   └── init.sql
├── minio/
│   ├── minio.license
│   ├── certs/
│   └── data/
├── docker-compose.yml
├── package.json
└── README.md
```

## **Prerequisites**

- Docker Desktop or Docker Engine installed
- Docker Compose support (`docker compose`)
- Git installed for cloning the repository

## **Local Docker deployment**

1. Clone the repository:
   ```bash
   git clone https://github.com/kishanMFS/DAM.git
   cd Digital-Asset-Management
   ```
2. Build and start all services in Docker:
   ```bash
   docker compose up -d --build
   ```
   Or use the root convenience script:
   ```bash
   npm run composeup
   ```
3. Validate the services:
   - Frontend: http://localhost
   - Backend: http://localhost:3002
   - MinIO console: http://localhost:9001
   - RabbitMQ management: http://localhost:15672

## **Stop and remove containers**

```bash
docker compose down
```

Or:

```bash
npm run composedown
```

## **Configuration notes**

- `docker-compose.yml` defines the multi-service stack: `frontend`, `backend`, `worker`, `postgres`, `minio`, and `rabbitmq`.
- The backend and worker services load environment variables from `./NodeBackend/.env.production` and `./worker/.env.production`.
- Database initialization happens from `db/init.sql`.
- MinIO uses `minio/minio.license`, `minio/certs`, and mounted `minio_data` volume.

## **Docker service ports**

- `80` -> frontend
- `3002` -> backend
- `5432` -> PostgreSQL
- `9000` -> MinIO API
- `9001` -> MinIO console
- `5672` -> RabbitMQ AMQP
- `15672` -> RabbitMQ management

## **Backend API endpoints**

The Node backend exposes the following REST endpoints under the base URL `http://localhost:3001/api` when running locally via Docker.

> Protected endpoints require a valid `access_token` cookie unless noted otherwise.

| Endpoint                             | Method  | Description                                                                      |
| ------------------------------------ | ------- | -------------------------------------------------------------------------------- |
| `/api/auth/login`                    | `POST`  | Authenticates a user with email and password and sets the access token cookie.   |
| `/api/auth/logout`                   | `POST`  | Clears the authentication cookie and ends the current session.                   |
| `/api/auth/verify`                   | `GET`   | Verifies whether the current access token is valid.                              |
| `/api/assets`                        | `POST`  | Uploads asset metadata for a new asset. Requires authentication.                 |
| `/api/assets`                        | `GET`   | Retrieves the list of assets for the current user or all assets for admin users. |
| `/api/assets/presigned-url`          | `POST`  | Requests a pre-signed URL for direct upload of an asset to storage.              |
| `/api/assets/dashboard`              | `GET`   | Returns dashboard statistics for the DAM application.                            |
| `/api/assets/:fileId/download-count` | `PATCH` | Increments the download count for a specific asset file.                         |

## **Recommended development flow**

1. Start the stack with `docker compose up -d --build`.
2. Open the frontend in your browser.
3. Use RabbitMQ management and MinIO console for diagnostics.
4. Update environment configuration files before rebuilding if credentials or hosts change.
