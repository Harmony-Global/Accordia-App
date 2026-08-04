"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { useRegisterAction } from "@/hooks/use-auth";
import { isStrongPassword, PASSWORD_RULE_MESSAGE } from "@/lib/password";
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

  if (session.ready && session.token) return <AuthLoadingScreen />;

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

    if (!isStrongPassword(payload.password)) {
      showToast({ tone: "error", title: "Check your password", body: PASSWORD_RULE_MESSAGE });
      setLoading(false);
      return;
    }

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
    <FigmaAuthShell>
      <section className="mt-6 overflow-hidden rounded-[10px] border-[0.5px] border-[#17617a] bg-[#fcfdfd] lg:mt-8 lg:grid lg:min-h-[720px] lg:grid-cols-[500px_1fr] xl:grid-cols-[540px_1fr]">
        <AuthVisualPanel
          body="Sign in to continue managing client jobs or professional opportunities matched to your selected categories."
          image="signup"
          label="Track Every Mile Stone"
          title="Join as a client or professional and move work forward with trust."
        />

        <form className="px-5 py-8 sm:px-10 lg:px-9 lg:py-8" onSubmit={submit}>
          <h1 className="text-[30px] font-medium leading-[1.25] text-[#5e5e5e] sm:text-[34px]">Create Account</h1>

          <div className="mt-6 grid grid-cols-2 text-center text-[18px] font-medium leading-[1.5] text-[#196c88] sm:text-[20px]">
            {(["client", "professional"] as RegisterRole[]).map((item) => (
              <button
                className={`border-b-2 pb-1 transition ${role === item ? "border-[#196c88]" : "border-transparent"}`}
                key={item}
                onClick={() => setRole(item)}
                type="button"
              >
                {item === "client" ? "Client" : "Professional"}
              </button>
            ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <AuthTextField label="First name" name="first_name" placeholder="First name" required />
            <AuthTextField label="Last name" name="last_name" placeholder="Last name" required />
            <AuthTextField label="Email" name="email" placeholder="Email" required type="email" />
            <AuthTextField label="Phone" name="phone" placeholder="+234" required />
            <AuthPasswordField
              className="sm:col-span-2"
              minLength={8}
              placeholder="Password"
              required
              showPassword={showPassword}
              togglePassword={() => setShowPassword((current) => !current)}
            />
          </div>

          <div className="mt-7">
            <AuthPrimaryButton loading={loading}>{loading ? "Creating account" : "Create Account"}</AuthPrimaryButton>
          </div>

          <div className="mt-7 grid gap-4">
            <AuthDivider />
            <AuthGoogleButton disabled={loading} label="Continue with Google" loading={googleLoading} onClick={continueWithGoogle} />
          </div>

          <p className="mt-3 text-center text-[16px] leading-[1.5] text-[#a4a4a4] sm:text-[18px]">
            Already registered? <Link className="text-[#196c88]" href="/login">Login</Link>
          </p>
        </form>
      </section>
    </FigmaAuthShell>
  );
}
