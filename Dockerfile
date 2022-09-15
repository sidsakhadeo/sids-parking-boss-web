# Stage 1: Create the build
FROM node:16 as build
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build --prod

# Stage 2: Copy production build to nginx
FROM nginx:alpine
COPY --from=build /app/dist/parking /usr/share/nginx/html
