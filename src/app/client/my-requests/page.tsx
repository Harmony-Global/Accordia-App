"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BriefcaseBusiness, CheckCircle2, ChevronDown, CircleX, Clock3, Eye, FileText, MapPin, MessageCircle, MoreHorizontal, ShieldCheck, UserRound, X, type LucideIcon } from "lucide-react";
import { AppShell, EmptyState } from "@/components/app-shell";
import { ChatModal } from "@/components/chat-modal";
import { ApplicationStatusPill, Button, IconButton, PageLoader, Spinner, StatusPill } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useClientJobs, useJobEngagement } from "@/hooks/use-jobs";
import type { Application, Job, JobConversation, ProfessionalProfile, ProfessionalService } from "@/types";

function PersonAvatar({ avatarUrl }: { avatarUrl?: string | null }) {
  return (
    <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-slate-100 text-brand">
      {avatarUrl ? <img alt="" className="h-full w-full object-cover" decoding="async" src={avatarUrl} /> : <UserRound size={18} />}
    </span>
  );
}

function References({ application }: { application: Application }) {
  const images = application.reference_image_urls ?? [];
  if (images.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {images.map((image, index) => (
        <img alt={`Applicant reference ${index + 1}`} className="h-20 w-24 rounded-md border border-line object-cover" decoding="async" key={image.slice(0, 48)} loading="lazy" src={image} />
      ))}
    </div>
  );
}

function getApplicantServices(application: Application): ProfessionalService[] {
  const professionalProfile = getApplicantProfile(application);
  return professionalProfile?.professional_services?.filter((service) => service.is_active) ?? [];
}

function getApplicantProfile(application: Application): ProfessionalProfile | null {
  const profiles = application.professional?.professional_profiles;
  return Array.isArray(profiles) ? profiles[0] ?? null : profiles ?? null;
}

