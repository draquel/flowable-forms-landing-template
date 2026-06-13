import type { FlowableFormConfig } from "@flowable/forms";
import { apiBase, env } from "../config/env";

/**
 * Shared, use-case-agnostic Flowable HTTP client.
 *
 * Form *rendering* is the same for every use case; only how you SOURCE the form
 * and what you DO on submit differ. Those concerns live in the page components
 * and in `src/lib/submissions/*`. This module holds the shared bits:
 *   - auth + JSON request helpers (getJson / postJson)
 *   - `findConfig()` to pull a `{ rows: [...] }` model out of a response
 *   - `fetchFormByKey()` — load a form model by definition key (Flowable Work
 *     two-step: look up definitions by key, then fetch the latest model)
 *
 * ⚠️ ADAPT PER DEPLOYMENT: paths/shapes depend on your Flowable version/product.
 */

interface FormDefinitionRef {
  id: string;
  version?: number;
}

/** Build an absolute (or dev-proxied) URL from a path template + substitutions. */
export function urlFor(
  pathTemplate: string,
  subs: Record<string, string> = {}
): string {
  let path = pathTemplate;
  for (const [key, value] of Object.entries(subs)) {
    path = path.replace(`{${key}}`, encodeURIComponent(value));
  }
  return `${apiBase()}${path}`;
}

export function authHeaders(extra: Record<string, string> = {}): HeadersInit {
  const headers: Record<string, string> = { Accept: "application/json", ...extra };
  if (env.apiToken) headers.Authorization = `Bearer ${env.apiToken}`;
  return headers;
}

export async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { headers: authHeaders(), signal });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status} ${res.statusText}): ${url}`);
  }
  return res.json();
}

export async function postJson(
  url: string,
  body: unknown,
  signal?: AbortSignal
): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Request failed (${res.status} ${res.statusText}): ${url}${
        text ? `\n${text}` : ""
      }`
    );
  }
  // Some complete/start endpoints return 204 No Content.
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Return the `{ rows: [...] }` form model from a response, or null if this
 * response doesn't contain one (e.g. it's a list of definition metadata).
 * Handles the model nested under common keys too.
 */
export function findConfig(json: unknown): FlowableFormConfig | null {
  const obj = json as Record<string, unknown> | null | undefined;
  if (!obj || typeof obj !== "object") return null;
  if (Array.isArray(obj.rows)) return obj as FlowableFormConfig;

  for (const key of ["formModel", "formJson", "form", "config"]) {
    const nested = obj[key] as Record<string, unknown> | undefined;
    if (nested && Array.isArray(nested.rows)) return nested as FlowableFormConfig;
  }
  return null;
}

/**
 * From a list-of-definitions response, pick the id of the latest version.
 * Accepts either `{ data: [...] }` (Flowable Work) or a bare array.
 */
function pickLatestDefinitionId(json: unknown): string | null {
  const obj = json as Record<string, unknown>;
  const list = (Array.isArray(json) ? json : obj?.data) as
    | FormDefinitionRef[]
    | undefined;
  if (!Array.isArray(list) || list.length === 0) return null;

  const latest = list.reduce((a, b) =>
    (b.version ?? 0) > (a.version ?? 0) ? b : a
  );
  return latest.id ?? null;
}

/** Fetch and return the form model (`{ rows: [...] }`) for the given form key. */
export async function fetchFormByKey(
  formKey: string = env.formKey,
  signal?: AbortSignal
): Promise<FlowableFormConfig> {
  if (!formKey) {
    throw new Error(
      "No form key configured. Set VITE_FLOWABLE_FORM_KEY in your .env."
    );
  }

  // Step 1: look up the definition(s) for this key.
  const lookupUrl = urlFor(env.formPath, { key: formKey });
  const lookup = await getJson(lookupUrl, signal);

  // Some deployments return the full model directly — use it if so.
  const direct = findConfig(lookup);
  if (direct) return direct;

  // Step 2: resolve the latest version's id, then fetch its model.
  const id = pickLatestDefinitionId(lookup);
  if (!id) {
    throw new Error(
      `No form definition found for key "${formKey}" at ${lookupUrl}. ` +
        "Check the key and VITE_FLOWABLE_FORM_PATH."
    );
  }

  const modelUrl = urlFor(env.formModelPath, { id });
  const model = await getJson(modelUrl, signal);

  const config = findConfig(model);
  if (!config) {
    throw new Error(
      `Form model at ${modelUrl} had no { rows: [...] }. ` +
        "Adjust findConfig()/VITE_FLOWABLE_FORM_MODEL_PATH in src/lib/flowableClient.ts."
    );
  }
  return config;
}

/**
 * Convert a form payload (`{ name: value, ... }`) into the Flowable REST
 * `variables` array (`[{ name, value }, ...]`). Flowable infers types from the
 * JSON value; add an explicit `type` here if your engine needs it.
 */
export function toVariables(
  values: Record<string, unknown>
): Array<{ name: string; value: unknown }> {
  return Object.entries(values).map(([name, value]) => ({ name, value }));
}
