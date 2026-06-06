"use client";

import Link from "next/link";
import { Camera, CheckCircle2, Clock3, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useSession } from "@/components/session-provider";
import { Alert, Button, Card, PageLoader, Spinner, StatusPill, TextAreaField, TextField } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useProfile } from "@/hooks/use-auth";
import { updateMyProfile } from "@/services/profile-service";
import { confirmPhoneVerification, getMyVerifications, startPhoneVerification } from "@/services/verification-service";
import type { ProfessionalProfile, Verification } from "@/types";

function getProfessionalProfile(profile: ReturnType<typeof useProfile>["profile"]): ProfessionalProfile | null {
  if (!profile?.professional_profiles) return null;
  return Array.isArray(profile.professional_profiles) ? profile.professional_profiles[0] ?? null : profile.professional_profiles;
}

export default function ProfilePage() {
  const { profile, error: loadError, loading, token, refresh } = useProfile();
  const { updateProfile } = useSession();
  const showToast = useToast();
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpChecking, setOtpChecking] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");

  const professionalProfile = useMemo(() => getProfessionalProfile(profile), [profile]);
  const phoneVerification = verifications.find((item) => item.type === "phone");
  useEffect(() => {
    setAvatarPreview(profile?.avatar_url ?? "");
  }, [profile?.avatar_url]);

  async function loadVerifications() {
    if (!token) return;
    setVerificationLoading(true);
    try {
      const data = await getMyVerifications(token);
      setVerifications(data.verifications);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load verification status";
      setError(message);
      showToast({ tone: "error", title: "Verification status unavailable", body: message });
    } finally {
      setVerificationLoading(false);
    }
  }

  useEffect(() => {
    void loadVerifications();
  }, [token]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setSaving(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const yearsExperience = String(form.get("years_experience") ?? "");
    const hourlyRate = String(form.get("hourly_rate") ?? "");

    try {
      await updateMyProfile(token, {
        profile: {
          first_name: String(form.get("first_name")),
          last_name: String(form.get("last_name")),
          phone: String(form.get("phone")),
          avatar_url: avatarPreview || null
        },
        professional_profile: profile?.role === "professional" ? {
          bio: String(form.get("bio") ?? "") || null,
          years_experience: yearsExperience ? Number(yearsExperience) : undefined,
          hourly_rate: hourlyRate ? Number(hourlyRate) : null,
          location: String(form.get("location") ?? "") || null,
          state: String(form.get("state") ?? "") || null,
          is_available: form.get("is_available") === "on"
        } : undefined
      });
      showToast({
        tone: "success",
        title: "Profile saved",
        body: "Your workspace is now using these details."
      });
      updateProfile({
        avatar_url: avatarPreview || null,
        first_name: String(form.get("first_name")),
        last_name: String(form.get("last_name")),
        phone: String(form.get("phone"))
      });
      await refresh();
      await loadVerifications();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save profile";
      setError(message);
      showToast({ tone: "error", title: "Could not save profile", body: message });
    } finally {
      setSaving(false);
    }
  }

  function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");

    if (!file.type.startsWith("image/")) {
      const message = "Choose an image file for your profile photo.";
      setError(message);
      showToast({ tone: "error", title: "Invalid profile photo", body: message });
      return;
    }

    if (file.size > 750 * 1024) {
      const message = "Choose an image smaller than 750KB for now.";
      setError(message);
      showToast({ tone: "error", title: "Image is too large", body: message });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => {
      const message = "Could not read that image. Try another file.";
      setError(message);
      showToast({ tone: "error", title: "Image upload failed", body: message });
    };
    reader.readAsDataURL(file);
  }

  async function sendOtp() {
    if (!token || !profile) return;

    setOtpSending(true);
    setError("");
    setDevCode("");

    try {
      const data = await startPhoneVerification(token, profile.phone);
      showToast({
        tone: "success",
        title: "Verification code sent",
        body: `Enter the 6-digit code sent to ${data.verification.value}.`
      });
      setDevCode(data.dev_code ?? "");
      await loadVerifications();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start phone verification";
      setError(message);
      showToast({ tone: "error", title: "Could not send code", body: message });
    } finally {
      setOtpSending(false);
    }
  }

  async function confirmOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setOtpChecking(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const code = String(form.get("code"));

    try {
      await confirmPhoneVerification(token, code);
      showToast({
        tone: "success",
        title: "Phone verified",
        body: "People can now see your trust status on Accordia."
      });
      setDevCode("");
      await refresh();
      await loadVerifications();
      event.currentTarget.reset();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not verify phone";
      setError(message);
      showToast({ tone: "error", title: "Verification failed", body: message });
    } finally {
      setOtpChecking(false);
    }
  }

  return (
    <AppShell>
      {loading && !profile ? <PageLoader /> : null}
      {loadError ? <Alert>{loadError}</Alert> : null}
      {profile ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <form className="rounded-lg border border-line bg-white p-6 shadow-sm" onSubmit={saveProfile}>
            <p className="text-sm font-medium text-brand">Profile</p>
            <h1 className="mt-1 text-3xl font-semibold text-ink">Keep your account details current</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              These details shape your workspace, job conversations, and trust signals.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-5 rounded-lg border border-line bg-slate-50 p-4">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-white text-lg font-bold text-brand shadow-sm">
                {avatarPreview ? (
                  <img alt={`${profile.first_name} ${profile.last_name}`} className="h-full w-full object-cover" src={avatarPreview} />
                ) : (
                  <UserRound size={28} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-ink">Profile photo</h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Add a clear photo so people can recognize your account across jobs and messages.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#125A73] hover:shadow-md">
                    <Camera size={16} />
                    Upload image
                    <input accept="image/*" className="sr-only" onChange={uploadAvatar} type="file" />
                  </label>
                  {avatarPreview ? (
                    <button className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-slate-50" onClick={() => setAvatarPreview("")} type="button">
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <TextField defaultValue={profile.first_name} label="First name" name="first_name" required />
              <TextField defaultValue={profile.last_name} label="Last name" name="last_name" required />
              <TextField defaultValue={profile.email} disabled label="Email" name="email" type="email" />
              <TextField defaultValue={profile.phone} label="Phone" name="phone" required />
            </div>

            {profile.role === "professional" ? (
              <div className="mt-7 border-t border-line pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">Professional profile</h2>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      Help clients understand your availability, location, and experience.
                    </p>
                  </div>
                  <Link className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-slate-50" href="/professional/categories">
                    Categories
                  </Link>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <TextAreaField className="md:col-span-2" defaultValue={professionalProfile?.bio ?? ""} label="Bio" name="bio" rows={4} />
                  <TextField defaultValue={professionalProfile?.location ?? ""} label="Location" name="location" />
                  <TextField defaultValue={professionalProfile?.state ?? ""} label="State" name="state" />
                  <TextField defaultValue={professionalProfile?.years_experience ?? ""} label="Years experience" min={0} name="years_experience" type="number" />
                  <TextField defaultValue={professionalProfile?.hourly_rate ?? ""} label="Typical hourly rate" min={0} name="hourly_rate" type="number" />
                </div>
                <label className="mt-4 flex items-center gap-3 rounded-md border border-line bg-slate-50 px-3 py-3 text-sm font-medium text-ink">
                  <input defaultChecked={professionalProfile?.is_available ?? true} name="is_available" type="checkbox" />
                  Available for matched jobs
                </label>
              </div>
            ) : null}

            <Button className="mt-7" disabled={saving} type="submit">
              {saving ? <span className="inline-flex items-center gap-2"><Spinner /> Saving profile</span> : "Save profile"}
            </Button>
          </form>

          <aside className="grid content-start gap-5">
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-brand">Trust status</p>
                  <h2 className="mt-1 text-xl font-semibold text-ink">Phone verification</h2>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-md bg-teal-50 text-brand">
                  {profile.phone_verified ? <CheckCircle2 size={22} /> : <ShieldCheck size={22} />}
                </div>
              </div>
              <div className="mt-4">
                <StatusPill tone={profile.phone_verified ? "green" : "amber"}>
                  {profile.phone_verified ? "Verified" : phoneVerification?.status === "pending" ? "Code sent" : "Pending"}
                </StatusPill>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                Phone verification is Accordia&apos;s first trust milestone. It helps both sides know the account is reachable.
              </p>
              {verificationLoading ? (
                <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted"><Spinner /> Checking verification status</p>
              ) : null}
              {!profile.phone_verified ? (
                <>
                  <Button className="mt-5 w-full" disabled={otpSending} onClick={sendOtp} type="button">
                    {otpSending ? <span className="inline-flex items-center gap-2"><Spinner /> Sending code</span> : "Send verification code"}
                  </Button>
                  {devCode ? (
                    <p className="mt-3 rounded-md bg-slate-100 p-3 text-sm font-medium text-ink">
                      Dev code: {devCode}
                    </p>
                  ) : null}
                  <form className="mt-4 flex gap-2" onSubmit={confirmOtp}>
                    <input
                      className="min-w-0 flex-1 rounded-md border border-line bg-white px-3 py-3 text-sm outline-none transition duration-200 focus:border-brand focus:ring-4 focus:ring-teal-100"
                      inputMode="numeric"
                      maxLength={6}
                      name="code"
                      pattern="[0-9]{6}"
                      placeholder="6-digit code"
                      required
                    />
                    <Button disabled={otpChecking} type="submit">
                      {otpChecking ? <Spinner /> : "Verify"}
                    </Button>
                  </form>
                </>
              ) : null}
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-3">
                <Clock3 className="text-muted" size={20} />
                <h2 className="font-semibold text-ink">Account role</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                You are signed in as a <span className="font-semibold text-ink">{profile.role}</span>. Accordia uses this to keep your workspace focused.
              </p>
            </Card>
          </aside>
        </div>
      ) : null}
    </AppShell>
  );
}