function ProfessionalProfileModal({ application, onClose }: { application: Application; onClose: () => void }) {
  const professionalProfile = getApplicantProfile(application);
  const services = getApplicantServices(application);
  const categories = professionalProfile?.professional_categories?.map((item) => item.category).filter(Boolean) ?? [];

  return (
    <div className="fixed inset-0 z-[75] flex items-start justify-center overflow-y-auto bg-black/10 p-3 backdrop-blur-[2px] sm:p-4">
      <section className="mt-2 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[10px] border border-line bg-white p-4 shadow-xl sm:mt-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <PersonAvatar avatarUrl={application.professional?.avatar_url} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-brand">Professional profile</p>
              <h2 className="truncate text-xl font-semibold text-ink">
                {application.professional?.first_name} {application.professional?.last_name}
              </h2>
            </div>
          </div>
          <IconButton aria-label="Close professional profile" onClick={onClose} type="button" variant="ghost">
            <X size={18} />
          </IconButton>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-md border border-line bg-slate-50 p-3">
            <ShieldCheck className="text-brand" size={18} />
            <p className="mt-2 text-sm font-semibold text-ink">Verification</p>
            <p className="mt-1 text-sm text-muted">{application.professional?.phone_verified ? "Phone verified" : "Phone not verified"}</p>
          </div>
          <div className="rounded-md border border-line bg-slate-50 p-3">
            <Clock3 className="text-brand" size={18} />
            <p className="mt-2 text-sm font-semibold text-ink">Experience</p>
            <p className="mt-1 text-sm text-muted">{professionalProfile?.years_experience ?? 0} year{professionalProfile?.years_experience === 1 ? "" : "s"}</p>
          </div>
          <div className="rounded-md border border-line bg-slate-50 p-3">
            <BriefcaseBusiness className="text-brand" size={18} />
            <p className="mt-2 text-sm font-semibold text-ink">Availability</p>
            <p className="mt-1 text-sm text-muted">{professionalProfile?.is_available ? "Available" : "Not marked available"}</p>
          </div>
        </div>

        {professionalProfile?.bio ? (
          <div className="mt-5">
            <h3 className="font-semibold text-ink">Bio</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{professionalProfile.bio}</p>
          </div>
        ) : null}

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <section>
            <h3 className="font-semibold text-ink">Categories</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {categories.length > 0 ? categories.map((category) => <StatusPill key={category.id}>{category.name}</StatusPill>) : <p className="text-sm text-muted">No categories yet.</p>}
            </div>
          </section>
          <section>
            <h3 className="font-semibold text-ink">Location</h3>
            <p className="mt-2 text-sm text-muted">{[professionalProfile?.location, professionalProfile?.state].filter(Boolean).join(", ") || "Not provided"}</p>
          </section>
        </div>

        <section className="mt-5">
          <h3 className="font-semibold text-ink">Application references</h3>
          <References application={application} />
          {(application.reference_image_urls ?? []).length === 0 ? <p className="mt-2 text-sm text-muted">No references attached.</p> : null}
        </section>

        <section className="mt-5">
          <h3 className="font-semibold text-ink">Services and products</h3>
          {services.length === 0 ? <p className="mt-2 text-sm text-muted">No active offerings yet.</p> : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {services.map((service) => (
              <article className="rounded-md border border-line bg-white p-3" key={service.id}>
                <img alt={service.title} className="h-36 w-full rounded-md object-cover" decoding="async" loading="lazy" src={service.image_url} />
                <h4 className="mt-3 font-semibold text-ink">{service.title}</h4>
                <p className="mt-1 line-clamp-3 text-sm leading-6 text-muted">{service.description}</p>
                <p className="mt-2 text-sm font-semibold text-brand">
                  {service.currency} {service.price_min.toLocaleString()} - {service.price_max.toLocaleString()}
                </p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}

function jobProgress(jobStatus: string) {
  const status = jobStatus.toLowerCase();

  if (["completed", "delivered", "closed"].includes(status)) {
    return { Icon: CheckCircle2, label: "Completed", tone: "green" as const };
  }

  if (["awarded", "accepted", "assigned", "in_progress", "inprogress", "in_review"].includes(status)) {
    return { Icon: Clock3, label: "In progress", tone: "amber" as const };
  }

  if (status === "rejected") {
    return { Icon: CircleX, label: "Rejected", tone: "red" as const };
  }

  if (status === "cancelled") {
    return { Icon: X, label: "Closed", tone: "gray" as const };
  }

  return { Icon: Clock3, label: "Open", tone: "teal" as const };
}

function acceptedProfessionalCount(job: { applications?: Pick<Application, "status">[] }) {
  return job.applications?.filter((application) => ["selected", "awarded"].includes(application.status)).length ?? 0;
}

function MetricAction({
  count,
  icon: Icon,
  label,
  onClick
}: {
  count: number;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={`Open ${label.toLowerCase()}`}
      className="flex h-[56px] min-w-0 flex-1 items-center justify-center gap-2 rounded-[5px] bg-[#f8fbfc] text-center transition hover:bg-[#f2f6f8] sm:h-[64px] lg:h-[68px] lg:w-[120px] lg:flex-none lg:flex-col lg:gap-1"
      onClick={onClick}
      type="button"
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#b8d1da] text-[#196c88]">
        <Icon size={15} strokeWidth={1.5} />
      </span>
      <span className="min-w-0 text-[12px] font-medium leading-[1.5] sm:text-[13px]">
        <span className="text-[#196c88]">{count}</span>
        <span className="text-[#5e5e5e]"> {label}</span>
      </span>
    </button>
  );
}

function FigmaStatusPill({ progress }: { progress: ReturnType<typeof jobProgress> }) {
  const Icon = progress.Icon;
  const styles = {
    teal: "bg-[#f2f6f8] text-[#196c88]",
    amber: "bg-[#fffbe6] text-[#f4a422]",
    green: "bg-[#e7f6f0] text-[#0fa269]",
    red: "bg-red-50 text-red-700",
    gray: "bg-[#f1f1f1] text-[#5e5e5e]"
  };

  return (
    <span className={`inline-flex h-7 min-w-[96px] items-center justify-center gap-1.5 rounded-full px-3 text-[12px] font-medium leading-[1.5] sm:min-w-[104px] sm:text-[13px] ${styles[progress.tone]}`}>
      <Icon size={13} strokeWidth={1.8} />
      {progress.label}
    </span>
  );
}

function RequestCard({
  job,
  selected,
  onSelect
}: {
  job: Job;
  selected: boolean;
  onSelect: () => void;
}) {
  const progress = jobProgress(job.status);
  const acceptedCount = acceptedProfessionalCount(job);
  const professionalsNeeded = job.number_of_professionals || 1;

  return (
    <article
      className={`flex min-h-0 w-full items-center rounded-[10px] border-[0.5px] bg-white p-4 transition sm:p-5 lg:min-h-[210px] lg:p-6 ${selected ? "border-[#196c88] shadow-[0_2px_4px_rgba(0,0,0,0.05)]" : "border-[#b8d1da] hover:border-[#196c88]"}`}
    >
      <div className="flex w-full flex-col items-start gap-4">
        <div className="flex w-full flex-wrap items-start justify-start gap-x-3 gap-y-2 lg:min-h-[41px] lg:justify-between">
          <div className="flex max-w-full flex-wrap items-center justify-start gap-2 sm:max-w-[360px] lg:w-[280px]">
            <span className="inline-flex h-7 max-w-full items-center justify-center truncate rounded-full bg-[#f2f6f8] px-3 text-center text-[12px] font-medium leading-[1.5] text-[#196c88] sm:text-[13px]">
              {job.categories?.name ?? "General service"}
            </span>
            <FigmaStatusPill progress={progress} />
          </div>
          <p className="w-full text-left text-[12px] font-medium leading-[1.4] text-[#f4a422] sm:w-auto sm:text-[13px] lg:w-[190px]">
            {acceptedCount} of {professionalsNeeded} Professionals accepted
          </p>
        </div>

        <div className="flex w-full flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between">
          <button className="w-full text-left lg:w-[290px]" onClick={onSelect} type="button">
            <h2 className="line-clamp-2 text-[20px] font-medium leading-[1.25] text-[#5e5e5e] sm:text-[24px] lg:line-clamp-1 lg:text-[26px]">{job.title}</h2>
            <p className="mt-1.5 line-clamp-2 text-[14px] font-light leading-[1.45] text-[#5e5e5e] sm:text-[16px] lg:text-[18px]">{job.description}</p>
          </button>
          <div className="grid w-full grid-cols-2 gap-2 sm:max-w-[280px] lg:flex lg:w-auto lg:max-w-none lg:items-center lg:justify-center lg:gap-2.5">
            <MetricAction count={job.views_count} icon={Eye} label="Views" onClick={onSelect} />
            <MetricAction count={job.applications_count} icon={FileText} label="Applications" onClick={onSelect} />
          </div>
        </div>

        <span className="inline-flex items-center justify-center rounded-full bg-[#f1f1f1] px-5 py-1 text-[12px] font-medium leading-[1.5] text-[#5e5e5e] sm:text-[13px]">
          {job.is_remote ? "Remote" : "In-Person"}
        </span>
      </div>
    </article>
  );
}

function ApplicationRow({
  application,
  index,
  initiallyOpen = false,
  conversation,
  awarding,
  undoing,
  onAward,
  onUndo,
  onOpenChat,
  onViewProfile
}: {
  application: Application;
  index: number;
  initiallyOpen?: boolean;
  conversation?: JobConversation;
  awarding: boolean;
  undoing: boolean;
  onAward: (application: Application) => void;
  onUndo: (application: Application) => void;
  onOpenChat: (conversation: JobConversation) => void;
  onViewProfile: (application: Application) => void;
}) {
  const professionalProfile = getApplicantProfile(application);
  const categories = professionalProfile?.professional_categories?.map((item) => item.category).filter(Boolean) ?? [];
  const location = [professionalProfile?.location, professionalProfile?.state].filter(Boolean).join(", ");
  const [open, setOpen] = useState(initiallyOpen);
  const [moreOpen, setMoreOpen] = useState(false);
  const canAward = ["pending", "reviewed", "shortlisted"].includes(application.status);
  const canUndo = application.status === "selected";
  const busy = awarding || undoing;

  function runSelectionAction() {
    setMoreOpen(false);
    if (canUndo) {
      onUndo(application);
      return;
    }

    onAward(application);
  }

  return (
    <article className="rounded-[10px] bg-white">
      <button
        aria-expanded={open}
        className="flex h-11 w-full items-center justify-between rounded-[10px] bg-[#f1f1f1] px-5 text-left shadow-[0_2px_4px_rgba(0,0,0,0.05)] transition hover:bg-[#e8e8e8]"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="text-[13px] font-medium leading-[1.5] text-black">Applicant {index + 1}</span>
        <ChevronDown className={`shrink-0 text-[#5e5e5e] transition ${open ? "rotate-180" : ""}`} size={16} strokeWidth={1.5} />
      </button>

      {open ? (
        <div className="pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <PersonAvatar avatarUrl={application.professional?.avatar_url} />
              <div className="min-w-0">
                <h3 className="truncate text-[13px] font-medium leading-[1.5] text-[#5e5e5e] sm:text-[14px]">
                  {application.professional?.first_name} {application.professional?.last_name}
                </h3>
                <p className="text-[12px] font-light leading-[1.5] text-[#a4a4a4]">
                  {application.professional?.phone_verified ? "Phone Verified" : "Phone not Verified"}
                </p>
              </div>
            </div>
            <ApplicationStatusPill status={application.status} />
          </div>

          <div className="mt-5 flex justify-center gap-3">
            <div className="flex w-[132px] items-start justify-center gap-2 rounded-[5px] bg-[#f8fbfc] px-2.5 py-3 text-center">
              <MapPin className="mt-0.5 text-[#196c88]" size={18} strokeWidth={1.5} />
              <div>
                <p className="text-[12px] font-medium leading-[1.5] text-[#196c88] sm:text-[13px]">Location</p>
                <p className="mt-1.5 text-[12px] font-medium leading-[1.5] text-[#5e5e5e] sm:text-[13px]">{location || "Not provided"}</p>
              </div>
            </div>
            <div className="flex w-[132px] items-start justify-center gap-2 rounded-[5px] bg-[#f8fbfc] px-2.5 py-3 text-center">
              <BriefcaseBusiness className="mt-0.5 text-[#196c88]" size={18} strokeWidth={1.5} />
              <div>
                <p className="text-[12px] font-medium leading-[1.5] text-[#196c88] sm:text-[13px]">Experience</p>
                <p className="mt-1.5 text-[12px] font-medium leading-[1.5] text-[#5e5e5e] sm:text-[13px]">
                  {professionalProfile?.years_experience ?? 0} year{professionalProfile?.years_experience === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>

          {categories.length > 0 ? (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {categories.slice(0, 3).map((category) => (
                <StatusPill key={category.id}>{category.name}</StatusPill>
              ))}
              {categories.length > 3 ? <StatusPill tone="gray">+{categories.length - 3} more</StatusPill> : null}
            </div>
          ) : null}

          <div className="mt-8">
            <p className="text-[13px] font-medium leading-[1.5] text-[#5e5e5e]">Application message</p>
            <div className="mt-2.5 flex items-start gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-[#f2f6f8] text-[#196c88]">
                <MessageCircle size={15} strokeWidth={1.5} />
              </span>
              <div className="min-h-[140px] flex-1 rounded-[10px] border-[0.5px] border-[#b8d1da] bg-white p-3">
                <p className="text-[13px] font-medium leading-[1.5] text-[#5e5e5e]">{application.pitch}</p>
                <References application={application} />
              </div>
            </div>
          </div>

          {application.proposed_rate ? (
            <p className="mt-3 text-sm font-semibold text-brand">Proposed rate: NGN {application.proposed_rate.toLocaleString()}</p>
          ) : null}

          <div className="mt-6 flex items-center justify-center gap-3">
            <Button
              className="h-11 w-[96px] rounded-[5px] px-3 py-0"
              disabled={!conversation}
              onClick={() => conversation ? onOpenChat(conversation) : undefined}
              title={conversation ? "Open chat" : "Chat opens after awards are sealed"}
              type="button"
            >
              Chat
            </Button>
            <Button className="h-11 w-[104px] rounded-[5px] px-2.5 py-0 text-[12px]" onClick={() => onViewProfile(application)} type="button" variant="secondary">
              View Profile
            </Button>
            <div className="relative">
              <IconButton aria-label="More applicant actions" className="h-11 w-9 rounded-[5px]" onClick={() => setMoreOpen(true)} type="button" variant="secondary">
                <MoreHorizontal size={16} />
              </IconButton>
              {moreOpen ? (
                <>
                  <button aria-label="Close applicant actions" className="fixed inset-0 z-[71] cursor-default bg-transparent" onClick={() => setMoreOpen(false)} type="button" />
                  <div className="absolute bottom-[calc(100%+8px)] right-0 z-[72] w-[150px] rounded-[5px] border-[0.5px] border-[#b8d1da] bg-white p-2 shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
                    {canAward || canUndo ? (
                      <button
                        className="flex min-h-10 w-full items-center justify-center rounded-[5px] px-3 text-[13px] font-medium text-[#196c88] transition hover:bg-[#f2f6f8]"
                        disabled={busy}
                        onClick={runSelectionAction}
                        type="button"
                      >
                        {awarding ? "Selecting..." : null}
                        {undoing ? "Undoing..." : null}
                        {!busy && canUndo ? "Undo selection" : null}
                        {!busy && canAward ? "Select" : null}
                      </button>
                    ) : (
                      <p className="px-2 py-2 text-center text-[12px] leading-5 text-[#757575]">No action available</p>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function SelectionNotice({
  count,
  onClose
}: {
  count: number;
  onClose: () => void;
}) {
  return (
    <div className="rounded-[10px] border-b-[3px] border-[#0fa269] bg-[#f3fef3] pb-6 pl-2.5 pr-3.5 pt-2.5 shadow-[0_-2px_2px_rgba(0,0,0,0.05)]">
      <button
        aria-label="Dismiss selection notice"
        className="ml-auto grid h-6 w-6 place-items-center text-black transition hover:text-[#0fa269]"
        onClick={onClose}
        type="button"
      >
        <X size={22} strokeWidth={2} />
      </button>
      <div className="flex w-full items-center justify-center gap-4">
        <span className="grid h-[50px] w-[50px] shrink-0 place-items-center rounded-full border-2 border-[#0fa269] text-[#0fa269]">
          <CheckCircle2 size={31} strokeWidth={1.6} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-medium leading-8 text-[#5e5e5e]">
            {count} professional{count === 1 ? "" : "s"} selected
          </p>
          <p className="text-[14px] font-light leading-[1.5] text-[#5e5e5e]">Tap on the "more" option to remove applicant</p>
        </div>
      </div>
    </div>
  );
}

function JobEngagementPanel({
  jobId,
  openConversationId,
  onAwarded,
  onClose
}: {
  jobId: string | null;
  openConversationId?: string | null;
  onAwarded: () => void;
  onClose: () => void;
}) {
  const { applications, conversations, error, loading, award, undoAward, sealAwards, refresh } = useJobEngagement(jobId);
  const showToast = useToast();
  const [awardingApplicationId, setAwardingApplicationId] = useState("");
  const [undoingApplicationId, setUndoingApplicationId] = useState("");
  const [sealing, setSealing] = useState(false);
  const [sealPromptOpen, setSealPromptOpen] = useState(false);
  const [profileApplication, setProfileApplication] = useState<Application | null>(null);
  const [chatConversation, setChatConversation] = useState<JobConversation | null>(null);
  const [openedConversationId, setOpenedConversationId] = useState("");
  const [selectionNoticeOpen, setSelectionNoticeOpen] = useState(false);
  const selectedApplications = applications.filter((application) => application.status === "selected");

  useEffect(() => {
    if (error) {
      showToast({ tone: "error", title: "Could not load job activity", body: error });
    }
  }, [error, showToast]);

  useEffect(() => {
    if (!openConversationId || openedConversationId === openConversationId) return;
    const conversation = conversations.find((item) => item.id === openConversationId);
    if (!conversation) return;

    setChatConversation(conversation);
    setOpenedConversationId(openConversationId);
  }, [conversations, openConversationId, openedConversationId]);

  async function awardJob(application: Application) {
    setAwardingApplicationId(application.id);

    try {
      await award(application.id);
      setSelectionNoticeOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not select professional";
      showToast({ tone: "error", title: "Selection failed", body: message });
    } finally {
      setAwardingApplicationId("");
    }
  }

  async function undoAwardSelection(application: Application) {
    setUndoingApplicationId(application.id);

    try {
      await undoAward(application.id);
      setSelectionNoticeOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not undo award";
      showToast({ tone: "error", title: "Undo failed", body: message });
    } finally {
      setUndoingApplicationId("");
    }
  }

  async function sealSelectedAwards() {
    if (selectedApplications.length === 0) return;

    setSealing(true);

    try {
      await sealAwards();
      showToast({
        tone: "success",
        title: "Awards sealed",
        body: "Selected professionals were awarded and other applicants were notified."
      });
      refresh();
      onAwarded();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not seal awards";
      showToast({ tone: "error", title: "Seal failed", body: message });
    } finally {
      setSealing(false);
      setSealPromptOpen(false);
    }
  }

  if (!jobId) {
    return (
      <div className="rounded-[10px] border-[0.5px] border-[#b8d1da] bg-white px-6 py-5 shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
        <div className="pl-2">
          <p className="text-[13px] font-medium leading-[1.5] text-[#5e5e5e]">Job activity</p>
          <div className="mt-2 flex items-center gap-2 px-3 text-[13px] font-medium leading-[1.5] text-[#757575]">
            <FileText className="text-[#196c88]" size={16} strokeWidth={1.6} />
            Applications
          </div>
        </div>
        <div className="my-5 border-t border-dashed border-[#5ac4dd]" />
        <div className="mx-auto flex w-full max-w-[320px] items-center justify-center border-[0.5px] border-dashed border-[#a4a4a4] p-2.5 text-center text-[13px] font-medium leading-[1.5] text-[#d4d4d4]">
          <div>
            <p>No applicant selected</p>
            <p>Select “application” to view applicants</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <aside className="max-h-[calc(100vh-6rem)] overflow-y-auto rounded-[10px] border-[0.5px] border-[#b8d1da] bg-white px-6 py-6 shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="pl-2">
          <p className="text-[13px] font-medium leading-[1.5] text-[#5e5e5e]">Job activity</p>
          <div className="mt-2 flex items-center gap-2 px-3 text-[13px] font-medium leading-[1.5] text-[#757575]">
            <FileText className="text-[#196c88]" size={16} strokeWidth={1.6} />
            Applications
          </div>
        </div>
        <button
          aria-label="Close job activity"
          className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-muted shadow-sm transition hover:border-brand hover:text-brand xl:hidden"
          onClick={onClose}
          type="button"
        >
          <X size={17} />
        </button>
      </div>
      {selectedApplications.length > 0 ? (
        <div className="mt-4 rounded-md border border-amber-100 bg-amber-50 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">
                {selectedApplications.length} professional{selectedApplications.length === 1 ? "" : "s"} selected
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">Seal awards when the final list is ready.</p>
            </div>
            <Button className="w-full sm:w-auto" disabled={sealing} onClick={() => setSealPromptOpen(true)} type="button">
              {sealing ? <span className="inline-flex items-center gap-2"><Spinner className="h-6 w-6 border-[3px]" /> Sealing</span> : <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} /> Seal awards</span>}
            </Button>
          </div>
        </div>
      ) : null}
      {sealPromptOpen ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/10 p-3 backdrop-blur-[2px] sm:p-4">
          <div className="motion-panel mt-2 w-full max-w-md rounded-lg border border-line bg-white p-5 shadow-xl sm:mt-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-brand">Finalize awards</p>
                <h3 className="mt-1 text-xl font-semibold text-ink">Seal selected professionals?</h3>
              </div>
              <button
                aria-label="Close seal awards confirmation"
                className="grid h-10 w-10 place-items-center rounded-full border border-line text-muted transition hover:border-brand hover:text-brand"
                disabled={sealing}
                onClick={() => setSealPromptOpen(false)}
                type="button"
              >
                <X size={17} />
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">
              You are about to award this job to {selectedApplications.length} professional{selectedApplications.length === 1 ? "" : "s"}. This will stop new applications and notify applicants who were not selected.
            </p>
            <div className="mt-4 rounded-md bg-amber-50 p-3">
              <p className="text-sm font-semibold text-ink">Selected professionals</p>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                {selectedApplications.slice(0, 4).map((application) => (
                  <li key={application.id}>
                    {application.professional?.first_name} {application.professional?.last_name}
                  </li>
                ))}
                {selectedApplications.length > 4 ? <li>+{selectedApplications.length - 4} more</li> : null}
              </ul>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button disabled={sealing} onClick={() => setSealPromptOpen(false)} type="button" variant="secondary">
                Keep reviewing
              </Button>
              <Button disabled={sealing} onClick={sealSelectedAwards} type="button">
                {sealing ? <span className="inline-flex items-center gap-2"><Spinner className="h-6 w-6 border-[3px]" /> Sealing</span> : "Seal awards"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {profileApplication ? <ProfessionalProfileModal application={profileApplication} onClose={() => setProfileApplication(null)} /> : null}
      {chatConversation ? <ChatModal conversation={chatConversation} onClose={() => setChatConversation(null)} /> : null}
      <div className="my-5 border-t border-dashed border-[#5ac4dd]" />
      {loading ? <p className="inline-flex items-center gap-2 text-sm text-muted"><Spinner /> Loading activity</p> : null}
      {!loading ? (
        <div className="grid gap-5">
          <section>
            {applications.length === 0 ? (
              <div className="mx-auto flex w-full max-w-[320px] items-center justify-center border-[0.5px] border-dashed border-[#a4a4a4] p-2.5 text-center text-[13px] font-medium leading-[1.5] text-[#d4d4d4]">
                No applications yet
              </div>
            ) : null}
            <div className="grid gap-4">
              {applications.map((application, index) => (
                <ApplicationRow
                  application={application}
                  conversation={conversations.find((conversation) => conversation.application_id === application.id || conversation.professional_id === application.professional_id)}
                  awarding={awardingApplicationId === application.id}
                  index={index}
                  initiallyOpen={index === Math.min(1, applications.length - 1)}
                  undoing={undoingApplicationId === application.id}
                  key={application.id}
                  onAward={awardJob}
                  onOpenChat={setChatConversation}
                  onUndo={undoAwardSelection}
                  onViewProfile={setProfileApplication}
                />
              ))}
            </div>
          </section>
          {selectionNoticeOpen && selectedApplications.length > 0 ? (
            <SelectionNotice count={selectedApplications.length} onClose={() => setSelectionNoticeOpen(false)} />
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}

function ClientJobsContent() {
  const { jobs, error, loading, refresh } = useClientJobs();
  const searchParams = useSearchParams();
  const showToast = useToast();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const jobIdParam = searchParams.get("job_id");
  const conversationIdParam = searchParams.get("conversation_id");

  useEffect(() => {
    if (error) {
      showToast({ tone: "error", title: "Could not load jobs", body: error });
    }
  }, [error, showToast]);

  useEffect(() => {
    if (jobIdParam) setSelectedJobId(jobIdParam);
  }, [jobIdParam]);

  function openJobActivity(jobId: string) {
    setSelectedJobId(jobId);
    window.requestAnimationFrame(() => {
      if (window.innerWidth < 1280) return;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (loading) {
    return (
      <AppShell>
        <PageLoader />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="relative left-1/2 w-full max-w-[1180px] -translate-x-1/2">
        <div className="mb-6 mt-1 flex flex-col items-start gap-2 md:mb-8 md:gap-3 lg:mb-10">
          <h1 className="text-[14px] font-medium leading-[1.5] text-[#196c88] md:text-[18px]">My Request</h1>
          <p className="max-w-[720px] text-[18px] font-normal leading-[1.4] text-[#5e5e5e] md:text-[26px] lg:text-[32px]">View service request and application<span className="hidden md:inline">s</span></p>
        </div>
        {jobs.length === 0 ? <EmptyState title="No requests yet" body="Create your first service request and start receiving applications." /> : null}
        <div className="grid gap-4 md:gap-[18px] xl:grid-cols-[minmax(0,710px)_minmax(340px,452px)]">
          <div className="space-y-3 md:space-y-4">
            {jobs.map((job) => {
              return (
                <RequestCard job={job} key={job.id} onSelect={() => openJobActivity(job.id)} selected={selectedJobId === job.id} />
              );
            })}
          </div>
          <div
            className={`${selectedJobId ? "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/10 px-3 pb-4 pt-4 backdrop-blur-[2px] xl:static xl:z-auto xl:block xl:overflow-visible xl:bg-transparent xl:p-0 xl:backdrop-blur-none" : "hidden xl:block"}`}
          >
            <div className="w-full max-w-[452px] xl:max-w-none">
              <JobEngagementPanel jobId={selectedJobId} openConversationId={conversationIdParam} onAwarded={refresh} onClose={() => setSelectedJobId(null)} />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
export default function ClientJobsPage() {
  return (
    <Suspense fallback={<AppShell><PageLoader /></AppShell>}>
      <ClientJobsContent />
    </Suspense>
  );
}
