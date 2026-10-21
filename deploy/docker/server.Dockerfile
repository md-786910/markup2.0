# API server (Express + socket.io + website proxy). Build context: repo root.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=5000
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY server/ ./
# Uploaded files live on a volume mounted here; the image creates it owned by
# the non-root user so a fresh named volume inherits that ownership.
RUN mkdir -p uploads/documents && chown -R node:node uploads
USER node
EXPOSE 5000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
