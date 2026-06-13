/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FLOWABLE_API_URL: string;
  readonly VITE_USE_DEV_PROXY?: string;
  readonly VITE_FLOWABLE_FORM_KEY: string;
  readonly VITE_FLOWABLE_API_TOKEN?: string;
  readonly VITE_FLOWABLE_FORM_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// @flowable/forms does not ship TypeScript types in all versions. This ambient
// declaration keeps the build green; tighten it if/when official types exist.
declare module "@flowable/forms" {
  import * as React from "react";

  export interface FlowableFormConfig {
    rows: Array<{ cols: unknown[] }>;
    [key: string]: unknown;
  }

  export interface FormProps {
    config: FlowableFormConfig;
    payload?: Record<string, unknown>;
    onChange?: (payload: Record<string, unknown>) => void;
    onOutcomePressed?: (
      payload: Record<string, unknown>,
      outcome: unknown
    ) => void;
    // Flowable accepts additional props (Components, locale, etc.).
    [key: string]: unknown;
  }

  export const Form: React.ComponentType<FormProps>;
}
