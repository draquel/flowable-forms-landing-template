import { useState } from "react";
import { Hero } from "../components/Hero";
import { Section } from "../components/Section";
import { FlowableForm } from "../components/FlowableForm";
import { fetchFormDefinition, resolveFormTitle } from "../lib/flowableClient";
import { startInstance } from "../lib/submissions/startInstance";
import { env } from "../config/env";

/** Static fallback for the form heading, used until the form loads and if no better source exists. */
const DEFAULT_FORM_TITLE = "Request access";

/**
 * PRIMARY example page: render a form by key and START a new process/case
 * instance on submit. Copy this file and edit the copy + form key to build a
 * new one-off landing page.
 *
 * The two use-case seams are wired here:
 *   loadDefinition -> fetchFormByKey(env.formKey)
 *   onSubmit       -> startInstance(values, outcome)
 */
export function StartInstancePage() {
  const [submitted, setSubmitted] = useState(false);
  // The form heading resolves once the form loads: a (hidden) `landingTitle`
  // field wins, then the form definition's name, then DEFAULT_FORM_TITLE.
  // See resolveFormTitle.
  const [formTitle, setFormTitle] = useState(DEFAULT_FORM_TITLE);

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Hero
        eyebrow="Get started"
        title="Build something with Flowable Forms"
        subtitle="A short, punchy value proposition for this landing page. Replace this copy when you clone the template."
      />

      <Section title="Why it matters">
        <p className="text-gray-600">
          Use this space for supporting copy, bullet points, or imagery that
          sets up the form below. Add as many <code>&lt;Section&gt;</code> blocks
          as you need.
        </p>
      </Section>

      <Section id="form" title={formTitle}>
        {submitted ? (
          <div className="rounded-md border border-green-200 bg-green-50 p-6 text-green-800">
            <p className="font-semibold">Thanks — we got your submission!</p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 p-6 shadow-sm">
            <FlowableForm
              reloadKey={env.formKey}
              submitLabel="Submit"
              loadDefinition={(signal) => fetchFormDefinition(env.formKey, signal)}
              onLoaded={(info) => setFormTitle(resolveFormTitle(info, DEFAULT_FORM_TITLE))}
              onSubmit={(values, outcome) => startInstance(values, outcome)}
              onSubmitted={() => setSubmitted(true)}
            />
          </div>
        )}
      </Section>

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        Powered by Flowable Forms
      </footer>
    </main>
  );
}

export default StartInstancePage;
