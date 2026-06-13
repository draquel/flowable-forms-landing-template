import type { FlowableFormConfig } from "@flowable/forms";
import { env } from "../../config/env";
import { findConfig, getJson, postJson, toVariables, urlFor } from "../flowableClient";

/**
 * Complete-task submission strategy (second example — see TaskFormPage).
 *
 * Renders the form attached to a running user task and completes that task with
 * the submitted values. All paths are env-driven and default to platform-api
 * (`VITE_FLOWABLE_TASK_FORM_PATH`, `VITE_FLOWABLE_TASK_VALUES_PATH`,
 * `VITE_FLOWABLE_TASK_COMPLETE_PATH`).
 *
 * Verified end-to-end against a live task. Note: the values fetch returns some
 * Flowable-internal keys alongside the form fields; they are echoed back on
 * complete. That works as-is — filter `values` here if you want to send only
 * the form's own fields.
 */

/** Fetch the form model (`{ rows: [...] }`) attached to a user task. */
export async function fetchTaskForm(
  taskId: string,
  signal?: AbortSignal
): Promise<FlowableFormConfig> {
  if (!taskId) throw new Error("No taskId provided.");

  const url = urlFor(env.taskFormPath, { taskId });
  const json = await getJson(url, signal);

  const config = findConfig(json);
  if (!config) {
    throw new Error(
      `Task form at ${url} had no { rows: [...] }. ` +
        "Adjust VITE_FLOWABLE_TASK_FORM_PATH / findConfig() to match your endpoint."
    );
  }
  return config;
}

/**
 * Fetch a task's existing variable values, to pre-fill the form (e.g. read-only
 * fields carrying data from the start form). Returns a `{ name: value }` object.
 */
export async function fetchTaskValues(
  taskId: string,
  signal?: AbortSignal
): Promise<Record<string, unknown>> {
  if (!taskId) throw new Error("No taskId provided.");
  const url = urlFor(env.taskValuesPath, { taskId });
  const json = await getJson(url, signal);
  return (json && typeof json === "object" ? json : {}) as Record<
    string,
    unknown
  >;
}

/** Complete the given user task with the submitted form values. */
export async function completeTask(
  taskId: string,
  values: Record<string, unknown>,
  outcome: unknown,
  signal?: AbortSignal
): Promise<void> {
  if (!taskId) throw new Error("No taskId provided.");

  const url = urlFor(env.taskCompletePath, { taskId });
  // platform-api's dedicated /complete endpoint takes the values + outcome
  // directly (no "action" field — that's only for the generic task resource).
  const body: Record<string, unknown> = { variables: toVariables(values) };
  if (outcome != null) body.outcome = outcome;

  await postJson(url, body, signal);
}
