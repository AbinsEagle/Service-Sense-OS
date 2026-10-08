import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { applyThemeMode, getThemeMode } from "./lib/theme";

// Light/dark: follow the phone, unless the technician picked Light or Dark in the app
// (data-theme on <html>, set from lib/theme.ts). Styles key off the .dark class.
const root = document.documentElement;
const saved = getThemeMode();
if (saved !== "system") applyThemeMode(saved);
const dark = window.matchMedia("(prefers-color-scheme: dark)");
const applyTheme = () => {
  const forced = root.getAttribute("data-theme");
  const isDark = forced ? forced === "dark" : dark.matches;
  root.classList.toggle("dark", isDark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", isDark ? "#111318" : "#f9f9ff");
};
applyTheme();
dark.addEventListener("change", applyTheme);
new MutationObserver(applyTheme).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
