// Runtime configuration.
//
// In the Docker image this file is regenerated at container start: the ${...}
// placeholders below are replaced with the container's environment variables
// (see docker/docker-entrypoint.sh).
//
// In local dev, Vite serves this file as-is; the un-substituted ${...} values
// are ignored by src/config/env.ts, which then falls back to .env (VITE_*).
window.__APP_CONFIG__ = {
  FLOWABLE_API_URL: "${FLOWABLE_API_URL}",
  USE_DEV_PROXY: "${USE_DEV_PROXY}",
  FLOWABLE_API_TOKEN: "${FLOWABLE_API_TOKEN}",
  FLOWABLE_FORM_KEY: "${FLOWABLE_FORM_KEY}",
  FLOWABLE_FORM_PATH: "${FLOWABLE_FORM_PATH}",
  FLOWABLE_FORM_MODEL_PATH: "${FLOWABLE_FORM_MODEL_PATH}",
  FLOWABLE_START_KIND: "${FLOWABLE_START_KIND}",
  FLOWABLE_DEFINITION_KEY: "${FLOWABLE_DEFINITION_KEY}",
  FLOWABLE_START_PATH: "${FLOWABLE_START_PATH}",
  FLOWABLE_TASK_FORM_PATH: "${FLOWABLE_TASK_FORM_PATH}",
  FLOWABLE_TASK_VALUES_PATH: "${FLOWABLE_TASK_VALUES_PATH}",
  FLOWABLE_TASK_COMPLETE_PATH: "${FLOWABLE_TASK_COMPLETE_PATH}",
};
