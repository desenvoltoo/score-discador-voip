FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_URL=http://localhost:4000/api
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
COPY tsconfig*.json ./
COPY index.html ./
COPY vite.config.ts ./
COPY src ./src

RUN npm install
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN npm install --global serve@14

COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
