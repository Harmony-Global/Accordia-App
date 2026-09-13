"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock3, Download, Eye, FileText, MapPin, MessageCircle, Save, Search, Send, Trash2, Undo2, X } from "lucide-react";
import { AppShell, EmptyState } from "@/components/app-shell";
import { ChatModal } from "@/components/chat-modal";
import {
  combineDateAndTime,
  dateOnly,
  formatTimeValue,
  ScheduleServiceCalendar,
  timePeriodFromDate,
  type TimePeriod
} from "@/components/schedule-service-calendar";
import { ApplicationStatusPill, Button, MoreButton, PageLoader, ProfileAvatar, SelectField, Spinner, StatusPill, SurfaceModal, TextAreaField, TextField } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useConversations } from "@/hooks/use-conversations";
import { useRequireAuth } from "@/hooks/use-auth";
import { useMatchedJobs, useMyApplications } from "@/hooks/use-jobs";
import { getProfessionalInquiries } from "@/services/inquiry-service";
import {
  uploadConversationDeliverable
} from "@/services/conversation-service";
import {
  acceptApplicationInvite,
  deleteApplication,
  getApplicationAttachmentAccess,
  getProposalDraft,
  saveProposalDraft,
  uploadApplicationAttachment,
  withdrawApplication
} from "@/services/job-service";
import type { Application, Job, JobConversation, ProfessionalInquiry, ProposalAttachment } from "@/types";

const MAX_PROPOSAL_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_PROPOSAL_ATTACHMENT_TOTAL_BYTES = 25 * 1024 * 1024;
const MAX_PROPOSAL_ATTACHMENTS = 5;
const MATCHED_REQUESTS_PAGE_SIZE = 2;
const APPLICATION_PREVIEW_LIMIT = 3;
const supportedProposalAttachmentTypes = new Set([
  "application/pdf",
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp"
]);

type ProposalFormState = {
  pitch: string;
  proposedRate: string;
  estimatedDays: string;
  proposedStartAt: string;
};

type ProfessionalRequestFilter = "service" | "active" | "completed" | "rejected";
type ConversationGroup = {
  jobId: string;
  job?: Job | null;
  conversations: JobConversation[];
};

const professionalRequestFilterLabels: Record<ProfessionalRequestFilter, string> = {
  service: "Service Requests/Applications",
  active: "Active Jobs",
  completed: "Completed",
  rejected: "Rejected"
};

function defaultProposalState(): ProposalFormState {
  return { pitch: "", proposedRate: "", estimatedDays: "5", proposedStartAt: "" };
}

function readProposalFiles(files: FileList | null, currentFiles: File[] = []) {
  const incomingFiles = Array.from(files ?? []);
  if (incomingFiles.length === 0) return currentFiles;

  const nextFiles = [...currentFiles];
  for (const file of incomingFiles) {
    if (!supportedProposalAttachmentTypes.has(file.type)) throw new Error("Only PDF, CSV, Excel, Word, JPEG, PNG, and WebP files are supported.");
    if (file.size === 0 || file.size > MAX_PROPOSAL_ATTACHMENT_BYTES) throw new Error("Each proposal attachment must be between 1 byte and 5MB.");
    if (nextFiles.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) continue;
    nextFiles.push(file);
  }

  if (nextFiles.length > MAX_PROPOSAL_ATTACHMENTS) throw new Error(`You can attach up to ${MAX_PROPOSAL_ATTACHMENTS} proposal files.`);
  const totalSize = nextFiles.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_PROPOSAL_ATTACHMENT_TOTAL_BYTES) throw new Error("Proposal attachments cannot exceed 25MB total.");

  return nextFiles;
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)}mb`;
  return `${Math.max(1, Math.round(size / 1024))}kb`;
}

function formatCurrency(value?: number | null) {
  return value ? `#${value.toLocaleString()}` : "Not provided";
}

function formatPaymentAmount(value?: number | null) {
  return value ? `#${value.toLocaleString()}` : "Pending";
}

function jobPriceAmount(job?: Pick<Job, "price_amount"> | null) {
  const amount = Number(job?.price_amount);
  return Number.isFinite(amount) ? amount : null;
}

function isFixedPriceJob(job?: Pick<Job, "price_type"> | null) {
  return job?.price_type === "fixed";
}

function formatJobPrice(job?: Pick<Job, "price_amount" | "price_type" | "currency"> | null) {
  const amount = jobPriceAmount(job);
  if (amount === null) return "Price not provided";
  const label = isFixedPriceJob(job) ? "Fixed Price" : "Negotiable";
  return `${label}: ${(job?.currency ?? "NGN").toUpperCase()} ${amount.toLocaleString()}`;
}

