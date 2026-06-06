import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from "react";

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
  return (
    <span
      aria-hidden="true"
      className={`inline-block aspect-square h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

export function LoadingPanel({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-teal-50 text-brand">
          <Spinner />
        </div>
        <div>
          <h2 className="font-semibold text-ink">{title}</h2>
          {body ? <p className="mt-1 text-sm leading-6 text-muted">{body}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center text-brand">
      <Spinner className="h-20 w-20 border-[3px]" />
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
  tone?: "teal" | "green" | "amber" | "gray";
}) {
  const tones = {
    teal: "bg-teal-50 text-brand",
    green: "bg-green-50 text-green",
    amber: "bg-amber-50 text-amber",
    gray: "bg-slate-100 text-muted"
  };

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${tones[tone]}`}>{children}</span>;
}
