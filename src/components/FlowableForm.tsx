import { useEffect, useRef, useState } from "react";
import { Form, type FlowableFormConfig } from "@flowable/forms";
import type { FormDefinition } from "../lib/flowableClient";

// Flowable Forms ships two stylesheets at the package root:
//   external.min.css — vendored third-party + base styles
//   flwforms.min.css — the form component styles
// They are Tailwind-v4-generated and use native CSS `@layer`, which this
// project's Tailwind-v3 PostCSS pipeline rejects. We import them with Vite's
// `?raw` suffix (plain string, NOT run through PostCSS) and inject them in a
// <style> tag at runtime. If a future version renames these files, check
// `node_modules/@flowable/forms/*.css`.
import externalCss from "@flowable/forms/external.min.css?raw";
import flwformsCss from "@flowable/forms/flwforms.min.css?raw";

const FLOWABLE_STYLE_ID = "flowable-forms-styles";

function ensureFlowableStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(FLOWABLE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = FLOWABLE_STYLE_ID;
  style.textContent = `${externalCss}\n${flwformsCss}`;
  document.head.appendChild(style);
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | {
      status: "ready";
      config: FlowableFormConfig;
      name?: string;
      payload: Record<string, unknown>;
    };

/** A loader may return a bare form model or a `{ config, name }` definition. */
function normalizeDefinition(
  result: FlowableFormConfig | FormDefinition
): FormDefinition {
  return "rows" in result ? { config: result } : result;
}

interface FlowableFormProps {
  /**
   * Loads the form model to render. This is the use-case seam: the start flow
   * passes a "form by key" loader, the task flow passes a "form by taskId"
   * loader. Receives an AbortSignal for cleanup.
   */
  loadDefinition: (
    signal?: AbortSignal
  ) => Promise<FlowableFormConfig | FormDefinition>;
  /**
   * Optionally loads the form's initial values (the `root.*` payload). Used by
   * the task flow to pre-fill fields with the task's existing variables. Merged
   * over `initialPayload`. Receives an AbortSignal for cleanup.
   */
  loadPayload?: (signal?: AbortSignal) => Promise<Record<string, unknown>>;
  /**
   * Handles an outcome press: what the form does on submit. The other use-case
   * seam (start instance vs. complete task). If omitted, submit is a no-op.
   */
  onSubmit?: (
    values: Record<string, unknown>,
    outcome: unknown
  ) => void | Promise<unknown>;
  /** Called after onSubmit resolves successfully. */
  onSubmitted?: (values: Record<string, unknown>, outcome: unknown) => void;
  /**
   * Called once the form model + initial payload are loaded. Gives the host the
   * resolved `config`, the definition `name` (if any), and the initial
   * `payload` — e.g. to derive a page title from a field or the form name.
   */
  onLoaded?: (info: {
    config: FlowableFormConfig;
    name?: string;
    payload: Record<string, unknown>;
  }) => void;
  /** Initial form values. */
  initialPayload?: Record<string, unknown>;
  /**
   * Changes to this value force a clean form re-init (new `key`). Pass whatever
   * identifies the current form — a form key, a taskId, etc.
   */
  reloadKey?: string;
  /**
   * Outcomes are optional in Flowable. A form WITH outcomes renders its own
   * buttons (which fire onSubmit); a form WITHOUT outcomes renders none, so the
   * host must supply the action.
   *
   * Left undefined (default), this component shows a built-in submit button only
   * as a FALLBACK — when the form has no outcomes. Force it on/off with an
   * explicit boolean (e.g. set false to suppress the fallback entirely).
   */
  showSubmitButton?: boolean;
  /** Label for the built-in submit button. */
  submitLabel?: string;
  /**
   * Outcome value passed to onSubmit when the built-in button is used (forms
   * without outcomes have none). Useful if your backend branches on it.
   */
  submitOutcome?: unknown;
}

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; error: string };

/**
 * Generic, use-case-agnostic Flowable form renderer: handles fetching (via the
 * injected `loadDefinition`), loading/error states, the Flowable CSS, and
 * outcome submission (via the injected `onSubmit`). It knows nothing about
 * starting instances vs. completing tasks — the page decides that.
 */
export function FlowableForm({
  loadDefinition,
  loadPayload,
  onSubmit,
  onSubmitted,
  onLoaded,
  initialPayload = {},
  reloadKey = "form",
  showSubmitButton,
  submitLabel = "Submit",
  submitOutcome,
}: FlowableFormProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });
  // Latest form values, tracked via onChange WITHOUT triggering a re-render
  // (a ref, not state) so we don't disturb the form's internal reactivity.
  const payloadRef = useRef<Record<string, unknown>>(initialPayload);

  useEffect(() => {
    ensureFlowableStyles();
    const controller = new AbortController();
    setState({ status: "loading" });

    // Load the form structure and (optionally) its initial values together, so
    // the whole form has uniform loading/error handling.
    Promise.all([
      loadDefinition(controller.signal),
      loadPayload ? loadPayload(controller.signal) : Promise.resolve(undefined),
    ])
      .then(([definition, loaded]) => {
        if (controller.signal.aborted) return;
        const { config, name } = normalizeDefinition(definition);
        const payload = { ...initialPayload, ...(loaded ?? {}) };
        payloadRef.current = payload;
        setState({ status: "ready", config, name, payload });
        onLoaded?.({ config, name, payload });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      });

    return () => controller.abort();
    // reloadKey identifies the form; reload when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  if (state.status === "loading") {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <span className="animate-pulse">Loading form…</span>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p className="font-semibold">Couldn’t load the form.</p>
        <p className="mt-1 break-words">{state.error}</p>
      </div>
    );
  }

  const handleOutcome = async (
    values: Record<string, unknown>,
    outcome: unknown
  ) => {
    setSubmit({ status: "submitting" });
    try {
      await onSubmit?.(values, outcome);
      setSubmit({ status: "idle" });
      onSubmitted?.(values, outcome);
    } catch (err: unknown) {
      setSubmit({
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // Outcomes are optional: show the built-in submit button only as a fallback
  // when the form defines none, unless the caller forces it via showSubmitButton.
  const outcomes = (state.config as { outcomes?: unknown[] }).outcomes;
  const hasOutcomes = Array.isArray(outcomes) && outcomes.length > 0;
  const shouldShowButton = showSubmitButton ?? !hasOutcomes;

  return (
    <div>
      <Form
        // `key` forces a clean re-init when the form changes.
        key={reloadKey}
        config={state.config}
        payload={state.payload}
        onChange={(p) => {
          payloadRef.current = p;
        }}
        // Fires only if the form defines its own outcomes.
        onOutcomePressed={handleOutcome}
      />

      {submit.status === "error" && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {submit.error}
        </p>
      )}

      {shouldShowButton && (
        <button
          type="button"
          disabled={submit.status === "submitting"}
          onClick={() => handleOutcome(payloadRef.current, submitOutcome)}
          className="mt-4 rounded-md bg-brand px-5 py-2.5 font-medium text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submit.status === "submitting" ? "Submitting…" : submitLabel}
        </button>
      )}
    </div>
  );
}

export default FlowableForm;
