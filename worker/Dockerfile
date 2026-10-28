FROM node:22-alpine AS builder

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY ReactFrontend/package.json ./ReactFrontend/package.json
COPY NodeBackend/package.json ./NodeBackend/package.json
COPY worker/package.json ./worker/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
RUN npm ci --workspace=worker --workspace=@dam/shared-types --include-workspace-root
COPY worker/tsconfig.json ./worker/tsconfig.json
COPY worker/src ./worker/src
COPY packages/shared-types ./packages/shared-types
RUN npm run build --workspace=worker

FROM node:22-alpine
WORKDIR /workspace
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY ReactFrontend/package.json ./ReactFrontend/package.json
COPY NodeBackend/package.json ./NodeBackend/package.json
COPY worker/package.json ./worker/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
RUN npm ci --omit=dev --workspace=worker --workspace=@dam/shared-types --include-workspace-root
RUN mkdir -p /workspace/worker/temp && chown -R node:node /workspace/worker
COPY --from=builder --chown=node:node /workspace/worker/dist ./worker/dist
WORKDIR /workspace/worker
USER node
CMD ["node", "dist/index.js"]