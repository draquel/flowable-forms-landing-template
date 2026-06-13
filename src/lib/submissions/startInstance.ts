import { env } from "../../config/env";
import { postJson, toVariables, urlFor } from "../flowableClient";

/**
 * Start-instance submission strategy.
 *
 * Starts a BPMN process or CMMN case from the submitted form values. The target
 * is env-driven (`VITE_FLOWABLE_START_KIND` = process | case,
 * `VITE_FLOWABLE_DEFINITION_KEY`, optional `VITE_FLOWABLE_START_PATH`) so the
 * template stays use-case agnostic.
 *
 * ⚠️ ADAPT PER DEPLOYMENT: confirm the endpoint path and body shape against your
 * Flowable REST API. Defaults target the standard process/cmmn runtime APIs.
 */

const DEFAULT_PATHS = {
  process: "/process-api/runtime/process-instances",
  case: "/cmmn-api/cmmn-runtime/case-instances",
} as const;

export interface StartResult {
  id?: string;
  [key: string]: unknown;
}

export async function startInstance(
  values: Record<string, unknown>,
  outcome: unknown,
  signal?: AbortSignal
): Promise<StartResult> {
  if (!env.definitionKey) {
    throw new Error(
      "No definition key configured. Set VITE_FLOWABLE_DEFINITION_KEY in your .env."
    );
  }

  const path = env.startPath || DEFAULT_PATHS[env.startKind];
  const url = urlFor(path);

  // Body shape differs slightly between the process and case runtime APIs.
  const keyField =
    env.startKind === "case" ? "caseDefinitionKey" : "processDefinitionKey";

  const body: Record<string, unknown> = {
    [keyField]: env.definitionKey,
    variables: toVariables(values),
  };
  // Outcome is informational here; include it as a variable if useful to you.
  if (outcome != null) body.outcome = outcome;

  return (await postJson(url, body, signal)) as StartResult;
}
