import { useState } from "react";
import { Moon, Sun, SunMoon } from "lucide-react";
import { getThemeMode, setThemeMode, type ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { BottomSheet, IconButton } from "./m3";

const OPTIONS: { mode: ThemeMode; label: string; hint: string; Icon: typeof Sun }[] = [
  { mode: "system", label: "System", hint: "Follow the phone's setting", Icon: SunMoon },
  { mode: "light", label: "Light", hint: "Best in bright sunlight", Icon: Sun },
  { mode: "dark", label: "Dark", hint: "Easier on the eyes indoors", Icon: Moon },
];

export function ThemeButton() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ThemeMode>(getThemeMode);
  const Current = OPTIONS.find((o) => o.mode === mode)!.Icon;
  return (
    <>
      <IconButton label="Theme" onClick={() => setOpen(true)}>
        <Current />
      </IconButton>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Theme">
        <ul role="radiogroup" aria-label="Theme" className="-mx-2 grid gap-1">
          {OPTIONS.map(({ mode: m, label, hint, Icon }) => (
            <li key={m}>
              <button
                role="radio"
                aria-checked={mode === m}
                onClick={() => {
                  setThemeMode(m);
                  setMode(m);
                  setOpen(false);
                }}
                className={cn("state flex min-h-[56px] w-full items-center gap-4 rounded-md px-3 text-left", mode === m && "bg-secondary-container text-on-secondary-container")}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                <span className="flex-1">
                  <span className="block text-on-surface">{label}</span>
                  <span className="block text-xs text-on-surface-variant">{hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </>
  );
}
