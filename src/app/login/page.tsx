"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { BrandLockup, StoryImageCarousel } from "@/components/brand";
import { useToast } from "@/components/toast";
import { Alert, Button, Spinner, TextField } from "@/components/ui";
import { useLoginAction } from "@/hooks/use-auth";

export default function LoginPage() {
  const login = useLoginAction();
  const showToast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login({ email, password });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      showToast({ tone: "error", title: "Login failed", body: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] px-5 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_460px]">
        <section className="motion-panel-left hidden rounded-2xl  p-7 shadow-sm lg:block">
          <BrandLockup />
          <p className="font-editorial motion-panel motion-delay-1 mt-8 text-2xl leading-8 text-brand">
            Work feels better when the next step is clear.
          </p>
          <h1 className="motion-panel motion-delay-2 mt-4 text-4xl font-semibold leading-tight text-ink">
            Keep hiring conversations, applications, and progress in one calm workspace.
          </h1>
          <p className="mt-4 max-w-lg text-base font-light leading-8 text-muted">
            Sign in to continue managing client jobs or professional opportunities matched to your selected categories.
          </p>
          <div className="mt-7">
            <StoryImageCarousel role="mixed" />
          </div>
        </section>
        <form className="motion-panel motion-delay-1 mx-auto w-full max-w-md rounded-2xl border border-line bg-white p-7 shadow-sm lg:mx-0" onSubmit={submit}>
          <p className="font-editorial text-xl text-brand">Good to see you again.</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">Welcome back</h1>
          <p className="mt-2 text-sm font-light leading-6 text-muted">Continue to your workspace.</p>
          {loading ? (
            <div className="mt-5 rounded-md border border-teal-100 bg-teal-50 p-3 text-sm font-medium text-brand">
              <span className="inline-flex items-center gap-2">
                <Spinner />
                Checking your details and opening your workspace...
              </span>
            </div>
          ) : null}
          <TextField className="mt-7" label="Email" onChange={(e) => setEmail(e.target.value)} required type="email" value={email} />
          <label className="mt-4 block text-sm font-semibold text-ink">
            Password
            <div className="mt-2 flex rounded-md border border-line bg-white transition duration-200 hover:border-slate-300 focus-within:border-brand focus-within:ring-4 focus-within:ring-teal-100">
              <input
                className="min-w-0 flex-1 rounded-md bg-transparent px-3 py-3 text-sm outline-none"
                onChange={(e) => setPassword(e.target.value)}
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="grid w-11 place-items-center rounded-md text-muted transition hover:bg-slate-50 hover:text-brand"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          {error ? <div className="mt-4"><Alert>{error}</Alert></div> : null}
          <Button className="mt-7 w-full" disabled={loading} type="submit">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Spinner />
                Opening workspace
              </span>
            ) : "Login"}
          </Button>
          <div className="mt-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
          <Button className="mt-5 w-full gap-3" type="button" variant="secondary">
            <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 18 18">
              <path fill="#4285f4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.86 2.7-6.62Z" />
              <path fill="#34a853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.58-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z" />
              <path fill="#fbbc05" d="M3.95 10.7a5.4 5.4 0 0 1 0-3.4V4.97H.96a9 9 0 0 0 0 8.06l2.99-2.33Z" />
              <path fill="#ea4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.42 0 9 0A9 9 0 0 0 .96 4.97L3.95 7.3C4.66 5.16 6.65 3.58 9 3.58Z" />
            </svg>
            Continue with Google
          </Button>
          <p className="mt-5 text-center text-sm text-muted">
            New here? <Link className="font-medium text-brand" href="/register">Create an account</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
