FROM node:26-alpine AS builder

WORKDIR /ProjectManagementReact

COPY package*.json ./
COPY . .

RUN npm install

EXPOSE 80
# ENV HUSKY=0
RUN npm run build

# Runtime stage
FROM nginx:stable-alpine

COPY --from=builder /ProjectManagementReact/dist /usr/share/nginx/html
COPY nginx.config /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]