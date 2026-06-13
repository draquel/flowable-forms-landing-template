import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Hero } from "../components/Hero";
import { Section } from "../components/Section";
import { FlowableForm } from "../components/FlowableForm";
import {
  completeTask,
  fetchTaskForm,
  fetchTaskValues,
} from "../lib/submissions/completeTask";

/**
 * SECOND example page: render the form attached to a running USER TASK and
 * complete that task on submit. The task id comes from the URL query, e.g.
 *   /task?taskId=TASK-123
 *
 * The two use-case seams are wired here:
 *   loadDefinition -> fetchTaskForm(taskId)
 *   onSubmit       -> completeTask(taskId, values, outcome)
 *
 * ⚠️ The complete-task endpoints are UNVERIFIED against a live task — see
 * src/lib/submissions/completeTask.ts and confirm them for your deployment.
 */
export function TaskFormPage() {
  const [params] = useSearchParams();
  const taskId = params.get("taskId") ?? "";
  const [done, setDone] = useState(false);

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Hero
        eyebrow="Open task"
        title="Complete your task"
        subtitle="This page renders the form for a running user task and completes it on submit."
      />

      <Section id="form" title="Task form">
        {!taskId ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">No task selected.</p>
            <p className="mt-1">
              Append <code>?taskId=&lt;id&gt;</code> to the URL, e.g.{" "}
              <code>/task?taskId=TASK-123</code>.
            </p>
          </div>
        ) : done ? (
          <div className="rounded-md border border-green-200 bg-green-50 p-6 text-green-800">
            <p className="font-semibold">Task completed.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 p-6 shadow-sm">
            <FlowableForm
              reloadKey={taskId}
              loadDefinition={(signal) => fetchTaskForm(taskId, signal)}
              loadPayload={(signal) => fetchTaskValues(taskId, signal)}
              onSubmit={(values, outcome) =>
                completeTask(taskId, values, outcome)
              }
              onSubmitted={() => setDone(true)}
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

export default TaskFormPage;
