import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { StartInstancePage } from "./pages/StartInstancePage";
import { TaskFormPage } from "./pages/TaskFormPage";

/**
 * Routes:
 *   /      -> StartInstancePage  (PRIMARY: render form by key, start instance)
 *   /task  -> TaskFormPage       (example: render a user-task form, complete it)
 *
 * For a single-page clone that only needs the start flow, you can drop the
 * router and render <StartInstancePage /> directly.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartInstancePage />} />
        <Route path="/task" element={<TaskFormPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
