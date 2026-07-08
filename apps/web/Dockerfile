FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm install
COPY apps/web apps/web
WORKDIR /app/apps/web
RUN npm run build
FROM node:20-alpine
WORKDIR /app
RUN npm i -g serve
COPY --from=build /app/apps/web/dist ./dist
EXPOSE 3000
CMD ["serve","-s","dist","-l","3000"]
