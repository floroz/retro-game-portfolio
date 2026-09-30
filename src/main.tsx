import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "framer-motion";
import "./index.scss";
import App from "./App.tsx";

const RemasterPreview = lazy(
  () => import("./components/remaster/RemasterPreview"),
);
const showStudy =
  new URLSearchParams(window.location.search).get("remaster") === "hall";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <Suspense fallback={<p>Loading airport study…</p>}>
        {showStudy ? <RemasterPreview /> : <App />}
      </Suspense>
    </MotionConfig>
  </StrictMode>,
);
