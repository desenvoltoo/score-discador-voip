FROM node:20-alpine AS build

WORKDIR /app
ARG VITE_API_URL=http://localhost:4000/api
ENV VITE_API_URL=$VITE_API_URL

COPY package.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install --include=dev --workspaces

COPY packages/shared packages/shared
COPY apps/web apps/web

RUN npm run build --workspace @score/web

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
RUN npm install --global serve@14

COPY --from=build /app/apps/web/dist ./dist

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
