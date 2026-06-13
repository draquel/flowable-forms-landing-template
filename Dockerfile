# syntax=docker/dockerfile:1

# ---- Build stage -----------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Install deps first (better layer caching). The @flowable scope needs the
# Flowable registry token; pass your ~/.npmrc as a BuildKit secret so it is
# NEVER baked into the image:
#   DOCKER_BUILDKIT=1 docker build --secret id=npmrc,src=$HOME/.npmrc -t flowable-landing .
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci

COPY . .
RUN npm run build

# ---- Serve stage -----------------------------------------------------------
FROM nginx:1.27-alpine AS serve

# envsubst (gettext) is used by the entrypoint to template config at startup.
RUN apk add --no-cache gettext

# Built static site.
COPY --from=build /app/dist /usr/share/nginx/html

# Pristine runtime-config template (regenerated into config.js on each start).
COPY public/config.js /usr/share/nginx/html/config.template.js

# nginx + entrypoint.
COPY docker/nginx.conf.template /etc/nginx/templates-src/default.conf.template
COPY docker/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
