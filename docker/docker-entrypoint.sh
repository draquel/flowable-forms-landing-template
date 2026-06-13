#!/bin/sh
# Generate per-environment config at container start, then run nginx.
# This is what lets ONE built image serve every environment.
set -eu

WEB_ROOT=/usr/share/nginx/html

# Backend the nginx reverse proxy forwards /flowable-api/* to (when the app uses
# USE_DEV_PROXY=true). Default suits Docker Desktop reaching a host-local server.
: "${FLOWABLE_BACKEND_URL:=http://host.docker.internal:8090}"

# 1) Runtime app config -> window.__APP_CONFIG__. Substitute ONLY our app keys so
#    nothing else in the file is touched.
APP_VARS='${FLOWABLE_API_URL} ${USE_DEV_PROXY} ${FLOWABLE_API_TOKEN} ${FLOWABLE_FORM_KEY} ${FLOWABLE_FORM_PATH} ${FLOWABLE_FORM_MODEL_PATH} ${FLOWABLE_START_KIND} ${FLOWABLE_DEFINITION_KEY} ${FLOWABLE_START_PATH} ${FLOWABLE_TASK_FORM_PATH} ${FLOWABLE_TASK_VALUES_PATH} ${FLOWABLE_TASK_COMPLETE_PATH}'
envsubst "$APP_VARS" < "$WEB_ROOT/config.template.js" > "$WEB_ROOT/config.js"

# 2) nginx config -> substitute ONLY ${FLOWABLE_BACKEND_URL} (leave $host, $uri…).
envsubst '${FLOWABLE_BACKEND_URL}' \
  < /etc/nginx/templates-src/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
