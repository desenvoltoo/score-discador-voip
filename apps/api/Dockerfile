FROM node:20-alpine AS build

WORKDIR /app
RUN apk add --no-cache openssl

COPY package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install --include=dev --workspaces

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN npm run build --workspace @score/shared \
  && npm run build --workspace @score/api

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api ./

EXPOSE 4000
CMD ["node", "dist/server.js"]
