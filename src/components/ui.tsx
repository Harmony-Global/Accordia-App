import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from "react";
import { CircleX, Clock3 } from "lucide-react";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "warning" }) {
  const variants = {
    primary: "bg-brand text-white hover:bg-[#125A73]",
    secondary: "border border-line bg-white text-ink hover:bg-slate-50",
    warning: "bg-amber text-white hover:bg-[#D98E13]"
  };

  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center rounded-md px-4 py-3 text-sm font-semibold shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm ${variants[variant]} ${className}`}
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

export function SelectField({
  label,
  children,
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className={`block text-sm font-semibold text-ink ${className}`}>
      {label}
      <select
        className="mt-2 w-full rounded-md border border-line bg-white px-3 py-3 text-sm outline-none transition duration-200 hover:border-slate-300 focus:border-brand focus:ring-4 focus:ring-teal-100"
        {...props}
      >
        {children}
      </select>
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

  if (normalizedStatus === "selected" || normalizedStatus === "awarded") {
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
