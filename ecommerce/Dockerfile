# Dockerfile único do monorepo. Use --build-arg APP=storefront | admin
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /repo

FROM base AS builder
ARG APP=storefront
COPY package.json turbo.json tsconfig.base.json yarn.lock* ./
COPY packages ./packages
COPY apps ./apps
COPY scripts ./scripts
RUN yarn install --network-timeout 600000
RUN yarn workspace @repo/db db:generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn workspace ${APP} build

FROM base AS runner
ARG APP=storefront
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    APP=${APP} \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# `output: "standalone"` já traz só o node_modules podado e o server.js dessa app —
# .next/static e public ficam de fora do standalone e são copiados à parte.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/${APP}/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/${APP}/.next/static ./apps/${APP}/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/${APP}/public ./apps/${APP}/public

USER nextjs
EXPOSE 3000 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["sh", "-c", "node apps/$APP/server.js"]
