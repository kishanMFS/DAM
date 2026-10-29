FROM node:22-alpine AS builder

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY ReactFrontend/package.json ./ReactFrontend/package.json
COPY NodeBackend/package.json ./NodeBackend/package.json
COPY worker/package.json ./worker/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
RUN npm ci --workspace=NodeBackend --workspace=@dam/shared-types --include-workspace-root
COPY NodeBackend/tsconfig.json ./NodeBackend/tsconfig.json
COPY NodeBackend/src ./NodeBackend/src
COPY packages/shared-types ./packages/shared-types
RUN npm run build --workspace=NodeBackend

FROM node:22-alpine
WORKDIR /workspace
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY ReactFrontend/package.json ./ReactFrontend/package.json
COPY NodeBackend/package.json ./NodeBackend/package.json
COPY worker/package.json ./worker/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
RUN npm ci --omit=dev --workspace=NodeBackend --workspace=@dam/shared-types --include-workspace-root
COPY --from=builder --chown=node:node /workspace/NodeBackend/dist ./NodeBackend/dist
WORKDIR /workspace/NodeBackend
RUN mkdir -p logs && chown node:node logs
USER node
EXPOSE 3002
CMD ["node", "dist/server.js"]