import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "framer-motion";
import "./index.css";
import App from "./App.tsx";
import { OGImage } from "./components/seo/OGImage";

// Check for OG image generation mode via URL parameter
const isOGImageMode =
  new URLSearchParams(window.location.search).get("og-image") === "true";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isOGImageMode ? (
      <OGImage />
    ) : (
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    )}
  </StrictMode>,
);
