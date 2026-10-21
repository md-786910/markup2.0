# Static build of a React (CRA) app served by unprivileged nginx.
# Used for client/, admin/ and website/ (APP_DIR). Build context: repo root.
# REACT_APP_* values are compiled into the JS at build time, so an image is
# specific to the URLs it was built with.
FROM node:22-bookworm-slim AS build
ARG APP_DIR
WORKDIR /app
COPY ${APP_DIR}/package.json ${APP_DIR}/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY ${APP_DIR}/ ./
ARG REACT_APP_BASE_URL \
    REACT_APP_SERVER_URL \
    REACT_APP_API_URL \
    REACT_APP_APP_URL \
    REACT_APP_SITE_URL \
    REACT_APP_SENTRY_DSN \
    REACT_APP_SENTRY_ENVIRONMENT \
    REACT_APP_SENTRY_RELEASE
ENV GENERATE_SOURCEMAP=false \
    DISABLE_ESLINT_PLUGIN=true \
    CI=false
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY deploy/docker/spa-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
