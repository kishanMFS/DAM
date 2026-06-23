FROM node:26-alpine AS builder

WORKDIR /ProjectManagementNode

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:26-alpine
WORKDIR /ProjectManagementNode
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /ProjectManagementNode/dist ./dist
EXPOSE 3002


CMD ["npm", "start"]