function formatEstimatedDays(value?: number | null) {
  return value ? `${value}day${value === 1 ? "" : "s"}` : "Not provided";
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatDisplayDate(value?: string | null) {
  if (!value) return "Not available yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available yet";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function activeStartedDate(conversation: JobConversation) {
  return conversation.work_starts_at ?? conversation.upfront_payment_made_at ?? conversation.updated_at ?? conversation.created_at;
}

function expectedCompletionDate(conversation: JobConversation) {
  if (conversation.work_ends_at) return conversation.work_ends_at;
  const startedAt = activeStartedDate(conversation);
  const days = conversation.application?.estimated_days;
  if (!startedAt || !days) return null;

  const date = new Date(startedAt);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function activeWorkState(conversation: JobConversation) {
  const status = (conversation.work_status ?? "in_progress").toLowerCase();
  if (status === "completed") return { label: "Completed", colorClass: "text-[#0fa269]", stepTone: "green" as const };
  if (status === "revision_requested") return { label: "Revision", colorClass: "text-[#f4a422]", stepTone: "green" as const };
  if (status === "submitted") return { label: "Submitted", colorClass: "text-[#f4a422]", stepTone: "amber" as const };
  return { label: "In progress", colorClass: "text-[#f4a422]", stepTone: "amber" as const };
}

function finalPaymentAmount(conversation: JobConversation) {
  const amount = conversation.application?.proposed_rate ?? 0;
  return amount > 0 ? Math.round(amount / 2) : null;
}

function dateTimeInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function dateTimeInputFromDate(value: Date) {
  const localDate = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function isoFromDateTimeInput(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function validDateFromInput(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function relativeDate(value?: string | null) {
  if (!value) return "Recently";
  const diff = Date.now() - new Date(value).getTime();
  const days = Math.max(0, Math.floor(diff / 86_400_000));
  if (days === 0) return "Today";
  if (days === 1) return "1day ago";
  return `${days}days ago`;
}

function applicantRequirement(count?: number | null) {
  const value = Math.max(1, Number(count ?? 1));
  return `${value} professional${value === 1 ? "" : "s"} required`;
}

function categoryName(job?: Pick<Job, "categories" | "category"> | null) {
  return job?.categories?.name ?? job?.category?.name ?? "General service";
}

function isOpenJob(job: Job) {
  return ["open", "in_discussion"].includes(job.status.toLowerCase());
}

function isDeclinedApplication(status: string) {
  return ["rejected", "not_awarded", "declined", "withdrawn"].includes(status.toLowerCase());
}

function isHiredApplication(status: string) {
  return ["selected", "awarded", "hired", "in_progress", "inprogress"].includes(status.toLowerCase());
}

function applicationDisplayStatus(application: Application, conversation?: JobConversation) {
  if (isDeclinedApplication(application.status)) return application.status;
  if (isHiredApplication(application.status)) return "hired";
  if (application.chat_invited_at || conversation) return "invited";
  return "pending";
}

function clientName(job?: Job | null) {
  if (!job?.client) return "Client";
  return `${job.client.first_name ?? "Client"} ${job.client.last_name ?? ""}`.trim();
}

function participantName(profile?: { first_name?: string | null; last_name?: string | null } | null) {
  return `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "Accordia user";
}

function conversationStarted(conversation: JobConversation) {
  if (!conversation.work_starts_at) return false;
  const startDate = new Date(conversation.work_starts_at);
  return !Number.isNaN(startDate.getTime()) && startDate.getTime() <= Date.now();
}

function isCompletedConversation(conversation: JobConversation) {
  return (conversation.work_status ?? "").toLowerCase() === "completed";
}

function isActiveConversation(conversation: JobConversation) {
  return Boolean(conversation.upfront_payment_made_at) && conversationStarted(conversation) && !isCompletedConversation(conversation);
}

function applicationWorkStatus(application: Application, conversation?: JobConversation) {
  if (!conversation || !isHiredApplication(application.status)) return "";
  if (isCompletedConversation(conversation)) return "Completed";
  return conversationStarted(conversation) ? "In progress" : "Job not started";
}

function groupConversationsByJob(conversations: JobConversation[], jobs: Job[]): ConversationGroup[] {
  const jobsById = new Map(jobs.map((job) => [job.id, job]));
  const groups = new Map<string, ConversationGroup>();

  for (const conversation of conversations) {
    const group = groups.get(conversation.job_id) ?? {
      jobId: conversation.job_id,
      job: jobsById.get(conversation.job_id) ?? null,
      conversations: [] as JobConversation[]
    };
    group.conversations.push(conversation);
    groups.set(conversation.job_id, group);
  }

  return [...groups.values()].sort((first, second) => {
    const firstLatest = Math.max(...first.conversations.map((conversation) => timestampValue(conversation.updated_at ?? conversation.created_at)));
    const secondLatest = Math.max(...second.conversations.map((conversation) => timestampValue(conversation.updated_at ?? conversation.created_at)));
    return secondLatest - firstLatest;
  });
}

function timestampValue(value?: string | null) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function ReferenceImages({ images }: { images: string[] }) {
  if (images.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {images.map((image, index) => (
        <img alt={`Work reference ${index + 1}`} className="h-20 w-24 rounded-[5px] border border-line object-cover" decoding="async" key={image.slice(0, 48)} loading="lazy" src={image} />
      ))}
    </div>
  );
}

function AttachmentUploadArea({ onChange }: { onChange: (files: FileList | null) => void }) {
  const accept = ".pdf,.csv,.xls,.xlsx,.doc,.docx,image/jpeg,image/png,image/webp";

  return (
    <label
      className="mt-4 flex min-h-[138px] w-full cursor-pointer flex-col items-center justify-center rounded-[2px] border border-dashed border-[#b9b9b9] bg-white px-4 py-8 text-center transition hover:border-[#196c88] hover:bg-[#f8fbfc]"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onChange(event.dataTransfer.files);
      }}
    >
      <span className="text-sm font-semibold text-[#196c88]">Click to upload <span className="font-normal text-[#a4a4a4]">or Drag and drop file</span></span>
      <span className="mt-1 text-sm text-[#a4a4a4]">Max file size: 5mb</span>
      <input
        accept={accept}
        className="sr-only"
        multiple
        onChange={(event) => {
          onChange(event.target.files);
          event.currentTarget.value = "";
        }}
        type="file"
      />
    </label>
  );
}

function AttachmentList({ attachments = [], files = [], onDownload }: { attachments?: ProposalAttachment[]; files?: File[]; onDownload?: (attachment: ProposalAttachment) => void }) {
  if (attachments.length === 0 && files.length === 0) return null;
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {attachments.map((attachment) => (
        <button className="flex min-w-0 items-center justify-between gap-3 rounded-[5px] border border-line bg-white px-3 py-3 text-left transition hover:border-[#196c88]" key={attachment.id} onClick={() => onDownload?.(attachment)} type="button">
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[5px] bg-red-500 text-white">
              <FileText size={23} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[16px] font-medium text-[#5e5e5e]">{attachment.name}</span>
              <span className="text-sm text-muted">{formatFileSize(attachment.size)}</span>
            </span>
          </span>
          {onDownload ? <Download className="shrink-0 text-[#196c88]" size={18} /> : null}
        </button>
      ))}
      {files.map((file) => (
        <div className="flex min-w-0 items-center gap-3 rounded-[5px] border border-dashed border-line bg-[#f8fbfc] px-3 py-3" key={`${file.name}-${file.size}`}>
          <FileText className="shrink-0 text-[#196c88]" size={18} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-[#5e5e5e]">{file.name}</span>
            <span className="text-xs text-muted">{formatFileSize(file.size)} ready to upload</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function MatchedServiceCard({ job, onOpen }: { job: Job; onOpen: () => void }) {
  const open = isOpenJob(job);
  return (
    <button className={`w-full rounded-[8px] border bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${open ? "border-[#f4c430]" : "border-line"}`} onClick={onOpen} type="button">
      <div className="flex items-start justify-between gap-3">
        <StatusPill tone="amber">{categoryName(job)}</StatusPill>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${open ? "bg-[#f2f6f8] text-[#196c88]" : "bg-red-50 text-red-700"}`}>
          <Clock3 size={16} />
          {open ? "Open" : "Closed"}
        </span>
      </div>
      <p className="mt-5 text-sm font-semibold text-[#196c88]">{applicantRequirement(job.number_of_professionals)}</p>
      <h3 className="mt-4 line-clamp-2 text-[20px] font-semibold leading-snug text-[#5e5e5e]">{job.title}</h3>
      <p className="mt-4 line-clamp-4 text-[16px] leading-7 text-[#8f8f8f]">{job.description}</p>
      <div className="mt-8 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#5e5e5e]">{[job.location, job.state].filter(Boolean).join(", ") || "Remote"}</p>
          <p className="mt-2 text-sm font-semibold text-[#196c88]">{relativeDate(job.created_at)}</p>
        </div>
        <StatusPill tone="gray">{job.is_remote ? "Remote" : "In-person"}</StatusPill>
      </div>
    </button>
  );
}

function ApplicationCard({ application, conversation, onAcceptInvite, onDelete, onOpenChat, onView, onWithdraw }: {
  application: Application;
  conversation?: JobConversation;
  onAcceptInvite: () => void;
  onDelete: () => void;
  onOpenChat: () => void;
  onView: () => void;
  onWithdraw: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const status = applicationDisplayStatus(application, conversation);
  const workStatus = applicationWorkStatus(application, conversation);
  const hasUnreadMessages = Boolean(conversation?.unread_message_count);
  const canWithdraw = !isDeclinedApplication(application.status) && !isHiredApplication(application.status);
  const canDelete = isDeclinedApplication(application.status);

  return (
    <article className="rounded-[8px] border border-line bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <StatusPill tone="amber">{categoryName(application.job)}</StatusPill>
        <div className="flex items-start gap-2">
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <ApplicationStatusPill status={status} />
            {workStatus ? <span className="text-sm font-semibold text-[#196c88]">- {workStatus}</span> : null}
          </div>
          <div className="relative">
            <MoreButton aria-label="Manage application" className="h-8 w-8 border-0 shadow-none" onClick={() => setMenuOpen(true)} />
            {hasUnreadMessages ? <span aria-hidden="true" className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-[#bf1d1d] ring-2 ring-white" /> : null}
            {menuOpen ? (
              <>
                <button aria-label="Close application menu" className="fixed inset-0 z-[71] cursor-default bg-transparent" onClick={() => setMenuOpen(false)} type="button" />
                <div className="absolute right-0 top-[calc(100%+8px)] z-[72] w-[260px] rounded-[7px] bg-white p-4 shadow-[0_8px_28px_rgba(0,0,0,0.16)]">
                  <div className="mb-3 flex items-center justify-between border-b border-[#5e5e5e] pb-3">
                    <p className="text-[20px] font-medium text-[#5e5e5e]">Manage applications</p>
                    <button aria-label="Close menu" onClick={() => setMenuOpen(false)} type="button"><X size={20} /></button>
                  </div>
                  <button className="flex w-full items-center gap-3 py-2 text-left text-sm text-[#757575] hover:text-[#196c88]" onClick={() => { setMenuOpen(false); onView(); }} type="button"><Eye size={17} /> View application</button>
                  {status === "invited" && !conversation ? <button className="flex w-full items-center gap-3 py-2 text-left text-sm text-[#757575] hover:text-[#196c88]" onClick={() => { setMenuOpen(false); onAcceptInvite(); }} type="button"><CheckCircle2 size={17} /> Accept invitation</button> : null}
                  {conversation ? <button className="flex w-full items-center gap-3 py-2 text-left text-sm text-[#757575] hover:text-[#196c88]" onClick={() => { setMenuOpen(false); onOpenChat(); }} type="button"><span className="relative"><MessageCircle size={17} />{hasUnreadMessages ? <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#bf1d1d]" /> : null}</span> Chat</button> : null}
                  {canWithdraw ? <button className="flex w-full items-center gap-3 py-2 text-left text-sm text-[#757575] hover:text-[#196c88]" onClick={() => { setMenuOpen(false); onWithdraw(); }} type="button"><Undo2 size={17} /> Withdraw application</button> : null}
                  {canDelete ? <button className="flex w-full items-center gap-3 py-2 text-left text-sm text-[#757575] hover:text-red-700" onClick={() => { setMenuOpen(false); onDelete(); }} type="button"><Trash2 size={17} /> Delete application</button> : null}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <h3 className="mt-5 line-clamp-2 text-[20px] font-semibold leading-snug text-[#5e5e5e]">{application.job?.title ?? "Applied job"}</h3>
      <p className="mt-4 line-clamp-2 text-[16px] leading-7 text-[#757575]">{application.pitch}</p>
      <div className="mt-8 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#5e5e5e]">{[application.job?.location, application.job?.state].filter(Boolean).join(", ") || "Remote"}</p>
          <p className="mt-2 text-sm font-semibold text-[#196c88]">Applied {relativeDate(application.created_at).toLowerCase()}</p>
        </div>
        <StatusPill tone="gray">{application.job?.is_remote ? "Remote" : "In-person"}</StatusPill>
      </div>
    </article>
  );
}

function RequestDetailsModal({ job, onClose, onSendProposal }: { job: Job; onClose: () => void; onSendProposal: () => void }) {
  return (
    <SurfaceModal onClose={onClose} panelClassName="max-h-[92vh] overflow-y-auto p-5 sm:p-7 lg:p-10" size="xl">
      <button aria-label="Close request details" className="absolute right-5 top-5 text-black transition hover:text-[#196c88]" onClick={onClose} type="button"><X size={28} /></button>
      <div className="pt-10 sm:pt-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <ProfileAvatar className="h-16 w-16" iconSize={26} />
            <div>
              <h2 className="text-[20px] font-medium text-[#5e5e5e]">Service request from {clientName(job)}</h2>
              <p className="mt-1 text-[17px] font-light text-[#a4a4a4]">{job.client?.phone_verified ? "Phone verified" : "Phone not verified"}</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <StatusPill tone="amber">{categoryName(job)}</StatusPill>
            <p className="mt-5 text-[17px] font-light text-[#a4a4a4]">Created on {formatDateTime(job.created_at)}</p>
          </div>
        </div>
        <div className="mt-8 border-t border-dashed border-[#757575]" />
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <p className="font-semibold text-[#5e5e5e]">{[job.location, job.state].filter(Boolean).join(", ") || "Remote"}</p>
          <StatusPill tone="gray">{job.is_remote ? "Remote" : "In-person"}</StatusPill>
        </div>
        <p className="mt-8 text-[16px] font-semibold text-[#196c88]">{applicantRequirement(job.number_of_professionals)}</p>
        <p className="mt-3 text-[16px] font-semibold text-[#f4a422]">{formatJobPrice(job)}</p>
        <h3 className="mt-6 text-[28px] font-medium leading-tight text-[#5e5e5e]">{job.title}</h3>
        <p className="mt-6 whitespace-pre-line text-[17px] font-light leading-8 text-[#8f8f8f]">{job.description}</p>
        <Button className="mt-12 h-12 rounded-[5px] px-5 py-0" disabled={!isOpenJob(job)} onClick={onSendProposal} type="button">
          <span className="inline-flex items-center gap-2">Send Proposal <Send size={19} /></span>
        </Button>
        {!isOpenJob(job) ? <p className="mt-3 text-sm text-muted">This service request is closed and is no longer accepting proposals.</p> : null}
      </div>
    </SurfaceModal>
  );
}

function CreateProposalModal({ busy, files, form, job, onClose, onFileChange, onFormChange, onSaveDraft, onSend }: {
  busy: string;
  files: File[];
  form: ProposalFormState;
  job: Job;
  onClose: () => void;
  onFileChange: (files: FileList | null) => void;
  onFormChange: (next: Partial<ProposalFormState>) => void;
  onSaveDraft: () => void;
  onSend: () => void;
}) {
  const fixedPrice = isFixedPriceJob(job);
  const fixedAmount = jobPriceAmount(job);
  const displayedProposedRate = fixedPrice && fixedAmount !== null ? String(fixedAmount) : form.proposedRate;
  const defaultDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(8, 0, 0, 0);
    return date;
  }, []);
  const initialStart = validDateFromInput(form.proposedStartAt) ?? defaultDate;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(initialStart.getFullYear(), initialStart.getMonth(), 1));
  const [calendarMode, setCalendarMode] = useState<"start" | "end">("start");
  const [calendarStartDate, setCalendarStartDate] = useState<Date | null>(() => dateOnly(initialStart));
  const [calendarEndDate, setCalendarEndDate] = useState<Date | null>(() => dateOnly(initialStart));
  const [calendarStartTime, setCalendarStartTime] = useState(() => formatTimeValue(initialStart));
  const [calendarEndTime, setCalendarEndTime] = useState(() => formatTimeValue(initialStart));
  const [calendarStartPeriod, setCalendarStartPeriod] = useState<TimePeriod>(() => timePeriodFromDate(initialStart));
  const [calendarEndPeriod, setCalendarEndPeriod] = useState<TimePeriod>(() => timePeriodFromDate(initialStart));

  function openCalendar() {
    const selected = validDateFromInput(form.proposedStartAt) ?? defaultDate;
    setCalendarStartDate(dateOnly(selected));
    setCalendarEndDate(dateOnly(selected));
    setCalendarMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
    setCalendarStartTime(formatTimeValue(selected));
    setCalendarEndTime(formatTimeValue(selected));
    setCalendarStartPeriod(timePeriodFromDate(selected));
    setCalendarEndPeriod(timePeriodFromDate(selected));
    setCalendarMode("start");
    setCalendarOpen(true);
  }

  function confirmCalendar() {
    const selected = combineDateAndTime(calendarStartDate, calendarStartTime, calendarStartPeriod);
    if (!selected) return;
    onFormChange({ proposedStartAt: dateTimeInputFromDate(selected) });
    setCalendarOpen(false);
  }

  return (
    <SurfaceModal onClose={onClose} panelClassName="max-h-[92vh] overflow-y-auto p-5 sm:p-7 lg:p-10" size="xl">
      <button aria-label="Close proposal form" className="absolute right-5 top-5 text-black transition hover:text-[#196c88]" onClick={onClose} type="button"><X size={28} /></button>
      <div className="relative pt-10">
        <p className="text-[20px] font-medium text-[#196c88]">Create Proposal</p>
        <h2 className="mt-8 text-[32px] font-light leading-tight text-[#5e5e5e]">Create and send proposal to clients</h2>
        <div className="mt-10 rounded-[8px] border border-line bg-white p-5 shadow-sm sm:p-8">
          <div className="flex justify-end">
            <Button className="h-12 rounded-[5px] border-[#196c88] px-7 py-0 text-[#196c88]" disabled={busy === "draft"} onClick={onSaveDraft} type="button" variant="secondary">
              {busy === "draft" ? <Spinner className="h-5 w-5" /> : <span className="inline-flex items-center gap-2"><Save size={17} /> Save Draft</span>}
            </Button>
          </div>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <SelectField label="Estimated Duration" onChange={(event) => onFormChange({ estimatedDays: event.target.value })} value={form.estimatedDays}>
              {["1", "2", "3", "5", "7", "14", "30"].map((value) => <option key={value} value={value}>{value} day{value === "1" ? "" : "s"}</option>)}
            </SelectField>
            <div>
              <p className="mb-2 text-sm font-medium text-ink">Proposed Start Date and Time</p>
              <button
                className={`flex min-h-[46px] w-full items-center justify-between gap-3 rounded-[5px] border border-line bg-white px-4 text-left text-base shadow-sm transition hover:border-[#196c88] ${form.proposedStartAt ? "text-[#5e5e5e]" : "text-muted"}`}
                onClick={openCalendar}
                type="button"
              >
                <span className="truncate">{form.proposedStartAt ? formatDateTime(form.proposedStartAt) : "Enter Start Date and Time"}</span>
                <CalendarDays className="shrink-0 text-[#196c88]" size={18} />
              </button>
            </div>
          </div>
          <TextField
            className="mt-5"
            disabled={fixedPrice}
            label={fixedPrice ? "Proposed Price (Fixed Price)" : "Proposed Price"}
            min={0}
            onChange={(event) => onFormChange({ proposedRate: event.target.value })}
            placeholder="Enter Amount"
            type="number"
            value={displayedProposedRate}
          />
          {fixedPrice ? <p className="mt-2 text-sm font-medium text-[#196c88]">This job request has a fixed price set by the client.</p> : null}
          <TextAreaField className="mt-5" label="Proposal Message" onChange={(event) => onFormChange({ pitch: event.target.value })} placeholder="Enter Proposal Message" rows={7} value={form.pitch} />
          <div className="mt-6">
            <p className="text-sm font-semibold text-ink">Attachments</p>
            <p className="mt-1 text-sm text-muted">Add files that support your proposal(Images, PDF, Docs etc)</p>
            <AttachmentUploadArea onChange={onFileChange} />
            <AttachmentList files={files} />
          </div>
          <Button className="mt-8 h-12 rounded-[5px] px-5 py-0" disabled={busy === "send"} onClick={onSend} type="button">
            {busy === "send" ? <Spinner className="h-5 w-5" /> : <span className="inline-flex items-center gap-2">Send Proposal <Send size={19} /></span>}
          </Button>
        </div>
        {calendarOpen ? (
          <ScheduleServiceCalendar
            busy={false}
            endDate={calendarEndDate}
            endPeriod={calendarEndPeriod}
            endTime={calendarEndTime}
            month={calendarMonth}
            mode={calendarMode}
            onClose={() => setCalendarOpen(false)}
            onEndPeriodChange={setCalendarEndPeriod}
            onEndTimeChange={setCalendarEndTime}
            onModeChange={setCalendarMode}
            onMonthChange={setCalendarMonth}
            onSelectDate={(date) => {
              const selected = dateOnly(date);
              setCalendarStartDate(selected);
              setCalendarEndDate(selected);
            }}
            onStartPeriodChange={setCalendarStartPeriod}
            onStartTimeChange={setCalendarStartTime}
            onSubmit={confirmCalendar}
            placement="fixed"
            startDate={calendarStartDate}
            startPeriod={calendarStartPeriod}
            startTime={calendarStartTime}
            title="Proposed Start Date"
            variant="start"
          />
        ) : null}
      </div>
    </SurfaceModal>
  );
}

function ApplicationDetailsModal({ application, conversation, onAcceptInvite, onClose, onDelete, onDownloadAttachment, onOpenChat, onWithdraw }: {
  application: Application;
  conversation?: JobConversation;
  onAcceptInvite: () => void;
  onClose: () => void;
  onDelete: () => void;
  onDownloadAttachment: (attachment: ProposalAttachment) => void;
  onOpenChat: () => void;
  onWithdraw: () => void;
}) {
  const status = applicationDisplayStatus(application, conversation);
  const canWithdraw = !isDeclinedApplication(application.status) && !isHiredApplication(application.status);
  const canDelete = isDeclinedApplication(application.status);

  return (
    <SurfaceModal onClose={onClose} panelClassName="max-h-[92vh] overflow-y-auto p-5 sm:p-7 lg:p-10" size="xl">
      <button aria-label="Close proposal" className="absolute right-5 top-5 text-black transition hover:text-[#196c88]" onClick={onClose} type="button"><X size={28} /></button>
      <div className="pt-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="text-[28px] font-medium text-[#5e5e5e]">Proposal</h2>
          <div className="text-left sm:text-right">
            <StatusPill tone="amber">{categoryName(application.job)}</StatusPill>
            <p className="mt-5 text-[17px] font-light text-[#a4a4a4]">Sent on {formatDateTime(application.created_at)}</p>
          </div>
        </div>
        <div className="mt-8 border-t border-dashed border-[#757575]" />
        <div className="mt-10 flex items-center justify-between gap-4">
          <p className="font-semibold text-[#196c88]">Applied {relativeDate(application.created_at).toLowerCase()}</p>
          <ApplicationStatusPill status={status} />
        </div>
        <h3 className="mt-8 text-[28px] font-medium leading-tight text-[#5e5e5e]">{application.job?.title ?? "Applied job"}</h3>
        <p className="mt-4 whitespace-pre-line text-[17px] font-light leading-8 text-[#8f8f8f]">{application.pitch}</p>
        <section className="mt-8 grid gap-4 rounded-[5px] border border-[#b8d1da] bg-[#fcfdfd] p-4 md:grid-cols-3">
          <div><p className="text-sm font-medium text-[#5e5e5e]">{isFixedPriceJob(application.job) ? "Proposed Price (Fixed Price)" : "Proposed Price"}</p><p className="mt-3 text-[22px] font-semibold text-[#5e5e5e]">{formatCurrency(application.proposed_rate)}</p></div>
          <div><p className="text-sm font-medium text-[#5e5e5e]">Estimated Duration</p><p className="mt-3 inline-flex items-center gap-2 text-[17px] text-[#5e5e5e]"><Clock3 className="text-[#196c88]" size={18} />{formatEstimatedDays(application.estimated_days)}</p></div>
          <div><p className="text-sm font-medium text-[#5e5e5e]">Proposed Start Date & Time</p><p className="mt-3 inline-flex items-center gap-2 text-[17px] text-[#5e5e5e]"><CalendarDays className="text-[#196c88]" size={18} />{formatDateTime(application.proposed_start_at)}</p></div>
        </section>
        <section className="mt-8 rounded-[5px] border border-[#b8d1da] p-4">
          <h3 className="text-[20px] font-medium text-[#5e5e5e]">Attachments</h3>
          <ReferenceImages images={application.reference_image_urls ?? []} />
          <AttachmentList attachments={application.proposal_attachments ?? []} onDownload={onDownloadAttachment} />
          {(application.reference_image_urls ?? []).length === 0 && (application.proposal_attachments ?? []).length === 0 ? <p className="mt-3 text-sm text-muted">No attachments were submitted.</p> : null}
        </section>
        <div className="mt-10 flex flex-wrap gap-4">
          {status === "invited" && !conversation ? <Button className="h-12 rounded-[5px] px-7 py-0" onClick={onAcceptInvite} type="button">Accept</Button> : null}
          {conversation ? <Button className="h-12 rounded-[5px] px-7 py-0" onClick={onOpenChat} type="button">Chat</Button> : null}
          {isHiredApplication(application.status) ? <Button className="h-12 rounded-[5px] px-7 py-0" disabled type="button" variant="secondary">Create Quote</Button> : null}
          {canWithdraw ? <Button className="h-12 rounded-[5px] border-[#196c88] px-7 py-0 text-[#196c88]" onClick={onWithdraw} type="button" variant="secondary">Withdraw</Button> : null}
          {canDelete ? <Button className="h-12 rounded-[5px] border-red-600 px-7 py-0 text-red-700" onClick={onDelete} type="button" variant="secondary">Delete</Button> : null}
        </div>
      </div>
    </SurfaceModal>
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

function ProfessionalActiveConversationCard({
  conversation,
  expanded,
  groupSize,
  job,
  onOpenChat,
  onToggle,
  onUploadDeliverables,
  onViewRequest
}: {
  conversation: JobConversation;
  expanded: boolean;
  groupSize: number;
  job?: Job | null;
  onOpenChat: (conversation: JobConversation) => void;
  onToggle: () => void;
  onUploadDeliverables: (conversation: JobConversation, files: FileList | null) => void;
  onViewRequest: (job: Job) => void;
}) {
  const workState = activeWorkState(conversation);
  const startedAt = activeStartedDate(conversation);
  const expectedAt = expectedCompletionDate(conversation);
  const deliverables = conversation.deliverables ?? [];
  const agreedPrice = conversation.application?.proposed_rate ?? jobPriceAmount(job);
  const upfrontPayment = agreedPrice ? Math.round(agreedPrice / 2) : null;
  const remainingPayment = finalPaymentAmount(conversation);
  const isCompleted = isCompletedConversation(conversation);
  const normalizedWorkStatus = (conversation.work_status ?? "in_progress").toLowerCase();
  const client = conversation.client;
  const location = [job?.location ?? conversation.job?.location, job?.state ?? conversation.job?.state].filter(Boolean).join(", ") || "Location not provided";

  return (
    <div className="rounded-[8px] border border-[#b8d1da] bg-[#fcfdfd] p-4 sm:p-6">
      <div className="rounded-[8px] border border-[#bdebd1] bg-[#f3fef3] p-4">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <ProfileAvatar avatarUrl={client?.avatar_url} className="h-14 w-14" iconSize={22} />
            <div className="min-w-0">
              <h2 className="text-[15px] font-medium leading-[1.5] text-[#5e5e5e]">{participantName(client)}</h2>
              <p className="mt-1 inline-flex items-center gap-1 text-[13px] text-[#5e5e5e]">
                <MapPin className="shrink-0 text-[#196c88]" size={15} strokeWidth={1.8} />
                {location}
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

        <div className="mt-5">
          <StatusPill tone="gray">{categoryName(job ?? conversation.job)}</StatusPill>
        </div>

        <div className="mt-6 grid gap-5 text-[14px] leading-[1.5] sm:grid-cols-3">
          <div>
            <p className="font-medium text-[#5e5e5e]">Work type</p>
            <p className="mt-2 font-light text-[#a4a4a4]">{job?.is_remote ?? conversation.job?.is_remote ? "Remote" : "In-person"}</p>
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

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button className="relative h-11 min-w-[132px] rounded-[5px] px-5 py-0" onClick={() => onOpenChat(conversation)} type="button">
            Chat
            {conversation.unread_message_count ? <span aria-hidden="true" className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#bf1d1d]" /> : null}
          </Button>
          {job ? (
            <Button className="h-11 min-w-[132px] rounded-[5px] border-[#196c88] px-5 py-0 text-[#196c88]" onClick={() => onViewRequest(job)} type="button" variant="secondary">
              View Profile
            </Button>
          ) : null}
          <MoreButton aria-label="More active job actions" />
          <button
            aria-label={expanded ? "Collapse job details" : "Expand job details"}
            aria-expanded={expanded}
            className="ml-auto grid h-10 w-10 place-items-center rounded-full border border-[#196c88] text-[#196c88] transition hover:bg-[#f2f6f8]"
            onClick={onToggle}
            type="button"
          >
            <ChevronDown className={`transition ${expanded ? "rotate-180" : ""}`} size={20} />
          </button>
        </div>
      </div>

      {expanded ? (
        <>
          <section className="mt-6 grid gap-8 rounded-[8px] border border-[#b8d1da] bg-white p-4 sm:p-6 lg:grid-cols-2">
            <div>
              <h3 className="text-[22px] font-medium leading-[1.3] text-[#5e5e5e] sm:text-[26px]">Job Details</h3>
              <div className="mt-7 space-y-4">
                <div>
                  <p className="text-[15px] font-medium text-[#5e5e5e]">Job Description</p>
                  <p className="mt-2 line-clamp-5 text-[14px] font-light leading-6 text-[#757575]">{job?.description ?? conversation.job?.description ?? conversation.application?.pitch ?? "No description available"}</p>
                </div>
                <p className="text-[15px] text-[#5e5e5e]">
                  Number of professionals Hired: <span className="ml-3 text-[20px] font-medium text-[#196c88]">{groupSize}</span>
                </p>
                <p className="text-[15px] text-[#5e5e5e]">
                  Agreed Price: <span className="ml-3 text-[20px] font-medium text-[#196c88]">{formatCurrency(agreedPrice)}</span>
                </p>
              </div>
            </div>
            <div>
              <h3 className="text-[22px] font-medium leading-[1.3] text-[#5e5e5e] sm:text-[26px]">Job Progress</h3>
              <div className="relative mt-7">
                <span className="absolute left-[18px] top-4 h-[150px] w-px bg-[#5e5e5e]" />
                <ProgressStep
                  index={1}
                  label={isCompleted ? "In progress" : workState.label}
                  helper={`Started on ${formatDisplayDate(startedAt)}`}
                  tone={normalizedWorkStatus === "completed" ? "green" : workState.stepTone}
                />
                <ProgressStep
                  index={2}
                  label={conversation.revision_requested_at ? "Revision" : "Revision"}
                  helper={conversation.revision_requested_at ? `Revision received on ${formatDisplayDate(conversation.revision_requested_at)}` : undefined}
                  tone={conversation.revision_requested_at || normalizedWorkStatus === "completed" ? "green" : "gray"}
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

          <section className="mt-6 grid gap-8 rounded-[8px] border border-[#b8d1da] bg-white p-4 sm:p-6 lg:grid-cols-2">
            <div>
              <h3 className="text-[22px] font-medium leading-[1.3] text-[#5e5e5e] sm:text-[26px]">Deliverables</h3>
              {!isCompleted ? (
                <div className="mt-4 max-w-[270px]">
                  <AttachmentUploadArea onChange={(files) => onUploadDeliverables(conversation, files)} />
                </div>
              ) : null}
              <AttachmentList attachments={deliverables} />
              {deliverables.length === 0 ? <p className="mt-4 text-sm text-muted">No files submitted yet.</p> : null}
            </div>
            <div>
              <h3 className="text-[22px] font-medium leading-[1.3] text-[#5e5e5e] sm:text-[26px]">Payment</h3>
              <div className="mt-7 space-y-5 text-[15px] text-[#5e5e5e]">
                <p>
                  Upfront Payment: <span className="ml-3 text-[18px] font-medium text-[#0fa269]">{formatPaymentAmount(upfrontPayment)}</span>
                  {conversation.upfront_payment_made_at ? <span className="ml-2 text-[13px] font-semibold text-[#0fa269]">(Payment made)</span> : null}
                </p>
                <p>
                  Remaining Payment: <span className={`ml-3 text-[18px] font-medium ${conversation.final_payment_made_at ? "text-[#0fa269]" : "text-[#f4a422]"}`}>{formatPaymentAmount(remainingPayment)}</span>
                  <span className={`ml-2 text-[13px] font-semibold ${conversation.final_payment_made_at ? "text-[#0fa269]" : "text-[#f4a422]"}`}>
                    {conversation.final_payment_made_at ? "(Payment made)" : "(Released after job confirmation)"}
                  </span>
                </p>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function ProfessionalActiveJobGroupCard({
  group,
  onOpenChat,
  onUploadDeliverables,
  onViewRequest
}: {
  group: ConversationGroup;
  onOpenChat: (conversation: JobConversation) => void;
  onUploadDeliverables: (conversation: JobConversation, files: FileList | null) => void;
  onViewRequest: (job: Job) => void;
}) {
  const [expandedConversationId, setExpandedConversationId] = useState(group.conversations[0]?.id ?? "");
  const job = group.job ?? group.conversations[0]?.job;

  useEffect(() => {
    setExpandedConversationId((current) => {
      if (!current || group.conversations.some((conversation) => conversation.id === current)) return current;
      return group.conversations[0]?.id ?? "";
    });
  }, [group.conversations]);

  if (group.conversations.length === 0) return null;

  return (
    <article className="rounded-[8px] border border-[#b8d1da] bg-white p-4 sm:p-6 lg:p-8">
      <div className="space-y-8">
        {group.conversations.map((conversation) => (
          <ProfessionalActiveConversationCard
            conversation={conversation}
            expanded={expandedConversationId === conversation.id}
            groupSize={group.conversations.length}
            job={job as Job | null}
            key={conversation.id}
            onOpenChat={onOpenChat}
            onToggle={() => setExpandedConversationId((current) => current === conversation.id ? "" : conversation.id)}
            onUploadDeliverables={onUploadDeliverables}
            onViewRequest={onViewRequest}
          />
        ))}
      </div>
    </article>
  );
}

function ProfessionalJobsContent() {
  const searchParams = useSearchParams();
  const token = useRequireAuth();
  const { jobs, error: loadError, loading, apply: submitApplication, refresh: refreshMatchedJobs } = useMatchedJobs();
  const { applications, error: applicationError, loading: applicationsLoading, refresh: refreshApplications } = useMyApplications();
  const { conversations, error: conversationError, refresh: refreshConversations } = useConversations();
  const showToast = useToast();
  const [search, setSearch] = useState("");
  const [proposalForms, setProposalForms] = useState<Record<string, ProposalFormState>>({});
  const [proposalFilesByJob, setProposalFilesByJob] = useState<Record<string, File[]>>({});
  const [requestJob, setRequestJob] = useState<Job | null>(null);
  const [proposalJob, setProposalJob] = useState<Job | null>(null);
  const [applicationModal, setApplicationModal] = useState<Application | null>(null);
  const [busy, setBusy] = useState("");
  const [chatConversation, setChatConversation] = useState<JobConversation | null>(null);
  const [inquiryConversation, setInquiryConversation] = useState<ProfessionalInquiry | null>(null);
  const [openedConversationId, setOpenedConversationId] = useState("");
  const [openedInquiryId, setOpenedInquiryId] = useState("");
  const [activeFilter, setActiveFilter] = useState<ProfessionalRequestFilter>("service");
  const [matchedPage, setMatchedPage] = useState(1);
  const [showAllApplications, setShowAllApplications] = useState(false);
  const [proposalSuccessOpen, setProposalSuccessOpen] = useState(false);
  const conversationIdParam = searchParams.get("conversation_id");
  const inquiryIdParam = searchParams.get("inquiry_id");
  const appliedJobIds = useMemo(() => new Set(applications.map((application) => application.job_id)), [applications]);
  const query = search.trim().toLowerCase();
  const matchedJobs = useMemo(() => jobs
    .filter((job) => !appliedJobIds.has(job.id))
    .filter((job) => !query || `${job.title} ${job.description} ${categoryName(job)} ${job.location ?? ""} ${job.state ?? ""}`.toLowerCase().includes(query)), [appliedJobIds, jobs, query]);
  const filteredApplications = useMemo(() => applications
    .filter((application) => !query || `${application.job?.title ?? ""} ${application.pitch} ${categoryName(application.job)} ${application.job?.location ?? ""} ${application.job?.state ?? ""}`.toLowerCase().includes(query)), [applications, query]);
  const activeConversations = useMemo(() => conversations.filter(isActiveConversation), [conversations]);
  const completedConversations = useMemo(() => conversations.filter((conversation) => Boolean(conversation.upfront_payment_made_at) && isCompletedConversation(conversation)), [conversations]);
  const rejectedApplications = useMemo(() => filteredApplications.filter((application) => isDeclinedApplication(application.status)), [filteredApplications]);
  const activeGroups = useMemo(() => groupConversationsByJob(activeConversations, jobs), [activeConversations, jobs]);
  const completedGroups = useMemo(() => groupConversationsByJob(completedConversations, jobs), [completedConversations, jobs]);
  const conversationsByApplicationId = useMemo(() => {
    const entries = conversations
      .filter((conversation) => Boolean(conversation.application_id))
      .map((conversation) => [conversation.application_id!, conversation] as const);
    return new Map(entries);
  }, [conversations]);
  const matchedPageCount = Math.max(1, Math.ceil(matchedJobs.length / MATCHED_REQUESTS_PAGE_SIZE));
  const visibleMatchedJobs = matchedJobs.slice((matchedPage - 1) * MATCHED_REQUESTS_PAGE_SIZE, matchedPage * MATCHED_REQUESTS_PAGE_SIZE);
  const visibleApplications = showAllApplications ? filteredApplications : filteredApplications.slice(0, APPLICATION_PREVIEW_LIMIT);
  const filterDots: Record<ProfessionalRequestFilter, boolean> = {
    service: applications.some((application) => Boolean(conversationsByApplicationId.get(application.id)?.unread_message_count)),
    active: activeConversations.some((conversation) => Boolean(conversation.unread_message_count)),
    completed: completedConversations.some((conversation) => Boolean(conversation.unread_message_count)),
    rejected: rejectedApplications.some((application) => Boolean(conversationsByApplicationId.get(application.id)?.unread_message_count))
  };
  const filterCounts: Record<ProfessionalRequestFilter, number> = {
    service: matchedJobs.length + filteredApplications.length,
    active: activeGroups.length,
    completed: completedGroups.length,
    rejected: rejectedApplications.length
  };

  useEffect(() => { if (loadError) showToast({ tone: "error", title: "Could not load matched jobs", body: loadError }); }, [loadError, showToast]);
  useEffect(() => { if (applicationError) showToast({ tone: "error", title: "Could not load applications", body: applicationError }); }, [applicationError, showToast]);
  useEffect(() => { if (conversationError) showToast({ tone: "error", title: "Could not load chats", body: conversationError }); }, [conversationError, showToast]);
  useEffect(() => {
    setMatchedPage(1);
  }, [query]);
  useEffect(() => {
    if (matchedPage > matchedPageCount) setMatchedPage(matchedPageCount);
  }, [matchedPage, matchedPageCount]);

  useEffect(() => {
    if (!conversationIdParam || openedConversationId === conversationIdParam) return;
    const conversation = conversations.find((item) => item.id === conversationIdParam);
    if (!conversation) return;
    setChatConversation(conversation);
    setOpenedConversationId(conversationIdParam);
  }, [conversationIdParam, conversations, openedConversationId]);

  useEffect(() => {
    if (!token || !inquiryIdParam || openedInquiryId === inquiryIdParam) return;
    getProfessionalInquiries(token)
      .then((data) => {
        const inquiry = data.inquiries.find((item) => item.id === inquiryIdParam);
        if (inquiry) {
          setInquiryConversation(inquiry);
          setOpenedInquiryId(inquiryIdParam);
        }
      })
      .catch((err) => showToast({ tone: "error", title: "Inquiry unavailable", body: err instanceof Error ? err.message : "Could not open inquiry" }));
  }, [inquiryIdParam, openedInquiryId, showToast, token]);

  function formFor(jobId: string) {
    return proposalForms[jobId] ?? defaultProposalState();
  }

  function updateForm(jobId: string, next: Partial<ProposalFormState>) {
    setProposalForms((current) => ({ ...current, [jobId]: { ...(current[jobId] ?? defaultProposalState()), ...next } }));
  }

  async function openProposal(job: Job) {
    setRequestJob(null);
    setProposalJob(job);
    if (!token) return;
    try {
      const data = await getProposalDraft(token, job.id);
      const savedDraft = data.draft;
      if (savedDraft) {
        const fixedAmount = isFixedPriceJob(job) ? jobPriceAmount(job) : null;
        setProposalForms((current) => ({
          ...current,
          [job.id]: {
            pitch: savedDraft.pitch ?? "",
            proposedRate: fixedAmount !== null ? String(fixedAmount) : savedDraft.proposed_rate ? String(savedDraft.proposed_rate) : "",
            estimatedDays: savedDraft.estimated_days ? String(savedDraft.estimated_days) : "5",
            proposedStartAt: dateTimeInputValue(savedDraft.proposed_start_at)
          }
        }));
      } else if (isFixedPriceJob(job)) {
        const fixedAmount = jobPriceAmount(job);
        if (fixedAmount !== null) updateForm(job.id, { proposedRate: String(fixedAmount) });
      }
    } catch (err) {
      showToast({ tone: "error", title: "Draft unavailable", body: err instanceof Error ? err.message : "Could not load proposal draft" });
    }
  }

  async function saveDraft(job: Job) {
    if (!token) return;
    const form = formFor(job.id);
    const fixedAmount = isFixedPriceJob(job) ? jobPriceAmount(job) : null;
    setBusy("draft");
    try {
      await saveProposalDraft(token, {
        job_id: job.id,
        pitch: form.pitch || null,
        proposed_rate: fixedAmount ?? (form.proposedRate ? Number(form.proposedRate) : null),
        estimated_days: form.estimatedDays ? Number(form.estimatedDays) : null,
        proposed_start_at: isoFromDateTimeInput(form.proposedStartAt),
        reference_image_urls: []
      });
      showToast({ tone: "success", title: "Draft saved", body: "You can return to this proposal later." });
    } catch (err) {
      showToast({ tone: "error", title: "Draft not saved", body: err instanceof Error ? err.message : "Could not save draft" });
    } finally {
      setBusy("");
    }
  }

  async function submitProposal(job: Job) {
    const form = formFor(job.id);
    const fixedAmount = isFixedPriceJob(job) ? jobPriceAmount(job) : null;
    setBusy("send");
    try {
      const data = await submitApplication(job.id, form.pitch, fixedAmount ?? (form.proposedRate ? Number(form.proposedRate) : null), form.estimatedDays ? Number(form.estimatedDays) : null, [], isoFromDateTimeInput(form.proposedStartAt));
      const proposalFiles = proposalFilesByJob[job.id] ?? [];
      if (token && proposalFiles.length > 0) await Promise.all(proposalFiles.map((file) => uploadApplicationAttachment(token, data.application_id, file)));
      showToast({ tone: "success", title: "Application sent", body: "The client can now review your proposal." });
      setProposalForms((current) => ({ ...current, [job.id]: defaultProposalState() }));
      setProposalFilesByJob((current) => ({ ...current, [job.id]: [] }));
      setProposalJob(null);
      setProposalSuccessOpen(true);
      await refreshApplications();
      refreshMatchedJobs();
    } catch (err) {
      showToast({ tone: "error", title: "Application failed", body: err instanceof Error ? err.message : "Could not apply" });
    } finally {
      setBusy("");
    }
  }

  function addProposalFiles(jobId: string, files: FileList | null) {
    try {
      setProposalFilesByJob((current) => ({ ...current, [jobId]: readProposalFiles(files, current[jobId] ?? []) }));
    } catch (err) {
      showToast({ tone: "error", title: "Attachment upload failed", body: err instanceof Error ? err.message : "Could not add proposal attachments" });
    }
  }

  async function acceptInvite(application: Application) {
    if (!token) return;
    setBusy(`accept-${application.id}`);
    try {
      await acceptApplicationInvite(token, application.id);
      await refreshApplications();
      refreshConversations();
      showToast({ tone: "success", title: "Invitation accepted", body: "Chat is now available with the client." });
    } catch (err) {
      showToast({ tone: "error", title: "Could not accept invite", body: err instanceof Error ? err.message : "Invitation could not be accepted" });
    } finally {
      setBusy("");
    }
  }

  async function withdraw(application: Application) {
    if (!token) return;
    setBusy(`withdraw-${application.id}`);
    try {
      await withdrawApplication(token, application.id);
      await refreshApplications();
      refreshConversations();
      setApplicationModal((current) => current?.id === application.id ? { ...current, status: "withdrawn" } : current);
      showToast({ tone: "success", title: "Application withdrawn", body: "The client has been notified." });
    } catch (err) {
      showToast({ tone: "error", title: "Could not withdraw", body: err instanceof Error ? err.message : "Application could not be withdrawn" });
    } finally {
      setBusy("");
    }
  }

  async function remove(application: Application) {
    if (!token) return;
    setBusy(`delete-${application.id}`);
    try {
      await deleteApplication(token, application.id);
      await refreshApplications();
      setApplicationModal(null);
      showToast({ tone: "success", title: "Application deleted", body: "The inactive application was removed." });
    } catch (err) {
      showToast({ tone: "error", title: "Could not delete", body: err instanceof Error ? err.message : "Application could not be deleted" });
    } finally {
      setBusy("");
    }
  }

  async function downloadAttachment(application: Application, attachment: ProposalAttachment) {
    if (!token) return;
    try {
      const data = await getApplicationAttachmentAccess(token, application.id, attachment.id);
      const link = document.createElement("a");
      link.href = data.signed_url;
      link.download = attachment.name;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.click();
    } catch (err) {
      showToast({ tone: "error", title: "Download failed", body: err instanceof Error ? err.message : "Could not download attachment" });
    }
  }

  async function uploadDeliverables(conversation: JobConversation, files: FileList | null) {
    const deliverableFiles = Array.from(files ?? []);
    if (!token || deliverableFiles.length === 0) return;

    setBusy(`deliverables-${conversation.id}`);
    try {
      await Promise.all(deliverableFiles.map((file) => uploadConversationDeliverable(token, conversation.id, file)));
      refreshConversations();
      showToast({ tone: "success", title: "Deliverables uploaded", body: "The client can now review the submitted files." });
    } catch (err) {
      showToast({ tone: "error", title: "Deliverable upload failed", body: err instanceof Error ? err.message : "Could not upload deliverables" });
    } finally {
      setBusy("");
    }
  }

  if (loading || applicationsLoading) return <AppShell><PageLoader /></AppShell>;

  return (
    <AppShell>
      <div className="relative left-1/2 w-full max-w-[1180px] -translate-x-1/2">
      <div className="mb-8">
        <p className="text-[20px] font-medium text-[#196c88]">Search Request And Application</p>
        <h1 className="mt-10 text-[28px] font-light leading-tight text-[#5e5e5e] sm:text-[34px]">Find matched service request</h1>
        <label className="mt-8 flex min-h-14 items-center gap-3 rounded-[6px] border border-line bg-white px-5 text-[#a4a4a4]">
          <span className="sr-only">Search requests and applications</span>
          <Search size={18} />
          <input className="w-full bg-transparent text-[18px] outline-none placeholder:text-[#a4a4a4]" onChange={(event) => setSearch(event.target.value)} placeholder="Search" value={search} />
        </label>
      </div>

      <nav aria-label="Service request filters" className="mb-8 border-b-[3px] border-[#d4d4d4]">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 sm:grid-cols-4 sm:gap-x-0">
          {(["service", "active", "completed", "rejected"] as ProfessionalRequestFilter[]).map((filter) => {
            const active = activeFilter === filter;
            return (
              <button
                aria-current={active ? "page" : undefined}
                className={`flex min-w-0 px-0 pt-1 text-[13px] font-medium leading-[1.5] transition sm:text-[14px] md:text-[16px] lg:text-[18px] ${filter === "service" ? "justify-start text-left" : filter === "rejected" ? "justify-start text-left sm:justify-end sm:text-right" : "justify-start text-left sm:justify-center sm:text-center"} ${active ? "text-[#196c88]" : "text-[#a4a4a4] hover:text-[#196c88]"}`}
                key={filter}
                onClick={() => setActiveFilter(filter)}
                type="button"
              >
                <span className={`relative -mb-[3px] inline-flex max-w-full items-center border-b-4 pb-2 ${active ? "border-[#196c88]" : "border-transparent"}`}>
                  {professionalRequestFilterLabels[filter]}({filterCounts[filter]})
                  {filterDots[filter] && filterCounts[filter] > 0 ? <span aria-hidden="true" className="absolute -right-4 -top-1.5 h-2.5 w-2.5 rounded-full bg-[#bf1d1d]" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {activeFilter === "service" ? (
      <div className="grid gap-8 xl:grid-cols-[minmax(320px,0.9fr)_minmax(360px,1.1fr)]">
        <section className="min-w-0">
          <h2 className="mb-7 text-[28px] font-semibold text-[#5e5e5e]">Matched Service Request({matchedJobs.length})</h2>
          {matchedJobs.length === 0 ? <EmptyState title="No matched requests" body="New matching service requests will appear here." /> : null}
          <div className="space-y-7">{visibleMatchedJobs.map((job) => <MatchedServiceCard job={job} key={job.id} onOpen={() => setRequestJob(job)} />)}</div>
          {matchedPageCount > 1 ? (
            <div className="mt-7 flex items-center justify-center gap-4 text-[#196c88]">
              <button aria-label="Previous matched requests page" className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-[#f2f6f8] disabled:cursor-not-allowed disabled:opacity-40" disabled={matchedPage === 1} onClick={() => setMatchedPage((page) => Math.max(1, page - 1))} type="button">
                <ChevronLeft size={20} />
              </button>
              {Array.from({ length: matchedPageCount }).map((_, index) => {
                const page = index + 1;
                return (
                  <button
                    aria-current={matchedPage === page ? "page" : undefined}
                    className={`grid h-8 w-8 place-items-center rounded-[5px] text-sm font-semibold transition ${matchedPage === page ? "bg-[#196c88] text-white" : "text-[#196c88] hover:bg-[#f2f6f8]"}`}
                    key={page}
                    onClick={() => setMatchedPage(page)}
                    type="button"
                  >
                    {page}
                  </button>
                );
              })}
              <button aria-label="Next matched requests page" className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-[#f2f6f8] disabled:cursor-not-allowed disabled:opacity-40" disabled={matchedPage === matchedPageCount} onClick={() => setMatchedPage((page) => Math.min(matchedPageCount, page + 1))} type="button">
                <ChevronRight size={20} />
              </button>
            </div>
          ) : null}
        </section>

        <section className="min-w-0">
          <h2 className="mb-7 text-[28px] font-semibold text-[#5e5e5e]">My Applications({filteredApplications.length})</h2>
          {filteredApplications.length === 0 ? <EmptyState title="No applications yet" body="Send a proposal to a matched request and it will stay here." /> : null}
          <div className="space-y-7">
            {visibleApplications.map((application) => {
              const conversation = conversationsByApplicationId.get(application.id);
              return (
                <ApplicationCard
                  application={application}
                  conversation={conversation}
                  key={application.id}
                  onAcceptInvite={() => acceptInvite(application)}
                  onDelete={() => remove(application)}
                  onOpenChat={() => conversation && setChatConversation(conversation)}
                  onView={() => setApplicationModal(application)}
                  onWithdraw={() => withdraw(application)}
                />
              );
            })}
          </div>
          {!showAllApplications && filteredApplications.length > APPLICATION_PREVIEW_LIMIT ? (
            <div className="mt-8 flex justify-end">
              <button className="inline-flex items-center gap-2 text-sm font-semibold text-[#196c88] transition hover:text-[#125a73]" onClick={() => setShowAllApplications(true)} type="button">
                See all application
                <ChevronRight size={18} />
              </button>
            </div>
          ) : null}
        </section>
      </div>
      ) : null}

      {activeFilter === "active" ? (
        <div className="space-y-6">
          {activeGroups.length === 0 ? <EmptyState title="No active jobs yet" body="Jobs appear here once the agreed scheduled start date has arrived." /> : null}
          {activeGroups.map((group) => (
            <ProfessionalActiveJobGroupCard
              group={group}
              key={group.jobId}
              onOpenChat={setChatConversation}
              onUploadDeliverables={uploadDeliverables}
              onViewRequest={setRequestJob}
            />
          ))}
        </div>
      ) : null}

      {activeFilter === "completed" ? (
        <div className="space-y-6">
          {completedGroups.length === 0 ? <EmptyState title="No completed jobs yet" body="Completed jobs will appear here after client confirmation." /> : null}
          {completedGroups.map((group) => (
            <ProfessionalActiveJobGroupCard
              group={group}
              key={group.jobId}
              onOpenChat={setChatConversation}
              onUploadDeliverables={uploadDeliverables}
              onViewRequest={setRequestJob}
            />
          ))}
        </div>
      ) : null}

      {activeFilter === "rejected" ? (
        <section className="space-y-7">
          {rejectedApplications.length === 0 ? <EmptyState title="No rejected applications" body="Rejected or withdrawn applications will appear here." /> : null}
          {rejectedApplications.map((application) => {
            const conversation = conversationsByApplicationId.get(application.id);
            return (
              <ApplicationCard
                application={application}
                conversation={conversation}
                key={application.id}
                onAcceptInvite={() => acceptInvite(application)}
                onDelete={() => remove(application)}
                onOpenChat={() => conversation && setChatConversation(conversation)}
                onView={() => setApplicationModal(application)}
                onWithdraw={() => withdraw(application)}
              />
            );
          })}
        </section>
      ) : null}
      </div>

      {requestJob ? <RequestDetailsModal job={requestJob} onClose={() => setRequestJob(null)} onSendProposal={() => openProposal(requestJob)} /> : null}
      {proposalJob ? (
        <CreateProposalModal
          busy={busy}
          files={proposalFilesByJob[proposalJob.id] ?? []}
          form={formFor(proposalJob.id)}
          job={proposalJob}
          onClose={() => setProposalJob(null)}
          onFileChange={(files) => addProposalFiles(proposalJob.id, files)}
          onFormChange={(next) => updateForm(proposalJob.id, next)}
          onSaveDraft={() => saveDraft(proposalJob)}
          onSend={() => submitProposal(proposalJob)}
        />
      ) : null}
      {applicationModal ? (
        <ApplicationDetailsModal
          application={applications.find((item) => item.id === applicationModal.id) ?? applicationModal}
          conversation={conversations.find((item) => item.application_id === applicationModal.id)}
          onAcceptInvite={() => acceptInvite(applicationModal)}
          onClose={() => setApplicationModal(null)}
          onDelete={() => remove(applicationModal)}
          onDownloadAttachment={(attachment) => downloadAttachment(applicationModal, attachment)}
          onOpenChat={() => {
            const conversation = conversations.find((item) => item.application_id === applicationModal.id);
            if (conversation) setChatConversation(conversation);
          }}
          onWithdraw={() => withdraw(applicationModal)}
        />
      ) : null}
      {busy ? <div className="fixed bottom-5 right-5 z-[110] inline-flex items-center gap-2 rounded-[5px] bg-white px-4 py-3 text-sm font-semibold text-[#196c88] shadow-lg"><Spinner className="h-4 w-4" /> Working</div> : null}
      {chatConversation ? <ChatModal conversation={chatConversation} onClose={() => setChatConversation(null)} /> : null}
      {inquiryConversation ? <ChatModal conversation={inquiryConversation} kind="inquiry" onClose={() => setInquiryConversation(null)} /> : null}
      {proposalSuccessOpen ? (
        <SurfaceModal onClose={() => setProposalSuccessOpen(false)} panelClassName="p-8 sm:p-12" size="md">
          <div className="py-4 text-center">
            <div className="mx-auto grid h-48 w-48 place-items-center rounded-full bg-[#e6f6ef] sm:h-60 sm:w-60">
              <CheckCircle2 className="text-[#0b8b5a]" size={104} strokeWidth={1.6} />
            </div>
            <h2 className="mt-8 text-[24px] font-semibold text-[#5e5e5e]">Proposal Submitted!</h2>
          </div>
        </SurfaceModal>
      ) : null}
    </AppShell>
  );
}

export default function ProfessionalJobsPage() {
  return (
    <Suspense fallback={<AppShell><PageLoader /></AppShell>}>
      <ProfessionalJobsContent />
    </Suspense>
  );
}
