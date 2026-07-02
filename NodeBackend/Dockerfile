FROM node:26-alpine AS builder

WORKDIR /nodebackend

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:26-alpine
WORKDIR /nodebackend
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /nodebackend/dist ./dist
EXPOSE 3002


CMD ["npm", "start"]