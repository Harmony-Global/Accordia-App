"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLockup } from "@/components/brand";
import { useSession } from "@/components/session-provider";
import { useToast } from "@/components/toast";
import { Button, SelectField, Spinner, TextField } from "@/components/ui";
import { completeOAuthProfile, type OAuthProfileResponse } from "@/services/auth-service";
import type { Profile, Role } from "@/types";

type RegisterRole = Exclude<Role, "admin">;

function readOAuthParams() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return {
    accessToken: hashParams.get("access_token"),
    error: hashParams.get("error_description") ?? hashParams.get("error")
  };
}

function routeAfterAuth(profile: Profile) {
  return "/dashboard";
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const session = useSession();
  const showToast = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<RegisterRole>("client");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  function handleOAuthResponse(accessToken: string, data: OAuthProfileResponse) {
    if (data.profile) {
      session.setSession(accessToken, data.profile.role, data.profile);
      showToast({ tone: "success", title: "Google sign-in successful", body: "Your workspace is ready." });
      router.replace(routeAfterAuth(data.profile));
      return;
    }

    if (data.needs_profile) {
      setEmail(data.user?.email ?? "");
      setFirstName(data.user?.first_name ?? "");
      setLastName(data.user?.last_name ?? "");
      return;
    }

    throw new Error("Could not load your Accordia profile.");
  }

  useEffect(() => {
    async function finishOAuth() {
      const params = readOAuthParams();

      if (params.error) {
        showToast({ tone: "error", title: "Google sign-in failed", body: params.error });
        router.replace("/login");
        return;
      }

      if (!params.accessToken) {
        showToast({ tone: "error", title: "Google sign-in failed", body: "No session token was returned." });
        router.replace("/login");
        return;
      }

      setToken(params.accessToken);

      try {
        const data = await completeOAuthProfile(params.accessToken);
        handleOAuthResponse(params.accessToken, data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not finish Google sign-in";
        showToast({ tone: "error", title: "Google sign-in failed", body: message });
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    void finishOAuth();
  }, [router, showToast]);

  async function completeProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setSaving(true);

    try {
      const data = await completeOAuthProfile(token, {
        role,
        phone,
        first_name: firstName,
        last_name: lastName
      });
      handleOAuthResponse(token, data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not complete profile";
      showToast({ tone: "error", title: "Profile setup failed", body: message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] text-brand">
        <Spinner className="h-16 w-16 border-[3px]" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] px-5 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-lg items-center">
        <form className="motion-panel w-full rounded-2xl border border-line bg-white p-7 shadow-sm" onSubmit={completeProfile}>
          <BrandLockup />
          <p className="font-editorial mt-8 text-xl text-brand">One last step.</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">Finish Google registration</h1>
          <p className="mt-2 text-sm font-light leading-6 text-muted">
            We found your Google account. Add the Accordia details we need for your workspace.
          </p>
          {email ? <p className="mt-5 rounded-md bg-teal-50 p-3 text-sm font-medium text-brand">{email}</p> : null}
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <TextField label="First name" onChange={(event) => setFirstName(event.target.value)} required value={firstName} />
            <TextField label="Last name" onChange={(event) => setLastName(event.target.value)} required value={lastName} />
            <TextField className="md:col-span-2" label="Phone" onChange={(event) => setPhone(event.target.value)} placeholder="+234..." required value={phone} />
            <SelectField className="md:col-span-2" label="Account type" onChange={(event) => setRole(event.target.value as RegisterRole)} value={role}>
              <option value="client">Client</option>
              <option value="professional">Professional</option>
            </SelectField>
          </div>
          <Button className="mt-6 w-full" disabled={saving} type="submit">
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="h-6 w-6 border-[3px]" />
                Creating profile
              </span>
            ) : "Continue"}
          </Button>
        </form>
      </div>
    </main>
  );
}
