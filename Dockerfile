# syntax=docker/dockerfile:1

FROM node:24-alpine AS deps
WORKDIR /app
# Platforms may set NODE_ENV=production for the whole build, which would skip
# the devDependencies `next build` needs.
ENV NODE_ENV=development
COPY package.json package-lock.json ./
RUN npm ci --include=dev

FROM node:24-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
# The /api/v1 rewrite target is compiled into the build, so the backend URL
# is a build argument; setting it at runtime has no effect.
# In Coolify, mark BACKEND_URL as a "Build Variable" to override this.
ARG BACKEND_URL=https://api.revcoraos.com
ENV BACKEND_URL=$BACKEND_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get({host:'127.0.0.1',port:process.env.PORT||3000,path:'/healthz',timeout:4000},r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "server.js"]
