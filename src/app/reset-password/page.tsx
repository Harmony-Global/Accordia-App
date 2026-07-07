"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLockup } from "@/components/brand";
import { useToast } from "@/components/toast";
import { Button, Spinner } from "@/components/ui";
import { isStrongPassword, PASSWORD_RULE_MESSAGE } from "@/lib/password";
import { resetPassword } from "@/services/auth-service";

function readAccessToken() {
  if (typeof window === "undefined") return null;
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);
  return hashParams.get("access_token") ?? searchParams.get("access_token");
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const showToast = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setToken(readAccessToken());
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      showToast({ tone: "error", title: "Reset link expired", body: "Request a new password reset link and try again." });
      return;
    }

    if (password !== confirmPassword) {
      showToast({ tone: "error", title: "Passwords do not match", body: "Confirm your new password and try again." });
      return;
    }

    if (!isStrongPassword(password)) {
      showToast({ tone: "error", title: "Check your password", body: PASSWORD_RULE_MESSAGE });
      return;
    }

    setLoading(true);

    try {
      const data = await resetPassword(token, password);
      showToast({ tone: "success", title: "Password updated", body: data.message });
      window.history.replaceState(null, "", "/login");
      router.replace("/login");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not reset password";
      showToast({ tone: "error", title: "Reset failed", body: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] px-5 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center">
        <form className="motion-panel w-full rounded-2xl border border-line bg-white p-7 shadow-sm" onSubmit={submit}>
          <BrandLockup />
          <p className="font-editorial mt-8 text-xl text-brand">Choose a new password.</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">Reset password</h1>
          <p className="mt-2 text-sm font-light leading-6 text-muted">
            {PASSWORD_RULE_MESSAGE}
          </p>
          {!token ? (
            <p className="mt-6 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">
              This reset link is missing or expired.
            </p>
          ) : null}
          <label className="mt-6 block text-sm font-semibold text-ink">
            New password
            <div className="mt-2 flex rounded-md border border-line bg-white transition duration-200 hover:border-slate-300 focus-within:border-brand focus-within:ring-4 focus-within:ring-teal-100">
              <input
                className="min-w-0 flex-1 rounded-md bg-transparent px-3 py-3 text-sm outline-none"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
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
          <label className="mt-4 block text-sm font-semibold text-ink">
            Confirm password
            <input
              className="mt-2 w-full rounded-md border border-line bg-white px-3 py-3 text-sm outline-none transition duration-200 hover:border-slate-300 focus:border-brand focus:ring-4 focus:ring-teal-100"
              minLength={8}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
            />
          </label>
          <Button className="mt-6 w-full" disabled={loading || !token} type="submit">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="h-6 w-6 border-[3px]" />
                Updating password
              </span>
            ) : "Update password"}
          </Button>
          <p className="mt-5 text-center text-sm text-muted">
            Need a new link? <Link className="font-medium text-brand" href="/forgot-password">Request reset</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
