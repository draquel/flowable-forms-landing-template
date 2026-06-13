/**
 * Centralised, typed access to configuration.
 *
 * Resolution order for each value:
 *   1. window.__APP_CONFIG__[KEY]   — RUNTIME config, injected by /config.js.
 *      In the Docker image this file is generated at container start from
 *      environment variables, so ONE built image serves every environment.
 *   2. import.meta.env[VITE_KEY]    — BUILD/dev config from `.env`.
 *
 * Keeping reads in one place means a cloned page only edits `.env` (dev) or the
 * container's env vars (prod) — never the source.
 */

type AppConfig = Record<string, string | undefined>;

function runtimeConfig(): AppConfig {
  if (typeof window === "undefined") return {};
  return (
    (window as unknown as { __APP_CONFIG__?: AppConfig }).__APP_CONFIG__ ?? {}
  );
}

/**
 * Read a config KEY. Prefers the runtime value, ignoring blanks and
 * un-substituted `${...}` placeholders (present in dev / when not templated),
 * then falls back to the build-time `VITE_<KEY>` env var.
 */
function read(key: string): string | undefined {
  const fromRuntime = runtimeConfig()[key];
  if (fromRuntime && fromRuntime.trim() && !fromRuntime.startsWith("${")) {
    return fromRuntime;
  }
  return import.meta.env[`VITE_${key}`] as string | undefined;
}

const bool = (v: string | undefined, fallback = false): boolean =>
  v == null ? fallback : ["1", "true", "yes", "on"].includes(v.toLowerCase());

export const env = {
  /** Base URL of the Flowable backend (e.g. http://localhost:8090). */
  apiUrl: read("FLOWABLE_API_URL") ?? "",

  /** When true, requests go through a same-origin proxy prefix ("/flowable-api"):
   * the Vite dev proxy in development, or the nginx reverse proxy in the
   * container. Avoids browser CORS. */
  useDevProxy: bool(read("USE_DEV_PROXY"), false),

  /** Key of the form to render. */
  formKey: read("FLOWABLE_FORM_KEY") ?? "",

  /** Optional bearer token for the Flowable API. */
  apiToken: read("FLOWABLE_API_TOKEN") ?? "",

  /**
   * REST path template that looks up form definition(s) by key; `{key}` is
   * substituted. On Flowable Work this returns a paged list of definition
   * metadata (one entry per version), not the form model itself.
   */
  formPath:
    read("FLOWABLE_FORM_PATH") ??
    "/form-api/form-repository/form-definitions?key={key}",

  /**
   * REST path template that returns the form *model* (the `{ rows: [...] }`
   * definition) for a given definition id; `{id}` is substituted.
   */
  formModelPath:
    read("FLOWABLE_FORM_MODEL_PATH") ??
    "/form-api/form-repository/form-definitions/{id}/model",

  // --- Start-instance flow (StartInstancePage) -----------------------------

  /** What a submit starts: "process" (BPMN) or "case" (CMMN). */
  startKind: (read("FLOWABLE_START_KIND") === "case" ? "case" : "process") as
    | "process"
    | "case",

  /** Definition key of the process/case to start on submit. */
  definitionKey: read("FLOWABLE_DEFINITION_KEY") ?? "",

  /**
   * Optional override for the start endpoint. If unset, a default is derived
   * from `startKind` (see src/lib/submissions/startInstance.ts).
   */
  startPath: read("FLOWABLE_START_PATH") ?? "",

  // --- Complete-task flow (TaskFormPage) -----------------------------------

  /** REST path template returning a task's form model; `{taskId}` substituted. */
  taskFormPath: read("FLOWABLE_TASK_FORM_PATH") ?? "/platform-api/tasks/{taskId}/form",

  /**
   * REST path template returning a task's existing variable values (the form's
   * initial payload); `{taskId}` substituted. Returns a `{ name: value }` object.
   */
  taskValuesPath:
    read("FLOWABLE_TASK_VALUES_PATH") ?? "/platform-api/tasks/{taskId}/variables",

  /** REST path template to complete a task; `{taskId}` substituted. */
  taskCompletePath:
    read("FLOWABLE_TASK_COMPLETE_PATH") ?? "/platform-api/tasks/{taskId}/complete",
} as const;

/** Effective base used for API calls: same-origin proxy prefix or absolute URL. */
export const apiBase = (): string => (env.useDevProxy ? "/flowable-api" : env.apiUrl);
