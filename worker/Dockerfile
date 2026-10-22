FROM node:26-alpine AS builder

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY worker/package.json ./worker/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
RUN npm ci --workspace=worker --workspace=@dam/shared-types --include-workspace-root
COPY worker/tsconfig.json ./worker/tsconfig.json
COPY worker/src ./worker/src
COPY packages/shared-types ./packages/shared-types
RUN npm run build --workspace=worker

FROM node:26-alpine
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY worker/package.json ./worker/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
RUN npm ci --omit=dev --workspace=worker --workspace=@dam/shared-types --include-workspace-root
COPY --from=builder /workspace/worker/dist ./worker/dist
EXPOSE 3002


CMD ["npm", "run", "start", "--workspace=worker"]