"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { BriefcaseBusiness, CheckCircle2, ChevronDown, Clock3, Download, Eye, File, FileImage, FileSpreadsheet, FileText, MapPin, MessagesSquare, RefreshCw, ShieldCheck, Star, X, type LucideIcon } from "lucide-react";
import { AppShell, EmptyState } from "@/components/app-shell";
import { ChatModal } from "@/components/chat-modal";
import { ApplicationStatusPill, Button, IconButton, MoreButton, PageLoader, ProfileAvatar, Spinner, StatusPill, SurfaceModal, TextAreaField } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useRequireAuth } from "@/hooks/use-auth";
import { useConversations } from "@/hooks/use-conversations";
import { useClientJobs, useJobEngagement } from "@/hooks/use-jobs";
import { confirmConversationCompletion, getConversationDeliverableAccess, makeConversationFinalPayment, requestConversationRevision, reviewConversationProfessional } from "@/services/conversation-service";
import { getApplicationAttachmentAccess, getJobApplications } from "@/services/job-service";
import { getNotifications, markNotificationRead } from "@/services/notification-service";
import type { Application, ConversationReview, Job, JobApplicationSummary, JobConversation, Notification, ProfessionalProfile, ProfessionalService, ProposalAttachment } from "@/types";

type RequestFilter = "all" | "active" | "completed" | "rejected";
type RequestTabSeenAt = Record<RequestFilter, number>;

const requestFilterLabels: Record<RequestFilter, string> = {
  all: "My Request / Applications",
  active: "Active Jobs",
  completed: "Completed",
  rejected: "Rejected"
};

const requestTabSeenStorageKey = "accordia:client-request-tab-seen-at";
const initialRequestTabSeenAt: RequestTabSeenAt = {
  all: 0,
  active: 0,
  completed: 0,
  rejected: 0
};

function PersonAvatar({ avatarUrl }: { avatarUrl?: string | null }) {
  return <ProfileAvatar avatarUrl={avatarUrl} />;
}

function RequestCategoryPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-h-[31px] items-center rounded-full bg-[#f2f6f8] px-4 text-[14px] font-medium leading-[1.45] text-[#196c88] md:px-5 md:text-[15px]">
      {children}
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
    <div className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-black/10 p-3 backdrop-blur-[2px] sm:p-4">
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

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function canPreviewAttachment(attachment: ProposalAttachment) {
  return attachment.type.startsWith("image/") || attachment.type === "application/pdf";
}

function formatProposalPrice(value?: number | null) {
  return value ? `#${value.toLocaleString()}` : "Not provided";
}

function isFixedPriceJob(job?: Pick<Job, "price_type"> | null) {
  return job?.price_type === "fixed";
}

function formatEstimatedDays(value?: number | null) {
  return value ? `${value}day${value === 1 ? "" : "s"}` : "Not provided";
}

function formatProposalDate(value?: string | null) {
  if (!value) return "Sent date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sent date unavailable";

  return `Sent on ${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} • ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function proposalState(application: Application, conversation?: JobConversation) {
  const normalizedStatus = application.status.toLowerCase();

  if (normalizedStatus === "rejected" || normalizedStatus === "not_awarded" || normalizedStatus === "withdrawn") {
    return { label: "Declined", className: "bg-red-50 text-red-600" };
  }

  if (["selected", "awarded", "hired", "in_progress", "inprogress"].includes(normalizedStatus)) {
    return { label: "Hired", className: "bg-[#e7f6f0] text-[#0fa269]" };
  }

  if (conversation || application.chat_invited_at) {
    return { label: "Invited", className: "bg-[#f2f6f8] text-[#196c88]" };
  }

  return { label: "New Proposal", className: "bg-[#f2f6f8] text-[#196c88]" };
}

function attachmentFileMeta(attachment: ProposalAttachment) {
  const type = attachment.type.toLowerCase();
  const name = attachment.name.toLowerCase();
  const extension = name.split(".").pop()?.toUpperCase();

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return { Icon: FileText, badge: "PDF", label: "PDF document", color: "#ef4444" };
  }

  if (
    type.includes("spreadsheet") ||
    type.includes("excel") ||
    type.includes("csv") ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".csv")
  ) {
    if (name.endsWith(".csv") || type.includes("csv")) {
      return { Icon: FileSpreadsheet, badge: "CSV", label: "CSV spreadsheet", color: "#16a34a" };
    }

    return { Icon: FileSpreadsheet, badge: extension === "XLS" ? "XLS" : "XLSX", label: "Excel spreadsheet", color: "#16a34a" };
  }

  if (
    type.startsWith("image/") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp")
  ) {
    const badge = extension && extension.length <= 4 ? extension : "IMG";
    return { Icon: FileImage, badge, label: `${badge} image`, color: "#f59e0b" };
  }

  return { Icon: File, badge: "FILE", label: "File attachment", color: "#196c88" };
}

function AttachmentDocumentCard({
  attachment,
  disabled,
  onDownload,
  onOpen
}: {
  attachment: ProposalAttachment;
  disabled: boolean;
  onDownload: () => void;
  onOpen?: () => void;
}) {
  const { Icon, label, color } = attachmentFileMeta(attachment);
  const content = (
    <>
      <span className="grid h-12 min-w-[58px] shrink-0 place-items-center rounded-[5px] px-2 text-white" style={{ backgroundColor: color }}>
        <Icon size={24} strokeWidth={1.9} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[16px] font-medium leading-[1.2] text-[#5e5e5e] md:text-[18px]">{attachment.name}</span>
        <span className="mt-1 block text-[14px] font-light text-[#757575] md:text-[16px]">
          {label} • {formatFileSize(attachment.size)}
        </span>
      </span>
    </>
  );

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-[6px] border border-[#b8d1da] bg-white px-3 py-3">
      {onOpen ? (
        <button className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60" disabled={disabled} onClick={onOpen} type="button">
          {content}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {content}
        </div>
      )}
      <button className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#196c88] transition hover:bg-[#f2f6f8] disabled:cursor-not-allowed disabled:opacity-50" disabled={disabled} onClick={onDownload} type="button" aria-label={`Download ${attachment.name}`}>
        <Download size={18} />
      </button>
    </div>
  );
}

function ProposalModal({
  application,
  conversation,
  inviteNoticeOpen,
  inviting,
  declining,
  onClose,
  onDecline,
  onDismissInviteNotice,
  onInvite,
  onOpenChat,
  onViewProfile
}: {
  application: Application;
  conversation?: JobConversation;
  inviteNoticeOpen: boolean;
  inviting: boolean;
  declining: boolean;
  onClose: () => void;
  onDecline: (application: Application) => void;
  onDismissInviteNotice: () => void;
  onInvite: (application: Application) => void;
  onOpenChat: (conversation: JobConversation) => void;
  onViewProfile: (application: Application) => void;
}) {
  const token = useRequireAuth();
  const showToast = useToast();
  const [preview, setPreview] = useState<{ attachment: ProposalAttachment; url: string } | null>(null);
  const [loadingAttachmentId, setLoadingAttachmentId] = useState("");
  const attachments = application.proposal_attachments ?? [];
  const references = application.reference_image_urls ?? [];
  const isDeclined = isDeclinedApplication(application.status);
  const state = proposalState(application, conversation);
  const hasInvite = Boolean(conversation || application.chat_invited_at);
  const professionalName = `${application.professional?.first_name ?? "Professional"} ${application.professional?.last_name ?? ""}`.trim();

  async function getAttachmentUrl(attachment: ProposalAttachment) {
    if (!token) throw new Error("Please log in again to access this attachment.");
    setLoadingAttachmentId(attachment.id);
    try {
      const data = await getApplicationAttachmentAccess(token, application.id, attachment.id);
      return data.signed_url;
    } finally {
      setLoadingAttachmentId("");
    }
  }

  async function previewAttachment(attachment: ProposalAttachment) {
    try {
      const url = await getAttachmentUrl(attachment);
      setPreview({ attachment, url });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not preview attachment";
      showToast({ tone: "error", title: "Preview unavailable", body: message });
    }
  }

  async function downloadAttachment(attachment: ProposalAttachment) {
    try {
      const url = await getAttachmentUrl(attachment);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.name;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.click();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not download attachment";
      showToast({ tone: "error", title: "Download failed", body: message });
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 top-16 z-[80] overflow-y-auto bg-black/25 px-3 py-5 md:top-20 md:px-6 lg:py-8">
      <section className="relative mx-auto min-h-[calc(100vh-7rem)] w-full max-w-[980px] rounded-[10px] bg-white px-4 py-6 shadow-xl sm:px-6 md:px-9 lg:px-12 lg:py-10">
        <button
          aria-label="Close proposal"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center text-black transition hover:text-[#196c88] md:right-10 md:top-8"
          onClick={onClose}
          type="button"
        >
          <X size={26} strokeWidth={2.2} />
        </button>

        <header className="pt-8 md:pt-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <PersonAvatar avatarUrl={application.professional?.avatar_url} />
              <div className="min-w-0">
                <h2 className="truncate text-[18px] font-medium leading-[1.4] text-[#5e5e5e] md:text-[21px]">Proposal by {professionalName}</h2>
                <p className="text-[15px] font-light leading-[1.4] text-[#a4a4a4] md:text-[18px]">
                  {application.professional?.phone_verified ? "Phone verified" : "Phone not verified"}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold md:text-sm ${state.className}`}>{state.label}</span>
              <p className="text-[14px] font-light leading-[1.4] text-[#a4a4a4] md:text-[17px]">{formatProposalDate(application.created_at)}</p>
            </div>
          </div>
          <div className="mt-5 border-t border-dashed border-[#757575]" />
        </header>

        <div className="mt-7 flex justify-end">
          <Button className="h-11 rounded-[5px] border-[#196c88] px-4 py-0 text-sm text-[#196c88]" onClick={() => onViewProfile(application)} type="button" variant="secondary">
            View Profile
          </Button>
        </div>

        <div className="mt-5">
          <section>
            <h3 className="text-[21px] font-medium leading-[1.4] text-[#5e5e5e] md:text-[24px]">Proposal Message</h3>
            <p className="mt-4 max-w-4xl text-[15px] font-light leading-[1.6] text-[#757575] md:text-[18px]">{application.pitch}</p>
          </section>

          <section className="mt-7 grid gap-4 rounded-[5px] border border-[#b8d1da] bg-[#fcfdfd] px-3 py-4 sm:grid-cols-2 md:px-4">
            <div>
              <p className="text-[16px] font-semibold leading-[1.4] text-[#5e5e5e] md:text-[18px]">{isFixedPriceJob(application.job) ? "Proposed Price (Fixed Price)" : "Proposed Price"}</p>
              <p className="mt-2 text-[22px] font-semibold leading-[1.2] text-[#5e5e5e] md:text-[26px]">{formatProposalPrice(application.proposed_rate)}</p>
            </div>
            <div>
              <p className="text-[16px] font-semibold leading-[1.4] text-[#5e5e5e] md:text-[18px]">Estimated Duration</p>
              <p className="mt-3 inline-flex items-center gap-2 text-[17px] font-light leading-[1.3] text-[#757575] md:text-[20px]">
                <Clock3 className="text-[#196c88]" size={18} strokeWidth={1.8} />
                {formatEstimatedDays(application.estimated_days)}
              </p>
            </div>
          </section>

          {attachments.length > 0 ? (
            <section className="mt-7 rounded-[5px] border border-[#b8d1da] px-4 py-4">
              <h3 className="text-[18px] font-medium leading-[1.4] text-[#5e5e5e] md:text-[20px]">Attached Document</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {attachments.map((attachment) => (
                  <AttachmentDocumentCard
                    attachment={attachment}
                    disabled={loadingAttachmentId === attachment.id}
                    key={attachment.id}
                    onDownload={() => downloadAttachment(attachment)}
                    onOpen={canPreviewAttachment(attachment) ? () => previewAttachment(attachment) : undefined}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {references.length > 0 ? (
            <section className="mt-7">
              <h3 className="text-[18px] font-medium leading-[1.4] text-[#5e5e5e] md:text-[20px]">Attached Portfolio projects({references.length})</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {references.map((image, index) => (
                  <article className="overflow-hidden rounded-[7px] border border-[#b8d1da] bg-white" key={image.slice(0, 48)}>
                    <img alt={`Portfolio reference ${index + 1}`} className="h-20 w-full object-cover md:h-24" src={image} />
                    <div className="p-3">
                      <h4 className="line-clamp-2 text-[14px] font-semibold leading-[1.35] text-[#5e5e5e]">Reference image {index + 1}</h4>
                      <p className="mt-2 line-clamp-2 text-[12px] font-light leading-[1.4] text-[#757575]">Supporting work sample attached to this proposal.</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {attachments.length === 0 && references.length === 0 ? (
            <section className="mt-7 rounded-[5px] border border-[#b8d1da] px-4 py-4">
              <h3 className="text-[18px] font-medium leading-[1.4] text-[#5e5e5e] md:text-[20px]">Attached Document</h3>
              <p className="mt-3 text-sm text-[#757575]">No proposal attachments were submitted.</p>
            </section>
          ) : null}

          {preview ? (
            <section className="mt-8 rounded-[10px] border border-[#b8d1da] bg-[#fcfdfd] p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold text-[#5e5e5e]">{preview.attachment.name}</p>
                <IconButton aria-label="Close attachment preview" className="h-8 w-8" onClick={() => setPreview(null)} type="button" variant="ghost">
                  <X size={15} />
                </IconButton>
              </div>
              {preview.attachment.type.startsWith("image/") ? (
                <img alt={preview.attachment.name} className="max-h-[360px] w-full rounded-md object-contain" src={preview.url} />
              ) : (
                <iframe className="h-[360px] w-full rounded-md border border-line bg-white" src={preview.url} title={preview.attachment.name} />
              )}
            </section>
          ) : null}

          <div className="mt-14 flex flex-col gap-4 sm:flex-row">
            {!isDeclined ? (
              conversation ? (
                <Button className="h-12 w-full rounded-[5px] px-6 py-0 sm:w-[118px]" onClick={() => onOpenChat(conversation)} type="button">
                  Chat
                </Button>
              ) : hasInvite ? (
                <Button className="h-12 w-full rounded-[5px] px-6 py-0 sm:w-[168px]" disabled type="button" variant="secondary">
                  Awaiting acceptance
                </Button>
              ) : (
                <Button className="h-12 w-full rounded-[5px] px-6 py-0 sm:w-[132px]" disabled={inviting} onClick={() => onInvite(application)} type="button">
                  {inviting ? <Spinner className="h-6 w-6 border-2" /> : "Invite to chat"}
                </Button>
              )
            ) : null}
            {!isDeclined ? (
              <Button className="h-12 w-full rounded-[5px] border-red-500 px-6 py-0 text-red-600 hover:bg-red-50 sm:w-[118px]" disabled={declining} onClick={() => onDecline(application)} type="button" variant="secondary">
                {declining ? "Declining..." : "Decline"}
              </Button>
            ) : (
              <div>
                <p className="text-[18px] font-semibold text-red-600">Application declined!</p>
                <p className="mt-1 text-sm text-[#a4a4a4]">This application was declined and would no longer be active</p>
              </div>
            )}
          </div>
        </div>

        {inviteNoticeOpen ? (
          <div className="fixed bottom-24 right-5 z-[90] w-[min(420px,calc(100vw-2.5rem))] rounded-[10px] border-b-[3px] border-[#196c88] bg-[#fcfdfd] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.12)] md:bottom-32">
            <button aria-label="Dismiss invite notice" className="absolute right-3 top-3 text-black transition hover:text-[#196c88]" onClick={onDismissInviteNotice} type="button">
              <X size={20} />
            </button>
            <div className="flex items-center gap-4 pr-6">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[#196c88] text-[#196c88]">
                <CheckCircle2 size={22} strokeWidth={1.8} />
              </span>
              <div>
                <p className="text-[16px] font-medium leading-[1.4] text-[#5e5e5e]">You have sent an invite to {application.professional?.first_name ?? "this professional"}</p>
                <p className="mt-1 text-sm font-light text-[#757575]">Click “Chat” to begin conversation</p>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function isDeclinedApplication(status: string) {
  return ["rejected", "not_awarded", "declined", "withdrawn"].includes(status.toLowerCase());
}

function hiredApplicationCount(applications?: Pick<Application, "status">[]) {
  return applications?.filter((application) => ["selected", "awarded", "hired", "in_progress", "inprogress"].includes(application.status.toLowerCase())).length ?? 0;
}

function isFreshApplication(application: Pick<Application, "status" | "chat_invited_at">) {
  const status = application.status.toLowerCase();
  return !application.chat_invited_at && ["pending", "reviewed", "shortlisted"].includes(status);
}

function hasInvitedApplication(applications?: Pick<Application, "status" | "chat_invited_at">[]) {
  return applications?.some((application) => Boolean(application.chat_invited_at)) ?? false;
}

function hasHiredApplication(applications?: Pick<Application, "status">[]) {
  return hiredApplicationCount(applications) > 0;
}

function allApplicationsDeclined(applications?: Pick<Application, "status">[]) {
  return Boolean(applications?.length && applications.every((application) => isDeclinedApplication(application.status)));
}

function hasFreshApplication(applications?: Pick<Application, "status" | "chat_invited_at">[]) {
  return applications?.some(isFreshApplication) ?? false;
}

function requestAvailability(job: Job) {
  const status = job.status.toLowerCase();
  const applications = job.applications ?? [];
  const professionalsNeeded = job.number_of_professionals || 1;
  const hiredCount = hiredApplicationCount(applications);

  if (
    ["awarded", "closed", "completed", "delivered", "cancelled", "rejected", "hired", "in_progress", "inprogress"].includes(status) ||
    allApplicationsDeclined(applications) ||
    hiredCount >= professionalsNeeded
  ) {
    return { Icon: Clock3, label: "Closed", tone: "red" as const };
  }

  return { Icon: Clock3, label: "Open", tone: "teal" as const };
}

function jobActivityStage(applications: Pick<Application, "status">[], conversations: JobConversation[]) {
  const hiredConversations = conversations.filter((conversation) => Boolean(conversation.upfront_payment_made_at));

  if (hiredConversations.length > 0 && hiredConversations.every((conversation) => isCompletedConversation(conversation))) {
    return { label: "Completed", className: "text-[#0fa269]" };
  }

  if (
    hiredConversations.length > 0 ||
    applications.some((application) => ["selected", "awarded", "hired", "in_progress", "inprogress"].includes(application.status.toLowerCase()))
  ) {
    return { label: "In progress", className: "text-[#f4a422]" };
  }

  if (conversations.length > 0) {
    return { label: "Not Started", className: "text-[#196c88]" };
  }

  return { label: "Not Started", className: "text-[#196c88]" };
}

function jobMatchesFilter(job: Job, filter: RequestFilter) {
  if (filter === "active" || filter === "completed" || filter === "rejected") return false;

  return true;
}

function isCompletedConversation(conversation: JobConversation) {
  return (conversation.work_status ?? "").toLowerCase() === "completed";
}

function conversationReview(conversation: JobConversation): ConversationReview | null {
  const review = conversation.review;
  return Array.isArray(review) ? review[0] ?? null : review ?? null;
}

function rejectedApplicationSummaries(job: Job) {
  return ((job.rejected_applications?.length ? job.rejected_applications : job.applications) ?? []).filter((application) => isDeclinedApplication(application.status));
}

function needsRejectedApplicationHydration(application: JobApplicationSummary) {
  return !application.professional || !application.created_at || !application.updated_at;
}

function formatCreatedDate(value?: string | null) {
  if (!value) return "Created date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Created date unavailable";

  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  const units = [
    { label: "year", seconds: 31_536_000 },
    { label: "month", seconds: 2_592_000 },
    { label: "week", seconds: 604_800 },
    { label: "day", seconds: 86_400 },
    { label: "hour", seconds: 3_600 },
    { label: "minute", seconds: 60 }
  ];
  const unit = units.find((item) => seconds >= item.seconds);

  if (!unit) return "1 second ago";

  const count = Math.floor(seconds / unit.seconds);
  return `${count} ${unit.label}${count === 1 ? "" : "s"} ago`;
}

function requestLocation(job: Job) {
  return [job.location, job.state].filter(Boolean).join(", ") || "Location not provided";
}

function profileLocation(application?: Pick<Application, "professional"> | null) {
  const professionalProfile = application ? getApplicantProfile(application as Application) : null;
  return [professionalProfile?.location, professionalProfile?.state].filter(Boolean).join(", ") || "Location not provided";
}

function profileCategories(application?: Pick<Application, "professional"> | null) {
  const professionalProfile = application ? getApplicantProfile(application as Application) : null;
  return professionalProfile?.professional_categories?.map((item) => item.category).filter(Boolean) ?? [];
}

function activeStartedDate(conversation: JobConversation) {
  return conversation.upfront_payment_made_at ?? conversation.updated_at ?? conversation.created_at;
}

function timestampValue(value?: string | null) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function latestConversationActivityAt(conversation: JobConversation) {
  return Math.max(
    timestampValue(conversation.completed_at),
    timestampValue(conversation.revision_requested_at),
    timestampValue(conversation.work_submitted_at),
    timestampValue(conversation.final_payment_made_at),
    timestampValue(conversation.upfront_payment_made_at),
    timestampValue(conversation.updated_at),
    timestampValue(conversation.created_at)
  );
}

function latestRejectedApplicationActivityAt(application: Application) {
  return Math.max(timestampValue(application.updated_at), timestampValue(application.created_at));
}

function latestJobActivityAt(job: Job) {
  const applicationActivity = (job.applications ?? []).reduce((latest, application) => Math.max(latest, timestampValue(application.updated_at), timestampValue(application.created_at)), 0);
  return Math.max(applicationActivity, timestampValue(job.updated_at), timestampValue(job.created_at));
}

function sortByLatestActivity<T>(items: T[], getActivityAt: (item: T) => number) {
  return [...items].sort((first, second) => getActivityAt(second) - getActivityAt(first));
}

function requestNotificationTab(notification: Notification): RequestFilter | null {
  const hasRequestTarget = typeof notification.data?.job_id === "string" || typeof notification.data?.application_id === "string" || typeof notification.data?.conversation_id === "string";
  if (!hasRequestTarget) return null;

  switch (notification.type) {
    case "application_received":
      return "all";
    case "professional_hired":
    case "work_submitted":
    case "final_payment_made":
    case "revision_requested":
    case "conversation_message":
      return "active";
    case "job_completed":
      return "completed";
    case "application_rejected":
      return "rejected";
    default:
      return null;
  }
}

function loadRequestTabSeenAt(): RequestTabSeenAt {
  if (typeof window === "undefined") return initialRequestTabSeenAt;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(requestTabSeenStorageKey) ?? "{}") as Partial<RequestTabSeenAt>;
    return {
      all: Number(parsed.all) || 0,
      active: Number(parsed.active) || 0,
      completed: Number(parsed.completed) || 0,
      rejected: Number(parsed.rejected) || 0
    };
  } catch {
    return initialRequestTabSeenAt;
  }
}

function saveRequestTabSeenAt(value: RequestTabSeenAt) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(requestTabSeenStorageKey, JSON.stringify(value));
}

function expectedCompletionDate(conversation: JobConversation) {
  const startedAt = activeStartedDate(conversation);
  const days = conversation.application?.estimated_days;
  if (!startedAt || !days) return null;

  const date = new Date(startedAt);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function formatDisplayDate(value?: string | null) {
  if (!value) return "Not available yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available yet";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatMoney(value?: number | null, currency = "#") {
  if (!value) return "Not provided";
  return `${currency}${value.toLocaleString()}`;
}

function applicationFromConversation(conversation: JobConversation): Application {
  return {
    id: conversation.application_id,
    job_id: conversation.job_id,
    professional_id: conversation.professional_id,
    pitch: conversation.application?.pitch ?? "",
    proposed_rate: conversation.application?.proposed_rate ?? null,
    estimated_days: conversation.application?.estimated_days ?? null,
    reference_image_urls: conversation.application?.reference_image_urls ?? [],
    proposal_attachments: conversation.application?.proposal_attachments ?? [],
    chat_invited_at: null,
    chat_invited_by: null,
    status: conversation.application?.status ?? "selected",
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    job: conversation.job as Job | undefined,
    professional: conversation.professional
  };
}

function applicationFromSummary(application: JobApplicationSummary, job: Job): Application {
  return {
    id: application.id,
    job_id: application.job_id,
    professional_id: application.professional_id,
    pitch: "",
    proposed_rate: application.proposed_rate ?? null,
    estimated_days: null,
    reference_image_urls: [],
    proposal_attachments: [],
    chat_invited_at: application.chat_invited_at,
    chat_invited_by: null,
    status: application.status,
    created_at: application.created_at,
    updated_at: application.updated_at,
    job,
    professional: application.professional
  };
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

function FigmaStatusPill({ onClick, progress }: { onClick?: () => void; progress: ReturnType<typeof requestAvailability> }) {
  const Icon = progress.Icon;
  const styles = {
    teal: "bg-[#f2f6f8] text-[#196c88]",
    amber: "bg-[#fffbe6] text-[#f4a422]",
    green: "bg-[#e7f6f0] text-[#0fa269]",
    red: "bg-red-50 text-red-700",
    gray: "bg-[#f1f1f1] text-[#5e5e5e]"
  };

  if (onClick) {
    return (
      <button
        className={`inline-flex h-7 min-w-[96px] items-center justify-center gap-1.5 rounded-full px-3 text-[12px] font-medium leading-[1.5] transition hover:ring-2 hover:ring-[#b8d1da] sm:min-w-[104px] sm:text-[13px] ${styles[progress.tone]}`}
        onClick={onClick}
        type="button"
      >
        <Icon size={13} strokeWidth={1.8} />
        {progress.label}
      </button>
    );
  }

  return (
    <span className={`inline-flex h-7 min-w-[96px] items-center justify-center gap-1.5 rounded-full px-3 text-[12px] font-medium leading-[1.5] sm:min-w-[104px] sm:text-[13px] ${styles[progress.tone]}`}>
      <Icon size={13} strokeWidth={1.8} />
      {progress.label}
    </span>
  );
}

function RequestCard({
  closeActionOpen,
  job,
  selected,
  closing,
  onCloseRequest,
  onToggleCloseAction,
  onSelect
}: {
  closeActionOpen: boolean;
  job: Job;
  selected: boolean;
  closing: boolean;
  onCloseRequest: () => void;
  onToggleCloseAction: () => void;
  onSelect: () => void;
}) {
  const progress = requestAvailability(job);
  const canClose = progress.label === "Open";
  const acceptedCount = acceptedProfessionalCount(job);
  const professionalsNeeded = job.number_of_professionals || 1;
  const categoryName = job.categories?.name ?? job.category?.name ?? "General service";

  return (
    <article
      className={`flex min-h-0 w-full items-center rounded-[10px] border-[0.5px] bg-white p-4 transition sm:p-5 lg:p-6 ${selected ? "border-[#196c88] shadow-[0_2px_4px_rgba(0,0,0,0.05)]" : "border-[#b8d1da] hover:border-[#196c88]"}`}
    >
      <div className="flex w-full flex-col items-start gap-4">
        <div className="flex w-full flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="flex max-w-full flex-wrap items-center justify-start gap-2 sm:max-w-[360px] lg:w-[280px]">
            <span className="inline-flex h-7 max-w-full items-center justify-center truncate rounded-full bg-[#f2f6f8] px-3 text-center text-[12px] font-medium leading-[1.5] text-[#196c88] sm:text-[13px]">
              {categoryName}
            </span>
            <FigmaStatusPill onClick={canClose ? onToggleCloseAction : undefined} progress={progress} />
            {canClose && closeActionOpen ? (
              <button
                className="inline-flex h-7 min-w-[76px] items-center justify-center rounded-full border border-red-200 bg-red-50 px-3 text-[12px] font-medium leading-[1.5] text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 sm:text-[13px]"
                disabled={closing}
                onClick={onCloseRequest}
                type="button"
              >
                {closing ? <Spinner className="h-3.5 w-3.5 border-2" /> : "Close"}
              </button>
            ) : null}
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

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-[12px] font-medium leading-[1.5] text-[#5e5e5e] sm:text-[13px]">{requestLocation(job)}</p>
          <span className="inline-flex w-fit shrink-0 items-center justify-center rounded-full bg-[#f9f9f9] px-5 py-1 text-[12px] font-medium leading-[1.5] text-[#5e5e5e] sm:text-[13px]">
            {job.is_remote ? "Remote" : "In-person"}
          </span>
        </div>
        <p className="text-[12px] font-medium leading-[1.5] text-[#196c88] sm:text-[13px]">{formatCreatedDate(job.created_at)}</p>
      </div>
    </article>
  );
}

function RequestCardSkeleton() {
  return (
    <article className="w-full rounded-[10px] border-[0.5px] border-[#dbe9ed] bg-white p-4 sm:p-5 lg:p-6">
      <div className="animate-pulse">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex gap-2">
            <div className="h-7 w-32 rounded-full bg-[#edf4f6]" />
            <div className="h-7 w-28 rounded-full bg-[#edf4f6]" />
          </div>
          <div className="h-4 w-40 rounded bg-[#edf4f6]" />
        </div>
        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:w-[290px]">
            <div className="h-8 w-48 rounded bg-[#e8eef1]" />
            <div className="mt-3 h-5 w-full max-w-[360px] rounded bg-[#edf4f6]" />
            <div className="mt-2 h-5 w-3/4 rounded bg-[#edf4f6]" />
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:max-w-[280px] lg:w-auto">
            <div className="h-14 rounded-[5px] bg-[#f3f7f8] sm:h-16" />
            <div className="h-14 rounded-[5px] bg-[#f3f7f8] sm:h-16" />
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-4 w-36 rounded bg-[#edf4f6]" />
          <div className="h-7 w-24 rounded-full bg-[#edf4f6]" />
        </div>
        <div className="mt-4 h-4 w-24 rounded bg-[#edf4f6]" />
      </div>
    </article>
  );
}

function ProgressStep({
  index,
  label,
  tone = "green",
  helper
}: {
  index: number;
  label: string;
  tone?: "green" | "amber" | "gray";
  helper?: string;
}) {
  const toneClasses = {
    green: "bg-[#0fa269] text-white",
    amber: "bg-[#f4a422] text-white",
    gray: "bg-[#e8e8e8] text-white"
  };
  const labelClass = tone === "green" && label === "Completed" ? "text-[#0fa269]" : "text-[#5e5e5e]";

  return (
    <div className="relative flex min-h-[72px] gap-5">
      <span className={`z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full text-[16px] font-semibold ${toneClasses[tone]}`}>
        {index}
      </span>
      <div className="pb-5">
        <p className={`text-[14px] font-medium leading-[1.5] ${labelClass}`}>{label}</p>
        {helper ? <p className="mt-1 text-[13px] font-light leading-[1.5] text-[#a4a4a4]">{helper}</p> : null}
      </div>
    </div>
  );
}

function activeWorkState(conversation: JobConversation) {
  const status = (conversation.work_status ?? "in_progress").toLowerCase();
  if (status === "completed") return { label: "Completed", colorClass: "text-[#0fa269]" };
  if (status === "revision_requested") return { label: "Revision", colorClass: "text-[#f4a422]" };
  return { label: "In progress", colorClass: "text-[#f4a422]" };
}

function hasSubmittedWork(conversation: JobConversation) {
  return ["submitted", "revision_requested", "completed"].includes((conversation.work_status ?? "").toLowerCase());
}

function finalPaymentAmount(conversation: JobConversation) {
  const rate = conversation.application?.proposed_rate ?? 0;
  return rate > 0 ? Math.round(rate / 2) : null;
}

function RatingPrompt({
  conversation,
  onReviewed
}: {
  conversation: JobConversation;
  onReviewed: (status: "submitted" | "skipped") => void;
}) {
  const token = useRequireAuth();
  const showToast = useToast();
  const professionalName = conversation.professional?.first_name ?? "this professional";
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function saveReview(skipped: boolean) {
    if (!token) {
      showToast({ tone: "error", title: "Session expired", body: "Please log in again to submit your review." });
      return;
    }

    if (!skipped && rating === 0) {
      showToast({ tone: "error", title: "Rating required", body: "Select a star rating or skip this review." });
      return;
    }

    setSubmitting(true);
    try {
      await reviewConversationProfessional(token, conversation.id, {
        rating: skipped ? null : rating,
        review_text: skipped ? null : reviewText.trim() || null,
        skipped
      });
      onReviewed(skipped ? "skipped" : "submitted");
      showToast({
        tone: "success",
        title: skipped ? "Review skipped" : "Review submitted",
        body: skipped ? "You can continue managing completed jobs." : "Thanks for rating the professional service."
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save review";
      showToast({ tone: "error", title: "Review failed", body: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto mt-7 w-full max-w-[330px] overflow-hidden rounded-[5px] border border-[#f4a422] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
      <div className="bg-[#fff8d7] px-4 py-3 text-center">
        <h4 className="text-[16px] font-medium leading-[1.4] text-[#196c88]">Rate your Experience</h4>
      </div>
      <div className="px-5 py-4 text-center">
        <p className="text-[13px] font-light leading-[1.5] text-[#5e5e5e]">How was your experience with {professionalName}?</p>
        <div className="mt-3 flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              aria-label={`Rate ${value} star${value === 1 ? "" : "s"}`}
              className="grid h-8 w-8 place-items-center text-[#f4a422] transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              key={value}
              onClick={() => setRating(value)}
              type="button"
            >
              <Star className={value <= rating ? "fill-current" : "fill-[#eeeeee] text-[#eeeeee]"} size={29} strokeWidth={0} />
            </button>
          ))}
        </div>
        <textarea
          className="mt-3 min-h-[72px] w-full resize-none rounded-[4px] border border-[#d5e4e9] px-3 py-2 text-[12px] text-[#5e5e5e] outline-none transition placeholder:text-[#b7b7b7] focus:border-[#196c88] focus:ring-2 focus:ring-[#196c88]/10"
          disabled={submitting}
          maxLength={2000}
          onChange={(event) => setReviewText(event.target.value)}
          placeholder="Review(Optional)"
          value={reviewText}
        />
        <Button
          className="mt-3 h-9 w-full rounded-[5px] py-0 text-[13px]"
          disabled={submitting || rating === 0}
          onClick={() => saveReview(false)}
          type="button"
        >
          {submitting ? <span className="inline-flex items-center gap-2"><Spinner /> Submitting</span> : "Submit"}
        </Button>
      </div>
      <button
        className="w-full bg-[#fff8d7] px-4 py-3 text-center text-[14px] font-medium text-[#196c88] transition hover:bg-[#fff2bd] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={submitting}
        onClick={() => saveReview(true)}
        type="button"
      >
        Skip
      </button>
    </div>
  );
}

function ActiveEngagementCard({
  conversation,
  job,
  onChanged,
  onOpenChat,
  onViewProfile
}: {
  conversation: JobConversation;
  job?: Job;
  onChanged: () => void;
  onOpenChat: (conversation: JobConversation) => void;
  onViewProfile: (application: Application) => void;
}) {
  const token = useRequireAuth();
  const showToast = useToast();
  const application = applicationFromConversation(conversation);
  const categories = profileCategories(application);
  const startedAt = activeStartedDate(conversation);
  const expectedAt = expectedCompletionDate(conversation);
  const isRemote = job?.is_remote ?? conversation.job?.is_remote ?? false;
  const workType = isRemote ? "Remote" : "In-person";
  const agreedPrice = conversation.application?.proposed_rate ?? application.proposed_rate;
  const workState = activeWorkState(conversation);
  const normalizedWorkStatus = (conversation.work_status ?? "in_progress").toLowerCase();
  const deliverables = conversation.deliverables ?? [];
  const finalPaid = Boolean(conversation.final_payment_made_at);
  const canReviewDeliverables = finalPaid;
  const canMakeFinalPayment = hasSubmittedWork(conversation) && !finalPaid;
  const canDecideCompletion = finalPaid && (conversation.work_status === "submitted" || conversation.work_status === "revision_requested");
  const completed = isCompletedConversation(conversation);
  const savedReview = conversationReview(conversation);
  const [busyAction, setBusyAction] = useState("");
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [loadingDeliverableId, setLoadingDeliverableId] = useState("");
  const [localReviewStatus, setLocalReviewStatus] = useState<"submitted" | "skipped" | null>(null);
  const reviewSubmitted = Boolean(savedReview && !savedReview.skipped) || localReviewStatus === "submitted";
  const reviewHandled = Boolean(savedReview) || Boolean(localReviewStatus);

  useEffect(() => {
    setLocalReviewStatus(null);
  }, [conversation.id]);

  async function runAction(action: string, handler: () => Promise<void>) {
    if (!token) {
      showToast({ tone: "error", title: "Session expired", body: "Please log in again to continue." });
      return;
    }

    setBusyAction(action);
    try {
      await handler();
      onChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not complete that action";
      showToast({ tone: "error", title: "Action failed", body: message });
    } finally {
      setBusyAction("");
    }
  }

  async function viewDeliverable(attachment: ProposalAttachment) {
    if (!token) {
      showToast({ tone: "error", title: "Session expired", body: "Please log in again to view deliverables." });
      return;
    }

    setLoadingDeliverableId(attachment.id);
    try {
      const data = await getConversationDeliverableAccess(token, conversation.id, attachment.id);
      window.open(data.signed_url, "_blank", "noopener,noreferrer");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not open deliverable";
      showToast({ tone: "error", title: "Deliverable unavailable", body: message });
    } finally {
      setLoadingDeliverableId("");
    }
  }

  async function submitRevision() {
    if (revisionNote.trim().length < 10) {
      showToast({ tone: "error", title: "Revision note needed", body: "Describe what needs to be changed before sending." });
      return;
    }

    await runAction("revision", async () => {
      await requestConversationRevision(token!, conversation.id, revisionNote.trim());
      setRevisionOpen(false);
      setRevisionNote("");
      showToast({ tone: "success", title: "Revision request sent", body: "The professional has been notified." });
    });
  }

  return (
    <article className="rounded-[10px] border-[0.5px] border-[#b8d1da] bg-white p-4 sm:p-6 lg:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <PersonAvatar avatarUrl={conversation.professional?.avatar_url} />
          <div className="min-w-0">
            <h2 className="text-[15px] font-medium leading-[1.5] text-[#5e5e5e]">
              {conversation.professional?.first_name} {conversation.professional?.last_name}
            </h2>
            <p className="mt-1 inline-flex items-center gap-1 text-[13px] text-[#5e5e5e]">
              <MapPin size={15} className="text-[#196c88]" />
              {profileLocation(application)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 text-[14px] font-medium leading-[1.5] lg:ml-auto lg:min-w-[280px]">
          <div className="grid grid-cols-[20px_minmax(0,1fr)] items-center gap-2 text-[#196c88]">
            <BriefcaseBusiness size={17} />
            <p>Work: <span className={workState.colorClass}>{workState.label}</span></p>
          </div>
          <div className="grid grid-cols-[20px_minmax(0,1fr)] items-center gap-2 text-[#196c88]">
            <Clock3 size={17} />
            <p>Started: <span className="font-light text-[#a4a4a4]">{formatDisplayDate(startedAt)}</span></p>
          </div>
        </div>
      </div>

      {categories.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-3">
          {categories.slice(0, 6).map((category) => <RequestCategoryPill key={category.id}>{category.name}</RequestCategoryPill>)}
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 text-[14px] leading-[1.5] sm:grid-cols-3">
        <div>
          <p className="font-medium text-[#5e5e5e]">Work type</p>
          <p className="mt-2 font-light text-[#a4a4a4]">{workType}</p>
        </div>
        <div>
          <p className="font-medium text-[#5e5e5e]">Date Started</p>
          <p className="mt-2 font-light text-[#a4a4a4]">{formatDisplayDate(startedAt)}</p>
        </div>
        <div>
          <p className="font-medium text-[#5e5e5e]">Expected Completion Date</p>
          <p className="mt-2 font-light text-[#a4a4a4]">{formatDisplayDate(expectedAt)}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button className="h-11 min-w-[132px] rounded-[5px] px-5 py-0" onClick={() => onOpenChat(conversation)} type="button">
          Chat
        </Button>
        <Button className="h-11 min-w-[132px] rounded-[5px] border-[#196c88] px-5 py-0 text-[#196c88]" onClick={() => onViewProfile(application)} type="button" variant="secondary">
          View Profile
        </Button>
        {reviewSubmitted ? (
          <span className="inline-flex h-11 items-center gap-2 text-[13px] font-medium text-[#b8d1da]">
            <Star className="fill-[#f4a422] text-[#f4a422]" size={18} strokeWidth={0} />
            Rated
          </span>
        ) : null}
        <MoreButton aria-label="More active job actions" />
      </div>

      <section className="mt-7 grid gap-8 rounded-[8px] border border-[#b8d1da] p-4 sm:p-6 lg:grid-cols-2">
        <div>
          <h3 className="text-[22px] font-medium leading-[1.3] text-[#5e5e5e] sm:text-[26px]">Job Details</h3>
          <div className="mt-7 space-y-4">
            <div>
              <p className="text-[15px] font-medium text-[#5e5e5e]">Job Description</p>
              <p className="mt-2 text-[14px] font-light leading-6 text-[#a4a4a4]">{job?.description ?? conversation.application?.pitch ?? "No description available"}</p>
            </div>
            <p className="text-[15px] text-[#5e5e5e]">
              Number of professionals Hired: <span className="ml-3 text-[20px] font-medium text-[#196c88]">1</span>
            </p>
            <p className="text-[15px] text-[#5e5e5e]">
              Agreed Price: <span className="ml-3 text-[20px] font-medium text-[#196c88]">{formatMoney(agreedPrice, job?.currency ?? "#")}</span>
            </p>
          </div>
        </div>
        <div>
          <h3 className="text-[22px] font-medium leading-[1.3] text-[#5e5e5e] sm:text-[26px]">Job Progress</h3>
          <div className="relative mt-7">
            <span className="absolute left-[18px] top-4 h-[150px] w-px bg-[#5e5e5e]" />
            <ProgressStep
              index={1}
              label="In progress"
              helper={`Started on ${formatDisplayDate(startedAt)}`}
              tone={normalizedWorkStatus === "in_progress" || normalizedWorkStatus === "submitted" ? "amber" : "green"}
            />
            <ProgressStep
              index={2}
              label={conversation.revision_requested_at ? "Revision" : "Revision  (No request made)"}
              helper={conversation.revision_requested_at ? `Revision received on ${formatDisplayDate(conversation.revision_requested_at)}` : undefined}
              tone={conversation.revision_requested_at ? "green" : "gray"}
            />
            <ProgressStep
              index={3}
              label="Completed"
              helper={conversation.completed_at ? `Completed on ${formatDisplayDate(conversation.completed_at)}` : undefined}
              tone={normalizedWorkStatus === "completed" ? "green" : "gray"}
            />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-8 rounded-[8px] border border-[#b8d1da] p-4 sm:p-6 lg:grid-cols-2">
        <div>
          <h3 className="text-[22px] font-medium leading-[1.3] text-[#5e5e5e] sm:text-[26px]">Deliverables</h3>
          {deliverables.length === 0 ? (
            <p className="mt-5 text-[14px] text-[#5e5e5e]">No files submitted yet</p>
          ) : !canReviewDeliverables ? (
            <p className="mt-5 text-[14px] text-[#5e5e5e]">Deliverables will be available after final payment.</p>
          ) : (
            <div className="mt-5 grid gap-3">
              {deliverables.map((deliverable) => (
                <AttachmentDocumentCard
                  attachment={deliverable}
                  disabled={loadingDeliverableId === deliverable.id}
                  key={deliverable.id}
                  onDownload={() => viewDeliverable(deliverable)}
                  onOpen={() => viewDeliverable(deliverable)}
                />
              ))}
            </div>
          )}
        </div>
        <div>
          <h3 className="text-[22px] font-medium leading-[1.3] text-[#5e5e5e] sm:text-[26px]">Payment</h3>
          <div className="mt-5 space-y-4 text-[15px] text-[#5e5e5e]">
            <p>
              Upfront Payment: <span className="ml-3 text-[18px] font-medium text-[#0fa269]">Payment made</span>
            </p>
            <p>
              Remaining Payment:{" "}
              <span className={`ml-3 text-[18px] font-medium ${finalPaid ? "text-[#0fa269]" : "text-[#f4a422]"}`}>
                {finalPaymentAmount(conversation) ? formatMoney(finalPaymentAmount(conversation), job?.currency ?? "#") : "Pending"}
              </span>
              <span className={`ml-2 text-[13px] ${finalPaid ? "text-[#0fa269]" : "text-[#f4a422]"}`}>
                {finalPaid ? "Payment made" : "Released after job confirmation"}
              </span>
            </p>
          </div>
        </div>
      </section>
      {canMakeFinalPayment ? (
        <div className="ml-auto mt-6 max-w-[640px] rounded-[8px] border border-[#b8d1da] bg-[#fffbe8] p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[#f4a422] text-[#f4a422]">!</span>
              <div>
                <p className="text-[16px] font-medium text-[#5e5e5e]">
                  {conversation.professional?.first_name ?? "The professional"} has marked this service as completed. Make full payment for this service
                </p>
                <p className="mt-1 text-[13px] text-[#757575]">Accordia securely holds your payment until you confirm satisfactory completion of job</p>
              </div>
            </div>
            <Button
              className="h-11 rounded-[5px] px-5 py-0"
              disabled={busyAction === "payment"}
              onClick={() => runAction("payment", async () => {
                await makeConversationFinalPayment(token!, conversation.id);
                showToast({ tone: "success", title: "Payment Successfully made", body: "Your deliverables are ready." });
              })}
              type="button"
            >
              {busyAction === "payment" ? <span className="inline-flex items-center gap-2"><Spinner /> Paying</span> : "Make Full Payment"}
            </Button>
          </div>
        </div>
      ) : null}
      {canDecideCompletion ? (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            className="h-11 rounded-[5px] px-5 py-0"
            disabled={busyAction === "complete"}
            onClick={() => runAction("complete", async () => {
              await confirmConversationCompletion(token!, conversation.id);
              showToast({ tone: "success", title: "Request completed", body: "This service has been marked as completed." });
            })}
            type="button"
          >
            {busyAction === "complete" ? <span className="inline-flex items-center gap-2"><Spinner /> Confirming</span> : "Confirm Completion"}
          </Button>
          <Button className="h-11 rounded-[5px] border-[#196c88] px-5 py-0 text-[#196c88]" onClick={() => setRevisionOpen(true)} type="button" variant="secondary">
            Request revision
          </Button>
        </div>
      ) : null}
      {revisionOpen ? (
        <div className="mt-6 rounded-[8px] border border-[#b8d1da] bg-white p-4">
          <TextAreaField
            label="Revision details"
            onChange={(event) => setRevisionNote(event.target.value)}
            placeholder="Describe what needs to be revised clearly..."
            rows={4}
            value={revisionNote}
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <Button disabled={busyAction === "revision"} onClick={submitRevision} type="button">
              {busyAction === "revision" ? <span className="inline-flex items-center gap-2"><Spinner /> Sending</span> : "Send Request"}
            </Button>
            <Button onClick={() => setRevisionOpen(false)} type="button" variant="secondary">Cancel</Button>
          </div>
          <p className="mt-4 text-center text-[14px] font-medium text-[#196c88]">Payments will remain securely held until the requested revisions are completed</p>
        </div>
      ) : null}
      {completed && !reviewHandled ? (
        <>
          <div className="mt-6 max-w-[560px] rounded-[8px] border border-[#f4a422]/40 bg-[#fffbe8] p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[#f4a422] text-[22px] font-semibold text-[#f4a422]">!</span>
              <div>
                <p className="text-[16px] font-medium text-[#5e5e5e]">Service has been marked completed from your end</p>
                <p className="mt-1 text-[13px] text-[#757575]">Rate professional&apos;s service and your experience</p>
              </div>
            </div>
          </div>
          <RatingPrompt
            conversation={conversation}
            onReviewed={(status) => {
              setLocalReviewStatus(status);
              onChanged();
            }}
          />
        </>
      ) : null}
      {reviewSubmitted ? (
        <div className="mt-7 flex items-center justify-center gap-3 text-[15px] font-medium text-[#5e5e5e]">
          <CheckCircle2 className="text-[#0fa269]" size={26} strokeWidth={1.8} />
          Review Submitted
        </div>
      ) : null}
    </article>
  );
}

function RejectedApplicantCard({
  application,
  job,
  onViewProfile
}: {
  application: JobApplicationSummary;
  job: Job;
  onViewProfile: (application: Application) => void;
}) {
  const fullApplication = applicationFromSummary(application, job);
  const categories = profileCategories(fullApplication);

  return (
    <article className="rounded-[10px] border-[0.5px] border-[#b8d1da] bg-white p-4 sm:p-6 lg:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <PersonAvatar avatarUrl={application.professional?.avatar_url} />
          <div className="min-w-0">
            <h2 className="text-[15px] font-medium leading-[1.5] text-[#5e5e5e]">
              {application.professional?.first_name} {application.professional?.last_name}
            </h2>
            <p className="mt-1 inline-flex items-center gap-1 text-[13px] text-[#5e5e5e]">
              <MapPin size={15} className="text-[#196c88]" />
              {profileLocation(fullApplication)}
            </p>
          </div>
        </div>
        <p className="inline-flex items-center gap-2 text-[14px] font-medium text-[#196c88]">
          <BriefcaseBusiness size={17} />
          Application: <span className="text-red-600">Declined</span>
        </p>
      </div>

      {categories.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-3">
          {categories.slice(0, 6).map((category) => <RequestCategoryPill key={category.id}>{category.name}</RequestCategoryPill>)}
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 text-[14px] leading-[1.5] sm:grid-cols-3">
        <div>
          <p className="font-medium text-[#5e5e5e]">Work type</p>
          <p className="mt-2 font-light text-[#a4a4a4]">{job.is_remote ? "Remote" : "In-person"}</p>
        </div>
        <div>
          <p className="font-medium text-[#5e5e5e]">Date applied</p>
          <p className="mt-2 font-light text-[#a4a4a4]">{formatDisplayDate(application.created_at)}</p>
        </div>
        <div>
          <p className="font-medium text-[#5e5e5e]">Date Declined</p>
          <p className="mt-2 font-light text-[#a4a4a4]">{formatDisplayDate(application.updated_at)}</p>
        </div>
      </div>

      <div className="mt-7">
        <Button className="h-11 min-w-[132px] rounded-[5px] border-[#196c88] px-5 py-0 text-[#196c88]" onClick={() => onViewProfile(fullApplication)} type="button" variant="secondary">
          View Profile
        </Button>
      </div>
    </article>
  );
}

function ApplicationRow({
  application,
  index,
  initiallyOpen = false,
  conversation,
  onOpenChat,
  onReviewProposal,
  onViewProfile
}: {
  application: Application;
  index: number;
  initiallyOpen?: boolean;
  conversation?: JobConversation;
  onOpenChat: (conversation: JobConversation) => void;
  onReviewProposal: (application: Application) => void;
  onViewProfile: (application: Application) => void;
}) {
  const professionalProfile = getApplicantProfile(application);
  const categories = professionalProfile?.professional_categories?.map((item) => item.category).filter(Boolean) ?? [];
  const location = [professionalProfile?.location, professionalProfile?.state].filter(Boolean).join(", ");
  const [open, setOpen] = useState(initiallyOpen);
  const [moreOpen, setMoreOpen] = useState(false);
  const isDeclined = isDeclinedApplication(application.status);
  const isHired = ["selected", "awarded", "hired", "in_progress", "inprogress"].includes(application.status.toLowerCase());
  const hasInvite = Boolean(conversation || application.chat_invited_at);
  const status = !isDeclined && !isHired && hasInvite ? "invited" : application.status;

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
            <div className="flex shrink-0 flex-col items-end gap-4">
              {conversation && !isDeclined ? (
                <button
                  aria-label={`Open chat with ${application.professional?.first_name ?? "applicant"}`}
                  className="grid h-8 w-8 place-items-center rounded-full text-[#196c88] transition hover:bg-[#f2f6f8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#196c88]"
                  onClick={() => onOpenChat(conversation)}
                  type="button"
                >
                  <MessagesSquare size={18} strokeWidth={1.7} />
                </button>
              ) : null}
              <ApplicationStatusPill status={status} />
            </div>
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

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {!isDeclined ? (
              <Button
                className="h-11 min-w-[148px] rounded-[5px] px-4 py-0 text-[13px] whitespace-nowrap"
                onClick={() => onReviewProposal(application)}
                type="button"
              >
                {hasInvite ? "View Proposal" : "Review Proposal"}
              </Button>
            ) : null}
            <Button className="h-11 min-w-[124px] rounded-[5px] border-[#196c88] px-4 py-0 text-[13px] whitespace-nowrap text-[#196c88]" onClick={() => onViewProfile(application)} type="button" variant="secondary">
              View Profile
            </Button>
            <div className="relative">
              <MoreButton aria-label="More applicant actions" onClick={() => setMoreOpen(true)} />
              {moreOpen ? (
                <>
                  <button aria-label="Close applicant actions" className="fixed inset-0 z-[71] cursor-default bg-transparent" onClick={() => setMoreOpen(false)} type="button" />
                  <div className="absolute bottom-[calc(100%+8px)] right-0 z-[72] w-[150px] rounded-[5px] border-[0.5px] border-[#b8d1da] bg-white p-2 shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
                    <p className="px-2 py-2 text-center text-[12px] leading-5 text-[#757575]">No action available</p>
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

function JobEngagementPanel({
  job,
  jobId,
  openConversationId,
  onChanged,
  onClose
}: {
  job?: Job | null;
  jobId: string | null;
  openConversationId?: string | null;
  onChanged?: () => void;
  onClose: () => void;
}) {
  const { applications, conversations, error, loading, refresh, inviteToChat, decline } = useJobEngagement(jobId);
  const showToast = useToast();
  const [profileApplication, setProfileApplication] = useState<Application | null>(null);
  const [proposalApplication, setProposalApplication] = useState<Application | null>(null);
  const [chatConversation, setChatConversation] = useState<JobConversation | null>(null);
  const [invitingApplicationId, setInvitingApplicationId] = useState("");
  const [decliningApplicationId, setDecliningApplicationId] = useState("");
  const [inviteNoticeApplicationId, setInviteNoticeApplicationId] = useState("");
  const [openedConversationId, setOpenedConversationId] = useState("");
  const activityStage = jobActivityStage(applications, conversations);

  function withSelectedJob(conversation: JobConversation) {
    if (!job) return conversation;

    return {
      ...conversation,
      job: {
        ...(conversation.job ?? {}),
        id: conversation.job?.id ?? job.id,
        title: conversation.job?.title ?? job.title,
        status: conversation.job?.status ?? job.status,
        category: conversation.job?.category ?? job.category,
        is_remote: job.is_remote,
        description: conversation.job?.description ?? job.description,
        number_of_professionals: conversation.job?.number_of_professionals ?? job.number_of_professionals,
        location: conversation.job?.location ?? job.location,
        state: conversation.job?.state ?? job.state,
        price_type: conversation.job?.price_type ?? job.price_type,
        price_amount: conversation.job?.price_amount ?? job.price_amount,
        currency: conversation.job?.currency ?? job.currency
      }
    };
  }

  function openChat(conversation: JobConversation) {
    setChatConversation(withSelectedJob(conversation));
  }

  useEffect(() => {
    if (error) {
      showToast({ tone: "error", title: "Could not load job activity", body: error });
    }
  }, [error, showToast]);

  useEffect(() => {
    if (!openConversationId || openedConversationId === openConversationId) return;
    const conversation = conversations.find((item) => item.id === openConversationId);
    if (!conversation) return;

    openChat(conversation);
    setOpenedConversationId(openConversationId);
  }, [conversations, openConversationId, openedConversationId, job]);

  async function inviteApplicantToChat(application: Application) {
    setInvitingApplicationId(application.id);

    try {
      await inviteToChat(application.id);
      onChanged?.();
      setInviteNoticeApplicationId(application.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not invite professional";
      showToast({ tone: "error", title: "Invite failed", body: message });
    } finally {
      setInvitingApplicationId("");
    }
  }

  async function declineApplicant(application: Application) {
    setDecliningApplicationId(application.id);

    try {
      await decline(application.id);
      setProposalApplication((current) => current?.id === application.id ? { ...current, status: "rejected" } : current);
      onChanged?.();
      showToast({
        tone: "success",
        title: "Application declined",
        body: "The professional was notified that their application was declined."
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not decline application";
      showToast({ tone: "error", title: "Decline failed", body: message });
    } finally {
      setDecliningApplicationId("");
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
        <div className="flex flex-col items-end gap-3">
          <p className={`text-[12px] font-semibold leading-[1.5] ${activityStage.className}`}>{activityStage.label}</p>
          <button
            aria-label="Close job activity"
            className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-muted shadow-sm transition hover:border-brand hover:text-brand xl:hidden"
            onClick={onClose}
            type="button"
          >
            <X size={17} />
          </button>
        </div>
      </div>
      {profileApplication ? <ProfessionalProfileModal application={profileApplication} onClose={() => setProfileApplication(null)} /> : null}
      {proposalApplication ? (
        <ProposalModal
          application={applications.find((application) => application.id === proposalApplication.id) ?? proposalApplication}
          conversation={conversations.find((conversation) => conversation.application_id === proposalApplication.id || conversation.professional_id === proposalApplication.professional_id)}
          declining={decliningApplicationId === proposalApplication.id}
          inviteNoticeOpen={inviteNoticeApplicationId === proposalApplication.id}
          inviting={invitingApplicationId === proposalApplication.id}
          onClose={() => setProposalApplication(null)}
          onDecline={declineApplicant}
          onDismissInviteNotice={() => setInviteNoticeApplicationId("")}
          onInvite={inviteApplicantToChat}
          onOpenChat={openChat}
          onViewProfile={(application) => {
            setProfileApplication(application);
          }}
        />
      ) : null}
      {chatConversation ? <ChatModal conversation={chatConversation} onClose={() => setChatConversation(null)} onHired={() => {
        refresh();
        onChanged?.();
      }} /> : null}
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
                  index={index}
                  initiallyOpen={index === Math.min(1, applications.length - 1)}
                  key={application.id}
                  onOpenChat={openChat}
                  onReviewProposal={setProposalApplication}
                  onViewProfile={setProfileApplication}
                />
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </aside>
  );
}

function ClientJobsContent() {
  const token = useRequireAuth();
  const { jobs, error, loading, refreshing, refresh, closeJob } = useClientJobs();
  const { conversations, error: conversationsError, loading: conversationsLoading, refresh: refreshConversations } = useConversations();
  const searchParams = useSearchParams();
  const showToast = useToast();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<RequestFilter>("all");
  const [profileApplication, setProfileApplication] = useState<Application | null>(null);
  const [chatConversation, setChatConversation] = useState<JobConversation | null>(null);
  const [openedConversationId, setOpenedConversationId] = useState("");
  const [hydratedRejectedApplicationsByJob, setHydratedRejectedApplicationsByJob] = useState<Record<string, Application[]>>({});
  const [rejectedLoading, setRejectedLoading] = useState(false);
  const [requestNotifications, setRequestNotifications] = useState<Notification[]>([]);
  const [requestTabSeenAt, setRequestTabSeenAt] = useState<RequestTabSeenAt>(initialRequestTabSeenAt);
  const [closingJobId, setClosingJobId] = useState("");
  const [closeActionJobId, setCloseActionJobId] = useState("");
  const [closeTarget, setCloseTarget] = useState<Job | null>(null);
  const jobIdParam = searchParams.get("job_id");
  const conversationIdParam = searchParams.get("conversation_id");
  const activeConversations = sortByLatestActivity(
    conversations.filter((conversation) => Boolean(conversation.upfront_payment_made_at) && !isCompletedConversation(conversation)),
    latestConversationActivityAt
  );
  const completedConversations = sortByLatestActivity(
    conversations.filter((conversation) => Boolean(conversation.upfront_payment_made_at) && isCompletedConversation(conversation)),
    latestConversationActivityAt
  );
  const rejectedApplications = sortByLatestActivity(
    jobs.flatMap((job) =>
      (hydratedRejectedApplicationsByJob[job.id] ?? rejectedApplicationSummaries(job))
        .map((application) => ({ application, job }))
    ),
    (item) => latestRejectedApplicationActivityAt(applicationFromSummary(item.application, item.job))
  );
  const sortedJobs = sortByLatestActivity(jobs, latestJobActivityAt);
  const filterCounts = {
    all: jobs.length,
    active: activeConversations.length,
    completed: completedConversations.length,
    rejected: rejectedApplications.length
  };
  const filteredJobs = sortedJobs.filter((job) => jobMatchesFilter(job, activeFilter));
  const latestRequestTabActivityAt: RequestTabSeenAt = {
    all: sortedJobs.reduce((latest, job) => Math.max(latest, latestJobActivityAt(job)), 0),
    active: activeConversations.reduce((latest, conversation) => Math.max(latest, latestConversationActivityAt(conversation)), 0),
    completed: completedConversations.reduce((latest, conversation) => Math.max(latest, latestConversationActivityAt(conversation)), 0),
    rejected: rejectedApplications.reduce((latest, item) => Math.max(latest, latestRejectedApplicationActivityAt(applicationFromSummary(item.application, item.job))), 0)
  };
  const requestNotificationDots = requestNotifications.reduce<Record<RequestFilter, boolean>>(
    (dots, notification) => {
      const tab = requestNotificationTab(notification);
      if (tab) dots[tab] = true;
      return dots;
    },
    { all: false, active: false, completed: false, rejected: false }
  );
  const requestTabDots: Record<RequestFilter, boolean> = {
    all: requestNotificationDots.all || (requestTabSeenAt.all > 0 && latestRequestTabActivityAt.all > requestTabSeenAt.all),
    active: requestNotificationDots.active || (requestTabSeenAt.active > 0 && latestRequestTabActivityAt.active > requestTabSeenAt.active),
    completed: requestNotificationDots.completed || (requestTabSeenAt.completed > 0 && latestRequestTabActivityAt.completed > requestTabSeenAt.completed),
    rejected: requestNotificationDots.rejected || (requestTabSeenAt.rejected > 0 && latestRequestTabActivityAt.rejected > requestTabSeenAt.rejected)
  };
  const filteredItemCount = activeFilter === "active" ? activeConversations.length : activeFilter === "completed" ? completedConversations.length : activeFilter === "rejected" ? rejectedApplications.length : filteredJobs.length;
  const hasFilteredItems = filteredItemCount > 0;
  const requestListFilter = activeFilter === "all";
  const requestsBusy = loading || refreshing || ((activeFilter === "active" || activeFilter === "completed") && conversationsLoading) || (activeFilter === "rejected" && rejectedLoading);
  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? null;

  const loadRequestNotifications = useCallback(() => {
    if (!token) return;

    getNotifications(token, true)
      .then((data) => {
        setRequestNotifications(data.notifications.filter((notification) => Boolean(requestNotificationTab(notification))));
      })
      .catch(() => undefined);
  }, [token]);

  function markRequestTabSeen(filter: RequestFilter) {
    const nextSeenAt = {
      ...requestTabSeenAt,
      [filter]: Math.max(Date.now(), latestRequestTabActivityAt[filter])
    };
    setRequestTabSeenAt(nextSeenAt);
    saveRequestTabSeenAt(nextSeenAt);

    const notificationsForTab = requestNotifications.filter((notification) => requestNotificationTab(notification) === filter);
    if (notificationsForTab.length > 0) {
      setRequestNotifications((current) => current.filter((notification) => requestNotificationTab(notification) !== filter));
      if (token) {
        void Promise.allSettled(notificationsForTab.map((notification) => markNotificationRead(token, notification.id, true)));
      }
    }
  }

  function selectRequestFilter(filter: RequestFilter) {
    setActiveFilter(filter);
    markRequestTabSeen(filter);
  }

  function refreshAll() {
    refresh();
    refreshConversations();
    loadRequestNotifications();
  }

  async function closeRequest(job: Job) {
    setClosingJobId(job.id);
    try {
      await closeJob(job.id);
      if (selectedJobId === job.id) setSelectedJobId(null);
      setCloseActionJobId("");
      setCloseTarget(null);
      refreshConversations();
      loadRequestNotifications();
      showToast({ tone: "success", title: "Request closed", body: "This request is no longer accepting applications." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not close this request";
      showToast({ tone: "error", title: "Close failed", body: message });
    } finally {
      setClosingJobId("");
    }
  }

  function withConversationJob(conversation: JobConversation) {
    const job = jobs.find((item) => item.id === conversation.job_id);
    if (!job) return conversation;

    return {
      ...conversation,
      job: {
        ...(conversation.job ?? {}),
        id: conversation.job?.id ?? job.id,
        title: conversation.job?.title ?? job.title,
        status: conversation.job?.status ?? job.status,
        category: conversation.job?.category ?? job.category,
        is_remote: job.is_remote,
        description: conversation.job?.description ?? job.description,
        number_of_professionals: conversation.job?.number_of_professionals ?? job.number_of_professionals,
        location: conversation.job?.location ?? job.location,
        state: conversation.job?.state ?? job.state,
        price_type: conversation.job?.price_type ?? job.price_type,
        price_amount: conversation.job?.price_amount ?? job.price_amount,
        currency: conversation.job?.currency ?? job.currency
      }
    };
  }

  useEffect(() => {
    if (!conversationIdParam || openedConversationId === conversationIdParam) return;
    const conversation = conversations.find((item) => item.id === conversationIdParam);
    if (!conversation) return;

    setChatConversation(withConversationJob(conversation));
    setSelectedJobId(conversation.job_id);
    setOpenedConversationId(conversationIdParam);
  }, [conversationIdParam, conversations, jobs, openedConversationId]);

  useEffect(() => {
    if (error) {
      showToast({ tone: "error", title: "Could not load jobs", body: error });
    }
  }, [error, showToast]);

  useEffect(() => {
    setRequestTabSeenAt(loadRequestTabSeenAt());
  }, []);

  useEffect(() => {
    if (!token) {
      setRequestNotifications([]);
      return;
    }

    loadRequestNotifications();
    const timer = window.setInterval(loadRequestNotifications, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadRequestNotifications, token]);

  useEffect(() => {
    if (conversationsError) {
      showToast({ tone: "error", title: "Could not load active chats", body: conversationsError });
    }
  }, [conversationsError, showToast]);

  useEffect(() => {
    if (activeFilter !== "rejected" || !token || jobs.length === 0) return;

    const jobIdsNeedingHydration = jobs
      .filter((job) => {
        const summaries = rejectedApplicationSummaries(job);
        return summaries.length > 0 && !hydratedRejectedApplicationsByJob[job.id] && summaries.some(needsRejectedApplicationHydration);
      })
      .map((job) => job.id);

    if (jobIdsNeedingHydration.length === 0) return;

    let cancelled = false;
    setRejectedLoading(true);
    Promise.all(
      jobIdsNeedingHydration.map((jobId) =>
        getJobApplications(token, jobId).then((data) => ({
          jobId,
          applications: data.applications.filter((application) => isDeclinedApplication(application.status))
        }))
      )
    )
      .then((results) => {
        if (cancelled) return;
        setHydratedRejectedApplicationsByJob((current) => {
          const next = { ...current };
          for (const result of results) {
            next[result.jobId] = result.applications;
          }
          return next;
        });
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Could not load rejected applicant details";
        showToast({ tone: "error", title: "Rejected applicants incomplete", body: message });
      })
      .finally(() => {
        if (!cancelled) setRejectedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeFilter, hydratedRejectedApplicationsByJob, jobs, showToast, token]);

  useEffect(() => {
    if (jobIdParam) setSelectedJobId(jobIdParam);
  }, [jobIdParam]);

  useEffect(() => {
    if (!selectedJobId) return;
    if (!requestListFilter) {
      setSelectedJobId(null);
      return;
    }
    if (!filteredJobs.some((job) => job.id === selectedJobId)) {
      setSelectedJobId(null);
    }
  }, [filteredJobs, requestListFilter, selectedJobId]);

  function openJobActivity(jobId: string) {
    setSelectedJobId(jobId);
    window.requestAnimationFrame(() => {
      if (window.innerWidth < 1280) return;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  return (
    <AppShell>
      <div className="relative left-1/2 w-full max-w-[1180px] -translate-x-1/2">
        <div className="mb-6 mt-1 flex flex-col items-start gap-4 md:mb-8 lg:mb-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col items-start gap-2 md:gap-3">
            <h1 className="text-[14px] font-medium leading-[1.5] text-[#196c88] md:text-[18px]">My Request</h1>
            <p className="max-w-[720px] text-[18px] font-normal leading-[1.4] text-[#5e5e5e] md:text-[26px] lg:text-[32px]">View service request and application<span className="hidden md:inline">s</span></p>
          </div>
          <button
            aria-label={requestsBusy ? "Refreshing requests" : "Refresh requests"}
            className="grid h-11 w-11 place-items-center rounded-full text-[#196c88] transition hover:bg-[#f2f6f8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#196c88] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={requestsBusy}
            onClick={refreshAll}
            type="button"
          >
            <RefreshCw className={requestsBusy ? "animate-spin" : ""} size={25} strokeWidth={2} />
          </button>
        </div>
        <nav aria-label="Request filters" className="mb-6 border-b-[3px] border-[#d4d4d4]">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 sm:grid-cols-4 sm:gap-x-0">
            {(["all", "active", "completed", "rejected"] as RequestFilter[]).map((filter) => {
              const active = activeFilter === filter;
              return (
                <button
                  aria-current={active ? "page" : undefined}
                  className={`flex min-w-0 px-0 pt-1 text-[13px] font-medium leading-[1.5] transition sm:text-[14px] md:text-[16px] lg:text-[18px] ${filter === "all" ? "justify-start text-left" : filter === "rejected" ? "justify-start text-left sm:justify-end sm:text-right" : "justify-start text-left sm:justify-center sm:text-center"} ${active ? "text-[#196c88]" : "text-[#a4a4a4] hover:text-[#196c88]"}`}
                  key={filter}
                  onClick={() => selectRequestFilter(filter)}
                  type="button"
                >
                  <span className={`relative -mb-[3px] inline-flex max-w-full items-center border-b-4 pb-2 ${active ? "border-[#196c88]" : "border-transparent"}`}>
                    {requestFilterLabels[filter]}({filterCounts[filter]})
                    {requestTabDots[filter] && filterCounts[filter] > 0 ? <span aria-hidden="true" className="absolute -right-4 -top-1.5 h-2.5 w-2.5 rounded-full bg-[#bf1d1d]" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
        {!requestsBusy && jobs.length === 0 ? <EmptyState title="No requests yet" body="Create your first service request and start receiving applications." /> : null}
        {!requestsBusy && jobs.length > 0 && filteredItemCount === 0 ? <EmptyState title="Nothing here yet" body="Items matching this tab will appear here." /> : null}
        {activeFilter === "active" ? (
          <div className="space-y-4">
            {requestsBusy ? Array.from({ length: 3 }).map((_, index) => <RequestCardSkeleton key={index} />) : null}
            {!requestsBusy ? activeConversations.map((conversation) => {
              const job = jobs.find((item) => item.id === conversation.job_id);
              return (
                <ActiveEngagementCard
                  conversation={conversation}
                  job={job}
                  key={conversation.id}
                  onChanged={refreshAll}
                  onOpenChat={(item) => setChatConversation(withConversationJob(item))}
                  onViewProfile={setProfileApplication}
                />
              );
            }) : null}
          </div>
        ) : null}
        {activeFilter === "completed" ? (
          <div className="space-y-4">
            {requestsBusy ? Array.from({ length: 3 }).map((_, index) => <RequestCardSkeleton key={index} />) : null}
            {!requestsBusy ? completedConversations.map((conversation) => {
              const job = jobs.find((item) => item.id === conversation.job_id);
              return (
                <ActiveEngagementCard
                  conversation={conversation}
                  job={job}
                  key={conversation.id}
                  onChanged={refreshAll}
                  onOpenChat={(item) => setChatConversation(withConversationJob(item))}
                  onViewProfile={setProfileApplication}
                />
              );
            }) : null}
          </div>
        ) : null}
        {activeFilter === "rejected" ? (
          <div className="space-y-4">
            {requestsBusy ? Array.from({ length: 3 }).map((_, index) => <RequestCardSkeleton key={index} />) : null}
            {!requestsBusy ? rejectedApplications.map(({ application, job }) => (
              <RejectedApplicantCard application={application} job={job} key={application.id} onViewProfile={setProfileApplication} />
            )) : null}
          </div>
        ) : null}
        {requestListFilter ? (
          <div className={`grid gap-4 md:gap-[18px] ${hasFilteredItems && !requestsBusy ? "xl:grid-cols-[minmax(0,710px)_minmax(340px,452px)]" : ""}`}>
            <div className="space-y-3 md:space-y-4">
              {requestsBusy ? Array.from({ length: 4 }).map((_, index) => <RequestCardSkeleton key={index} />) : null}
              {!requestsBusy ? filteredJobs.map((job) => {
                return (
                  <RequestCard
                    closeActionOpen={closeActionJobId === job.id}
                    closing={closingJobId === job.id}
                    job={job}
                    key={job.id}
                    onCloseRequest={() => setCloseTarget(job)}
                    onSelect={() => openJobActivity(job.id)}
                    onToggleCloseAction={() => setCloseActionJobId((current) => current === job.id ? "" : job.id)}
                    selected={selectedJobId === job.id}
                  />
                );
              }) : null}
            </div>
            {hasFilteredItems && !requestsBusy ? (
              <div
                className={`${selectedJobId ? "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/10 px-3 pb-4 pt-4 backdrop-blur-[2px] xl:static xl:z-auto xl:block xl:overflow-visible xl:bg-transparent xl:p-0 xl:backdrop-blur-none" : "hidden xl:block"}`}
              >
                <div className="w-full max-w-[452px] xl:max-w-none">
                  <JobEngagementPanel job={selectedJob} jobId={selectedJobId} openConversationId={conversationIdParam} onChanged={refreshAll} onClose={() => setSelectedJobId(null)} />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {profileApplication ? <ProfessionalProfileModal application={profileApplication} onClose={() => setProfileApplication(null)} /> : null}
        {chatConversation ? <ChatModal conversation={chatConversation} onClose={() => setChatConversation(null)} onHired={refreshAll} /> : null}
        {closeTarget ? (
          <SurfaceModal onClose={() => setCloseTarget(null)} panelClassName="p-5 sm:p-6" size="sm">
            <button aria-label="Close confirmation" className="absolute right-4 top-4 text-black transition hover:text-[#196c88]" onClick={() => setCloseTarget(null)} type="button">
              <X size={20} />
            </button>
            <div className="pr-8">
              <p className="text-sm font-medium text-[#196c88]">Close Request</p>
              <h2 className="mt-3 text-[22px] font-semibold leading-snug text-[#5e5e5e]">Close this job request?</h2>
              <p className="mt-3 text-sm leading-6 text-[#757575]">
                This request will stop accepting applications and cannot be reopened.
              </p>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button className="rounded-[5px] px-5" disabled={closingJobId === closeTarget.id} onClick={() => setCloseTarget(null)} type="button" variant="secondary">
                Keep Open
              </Button>
              <Button className="rounded-[5px] bg-red-700 px-5 hover:bg-red-800" disabled={closingJobId === closeTarget.id} onClick={() => closeRequest(closeTarget)} type="button">
                {closingJobId === closeTarget.id ? <span className="inline-flex items-center gap-2"><Spinner className="h-4 w-4" /> Closing</span> : "Close Request"}
              </Button>
            </div>
          </SurfaceModal>
        ) : null}
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
