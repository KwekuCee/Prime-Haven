import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

if (typeof window !== "undefined") {
  const isBrowserExtensionError = (text: string) =>
    text.includes("chrome-extension://") ||
    text.includes("moz-extension://") ||
    text.includes("safari-extension://") ||
    text.includes("Failed to connect to MetaMask") ||
    text.includes("inpage.js");

  window.addEventListener(
    "error",
    (event) => {
      const combined = `${event.message || ""} ${event.filename || ""} ${event.error?.stack || ""}`;
      if (isBrowserExtensionError(combined)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );

  window.addEventListener(
    "unhandledrejection",
    (event) => {
      const reason = event.reason;
      const combined = `${reason?.message || String(reason || "")} ${reason?.stack || ""}`;
      if (isBrowserExtensionError(combined)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );
}

createRoot(document.getElementById("root")!).render(<App />);
