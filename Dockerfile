# Stage 1: Create the build
FROM node:16.17-alpine as build
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build --prod

# Stage 2: Copy production build to nginx
FROM nginx:alpine
COPY --from=build /app/dist/sids-parking-boss-web /usr/share/nginx/html
