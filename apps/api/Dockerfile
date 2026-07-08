FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

RUN npm install
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 4000
CMD ["node", "dist/server.js"]
