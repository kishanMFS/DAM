# NodeBackend

The NodeBackend is the DAM platform’s REST API. It authenticates users, stores asset metadata in PostgreSQL, creates MinIO presigned URLs, publishes media-processing tasks to RabbitMQ, and provides asset listing, download-count, dashboard-statistics, and deletion operations.

## Stack and layout

- TypeScript, Node.js, Express, PostgreSQL via `pg-promise`, MinIO’s JavaScript client, and RabbitMQ via `amqplib`.
- `src/server.ts` starts the HTTP server, configures middleware, and mounts API routes.
- `src/controllers/` handles HTTP requests; `src/services/` implements application workflows; `src/models/` contains database operations.
- `src/middleware/` provides authentication, request validation, error handling, and rate limiting.
- Shared request and database types are in `packages/shared-types`.

## Run locally

Install dependencies from the repository root, which owns the npm workspaces and lockfile:

```bash
npm install
npm run dev --workspace=NodeBackend
```

The development environment file is `NodeBackend/.env.development`; production uses `NodeBackend/.env.production`. The backend config also checks the repository-root environment file. Provide a PostgreSQL database, RabbitMQ, and MinIO before starting the API. Local defaults and ports must agree with the corresponding service environment files. For an all-container development stack, use the root Compose configuration instead.

Build and test from the repository root:

```bash
npm run build --workspace=NodeBackend
npm test --workspace=NodeBackend -- --runInBand
```

The production container is built from `NodeBackend/Dockerfile`. It builds TypeScript into `NodeBackend/dist` and runs as the non-root `node` user. `PORT` controls the listener: the checked-in development file uses `3001`, while Compose configures `3002` and publishes it on `127.0.0.1:3002`. Container settings are supplied by the root `docker-compose.yml` and root `.env`; the image does not copy service `.env` files.

## API

The API mounts routes under `/api`:

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/auth/login` | `POST` | Validate credentials and set the `access_token` cookie. |
| `/api/auth/logout` | `POST` | Clear the authentication cookie. |
| `/api/auth/verify` | `GET` | Verify the current access-token cookie. |
| `/api/assets` | `GET` | List assets with pagination, tag search, or a `sourceObjectNames` processing lookup. |
| `/api/assets` | `POST` | Insert uploaded-file metadata and enqueue media tasks. |
| `/api/assets/presigned-url` | `POST` | Create direct-to-MinIO upload URLs. |
| `/api/assets/dashboard` | `GET` | Return dashboard counts and storage totals. |
| `/api/assets/:fileId/download-count` | `PATCH` | Increment an asset’s download count. |
| `/api/assets/:fileId` | `DELETE` | Delete an asset and its generated variants; admin only. |
| `/health/live` | `GET` | Liveness response used by Compose health checks. |

Asset endpoints use cookie authentication except the liveness endpoint. The browser origin must be included in `CORS_ORIGINS`, with credentials enabled for the access-token cookie. In Compose, the frontend’s Nginx proxy forwards `/api/` to the backend.

## Upload and processing flow

1. The frontend requests presigned upload URLs from `/api/assets/presigned-url`.
2. The browser uploads each file directly to MinIO.
3. The frontend posts file metadata to `/api/assets`.
4. The backend inserts each source row’s metadata, then publishes a `MediaTask` to RabbitMQ’s durable `task_queue`. The worker creates derived rows and updates their progress and status while processing.
5. The frontend polls `/api/assets?sourceObjectNames=<JSON array>` for source assets and generated variants.

Presigned URLs are generated using the public MinIO host configured by `MINIO_PUBLIC_URL`. Ensure that host is reachable by the browser and that the reverse proxy preserves the `Host` header.

## Configuration and security

The Compose environment is defined by the repository-root `.env.example`; create the ignored root `.env` and provide the required values before deploying. Backend settings include:

- PostgreSQL connection fields `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, or `DB_URL`.
- `JWT_SECRET`, `JWT_EXPIRES_IN`, and browser `CORS_ORIGINS`.
- `RABBITMQ_URL` and `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_BUCKET`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, and `MINIO_PUBLIC_URL`.

For Docker Compose, the PostgreSQL bootstrap administrator and application role are separate: `POSTGRES_USER`/`POSTGRES_PASSWORD` initialize the database; `DB_USER`/`DB_PASSWORD` are used by the backend and worker. `db/zz-create-app-user.sh` provisions the application role and grants table and sequence access on a new database volume. Initialization scripts do not rerun automatically for an existing volume; apply role/grant changes to that database explicitly.

Use unique, strong secrets for deployments. Do not commit `.env` files or bake secrets into the container image. The existing service `.env.production` files are local development artifacts and may contain placeholder credentials; Compose injects the root `.env` values into containers.
