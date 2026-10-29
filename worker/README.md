# Media Worker

The worker is a background Node.js service that consumes media tasks from RabbitMQ, reads original files from MinIO, generates image thumbnails or video renditions, stores derived objects, and updates asset metadata and processing state in PostgreSQL.

## Stack and layout

- TypeScript and Node.js with `amqplib`, `pg-promise`, MinIO’s JavaScript client, `sharp`, `fluent-ffmpeg`, `ffmpeg-static`, and `ffprobe-static`.
- `src/index.ts` initializes MinIO and PostgreSQL before starting the RabbitMQ consumer.
- `src/consumer.ts` consumes persistent messages from the durable `task_queue` with manual acknowledgements.
- `src/services/imageProcessor.ts` generates JPEG thumbnails.
- `src/services/videoProcessor.ts` probes videos, creates height-based MP4 renditions and a thumbnail, uploads outputs, stores tags, and updates statuses.
- `src/models/assetModel.ts` contains worker-side PostgreSQL operations; `src/utils/` provides database, MinIO, and logging clients.
- Worker tests are in `_test_/`, including generated media fixtures under `_test_/helpers/`.

## Run and test locally

Install dependencies from the repository root, which owns the npm workspaces and lockfile:

```bash
npm install
npm run dev --workspace=worker
```

The worker reads `worker/.env.development` first, then the repository-root `.env.development` and `.env`. Local configuration must point to PostgreSQL, RabbitMQ, and MinIO services that are reachable from the host. To start the Compose stack instead, use the root README instructions and its root `.env`.

Build and test from the repository root:

```bash
npm run build --workspace=worker
npm test --workspace=worker -- --runInBand
```

The production image is built with `worker/Dockerfile`, compiles TypeScript, prepares a writable temporary-work directory, and runs as the non-root `node` user. Compose injects the root `.env` values; service `.env` files are not copied into the image.

## Task flow

A task message contains the source asset ID, original filename, MinIO object name and bucket, MIME type, and uploader ID. The worker:

1. Verifies the source asset still exists, then downloads it from MinIO to `worker/temp/`.
2. For images, generates a JPEG thumbnail. For videos, probes the source and creates 240p, 480p, and 720p MP4 renditions; 1080p sources also receive a 1080p rendition.
3. Inserts derived asset rows linked to the source through `parentid`, records dimensions and media tags, uploads derived files, and updates progress/status.
4. Acknowledges a RabbitMQ task after successful processing; permanent task failures are rejected without requeue, while configured transient database failures are delayed and requeued.
5. Removes downloaded and generated temporary files after handling.

Video variants are converted concurrently. Worker logs are written to rotating files under `worker/logs`; production error messages are also sent to standard output and are visible through container logs. The worker uses database role `DB_USER` and must have table/sequence privileges, including `INSERT` on `assettags`.

## Configuration

The Compose worker connects to services using Docker DNS names: `postgres:5432`, `rabbitmq:5672`, and `minio:9000`. Configure the repository-root `.env` with:

- `DB_NAME`, `DB_USER`, `DB_PASSWORD` or `DB_URL` for PostgreSQL.
- `RABBITMQ_URL` for the durable task queue connection.
- `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_BUCKET`, `MINIO_ACCESS_KEY`, and `MINIO_SECRET_KEY`.
- `NODE_ENV=production` in the container; local development reads `worker/.env.development`.

The PostgreSQL bootstrap role and application role are different: `POSTGRES_USER` initializes the database; `DB_USER` is used by the worker and backend. For an existing database volume, apply role and grant changes manually because initialization scripts only run when PostgreSQL initializes a new volume. Never commit credentials or put secrets into the worker image.
