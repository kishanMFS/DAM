FROM node:26-alpine AS builder

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY NodeBackend/package.json ./NodeBackend/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
RUN npm ci --workspace=NodeBackend --workspace=@dam/shared-types --include-workspace-root
COPY NodeBackend/tsconfig.json ./NodeBackend/tsconfig.json
COPY NodeBackend/src ./NodeBackend/src
COPY packages/shared-types ./packages/shared-types
RUN npm run build --workspace=NodeBackend

FROM node:26-alpine
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY NodeBackend/package.json ./NodeBackend/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
RUN npm ci --omit=dev --workspace=NodeBackend --workspace=@dam/shared-types --include-workspace-root
COPY --from=builder /workspace/NodeBackend/dist ./NodeBackend/dist
EXPOSE 3002


CMD ["npm", "run", "start", "--workspace=NodeBackend"]