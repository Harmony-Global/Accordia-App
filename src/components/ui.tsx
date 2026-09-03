"use client";

import type {
  ButtonHTMLAttributes,
  ChangeEvent,
  InputHTMLAttributes,
  ReactElement,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from "react";
import { Children, isValidElement, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, CircleX, Clock3, MoreHorizontal, UserRound } from "lucide-react";

export function Button({
  children,
  size = "md",
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { size?: "sm" | "md" | "lg"; variant?: "primary" | "secondary" | "warning" }) {
  const variants = {
    primary: "bg-brand text-white hover:bg-[#125A73]",
    secondary: "border border-line bg-white text-ink hover:bg-slate-50",
    warning: "bg-amber text-white hover:bg-[#D98E13]"
  };
  const sizes = {
    sm: "min-h-9 px-3 py-2 text-xs",
    md: "min-h-11 px-4 py-3 text-sm",
    lg: "min-h-12 px-5 py-3 text-base"
  };

  return (
    <button
      className={`inline-flex items-center justify-center rounded-md font-semibold shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({
  children,
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "warning" | "ghost" }) {
  const variants = {
    primary: "border-brand bg-brand text-white hover:bg-[#125A73]",
    secondary: "border-line bg-white text-brand hover:border-brand hover:bg-teal-50",
    warning: "border-amber bg-amber text-white hover:bg-[#D98E13]",
    ghost: "border-line bg-white text-muted hover:border-brand hover:text-brand"
  };

  return (
    <button
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function MoreButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`grid h-11 w-9 shrink-0 place-items-center rounded-[2px] border border-line bg-white text-brand shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:bg-teal-50 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm ${className}`}
      type="button"
      {...props}
    >
      <MoreHorizontal size={16} />
    </button>
  );
}

export function TextField({
  label,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={`block text-sm font-semibold text-ink ${className}`}>
      {label}
      <input
        className="mt-2 w-full rounded-md border border-line bg-white px-3 py-3 text-sm outline-none transition duration-200 hover:border-slate-300 focus:border-brand focus:ring-4 focus:ring-teal-100"
        {...props}
      />
    </label>
  );
}

type CustomSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

function optionLabel(children: unknown): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(optionLabel).join("");
  return "";
}

function optionsFromChildren(children: React.ReactNode): CustomSelectOption[] {
  return Children.toArray(children)
    .filter(isValidElement)
    .map((child) => {
      const option = child as ReactElement<React.OptionHTMLAttributes<HTMLOptionElement>>;
      return {
        value: String(option.props.value ?? ""),
        label: optionLabel(option.props.children),
        disabled: option.props.disabled
      };
    });
}

export function CustomSelect({
  children,
  className = "",
  triggerClassName = "",
  menuClassName = "",
  value,
  defaultValue,
  onChange,
  disabled,
  name,
  required,
  id,
  "aria-label": ariaLabel
}: SelectHTMLAttributes<HTMLSelectElement> & {
  triggerClassName?: string;
  menuClassName?: string;
}) {
  const generatedId = useId();
  const buttonId = id ?? generatedId;
  const options = useMemo(() => optionsFromChildren(children), [children]);
  const firstEnabledOption = options.find((option) => !option.disabled);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(String(defaultValue ?? firstEnabledOption?.value ?? ""));
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedValue = String(isControlled ? value : internalValue);
  const selectedOption = options.find((option) => option.value === selectedValue) ?? firstEnabledOption;

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function chooseOption(option: CustomSelectOption) {
    if (option.disabled || disabled) return;
    if (!isControlled) setInternalValue(option.value);
    setOpen(false);
    onChange?.({
      target: { value: option.value, name },
      currentTarget: { value: option.value, name }
    } as ChangeEvent<HTMLSelectElement>);
  }

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <input name={name} required={required} type="hidden" value={selectedOption?.value ?? ""} />
      <button
        aria-controls={`${buttonId}-menu`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={`flex w-full items-center justify-between gap-3 rounded-md border border-line bg-white px-3 py-3 text-left text-sm text-ink outline-none transition duration-200 hover:border-slate-300 focus:border-brand focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-muted ${triggerClassName}`}
        disabled={disabled}
        id={buttonId}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className={selectedOption?.value ? "truncate" : "truncate text-muted"}>{selectedOption?.label ?? "Select option"}</span>
        <ChevronDown className={`shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} size={16} />
      </button>
      {open ? (
        <div
          aria-labelledby={buttonId}
          className={`absolute left-0 right-0 z-[90] mt-2 max-h-64 overflow-y-auto rounded-md border border-line bg-white py-1 shadow-xl ${menuClassName}`}
          id={`${buttonId}-menu`}
          role="listbox"
        >
          {options.map((option) => {
            const selected = option.value === selectedValue;
            return (
              <button
                aria-selected={selected}
                className={`flex min-h-10 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition ${selected ? "bg-[#196c88] text-white" : "text-[#5e5e5e] hover:bg-[#196c88] hover:text-white"} disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white disabled:hover:text-slate-300`}
                disabled={option.disabled}
                key={option.value}
                onClick={() => chooseOption(option)}
                role="option"
                type="button"
              >
                <span className="truncate">{option.label}</span>
                {selected ? <Check size={15} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function SelectField({
  label,
  children,
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className={`block text-sm font-semibold text-ink ${className}`}>
      {label}
      <CustomSelect
        className="mt-2"
        {...props}
      >
        {children}
      </CustomSelect>
    </label>
  );
}

export function TextAreaField({
  label,
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className={`block text-sm font-semibold text-ink ${className}`}>
      {label}
      <textarea
        className="mt-2 w-full rounded-md border border-line bg-white px-3 py-3 text-sm outline-none transition duration-200 hover:border-slate-300 focus:border-brand focus:ring-4 focus:ring-teal-100"
        {...props}
      />
    </label>
  );
}

export function Alert({
  children,
  tone = "error"
}: {
  children: React.ReactNode;
  tone?: "error" | "success" | "info";
}) {
  const tones = {
    error: "bg-red-50 text-red-700",
    success: "bg-green-50 text-green-700",
    info: "bg-teal-50 text-brand"
  };

  return <p className={`motion-panel rounded-md p-3 text-sm font-medium ${tones[tone]}`}>{children}</p>;
}

export function Spinner({ className = "" }: { className?: string }) {
  const hasCustomSize = /\b(h-|w-|size-)/.test(className);
  const hasCustomBorder = /\bborder-/.test(className);

  return (
    <span
      aria-hidden="true"
      className={`inline-block aspect-square shrink-0 animate-spin rounded-full border-current border-t-transparent ${hasCustomSize ? "" : "h-5 w-5"} ${hasCustomBorder ? "" : "border-[2px]"} ${className}`}
    />
  );
}

export function LoadingPanel({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4" aria-busy="true" aria-label={title}>
        <div className="h-16 w-16 shrink-0 animate-pulse rounded-md bg-slate-100 shadow-[0_8px_24px_rgba(15,23,42,0.08)]" />
        <div className="min-w-0 flex-1">
          <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200 shadow-[0_6px_18px_rgba(15,23,42,0.08)]" />
          {body ? <div className="mt-3 h-3 w-full max-w-sm animate-pulse rounded-full bg-slate-100 shadow-[0_6px_18px_rgba(15,23,42,0.06)]" /> : null}
        </div>
      </div>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="grid min-h-[55vh] place-items-center" aria-busy="true" aria-label="Loading page">
      <div className="w-full max-w-3xl space-y-4 px-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="rounded-lg border border-line bg-white p-4 shadow-sm" key={index}>
            <div className="flex gap-4">
              <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-slate-100 shadow-[0_8px_24px_rgba(15,23,42,0.08)]" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="h-4 w-2/5 animate-pulse rounded-full bg-slate-200 shadow-[0_6px_18px_rgba(15,23,42,0.08)]" />
                <div className="h-3 w-full animate-pulse rounded-full bg-slate-100 shadow-[0_6px_18px_rgba(15,23,42,0.06)]" />
                <div className="h-3 w-3/4 animate-pulse rounded-full bg-slate-100 shadow-[0_6px_18px_rgba(15,23,42,0.06)]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-100 shadow-[0_6px_18px_rgba(15,23,42,0.06)] ${className}`} />;
}

export function SurfaceModal({
  children,
  className = "",
  panelClassName = "",
  size = "md",
  labelledBy,
  onClose
}: {
  children: React.ReactNode;
  className?: string;
  panelClassName?: string;
  size?: "sm" | "md" | "lg" | "xl" | "chat";
  labelledBy?: string;
  onClose?: () => void;
}) {
  const sizes = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
    chat: "max-w-[860px]"
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className={`fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/20 p-3 backdrop-blur-[2px] sm:p-4 md:p-6 ${className}`}>
      {onClose ? <button aria-label="Close modal" className="fixed inset-0 z-0 cursor-default bg-transparent" onClick={onClose} type="button" /> : null}
      <section
        aria-labelledby={labelledBy}
        aria-modal="true"
        className={`relative z-10 mt-2 w-full rounded-[10px] border border-line bg-white shadow-[0_-2px_4px_rgba(0,0,0,0.05),0_10px_30px_rgba(15,23,42,0.14)] sm:mt-4 ${sizes[size]} ${panelClassName}`}
        role="dialog"
      >
        {children}
      </section>
    </div>
  );
}

export function ProfileAvatar({
  avatarUrl,
  className = "",
  iconSize = 18
}: {
  avatarUrl?: string | null;
  className?: string;
  iconSize?: number;
}) {
  return (
    <span className={`grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 text-brand ${className}`}>
      {avatarUrl ? <img alt="" className="h-full w-full object-cover" decoding="async" src={avatarUrl} /> : <UserRound size={iconSize} />}
    </span>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-line bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${className}`}>{children}</div>;
}

export function StatusPill({
  children,
  tone = "teal"
}: {
  children: React.ReactNode;
  tone?: "teal" | "green" | "amber" | "gray" | "red";
}) {
  const tones = {
    teal: "bg-teal-50 text-brand",
    green: "bg-green-50 text-green",
    amber: "bg-amber-50 text-amber",
    gray: "bg-slate-100 text-muted",
    red: "bg-red-50 text-red-700"
  };

  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${tones[tone]}`}>{children}</span>;
}

export function ApplicationStatusPill({ status }: { status: string }) {
  const normalizedStatus = status.toLowerCase();
  const label = normalizedStatus
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  if (["selected", "awarded", "hired", "in_progress", "inprogress"].includes(normalizedStatus)) {
    return (
      <StatusPill tone="green">
        <Clock3 className="mr-1" size={13} />
        Hired
      </StatusPill>
    );
  }

  if (normalizedStatus === "pending") {
    return (
      <StatusPill tone="amber">
        <Clock3 className="mr-1" size={13} />
        Pending
      </StatusPill>
    );
  }

  if (normalizedStatus === "invited") {
    return (
      <StatusPill tone="amber">
        <Clock3 className="mr-1" size={13} />
        Invited
      </StatusPill>
    );
  }

  if (normalizedStatus === "withdrawn") {
    return (
      <StatusPill tone="gray">
        <CircleX className="mr-1" size={13} />
        Withdrawn
      </StatusPill>
    );
  }

  if (normalizedStatus === "rejected" || normalizedStatus === "not_awarded") {
    return (
      <StatusPill tone="red">
        <CircleX className="mr-1" size={13} />
        {normalizedStatus === "not_awarded" ? "Not awarded" : "Declined"}
      </StatusPill>
    );
  }

  return <StatusPill>{label}</StatusPill>;
}
