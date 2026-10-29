# ReactFrontend

ReactFrontend is the browser application for the DAM platform. Users and administrators sign in, browse and search assets, upload images and videos directly to MinIO, follow worker conversion progress, and preview or download media.

## Stack and layout

- React, TypeScript, Vite, React Router, Redux Toolkit, TanStack Query, and Tailwind CSS.
- `src/main.tsx` mounts the application; `src/routes/routes.tsx` configures providers and routes.
- `src/pages/` contains login and user/admin dashboard pages.
- `src/components/` contains the layout, upload workflow, gallery, and media previews.
- `src/services/` contains the API client and authentication/asset service functions.
- Tests live under `_test_/`; Vite and frontend Nginx configuration are in `vite.config.ts` and `nginx.config`.

## Run and build

Install dependencies from the repository root, which owns the npm workspaces and lockfile:

```bash
npm install
npm run dev --workspace=ReactFrontend
```

Vite reads `ReactFrontend/.env.development` when present. `VITE_API` sets the API base URL and `VITE_PORT` sets the development/preview port. The Vite development server proxies `/dam-assets` to MinIO using `VITE_MINIO_PROXY_TARGET` or `http://127.0.0.1:9000` by default. Start the backend, PostgreSQL, RabbitMQ, and MinIO services as needed.

Run checks from the repository root:

```bash
npm test --workspace=ReactFrontend -- --runInBand
npm run build --workspace=ReactFrontend
npm run lint --workspace=ReactFrontend
```

The production container is built by `ReactFrontend/Dockerfile`: Vite creates static files, which are served by Nginx on port `80`. Compose builds the frontend with `VITE_API=/api` and routes `/api/` and `/dam-assets/` to the backend and MinIO. Deploy or rebuild the frontend container after changing the browser application; rebuilding only the backend does not update frontend assets.

## Routes and application behavior

- `/login` shows the login form.
- `/user/dashboard` is the authenticated user dashboard and upload/gallery view.
- `/admin/dashboard` is the administrator dashboard and gallery.
- Protected application routes render inside `components/Layout.tsx`.

The API client sends cookie credentials. The backend must allow the browser origin through `CORS_ORIGINS`, and production cookies require a compatible HTTPS deployment. The layout’s light/dark toggle stores the preference in browser `localStorage` under `dam-theme`.

## Upload, processing, and media access

1. The upload UI requests presigned URLs from the backend.
2. The browser sends file bytes directly to MinIO using `XMLHttpRequest`, so upload progress can update live.
3. The frontend posts metadata to the backend after all file uploads finish.
4. The backend publishes processing tasks to RabbitMQ; the worker creates thumbnails and video variants and updates PostgreSQL progress/status.
5. The gallery polls the backend using the source object names, displays returned variants, and resumes polling after reload when a source is still processing.

The public MinIO URL must be browser-accessible. In Compose, Nginx exposes the application at `http://localhost`; the MinIO API and console are separately published on `localhost:9000` and `localhost:9001` for local use.

## Configuration and security

- `VITE_API` is compiled into the frontend bundle; it is a URL/configuration value, not a place for secrets.
- The root `.env.example` configures server-side CORS and MinIO public URL values for Compose.
- Never put database passwords, JWT secrets, RabbitMQ credentials, or MinIO secrets in Vite variables or browser code.
- The service `.env.production` is not copied into the image. Configure the stack using the ignored repository-root `.env` and the root Compose file.
