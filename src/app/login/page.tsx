"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AuthDivider,
  AuthGoogleButton,
  AuthLoadingScreen,
  AuthPasswordField,
  AuthPrimaryButton,
  AuthTextField,
  AuthVisualPanel,
  FigmaAuthShell
} from "@/components/auth/auth-ui";
import { useSession } from "@/components/session-provider";
import { useToast } from "@/components/toast";
import { useLoginAction } from "@/hooks/use-auth";
import { startGoogleOAuth } from "@/services/auth-service";

export default function LoginPage() {
  const router = useRouter();
  const session = useSession();
  const login = useLoginAction();
  const showToast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const sessionNoticeShown = useRef(false);

  useEffect(() => {
    if (session.ready && session.token) {
      router.replace("/dashboard");
    }
  }, [router, session.ready, session.token]);

  useEffect(() => {
    if (!session.ready || sessionNoticeShown.current) return;

    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason !== "session-expired") return;

    sessionNoticeShown.current = true;
    showToast({
      tone: "error",
      title: "Session expired",
      body: "Please log in again to continue."
    });
    router.replace("/login");
  }, [router, session.ready, showToast]);

  if (session.ready && session.token) return <AuthLoadingScreen />;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      await login({ email, password });
      showToast({ tone: "success", title: "Login successful", body: "Your workspace is ready." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      showToast({ tone: "error", title: "Login failed", body: message });
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
      const message = err instanceof Error ? err.message : "Could not start Google sign-in";
      showToast({ tone: "error", title: "Google sign-in failed", body: message });
      setGoogleLoading(false);
    }
  }

  return (
    <FigmaAuthShell>
      <section className="mt-6 overflow-hidden rounded-[10px] border-[0.5px] border-[#17617a] bg-[#fcfdfd] lg:mt-8 lg:grid lg:min-h-[620px] lg:grid-cols-[560px_1fr] lg:items-stretch xl:grid-cols-[586px_1fr]">
        <AuthVisualPanel
          body="Create account as a client or a professional to connect, discover opportunities, manage projects, collaborate and build meaningful relationships"
          image="login"
          label="Create Services"
          title="All conversations, activities, and progress in one calm workspace."
        />

        <form className="px-5 py-8 sm:px-10 lg:px-8" onSubmit={submit}>
          <div className="mx-auto max-w-[460px]">
            <h1 className="text-[30px] font-medium leading-[1.25] text-[#5e5e5e] sm:text-[34px]">Welcome back</h1>

            <div className="mt-6 grid gap-5">
              <AuthTextField label="Email" onChange={(event) => setEmail(event.target.value)} placeholder="Email" required type="email" value={email} />
              <AuthPasswordField
                forgotHref="/forgot-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                required
                showPassword={showPassword}
                togglePassword={() => setShowPassword((current) => !current)}
                value={password}
              />
            </div>

            <div className="mt-7">
              <AuthPrimaryButton loading={loading}>{loading ? "Logging in" : "Login"}</AuthPrimaryButton>
            </div>

            <div className="mt-10 grid gap-4">
              <AuthDivider />
              <AuthGoogleButton disabled={loading} label="Continue with Google" loading={googleLoading} onClick={continueWithGoogle} />
            </div>

            <p className="mt-4 text-center text-[16px] leading-[1.5] text-[#a4a4a4] sm:text-[18px]">
              New Here? <Link className="text-[#196c88]" href="/register">Create account</Link>
            </p>
          </div>
        </form>
      </section>
    </FigmaAuthShell>
  );
}
