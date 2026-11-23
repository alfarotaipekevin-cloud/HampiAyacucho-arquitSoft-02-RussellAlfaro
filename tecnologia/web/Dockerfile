# 1. Compilación de la web
FROM node:22-alpine AS compilacion
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2. Servidor estático
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=compilacion /app/dist/web/browser /usr/share/nginx/html
EXPOSE 80
