# Stage 1: Build the React application
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json ./
COPY package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve the application from a lightweight Nginx server
FROM nginx:1.23-alpine AS production
# Copy the built static files from the 'build' stage
COPY --from=build /app/dist /usr/share/nginx/html
# Copy a custom Nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Expose port 80 for the Nginx server
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]