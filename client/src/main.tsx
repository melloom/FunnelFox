import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const isStandalone =
  (window.navigator as any).standalone === true ||
  window.matchMedia("(display-mode: standalone)").matches;

if (isStandalone && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
  document.addEventListener(
    "touchend",
    (e) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        e.preventDefault();
        target.focus();
        target.click();
      }
    },
    { passive: false }
  );
}

createRoot(document.getElementById("root")!).render(<App />);
