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
  name?: string;
}

/** A form model plus the definition metadata (its display `name`) around it. */
export interface FormDefinition {
  config: FlowableFormConfig;
  /** The form definition's display name, if the deployment returned one. */
  name?: string;
}

/**
 * Key of the (typically hidden) form field whose value overrides the page
 * title. Author this field in the form designer with a static default value to
 * set a per-form landing title without touching code. See resolveFormTitle().
 */
export const TITLE_FIELD = "landingTitle";

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
 * From a list-of-definitions response, pick the latest version's metadata.
 * Accepts either `{ data: [...] }` (Flowable Work) or a bare array.
 */
function pickLatestDefinition(json: unknown): FormDefinitionRef | null {
  const obj = json as Record<string, unknown>;
  const list = (Array.isArray(json) ? json : obj?.data) as
    | FormDefinitionRef[]
    | undefined;
  if (!Array.isArray(list) || list.length === 0) return null;

  return list.reduce((a, b) => ((b.version ?? 0) > (a.version ?? 0) ? b : a));
}

/** Read a `name` string off an object, if present. */
function readName(json: unknown): string | undefined {
  const name = (json as Record<string, unknown> | null | undefined)?.name;
  return typeof name === "string" && name.trim() ? name : undefined;
}

/**
 * Fetch the form model AND its definition `name` for a key. Same two-step
 * lookup as fetchFormByKey, but preserves the surrounding metadata so callers
 * can use the form's display name (e.g. as a page-title fallback).
 */
export async function fetchFormDefinition(
  formKey: string = env.formKey,
  signal?: AbortSignal
): Promise<FormDefinition> {
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
  if (direct) return { config: direct, name: readName(lookup) };

  // Step 2: resolve the latest version, then fetch its model.
  const latest = pickLatestDefinition(lookup);
  if (!latest?.id) {
    throw new Error(
      `No form definition found for key "${formKey}" at ${lookupUrl}. ` +
        "Check the key and VITE_FLOWABLE_FORM_PATH."
    );
  }

  const modelUrl = urlFor(env.formModelPath, { id: latest.id });
  const model = await getJson(modelUrl, signal);

  const config = findConfig(model);
  if (!config) {
    throw new Error(
      `Form model at ${modelUrl} had no { rows: [...] }. ` +
        "Adjust findConfig()/VITE_FLOWABLE_FORM_MODEL_PATH in src/lib/flowableClient.ts."
    );
  }
  // Prefer a name on the model response; fall back to the list metadata.
  return { config, name: readName(model) ?? latest.name };
}

/** Fetch and return just the form model (`{ rows: [...] }`) for the given key. */
export async function fetchFormByKey(
  formKey: string = env.formKey,
  signal?: AbortSignal
): Promise<FlowableFormConfig> {
  return (await fetchFormDefinition(formKey, signal)).config;
}

/**
 * The payload key a component binds to is carried in its `value` as a binding
 * expression — `{{fieldKey}}` (Flowable Forms) or `${fieldKey}`. The visible
 * `id` is an unrelated stencil id (e.g. `text3`). Return the bound key, if any.
 */
function bindingKey(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const match = value.trim().match(/^\{\{\s*([\w.$]+)\s*\}\}$|^\$\{\s*([\w.$]+)\s*\}$/);
  return match ? match[1] ?? match[2] : undefined;
}

/**
 * Deep-walk a form model for the component bound to `fieldKey` and return its
 * authored static value (`defaultValue`). Matches on the `{{binding}}` in
 * `value` — falling back to a literal `id === fieldKey`. Resilient to nesting
 * (panels, sections, tabs) because it searches the whole object tree.
 */
function deepFindFieldValue(node: unknown, fieldKey: string): unknown {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = deepFindFieldValue(item, fieldKey);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (bindingKey(obj.value) === fieldKey) {
      // `value` is the binding expression, so the seed is in `defaultValue`.
      if (obj.defaultValue !== undefined) return obj.defaultValue;
    } else if (obj.id === fieldKey && ("value" in obj || "defaultValue" in obj)) {
      return obj.value ?? obj.defaultValue;
    }
    for (const value of Object.values(obj)) {
      const found = deepFindFieldValue(value, fieldKey);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

/**
 * Resolve a field's value, preferring the live `payload` (the form's resolved
 * values) and falling back to the value authored in the model definition.
 */
export function extractFieldValue(
  config: FlowableFormConfig,
  fieldKey: string,
  payload?: Record<string, unknown>
): unknown {
  if (payload && payload[fieldKey] != null) return payload[fieldKey];
  return deepFindFieldValue(config, fieldKey);
}

/**
 * Resolve the page title from a loaded form, in precedence order:
 *   1. a (hidden) form field's value — TITLE_FIELD, authored per form
 *   2. the form definition's display name
 *   3. the supplied static `fallback`
 */
export function resolveFormTitle(
  info: { config: FlowableFormConfig; name?: string; payload?: Record<string, unknown> },
  fallback: string,
  fieldKey: string = TITLE_FIELD
): string {
  const fromField = extractFieldValue(info.config, fieldKey, info.payload);
  if (typeof fromField === "string" && fromField.trim()) return fromField;
  if (info.name && info.name.trim()) return info.name;
  return fallback;
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
