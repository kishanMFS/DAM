FROM node:22-alpine AS builder

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY ReactFrontend/package.json ./ReactFrontend/package.json
COPY NodeBackend/package.json ./NodeBackend/package.json
COPY worker/package.json ./worker/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
RUN npm ci --workspace=ReactFrontend --include-workspace-root

COPY ReactFrontend ./ReactFrontend
COPY packages/shared-types ./packages/shared-types

ARG VITE_API=/api
ARG VITE_BASE_PATH=/
ENV VITE_API=${VITE_API}
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
RUN npm run build --workspace=ReactFrontend

FROM nginx:stable-alpine

COPY --from=builder /workspace/ReactFrontend/dist /usr/share/nginx/html
COPY ReactFrontend/nginx.config /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
