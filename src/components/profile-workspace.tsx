"use client";

import { Camera, CheckCircle2, Mail, MapPin, Pencil, Phone, ShieldCheck, Star, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ProfileCategorySelect } from "@/components/category-select";
import { useSession } from "@/components/session-provider";
import { AccentCheckbox, Button, Card, PageLoader, Spinner, StatusPill, TextAreaField, TextField } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useProfile } from "@/hooks/use-auth";
import { useCategories } from "@/hooks/use-categories";
import { addPortfolioEntry, editPortfolioEntry, getMyProfile, removePortfolioEntry, requestEmailChange, updateMyProfile, uploadProfileAvatar } from "@/services/profile-service";
import { confirmPhoneVerification, getMyVerifications, startPhoneVerification } from "@/services/verification-service";
import type { PortfolioEntry, ProfessionalProfile, Verification } from "@/types";

function getProfessionalProfile(profile: ReturnType<typeof useProfile>["profile"]): ProfessionalProfile | null {
  if (!profile?.professional_profiles) return null;
  return Array.isArray(profile.professional_profiles) ? profile.professional_profiles[0] ?? null : profile.professional_profiles;
}

export function ProfileWorkspace({ editing = false }: { editing?: boolean }) {
  const router = useRouter();
  const { profile, error: loadError, loading, token, refresh } = useProfile();
  const { updateProfile } = useSession();
  const { categories, selectedMainIds, selectedCategoryIds, error: categoryError, loading: categoriesLoading, saveCategories } = useCategories("hierarchy");
  const showToast = useToast();
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [draftCategoryIds, setDraftCategoryIds] = useState<string[]>([]);
  const [draftMainIds, setDraftMainIds] = useState<string[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioEntry[]>([]);
  const [rating, setRating] = useState<{ average: number | null; count: number }>({ average: null, count: 0 });
  const [ratingStatus, setRatingStatus] = useState<"loading" | "loaded" | "unavailable">("loading");
  const [portfolioSaving, setPortfolioSaving] = useState(false);
  const [portfolioEditingId, setPortfolioEditingId] = useState("");
  const [portfolioFileName, setPortfolioFileName] = useState("");
  const portfolioInputRef = useRef<HTMLInputElement>(null);
  const [editorReady, setEditorReady] = useState(!editing);
  const [categoriesSaving, setCategoriesSaving] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpChecking, setOtpChecking] = useState(false);
  const [, setError] = useState("");
  const [devCode, setDevCode] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);

  const professionalProfile = useMemo(() => getProfessionalProfile(profile), [profile]);
  const phoneVerification = verifications.find((item) => item.type === "phone");

  useEffect(() => {
    setAvatarPreview(profile?.avatar_url ?? "");
  }, [profile?.avatar_url]);

  useEffect(() => { setDraftCategoryIds(selectedCategoryIds); }, [selectedCategoryIds]);
  useEffect(() => { setDraftMainIds(selectedMainIds); }, [selectedMainIds]);
  useEffect(() => {
    if (!editing || !token) return;
    let active = true;
    setEditorReady(false);
    void refresh().finally(() => { if (active) setEditorReady(true); });
    return () => { active = false; };
  }, [editing, token, refresh]);

  async function loadOverview() {
    if (!token || profile?.role !== "professional") return;
    try {
      const data = await getMyProfile(token);
      setPortfolio(Array.isArray(data.portfolio) ? data.portfolio : []);
      if (typeof data.review_count === "number" && (data.rating_average === null || typeof data.rating_average === "number")) {
        setRating({ average: data.rating_average, count: data.review_count });
        setRatingStatus("loaded");
      } else {
        setRatingStatus("unavailable");
      }
    } catch (error) {
      setRatingStatus("unavailable");
      showToast({ tone: "error", title: "Could not load profile details", body: error instanceof Error ? error.message : "Please try again." });
    }
  }
  useEffect(() => { void loadOverview(); }, [token, profile?.role]);

  async function saveSelectedCategories() {
    setCategoriesSaving(true);
    try {
      await saveCategories(draftMainIds, draftCategoryIds);
      await refresh();
      showToast({ tone: "success", title: "Categories saved" });
    } catch (error) {
      showToast({ tone: "error", title: "Could not save categories", body: error instanceof Error ? error.message : "Please try again." });
    } finally { setCategoriesSaving(false); }
  }

  useEffect(() => {
    if (loadError) {
      showToast({ tone: "error", title: "Could not load profile", body: loadError });
    }
  }, [loadError, showToast]);

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
    const nextEmail = String(form.get("email") ?? "").trim();

    try {
      await updateMyProfile(token, {
        profile: {
          first_name: String(form.get("first_name")),
          last_name: String(form.get("last_name")),
          phone: String(form.get("phone")),
          avatar_url: avatarPreview || null,
          ...(profile?.role === "client" ? {
            location: String(form.get("location") ?? "") || null,
            state: String(form.get("state") ?? "") || null
          } : {})
        },
        professional_profile: profile?.role === "professional" ? {
          bio: String(form.get("bio") ?? "") || null,
          years_experience: yearsExperience ? Number(yearsExperience) : undefined,
          location: String(form.get("location") ?? "") || null,
          state: String(form.get("state") ?? "") || null,
          is_available: form.get("is_available") === "on"
        } : undefined
      });
      updateProfile({
        avatar_url: avatarPreview || null,
        first_name: String(form.get("first_name")),
        last_name: String(form.get("last_name")),
        phone: String(form.get("phone"))
      });
      await refresh();
      await loadVerifications();
      if (nextEmail && nextEmail !== profile?.email) {
        try {
          await requestEmailChange(token, nextEmail);
          showToast({ tone: "success", title: "Profile saved", body: "Check your current and new email inboxes for confirmation links. Your current address remains until the change completes." });
        } catch (emailError) {
          showToast({ tone: "error", title: "Profile saved; email change not started", body: emailError instanceof Error ? emailError.message : "Try changing your email again." });
          return;
        }
      } else showToast({ tone: "success", title: "Profile saved" });
      router.push("/profile");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save profile";
      setError(message);
      showToast({ tone: "error", title: "Could not save profile", body: message });
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");

    if (!token) {
      const message = "Sign in again before uploading a profile photo.";
      setError(message);
      showToast({ tone: "error", title: "Upload unavailable", body: message });
      event.target.value = "";
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      const message = "Choose a JPEG, PNG, or WebP image for your profile photo.";
      setError(message);
      showToast({ tone: "error", title: "Invalid profile photo", body: message });
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      const message = "Choose an image smaller than 2 MB.";
      setError(message);
      showToast({ tone: "error", title: "Image is too large", body: message });
      event.target.value = "";
      return;
    }

    setAvatarUploading(true);
    try {
      const data = await uploadProfileAvatar(token, file);
      setAvatarPreview(data.avatar_url);
      updateProfile({ avatar_url: data.avatar_url });
      showToast({ tone: "success", title: "Profile photo uploaded" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not upload profile photo";
      setError(message);
      showToast({ tone: "error", title: "Image upload failed", body: message });
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
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

  async function savePortfolio(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const description = String(data.get("description") ?? "");
    const file = data.get("file");
    setPortfolioSaving(true);
    try {
      if (portfolioEditingId) await editPortfolioEntry(token, portfolioEditingId, title, description, file instanceof File && file.size ? file : undefined);
      else {
        if (!(file instanceof File) || !file.size || !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error("Choose a JPEG, PNG, WebP, or PDF file up to 5 MB.");
        await addPortfolioEntry(token, title, description, file);
      }
      form.reset(); setPortfolioEditingId(""); setPortfolioFileName("");
      await loadOverview();
      showToast({ tone: "success", title: "Portfolio saved" });
    } catch (error) { showToast({ tone: "error", title: "Could not save portfolio", body: error instanceof Error ? error.message : "Please try again." }); }
    finally { setPortfolioSaving(false); }
  }

  async function deletePortfolio(id: string) {
    if (!token || !window.confirm("Remove this portfolio entry?")) return;
    try { await removePortfolioEntry(token, id); await loadOverview(); showToast({ tone: "success", title: "Portfolio removed" }); }
    catch (error) { showToast({ tone: "error", title: "Could not remove portfolio", body: error instanceof Error ? error.message : "Please try again." }); }
  }

  if (!editing) return <AppShell>
    {loading && !profile ? <PageLoader /> : null}
    {profile ? <div className="pb-12 text-[#5e5e5e]">
      <p className="text-lg font-medium text-[#196c88]">My Profile</p>
      <h1 className="mt-5 text-3xl font-normal sm:text-4xl">Manage Your Profile</h1>
      <div className="mt-6 flex justify-end"><Link aria-label="Edit profile" className="inline-flex items-center gap-2 text-[#196c88] hover:underline" href="/profile/edit"><Pencil size={20} /><span className="sr-only sm:not-sr-only">Edit</span></Link></div>
      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-[7px] border border-[#e3ecef] bg-[#f8fbfc] p-5 sm:p-7">
            <div className="flex items-center gap-4">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-[#edf3f5] text-[#196c88]">{profile.avatar_url ? <img alt="" className="h-full w-full object-cover" src={profile.avatar_url} /> : <UserRound size={32} />}</div>
              <div className="min-w-0"><h2 className="break-words text-2xl font-medium text-[#196c88]">{profile.first_name} {profile.last_name}</h2><p className="mt-1 text-[#999]">{profile.phone_verified ? "Phone Verified" : "Phone Not Verified"}</p></div>
            </div>
            {profile.role === "professional" ? <>
              <div className="mt-5 flex flex-wrap gap-2">{professionalProfile?.professional_main_categories?.map(({ category }) => <span className="rounded-[4px] bg-[#edf3f5] px-3 py-1 text-sm text-[#196c88]" key={category.id}>{category.name}</span>)}</div>
              <div className="mt-6 grid gap-4 border-t border-[#e3ecef] pt-5 text-sm sm:grid-cols-3">
                <div><p className="text-xs font-semibold uppercase text-[#196c88]">Rating</p><p className="mt-1 flex items-center gap-1"><Star className="fill-[#f5a11b] text-[#f5a11b]" size={16} />{ratingStatus === "loading" ? "Loading rating..." : ratingStatus === "unavailable" ? "Rating unavailable" : rating.average === null ? "No rating yet" : `${rating.average} (${rating.count} reviews)`}</p></div>
                <div><p className="text-xs font-semibold uppercase text-[#196c88]">Experience</p><p className="mt-1">{professionalProfile?.years_experience ?? 0} years</p></div>
                <div><p className="text-xs font-semibold uppercase text-[#196c88]">Availability</p><p className={`mt-1 ${professionalProfile?.is_available ? "text-[#088355]" : "text-[#a66a00]"}`}>{professionalProfile?.is_available ? "Available for matched jobs" : "Unavailable for matched jobs"}</p></div>
              </div>
            </> : null}
          </section>
          {profile.role === "professional" ? <>
            <section className="rounded-[7px] border border-[#e3ecef] bg-[#f8fbfc] p-5 sm:p-7"><h2 className="text-lg font-medium text-[#196c88]">Professional Biography</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{professionalProfile?.bio || "No biography added yet."}</p></section>
            <section><h2 className="text-lg font-medium text-[#196c88]">Featured Portfolio &amp; Case Studies</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">{portfolio.map((entry) => <article className="rounded-[7px] border border-[#e3ecef] bg-[#f8fbfc] p-4" key={entry.id}>{entry.mime_type === "application/pdf" ? <a className="flex aspect-video items-center justify-center bg-white text-[#196c88] underline" href={entry.file_url} rel="noreferrer" target="_blank">Open PDF</a> : <img alt={entry.title} className="aspect-video w-full rounded-[4px] object-cover" src={entry.file_url} />}<h3 className="mt-3 font-medium">{entry.title}</h3>{entry.description ? <p className="mt-1 text-sm">{entry.description}</p> : null}</article>)}{portfolio.length === 0 ? <p className="text-sm text-[#999]">No portfolio entries yet.</p> : null}</div></section>
          </> : null}
        </div>
        <aside className="min-w-0 space-y-5">
          <section className="rounded-[7px] border border-[#e3ecef] bg-[#f8fbfc] p-5"><p className="text-xs font-semibold uppercase">Profile completeness</p><div className="mt-2 flex items-baseline justify-between gap-2"><h2 className="text-2xl font-medium text-[#196c88]">{profile.phone_verified ? "100% Complete" : "0% Complete"}</h2>{!profile.phone_verified ? <span className="text-sm text-[#f59e0b]">1 Step Left</span> : null}</div><div aria-label="Verification progress" aria-valuemax={100} aria-valuemin={0} aria-valuenow={profile.phone_verified ? 100 : 0} className="mt-4 h-2 overflow-hidden rounded-full bg-[#c6dce4]" role="progressbar"><div className="h-full bg-[#196c88]" style={{ width: profile.phone_verified ? "100%" : "0%" }} /></div><h3 className="mt-5 text-xs font-semibold uppercase">Phone verification</h3><p className="mt-3 text-sm leading-6 text-[#888]">Phone verification is Accordia&apos;s first trust milestone. It helps both sides know the account is reachable.</p>{!profile.phone_verified ? <><Button className="mt-4 w-full" disabled={otpSending} onClick={sendOtp} type="button">{otpSending ? "Sending code" : "Send Verification Code"}</Button>{devCode ? <p className="mt-2 text-sm">Dev code: {devCode}</p> : null}<form className="mt-3 flex gap-2" onSubmit={confirmOtp}><input aria-label="6-digit verification code" className="min-w-0 flex-1 rounded-[5px] border border-[#b9b9b9] px-3" inputMode="numeric" maxLength={6} name="code" pattern="[0-9]{6}" placeholder="Enter 6-Digit" required /><Button disabled={otpChecking} type="submit">Verify</Button></form></> : <p className="mt-4 inline-flex items-center gap-2 text-sm text-[#088355]"><CheckCircle2 size={18} />Phone verified</p>}</section>
          <section className="rounded-[7px] border border-[#e3ecef] bg-[#f8fbfc] p-5"><h2 className="text-lg font-medium">Contact &amp; Location</h2><div className="mt-4 space-y-4 text-sm"><p className="flex items-start gap-3"><Mail className="shrink-0 text-[#196c88]" size={18} /><span className="break-all">{profile.email}</span></p><p className="flex items-start gap-3"><Phone className="shrink-0 text-[#196c88]" size={18} />{profile.phone}</p><p className="flex items-start gap-3"><MapPin className="shrink-0 text-[#196c88]" size={18} />{profile.role === "professional" ? [professionalProfile?.location, professionalProfile?.state].filter(Boolean).join(", ") || "Location not added" : [profile.location, profile.state].filter(Boolean).join(", ") || "Location not added"}</p></div></section>
          {profile.role === "client" ? <section className="rounded-[7px] border border-[#e3ecef] bg-[#f8fbfc] p-5"><h2 className="font-medium">Account Role</h2><p className="mt-2 text-sm">You are signed in as a <strong>{profile.role}</strong>. Accordia uses this to keep your workspace focused.</p></section> : null}
        </aside>
      </div>
    </div> : null}
  </AppShell>;

  return (
    <AppShell>
      {(loading && !profile || editing && !editorReady) ? <PageLoader /> : null}
      {loadError && editorReady ? <div className="mx-auto max-w-[960px] rounded-[5px] border border-red-200 bg-white p-5 text-sm text-red-700">Could not load your latest profile. Refresh the page before editing.</div> : null}
      {profile && editorReady && !loadError ? (
        <div className="mx-auto grid max-w-[960px] gap-6 pb-10">
          <form className="rounded-[7px] border border-line bg-white p-5 shadow-sm sm:p-8" onSubmit={saveProfile}>
            <p className="text-sm font-medium text-brand">Edit Profile</p>
            <h1 className="mt-2 text-2xl font-normal text-ink">Keep Your account details current</h1>

            <div className="mt-6 flex flex-wrap items-center gap-5 rounded-lg border border-line bg-slate-50 p-4">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-white text-lg font-bold text-brand shadow-sm">
                {avatarPreview ? (
                  <img alt={`${profile.first_name} ${profile.last_name}`} className="h-full w-full object-cover" decoding="async" src={avatarPreview} />
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
                  <label className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#125A73] hover:shadow-md ${avatarUploading ? "pointer-events-none opacity-75" : "cursor-pointer"}`}>
                    {avatarUploading ? <Spinner /> : <Camera size={16} />}
                    {avatarUploading ? "Uploading" : "Upload image"}
                    <input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={avatarUploading} onChange={uploadAvatar} type="file" />
                  </label>
                  {avatarPreview ? (
                    <button className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" disabled={avatarUploading} onClick={() => setAvatarPreview("")} type="button">
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <TextField defaultValue={profile.first_name} label="First name" name="first_name" required />
              <TextField defaultValue={profile.last_name} label="Last name" name="last_name" required />
              <TextField defaultValue={profile.email} label="Email" name="email" required type="email" />
              <TextField defaultValue={profile.phone} label="Phone" name="phone" required />
            </div>

            {profile.role === "client" ? <div className="mt-4 grid gap-4 md:grid-cols-2"><TextField defaultValue={profile.location ?? ""} label="Location" name="location" /><TextField defaultValue={profile.state ?? ""} label="State" name="state" /></div> : null}

            {profile.role === "professional" ? (
              <div className="mt-7 border-t border-line pt-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">Professional profile</h2>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      Help clients understand your availability, location, and experience.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <TextAreaField className="md:col-span-2" defaultValue={professionalProfile?.bio ?? ""} label="Bio" name="bio" rows={4} />
                  <TextField defaultValue={professionalProfile?.location ?? ""} label="Location" name="location" />
                  <TextField defaultValue={professionalProfile?.state ?? ""} label="State" name="state" />
                  <TextField defaultValue={professionalProfile?.years_experience ?? ""} label="Years experience" min={0} name="years_experience" type="number" />
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-md border border-line bg-slate-50 px-3 py-3 text-sm font-medium text-ink">
                  <AccentCheckbox defaultChecked={professionalProfile?.is_available ?? true} name="is_available">Available for matched jobs</AccentCheckbox>
                </div>
              </div>
            ) : null}

            <Button className="mt-7" disabled={saving || avatarUploading} type="submit">
              {saving ? <span className="inline-flex items-center gap-2"><Spinner /> Saving profile</span> : "Save profile"}
            </Button>
          </form>
          {profile.role === "professional" ? <>
            <section className="rounded-[7px] border border-line bg-white p-5 sm:p-8" id="categories"><div className="flex flex-wrap justify-between gap-2"><div><p className="text-sm text-[#196c88]">Professional Category</p><h2 className="mt-2 text-xl text-[#5e5e5e]">Categories and subcategories</h2></div><span className="text-sm text-[#196c88]">{draftMainIds.length}/5 categories</span></div>{categoryError ? <p className="mt-4 text-sm text-red-600">{categoryError}</p> : null}<div className="mt-6"><ProfileCategorySelect categories={categories} categoryIds={draftCategoryIds} mainIds={draftMainIds} onChange={(mains, subs) => { setDraftMainIds(mains); setDraftCategoryIds(subs); }} /></div><Button className="mt-4" disabled={categoriesSaving || categoriesLoading || Boolean(categoryError) || draftMainIds.length > 5} onClick={() => void saveSelectedCategories()} type="button">{categoriesSaving ? "Saving" : "Add Categories"}</Button></section>
            <section className="rounded-[7px] border border-line bg-white p-5 sm:p-8">
              <p className="text-sm text-[#196c88]">Portfolio</p>
              <h2 className="mt-2 text-xl text-[#5e5e5e]">Featured Portfolio &amp; Case Studies</h2>
              <div className="mt-5 grid gap-3">{portfolio.map((entry) => <div className="flex min-w-0 items-center justify-between gap-3 rounded-[5px] border border-line p-3" key={entry.id}><a className="min-w-0 truncate text-sm text-[#196c88] underline" href={entry.file_url} rel="noreferrer" target="_blank">{entry.title}</a><div className="flex gap-2"><button aria-label={`Edit ${entry.title}`} className="text-[#196c88]" onClick={() => { setPortfolioEditingId(entry.id); setPortfolioFileName(""); }} type="button"><Pencil size={17} /></button><button aria-label={`Remove ${entry.title}`} className="text-red-600" onClick={() => void deletePortfolio(entry.id)} type="button"><Trash2 size={17} /></button></div></div>)}</div>
              <form className="mt-5 space-y-4" key={portfolioEditingId || "new"} onSubmit={savePortfolio}>
                <TextField defaultValue={portfolio.find((entry) => entry.id === portfolioEditingId)?.title ?? ""} label="Portfolio Title" name="title" required />
                <TextAreaField defaultValue={portfolio.find((entry) => entry.id === portfolioEditingId)?.description ?? ""} label="Description (Optional)" name="description" rows={4} />
                <label className="block cursor-pointer rounded-[5px] border border-dashed border-[#b9b9b9] px-4 py-8 text-center text-sm text-[#196c88] focus-within:ring-2 focus-within:ring-[#196c88]" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (!file || !portfolioInputRef.current) return; const transfer = new DataTransfer(); transfer.items.add(file); portfolioInputRef.current.files = transfer.files; setPortfolioFileName(file.name); }}><span className="block break-all">{portfolioFileName || (portfolioEditingId ? "Replace file (optional)" : "Click to upload or drag and drop file")}</span><input accept="image/jpeg,image/png,image/webp,application/pdf" aria-label="Portfolio attachment" className="sr-only" name="file" onChange={(event) => setPortfolioFileName(event.target.files?.[0]?.name ?? "")} ref={portfolioInputRef} type="file" /><span className="mt-2 block text-[#999]">Max file size: 5 MB</span></label>
                <div className="flex gap-2"><Button disabled={portfolioSaving} type="submit">{portfolioSaving ? "Saving" : portfolioEditingId ? "Save Changes" : "Save Portfolio"}</Button>{portfolioEditingId ? <button className="text-sm text-[#196c88]" onClick={() => { setPortfolioEditingId(""); setPortfolioFileName(""); }} type="button">Cancel</button> : null}</div>
              </form>
            </section>
          </> : null}
        </div>
      ) : null}
    </AppShell>
  );
}
