import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Follow the phone's light/dark setting (shadcn styles key off the .dark class).
// A data-theme="light" | "dark" attribute on <html>, when a host page sets one, wins.
const root = document.documentElement;
const dark = window.matchMedia("(prefers-color-scheme: dark)");
const applyTheme = () => {
  const forced = root.getAttribute("data-theme");
  root.classList.toggle("dark", forced ? forced === "dark" : dark.matches);
};
applyTheme();
dark.addEventListener("change", applyTheme);
new MutationObserver(applyTheme).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
