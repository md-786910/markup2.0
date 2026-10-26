# Production build of a React (CRA) app: the static files end up in /app/build.
# docker-compose.override.yml copies them to <app>/build in the repo, where the
# host's nginx serves them. Used for client/, admin/ and website/ (APP_DIR).
# Build context: repo root.
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
    REACT_APP_SENTRY_RELEASE \
    REACT_APP_POSTHOG_KEY \
    REACT_APP_POSTHOG_HOST \
    REACT_APP_GA_MEASUREMENT_ID \
    REACT_APP_CRISP_WEBSITE_ID
ENV GENERATE_SOURCEMAP=false \
    DISABLE_ESLINT_PLUGIN=true \
    CI=false
RUN npm run build
