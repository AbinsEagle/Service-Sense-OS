import { useState } from "react";
import { ChevronRight, Moon, Settings2, Sun, SunMoon, UserRound } from "lucide-react";
import { getThemeMode, setThemeMode, type ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { BottomSheet, IconButton } from "./m3";

const OPTIONS: { mode: ThemeMode; label: string; hint: string; Icon: typeof Sun }[] = [
  { mode: "system", label: "System", hint: "Follow the phone's setting", Icon: SunMoon },
  { mode: "light", label: "Light", hint: "Best in bright sunlight", Icon: Sun },
  { mode: "dark", label: "Dark", hint: "Easier on the eyes indoors", Icon: Moon },
];

// Theme choice (System / Light / Dark), shown in the Home settings sheet.
export function ThemeOptions({ onPicked }: { onPicked?: () => void }) {
  const [mode, setMode] = useState<ThemeMode>(getThemeMode);
  return (
    <ul role="radiogroup" aria-label="Theme" className="-mx-2 grid gap-1">
          {OPTIONS.map(({ mode: m, label, hint, Icon }) => (
            <li key={m}>
              <button
                role="radio"
                aria-checked={mode === m}
                onClick={() => {
                  setThemeMode(m);
                  setMode(m);
                  onPicked?.();
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
  );
}

// Settings for Home: technician details and theme, behind one icon (keeps the top bar uncluttered).
export function SettingsButton({ technicianLabel, onProfile }: { technicianLabel: string; onProfile(): void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton label="Settings" onClick={() => setOpen(true)}>
        <Settings2 />
      </IconButton>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Settings">
        <button
          onClick={() => {
            setOpen(false);
            onProfile();
          }}
          className="state -mx-2 mb-4 flex min-h-[56px] w-[calc(100%+1rem)] items-center gap-4 rounded-md px-3 text-left"
        >
          <UserRound className="h-5 w-5 shrink-0 text-on-surface-variant" aria-hidden />
          <span className="flex-1">
            <span className="block text-on-surface">Your details</span>
            <span className="block text-xs text-on-surface-variant">{technicianLabel}</span>
          </span>
          <ChevronRight className="h-4 w-4 text-on-surface-variant" aria-hidden />
        </button>
        <h3 className="mb-2 text-sm font-medium text-on-surface-variant">Theme</h3>
        <ThemeOptions />
      </BottomSheet>
    </>
  );
}
