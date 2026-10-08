import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Small Material 3 component set (UI plan U2): buttons, text field, app bar, dialog, chips.

type ButtonVariant = "filled" | "tonal" | "outlined" | "text";
const BTN: Record<ButtonVariant, string> = {
  filled: "bg-primary text-on-primary shadow-none hover:shadow-e1",
  tonal: "bg-secondary-container text-on-secondary-container",
  outlined: "border border-outline text-primary",
  text: "text-primary px-3",
};

export function Button({
  variant = "filled",
  size = "md",
  icon,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "md" | "lg"; icon?: ReactNode }) {
  return (
    <button
      {...rest}
      className={cn(
        "state inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium tracking-[0.01em] transition-shadow",
        size === "lg" ? "h-14 px-7 text-base" : "h-10 px-6 text-sm",
        BTN[variant],
        "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-on-surface/10 disabled:text-on-surface/40 disabled:shadow-none",
        rest.disabled && variant !== "text" && "!bg-surface-container-highest !text-on-surface-variant opacity-60",
        rest.disabled && variant === "text" && "opacity-40",
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function IconButton({ label, children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button {...rest} aria-label={label} title={label} className={cn("state inline-flex h-12 w-12 items-center justify-center rounded-full text-on-surface-variant", className)}>
      {children}
    </button>
  );
}

// Outlined text field with a floating-style label above (simpler and sunlight-legible).
export function TextField({
  label,
  required,
  supporting,
  error,
  prefix,
  className,
  multiline,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; supporting?: string; error?: string | null; prefix?: string; multiline?: boolean }) {
  const id = useId();
  const box = cn(
    "w-full rounded-xs border bg-transparent px-4 text-base text-on-surface outline-none placeholder:text-on-surface-variant/70",
    "focus:border-2 focus:border-primary",
    error ? "border-error" : "border-outline",
  );
  return (
    <div className={cn("grid gap-1", className)}>
      <label htmlFor={id} className={cn("text-sm font-medium", error ? "text-error" : "text-on-surface-variant")}>
        {label}
        {required && <span className="text-error"> *</span>}
      </label>
      <div className="relative flex items-center">
        {prefix && <span className="pointer-events-none absolute left-4 text-base text-on-surface-variant">{prefix}</span>}
        {multiline ? (
          <textarea
            id={id}
            rows={2}
            className={cn(box, "min-h-[56px] py-3")}
            value={rest.value as string}
            onChange={rest.onChange as unknown as React.ChangeEventHandler<HTMLTextAreaElement>}
            placeholder={rest.placeholder}
          />
        ) : (
          <input id={id} {...rest} aria-invalid={!!error} className={cn(box, "h-14", prefix && "pl-12")} />
        )}
      </div>
      {(error || supporting) && <p className={cn("px-4 text-xs", error ? "text-error" : "text-on-surface-variant")}>{error || supporting}</p>}
    </div>
  );
}

export function TopAppBar({ leading, title, subtitle, trailing }: { leading?: ReactNode; title: ReactNode; subtitle?: ReactNode; trailing?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 bg-surface">
      <div className="mx-auto flex h-16 max-w-2xl items-center gap-1 px-1">
        {leading ?? <span className="w-3" />}
        <div className="min-w-0 flex-1 px-1">
          <h1 className="truncate text-[22px] leading-7 text-on-surface">{title}</h1>
          {subtitle && <p className="truncate text-xs text-on-surface-variant">{subtitle}</p>}
        </div>
        {trailing}
      </div>
    </header>
  );
}

export function Dialog({
  open,
  icon,
  title,
  children,
  actions,
  onClose,
}: {
  open: boolean;
  icon?: ReactNode;
  title: string;
  children: ReactNode;
  actions: ReactNode;
  onClose(): void;
}) {
  if (!open) return null;
  // Portal to <body>: a dialog opened from inside the sticky header must still sit above the bottom bar.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-scrim/40 p-4 sm:items-center" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm rounded-xl bg-surface-container-high p-6 shadow-e3"
        onClick={(e) => e.stopPropagation()}
      >
        {icon && <div className="mb-4 flex justify-center text-secondary">{icon}</div>}
        <h2 className={cn("mb-4 text-2xl text-on-surface", icon && "text-center")}>{title}</h2>
        <div className="text-sm leading-5 text-on-surface-variant">{children}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">{actions}</div>
      </div>
    </div>,
    document.body,
  );
}

export function FilterChip({ selected, children, onClick, icon }: { selected: boolean; children: ReactNode; onClick(): void; icon?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "state inline-flex h-10 items-center gap-2 rounded-sm border px-4 text-sm font-medium",
        selected ? "border-transparent bg-secondary-container text-on-secondary-container" : "border-outline text-on-surface-variant",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function Snackbar({ message, onClose }: { message: string | null; onClose(): void }) {
  if (!message) return null;
  return (
    <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4" role="status">
      <div className="flex max-w-md items-center gap-2 rounded-xs bg-inverse-surface py-1 pl-4 pr-1 text-sm text-inverse-on-surface shadow-e3">
        <span className="py-2">{message}</span>
        <button className="state inline-flex h-10 w-10 items-center justify-center rounded-full" aria-label="Dismiss" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Modal bottom sheet (M3): slides up from the bottom, scrim behind.
export function BottomSheet({ open, title, onClose, children }: { open: boolean; title: string; onClose(): void; children: ReactNode }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-scrim/40" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-lg rounded-t-xl bg-surface-container-low px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-3 shadow-e3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-8 rounded-full bg-on-surface-variant/40" aria-hidden />
        <h2 className="mb-4 text-xl text-on-surface">{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
