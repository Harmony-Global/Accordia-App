"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandLockup } from "@/components/brand";
import { useToast } from "@/components/toast";
import { Button, Spinner, TextField } from "@/components/ui";
import { requestPasswordReset } from "@/services/auth-service";

export default function ForgotPasswordPage() {
  const showToast = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const data = await requestPasswordReset(email, redirectTo);
      setSent(true);
      showToast({ tone: "success", title: "Reset link sent", body: data.message });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not send reset link";
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
          <p className="font-editorial mt-8 text-xl text-brand">Reset access safely.</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">Forgot password</h1>
          <p className="mt-2 text-sm font-light leading-6 text-muted">
            Enter the email on your password account and we will send a secure reset link.
          </p>
          <TextField
            className="mt-7"
            label="Email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
          <Button className="mt-6 w-full" disabled={loading || sent} type="submit">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="h-6 w-6 border-[3px]" />
                Sending link
              </span>
            ) : sent ? "Check your email" : "Send reset link"}
          </Button>
          <p className="mt-5 text-center text-sm text-muted">
            Remembered it? <Link className="font-medium text-brand" href="/login">Back to login</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
