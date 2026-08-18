"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, ImagePlus, MessageCircle, PencilLine, Save, Send, Trash2, X } from "lucide-react";
import { AppShell, EmptyState } from "@/components/app-shell";
import { ChatModal } from "@/components/chat-modal";
import { ApplicationStatusPill, Button, IconButton, PageLoader, Spinner, StatusPill, TextAreaField, TextField } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useConversations } from "@/hooks/use-conversations";
import { useRequireAuth } from "@/hooks/use-auth";
import { useMatchedJobs, useMyApplications } from "@/hooks/use-jobs";
import { uploadConversationDeliverable } from "@/services/conversation-service";
import { getProfessionalInquiries } from "@/services/inquiry-service";
import { deleteApplicationAttachment, uploadApplicationAttachment } from "@/services/job-service";
import type { Application, JobConversation, ProfessionalInquiry, ProposalAttachment } from "@/types";

const MAX_PROPOSAL_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_PROPOSAL_ATTACHMENT_TOTAL_BYTES = 25 * 1024 * 1024;
const MAX_PROPOSAL_ATTACHMENTS = 5;
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

function readImages(files: FileList | null): Promise<string[]> {
  const images = Array.from(files ?? []).filter((file) => file.type.startsWith("image/")).slice(0, 3);

  return Promise.all(images.map((file) => new Promise<string>((resolve, reject) => {
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error("Each reference image must be smaller than 5MB."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        resolve("");
        return;
      }

      const image = new window.Image();
      image.onload = () => {
        const maxDimension = 1200;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");

        if (!context) {
          resolve(reader.result as string);
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.onerror = () => reject(new Error("Could not compress one of the selected images."));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Could not read one of the selected images."));
    reader.readAsDataURL(file);
  })));
}

function readProposalFiles(files: FileList | null, existingAttachments: ProposalAttachment[] = []) {
  const nextFiles = Array.from(files ?? []);
  if (nextFiles.length === 0) return [];
  if (existingAttachments.length + nextFiles.length > MAX_PROPOSAL_ATTACHMENTS) {
    throw new Error(`You can attach up to ${MAX_PROPOSAL_ATTACHMENTS} proposal files.`);
  }

  const existingSize = existingAttachments.reduce((sum, attachment) => sum + attachment.size, 0);
  const incomingSize = nextFiles.reduce((sum, file) => sum + file.size, 0);
  if (existingSize + incomingSize > MAX_PROPOSAL_ATTACHMENT_TOTAL_BYTES) {
    throw new Error("Proposal attachments cannot exceed 25MB total.");
  }

  for (const file of nextFiles) {
    if (!supportedProposalAttachmentTypes.has(file.type)) {
      throw new Error("Only PDF, CSV, Excel, Word, JPEG, PNG, and WebP files are supported.");
    }
    if (file.size === 0 || file.size > MAX_PROPOSAL_ATTACHMENT_BYTES) {
      throw new Error("Each proposal attachment must be between 1 byte and 10MB.");
    }
  }

  return nextFiles;
}

function ReferenceImages({ images }: { images: string[] }) {
  if (images.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {images.map((image, index) => (
        <img alt={`Work reference ${index + 1}`} className="h-20 w-24 rounded-md border border-line object-cover" decoding="async" key={image.slice(0, 48)} loading="lazy" src={image} />
      ))}
    </div>
  );
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function ProposalAttachmentList({
  attachments,
  files = [],
  onDelete
}: {
  attachments?: ProposalAttachment[];
  files?: File[];
  onDelete?: (attachmentId: string) => void;
}) {
  const hasItems = (attachments?.length ?? 0) > 0 || files.length > 0;
  if (!hasItems) return null;

  return (
    <div className="mt-3 grid gap-2">
      {attachments?.map((attachment) => (
        <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-white p-3 text-sm" key={attachment.id}>
          <span className="flex min-w-0 items-center gap-2">
            <FileText className="shrink-0 text-brand" size={16} />
            <span className="min-w-0">
              <span className="block truncate font-semibold text-ink">{attachment.name}</span>
              <span className="text-xs text-muted">{formatFileSize(attachment.size)}</span>
            </span>
          </span>
          {onDelete ? (
            <button className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-red-700 transition hover:bg-red-50" onClick={() => onDelete(attachment.id)} type="button" aria-label={`Remove ${attachment.name}`}>
              <Trash2 size={15} />
            </button>
          ) : null}
        </div>
      ))}
      {files.map((file) => (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-line bg-slate-50 p-3 text-sm" key={`${file.name}-${file.size}`}>
          <FileText className="shrink-0 text-brand" size={16} />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink">{file.name}</span>
            <span className="text-xs text-muted">{formatFileSize(file.size)} ready to upload</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function FileActionButton({
  accept = "image/*",
  label,
  onChange
}: {
  accept?: string;
  label: string;
  onChange: (files: FileList | null) => void;
}) {
  return (
    <label className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md active:translate-y-0">
        <ImagePlus size={18} />
        {label}
      <input accept={accept} className="sr-only" multiple onChange={(event) => onChange(event.target.files)} type="file" />
    </label>
  );
}

function ProfessionalJobsContent() {
  const searchParams = useSearchParams();
  const token = useRequireAuth();
  const { jobs, error: loadError, loading, apply: submitApplication, refresh: refreshMatchedJobs } = useMatchedJobs();
  const { applications, error: applicationError, loading: applicationsLoading, saveApplication, refresh: refreshApplications } = useMyApplications();
  const { conversations, error: conversationError, refresh: refreshConversations } = useConversations();
  const showToast = useToast();
  const [pitchByJob, setPitchByJob] = useState<Record<string, string>>({});
  const [proposedRateByJob, setProposedRateByJob] = useState<Record<string, string>>({});
  const [estimatedDaysByJob, setEstimatedDaysByJob] = useState<Record<string, string>>({});
  const [referencesByJob, setReferencesByJob] = useState<Record<string, string[]>>({});
  const [proposalFilesByJob, setProposalFilesByJob] = useState<Record<string, File[]>>({});
  const [editing, setEditing] = useState<Record<string, { pitch: string; proposed_rate: string; estimated_days: string; reference_image_urls: string[]; proposal_attachments: ProposalAttachment[] }>>({});
  const [applyingJobId, setApplyingJobId] = useState("");
  const [savingApplicationId, setSavingApplicationId] = useState("");
  const [uploadingAttachmentFor, setUploadingAttachmentFor] = useState("");
  const [deletingAttachmentId, setDeletingAttachmentId] = useState("");
  const [uploadingDeliverableFor, setUploadingDeliverableFor] = useState("");
  const [chatConversation, setChatConversation] = useState<JobConversation | null>(null);
  const [inquiryConversation, setInquiryConversation] = useState<ProfessionalInquiry | null>(null);
  const [openedConversationId, setOpenedConversationId] = useState("");
  const [openedInquiryId, setOpenedInquiryId] = useState("");
  const conversationIdParam = searchParams.get("conversation_id");
  const inquiryIdParam = searchParams.get("inquiry_id");
  const appliedJobIds = new Set(applications.map((application) => application.job_id));
  const availableJobs = jobs.filter((job) => !appliedJobIds.has(job.id));

  useEffect(() => {
    if (loadError) {
      showToast({ tone: "error", title: "Could not load matched jobs", body: loadError });
    }
  }, [loadError, showToast]);

  useEffect(() => {
    if (applicationError) {
      showToast({ tone: "error", title: "Could not load applications", body: applicationError });
    }
  }, [applicationError, showToast]);

  useEffect(() => {
    if (conversationError) {
      showToast({ tone: "error", title: "Could not load chats", body: conversationError });
    }
  }, [conversationError, showToast]);

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
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Could not open inquiry";
        showToast({ tone: "error", title: "Inquiry unavailable", body: message });
      });
  }, [inquiryIdParam, openedInquiryId, showToast, token]);

  async function apply(jobId: string) {
    if ((referencesByJob[jobId] ?? []).length === 0) {
      showToast({
        tone: "error",
        title: "Supporting images required",
        body: "You need to attach supporting images for your application."
      });
      return;
    }

    setApplyingJobId(jobId);

    try {
      const proposedRate = proposedRateByJob[jobId] ? Number(proposedRateByJob[jobId]) : null;
      const estimatedDays = estimatedDaysByJob[jobId] ? Number(estimatedDaysByJob[jobId]) : null;
      const data = await submitApplication(jobId, pitchByJob[jobId], proposedRate, estimatedDays, referencesByJob[jobId] ?? []);
      const proposalFiles = proposalFilesByJob[jobId] ?? [];

      if (token && proposalFiles.length > 0) {
        await Promise.all(proposalFiles.map((file) => uploadApplicationAttachment(token, data.application_id, file)));
      }

      showToast({
        tone: "success",
        title: "Application sent",
        body: "The client can now review your pitch and references."
      });
      setPitchByJob((current) => ({ ...current, [jobId]: "" }));
      setProposedRateByJob((current) => ({ ...current, [jobId]: "" }));
      setEstimatedDaysByJob((current) => ({ ...current, [jobId]: "" }));
      setReferencesByJob((current) => ({ ...current, [jobId]: [] }));
      setProposalFilesByJob((current) => ({ ...current, [jobId]: [] }));
      await refreshApplications();
      refreshMatchedJobs();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not apply";
      showToast({ tone: "error", title: "Application failed", body: message });
    } finally {
      setApplyingJobId("");
    }
  }

  async function uploadReferences(jobId: string, files: FileList | null) {
    try {
      const images = await readImages(files);
      setReferencesByJob((current) => ({ ...current, [jobId]: images }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not add references";
      showToast({ tone: "error", title: "Reference upload failed", body: message });
    }
  }

  function addProposalFiles(jobId: string, files: FileList | null) {
    try {
      const nextFiles = readProposalFiles(files);
      setProposalFilesByJob((current) => ({ ...current, [jobId]: nextFiles }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not add proposal attachments";
      showToast({ tone: "error", title: "Attachment upload failed", body: message });
    }
  }

  async function uploadApplicationReferences(applicationId: string, files: FileList | null) {
    try {
      const images = await readImages(files);
      setEditing((current) => ({
        ...current,
        [applicationId]: {
          ...current[applicationId],
          reference_image_urls: images
        }
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not add references";
      showToast({ tone: "error", title: "Reference upload failed", body: message });
    }
  }

  async function uploadApplicationProposalAttachments(application: Application, files: FileList | null) {
    if (!token) {
      showToast({ tone: "error", title: "Session expired", body: "Please log in again to upload attachments." });
      return;
    }

    try {
      const nextFiles = readProposalFiles(files, application.proposal_attachments ?? []);
      if (nextFiles.length === 0) return;

      setUploadingAttachmentFor(application.id);
      let latestAttachments = application.proposal_attachments ?? [];
      for (const file of nextFiles) {
        const data = await uploadApplicationAttachment(token, application.id, file);
        latestAttachments = data.attachments;
      }

      setEditing((current) => {
        const draft = current[application.id];
        return draft ? { ...current, [application.id]: { ...draft, proposal_attachments: latestAttachments } } : current;
      });
      await refreshApplications();
      showToast({ tone: "success", title: "Attachment uploaded", body: "Your proposal files were updated." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not upload proposal attachments";
      showToast({ tone: "error", title: "Attachment upload failed", body: message });
    } finally {
      setUploadingAttachmentFor("");
    }
  }

  async function removeApplicationProposalAttachment(application: Application, attachmentId: string) {
    if (!token) {
      showToast({ tone: "error", title: "Session expired", body: "Please log in again to remove attachments." });
      return;
    }

    setDeletingAttachmentId(attachmentId);

    try {
      const data = await deleteApplicationAttachment(token, application.id, attachmentId);
      setEditing((current) => {
        const draft = current[application.id];
        return draft ? { ...current, [application.id]: { ...draft, proposal_attachments: data.attachments } } : current;
      });
      await refreshApplications();
      showToast({ tone: "success", title: "Attachment removed", body: "The file was removed from your proposal." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not remove attachment";
      showToast({ tone: "error", title: "Remove failed", body: message });
    } finally {
      setDeletingAttachmentId("");
    }
  }

  async function uploadDeliverables(conversation: JobConversation, files: FileList | null) {
    if (!token) {
      showToast({ tone: "error", title: "Session expired", body: "Please log in again to upload deliverables." });
      return;
    }

    try {
      const nextFiles = readProposalFiles(files, conversation.deliverables ?? []);
      if (nextFiles.length === 0) return;

      setUploadingDeliverableFor(conversation.id);
      for (const file of nextFiles) {
        await uploadConversationDeliverable(token, conversation.id, file);
      }
      refreshConversations();
      showToast({ tone: "success", title: "Deliverables submitted", body: "The client has been notified to review your work." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not upload deliverables";
      showToast({ tone: "error", title: "Deliverable upload failed", body: message });
    } finally {
      setUploadingDeliverableFor("");
    }
  }

  function startEditing(application: Application) {
    setEditing((current) => ({
      ...current,
      [application.id]: {
        pitch: application.pitch,
        proposed_rate: application.proposed_rate ? String(application.proposed_rate) : "",
        estimated_days: application.estimated_days ? String(application.estimated_days) : "",
        reference_image_urls: application.reference_image_urls ?? [],
        proposal_attachments: application.proposal_attachments ?? []
      }
    }));
  }

  function closeEditing(applicationId: string) {
    setEditing((current) => {
      const next = { ...current };
      delete next[applicationId];
      return next;
    });
  }

  async function save(application: Application) {
    const draft = editing[application.id];
    if (!draft) return;

    setSavingApplicationId(application.id);

    try {
      await saveApplication(application.id, {
        pitch: draft.pitch,
        proposed_rate: draft.proposed_rate ? Number(draft.proposed_rate) : null,
        estimated_days: draft.estimated_days ? Number(draft.estimated_days) : null,
        reference_image_urls: draft.reference_image_urls
      });
      setEditing((current) => {
        const next = { ...current };
        delete next[application.id];
        return next;
      });
      showToast({ tone: "success", title: "Application updated", body: "Your client-facing pitch has been refreshed." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update application";
      showToast({ tone: "error", title: "Could not update application", body: message });
    } finally {
      setSavingApplicationId("");
    }
  }

  if (loading || applicationsLoading) {
    return (
      <AppShell>
        <PageLoader />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-sm font-medium text-brand">Professional workspace</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">Jobs and applications</h1>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-ink">My applications</h2>
              <p className="mt-1 text-sm text-muted">Applied jobs stay here so you can review and update your pitch.</p>
            </div>
            <StatusPill tone="gray">{applications.length} total</StatusPill>
          </div>
          {applications.length === 0 ? <EmptyState title="No applications yet" body="Apply to a matched job and it will stay here for follow-up." /> : null}
          <div className="space-y-4">
            {applications.map((application) => {
              const draft = editing[application.id];
              const references = draft?.reference_image_urls ?? application.reference_image_urls ?? [];
              const conversation = conversations.find((item) => item.application_id === application.id);

              return (
                <article className="rounded-lg border border-line bg-white p-4 shadow-sm sm:p-5" key={application.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <ApplicationStatusPill status={application.status} />
                      <h3 className="mt-2 text-lg font-semibold text-ink sm:text-xl">{application.job?.title ?? "Applied job"}</h3>
                      <p className="mt-1 text-sm text-muted">{application.job?.category?.name ?? application.job?.categories?.name ?? "General service"}</p>
                    </div>
                    {draft ? (
                      <IconButton aria-label="Close edit form" onClick={() => closeEditing(application.id)} type="button" variant="ghost">
                        <X size={18} />
                      </IconButton>
                    ) : (
                      <IconButton aria-label="Edit application" onClick={() => startEditing(application)} type="button">
                        <PencilLine size={18} />
                      </IconButton>
                    )}
                  </div>
                  {draft ? (
                    <div className="mt-4 grid gap-4">
                      <TextAreaField label="Pitch" onChange={(event) => setEditing((current) => ({ ...current, [application.id]: { ...draft, pitch: event.target.value } }))} rows={5} value={draft.pitch} />
                      <TextField label="Proposed rate" onChange={(event) => setEditing((current) => ({ ...current, [application.id]: { ...draft, proposed_rate: event.target.value } }))} type="number" value={draft.proposed_rate} />
                      <TextField label="Estimated days" min={1} max={365} onChange={(event) => setEditing((current) => ({ ...current, [application.id]: { ...draft, estimated_days: event.target.value } }))} type="number" value={draft.estimated_days} />
                      <FileActionButton label="Replace references" onChange={(files) => uploadApplicationReferences(application.id, files)} />
                      <ReferenceImages images={references} />
                      <FileActionButton accept=".pdf,.csv,.xls,.xlsx,.doc,.docx,image/jpeg,image/png,image/webp" label={uploadingAttachmentFor === application.id ? "Uploading proposal files..." : "Add proposal files"} onChange={(files) => uploadApplicationProposalAttachments(application, files)} />
                      <ProposalAttachmentList attachments={draft.proposal_attachments} onDelete={(attachmentId) => removeApplicationProposalAttachment(application, attachmentId)} />
                      {deletingAttachmentId ? <p className="text-xs text-muted">Removing attachment...</p> : null}
                      <Button className="w-full" disabled={savingApplicationId === application.id} onClick={() => save(application)} type="button">
                        {savingApplicationId === application.id ? (
                          <span className="inline-flex items-center gap-2"><Spinner /> Saving application</span>
                        ) : (
                          <span className="inline-flex items-center gap-2"><Save size={18} /> Save application</span>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="mt-4 text-sm leading-6 text-muted">{application.pitch}</p>
                      <div className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
                        <p><span className="font-semibold text-ink">Proposed rate:</span> {application.proposed_rate ? `NGN ${application.proposed_rate.toLocaleString()}` : "Not provided"}</p>
                        <p><span className="font-semibold text-ink">Estimated days:</span> {application.estimated_days ? `${application.estimated_days} day${application.estimated_days === 1 ? "" : "s"}` : "Not provided"}</p>
                      </div>
                      <ReferenceImages images={references} />
                      <ProposalAttachmentList attachments={application.proposal_attachments ?? []} />
                    </>
                  )}
                  {conversation ? (
                    <div className="mt-4 grid gap-3">
                      <Button
                        className="w-full"
                        onClick={() => setChatConversation(conversation)}
                        type="button"
                      >
                        <span className="inline-flex items-center gap-2"><MessageCircle size={18} /> Chat with client</span>
                      </Button>
                      {conversation.upfront_payment_made_at ? (
                        <div className="rounded-md border border-line bg-slate-50 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-ink">Deliverables</p>
                              <p className="text-xs text-muted">
                                {conversation.work_status === "revision_requested"
                                  ? "The client requested a revision. Upload the revised files when ready."
                                  : conversation.work_status === "submitted"
                                    ? "Work submitted. You can add another file if needed."
                                    : conversation.work_status === "completed"
                                      ? "This job has been completed."
                                      : "Upload completed work for the client to review."}
                              </p>
                            </div>
                            <StatusPill tone={conversation.work_status === "completed" ? "green" : conversation.work_status === "revision_requested" ? "amber" : "gray"}>
                              {conversation.work_status === "revision_requested" ? "Revision" : conversation.work_status === "submitted" ? "Submitted" : conversation.work_status === "completed" ? "Completed" : "In progress"}
                            </StatusPill>
                          </div>
                          {conversation.revision_note ? <p className="mt-2 rounded-md bg-white p-2 text-xs text-muted">{conversation.revision_note}</p> : null}
                          <ProposalAttachmentList attachments={conversation.deliverables ?? []} />
                          {conversation.work_status !== "completed" ? (
                            <div className="mt-3">
                              <FileActionButton
                                accept=".pdf,.csv,.xls,.xlsx,.doc,.docx,image/jpeg,image/png,image/webp"
                                label={uploadingDeliverableFor === conversation.id ? "Uploading deliverables..." : "Upload deliverables"}
                                onChange={(files) => uploadDeliverables(conversation, files)}
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <section className="min-w-0">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-ink">Available matched jobs</h2>
            <p className="mt-1 text-sm text-muted">New matches you have not applied to yet.</p>
          </div>
          {availableJobs.length === 0 ? <EmptyState title="No new matched jobs" body="You can still manage your existing applications above." /> : null}
          <div className="space-y-4">
            {availableJobs.map((job) => (
              <article className="rounded-lg border border-line bg-white p-4 shadow-sm sm:p-5" key={job.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <StatusPill>{job.categories?.name ?? "General service"}</StatusPill>
                    <h3 className="mt-1 text-lg font-semibold text-ink sm:text-xl">{job.title}</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{job.description}</p>
                  </div>
                </div>
                <TextAreaField
                  className="mt-4"
                  label="Pitch"
                  onChange={(event) => setPitchByJob((current) => ({ ...current, [job.id]: event.target.value }))}
                  placeholder="Write a short pitch to the client..."
                  rows={5}
                  value={pitchByJob[job.id] ?? ""}
                />
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <TextField
                    label="Proposed rate"
                    min={0}
                    onChange={(event) => setProposedRateByJob((current) => ({ ...current, [job.id]: event.target.value }))}
                    placeholder="e.g. 50000"
                    type="number"
                    value={proposedRateByJob[job.id] ?? ""}
                  />
                  <TextField
                    label="Estimated days"
                    min={1}
                    max={365}
                    onChange={(event) => setEstimatedDaysByJob((current) => ({ ...current, [job.id]: event.target.value }))}
                    placeholder="e.g. 5"
                    type="number"
                    value={estimatedDaysByJob[job.id] ?? ""}
                  />
                </div>
                <div className="mt-3">
                  <FileActionButton label="Add references" onChange={(files) => uploadReferences(job.id, files)} />
                </div>
                <ReferenceImages images={referencesByJob[job.id] ?? []} />
                <div className="mt-3">
                  <FileActionButton accept=".pdf,.csv,.xls,.xlsx,.doc,.docx,image/jpeg,image/png,image/webp" label="Add proposal files" onChange={(files) => addProposalFiles(job.id, files)} />
                </div>
                <ProposalAttachmentList files={proposalFilesByJob[job.id] ?? []} />
                <Button className="mt-3 w-full" disabled={applyingJobId === job.id} onClick={() => apply(job.id)} type="button">
                  {applyingJobId === job.id ? (
                    <span className="inline-flex items-center gap-2"><Spinner /> Applying</span>
                  ) : (
                    <span className="inline-flex items-center gap-2"><Send size={18} /> Apply now</span>
                  )}
                </Button>
              </article>
            ))}
          </div>
        </section>
      </div>
      {chatConversation ? <ChatModal conversation={chatConversation} onClose={() => setChatConversation(null)} /> : null}
      {inquiryConversation ? <ChatModal conversation={inquiryConversation} kind="inquiry" onClose={() => setInquiryConversation(null)} /> : null}
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
