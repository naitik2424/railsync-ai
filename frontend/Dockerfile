FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . ./
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 5173

# Configure nginx to serve on port 5173 and handle SPA routing
RUN sed -i 's/listen       80;/listen       5173;/g' /etc/nginx/conf.d/default.conf && \
    sed -i 's/try_files $uri $uri\/ \/index.html;/try_files $uri $uri\/ \/index.html =404;/g' /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
