"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLockup, StoryImageCarousel } from "@/components/brand";
import { useSession } from "@/components/session-provider";
import { useToast } from "@/components/toast";
import { Button, Spinner, TextField } from "@/components/ui";
import { useRegisterAction } from "@/hooks/use-auth";
import { startGoogleOAuth } from "@/services/auth-service";
import type { Role } from "@/types";

type RegisterRole = Exclude<Role, "admin">;

export default function RegisterPage() {
  const router = useRouter();
  const session = useSession();
  const register = useRegisterAction();
  const showToast = useToast();
  const [role, setRole] = useState<RegisterRole>("client");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (session.ready && session.token) {
      router.replace("/dashboard");
    }
  }, [router, session.ready, session.token]);

  if (session.ready && session.token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] text-brand">
        <Spinner className="h-24 w-24 border-4" />
      </main>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get("email")),
      password: String(form.get("password")),
      phone: String(form.get("phone")),
      role,
      first_name: String(form.get("first_name")),
      last_name: String(form.get("last_name"))
    };

    try {
      await register(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      showToast({ tone: "error", title: "Registration failed", body: message });
    } finally {
      setLoading(false);
    }
  }

  async function continueWithGoogle() {
    setGoogleLoading(true);

    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const data = await startGoogleOAuth(redirectTo);
      window.location.assign(data.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start Google registration";
      showToast({ tone: "error", title: "Google registration failed", body: message });
      setGoogleLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] px-5 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_560px]">
        <section className="motion-panel-left hidden  p-7 shadow-sm  lg:block">
          <BrandLockup />
          <p className="font-editorial motion-panel motion-delay-1 mt-8 text-2xl leading-8 text-brand">
            A cleaner way to meet the right people for the work.
          </p>
          <h1 className="motion-panel motion-delay-2 mt-4 text-4xl font-semibold leading-tight text-ink">
            Join as a client or professional and move work forward with trust.
          </h1>
          <p className="mt-4 max-w-lg text-base font-light leading-8 text-muted">
            Built for everyday service work and specialist projects, from plumbing and cleaning to design, tutoring, and development.
          </p>
          <div className="mt-7">
            <StoryImageCarousel role={role === "client" ? "client" : "professional"} />
          </div>
        </section>
      <form className="motion-panel motion-delay-1 mx-auto w-full max-w-xl rounded-2xl border border-line bg-white p-7 shadow-sm lg:mx-0" onSubmit={submit}>
        <p className="font-editorial text-xl text-brand">Start with your role.</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Create your account</h1>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {(["client", "professional"] as RegisterRole[]).map((item) => (
            <button
              className={` px-4 py-3 text-sm font-medium ${role === item ? "text-brand" : "border-line text-ink"}`}
              key={item}
              onClick={() => setRole(item)}
              type="button"
            >
              {item === "client" ? "Client" : "Professional"}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="mt-5 rounded-md border border-teal-100 bg-teal-50 p-3 text-sm font-medium text-brand">
            <span className="inline-flex items-center gap-2">
              <Spinner />
              Creating your account and preparing your next step...
            </span>
          </div>
        ) : null}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <TextField label="First name" name="first_name" required />
          <TextField label="Last name" name="last_name" required />
          <TextField label="Email" name="email" required type="email" />
          <TextField label="Phone" name="phone" placeholder="+234..." required />
          <label className="block text-sm font-semibold text-ink md:col-span-2">
            Password
            <div className="mt-2 flex rounded-md border border-line bg-white transition duration-200 hover:border-slate-300 focus-within:border-brand focus-within:ring-4 focus-within:ring-teal-100">
              <input
                className="min-w-0 flex-1 rounded-md bg-transparent px-3 py-3 text-sm outline-none"
                name="password"
                required
                type={showPassword ? "text" : "password"}
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
        </div>
        <Button className="mt-6 w-full" disabled={loading} type="submit">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner />
              Creating account
            </span>
          ) : "Create account"}
        </Button>
        <div className="mt-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>
        <Button className="mt-5 w-full gap-3" disabled={googleLoading || loading} onClick={continueWithGoogle} type="button" variant="secondary">
          <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 18 18">
            <path fill="#4285f4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.86 2.7-6.62Z" />
            <path fill="#34a853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.58-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z" />
            <path fill="#fbbc05" d="M3.95 10.7a5.4 5.4 0 0 1 0-3.4V4.97H.96a9 9 0 0 0 0 8.06l2.99-2.33Z" />
            <path fill="#ea4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.42 0 9 0A9 9 0 0 0 .96 4.97L3.95 7.3C4.66 5.16 6.65 3.58 9 3.58Z" />
          </svg>
          {googleLoading ? "Opening Google" : "Continue with Google"}
        </Button>
        <p className="mt-4 text-center text-sm text-muted">
          Already registered? <Link className="font-medium text-brand" href="/login">Login</Link>
        </p>
      </form>
      </div>
    </main>
  );
}
