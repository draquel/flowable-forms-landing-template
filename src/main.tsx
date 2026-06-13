import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// NOTE: React.StrictMode is intentionally NOT used here. In development it
// double-mounts components (mount → unmount → remount), which breaks the
// class-based internals of @flowable/forms — its change subscriptions get torn
// down, so conditional-visibility expressions stop re-evaluating (and it logs
// "setState on a component that is not yet mounted"). StrictMode only affects
// dev, but removing it keeps dev behavior consistent with production.
const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found in index.html");

createRoot(rootEl).render(<App />);
