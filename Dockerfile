FROM node:20-alpine AS build
WORKDIR /app
# Prisma's musl engine needs OpenSSL to correctly detect which build to
# generate — without this, `prisma generate` silently guesses wrong
# (defaults to openssl-1.1.x) and the engine fails to load at runtime.
RUN apk add --no-cache openssl
COPY package.json ./
RUN npm install
COPY . .
# Build-time-only placeholders so `next build` can statically analyze routes
# (which import env.ts) without a real database/secret. These never reach
# the runtime image — multi-stage builds don't carry ENV across stages,
# only the COPY'd filesystem. Real values come from the environment at
# container start.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV JWT_SECRET="build-time-placeholder-not-a-real-secret-0000"
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Same reason as the build stage — the engine binary needs OpenSSL present
# at runtime too, not just at generate-time.
RUN apk add --no-cache openssl
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src ./src
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.mjs ./next.config.mjs
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
