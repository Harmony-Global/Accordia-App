import { apiFetch, apiFormData } from "@/services/http";
import type { Application, Job, JobConversation, JobView, ProposalAttachment } from "@/types";

export type CreateJobPayload = {
  title: string;
  description: string;
  category_id: string;
  number_of_professionals: number;
  location: string;
  state: string;
  is_remote: boolean;
};

export function getClientJobs(token: string) {
  return apiFetch<{ jobs: Job[] }>("/api/jobs?mine=true", { token });
}

export function createJob(token: string, payload: CreateJobPayload) {
  return apiFetch<{ job: Job }>("/api/jobs", {
    token,
    method: "POST",
    body: payload
  });
}

export function getMatchedJobs(token: string) {
  return apiFetch<{ jobs: Job[] }>("/api/jobs/feed", { token });
}

export function getMyApplications(token: string) {
  return apiFetch<{ applications: Application[] }>("/api/applications/me", { token });
}

export function getJobApplications(token: string, jobId: string) {
  return apiFetch<{ applications: Application[] }>(`/api/jobs/${jobId}/applications`, { token });
}

export function getJobViews(token: string, jobId: string) {
  return apiFetch<{ views: JobView[] }>(`/api/jobs/${jobId}/views`, { token });
}

export function applyToJob(
  token: string,
  jobId: string,
  pitch: string,
  proposedRate?: number | null,
  estimatedDays?: number | null,
  referenceImageUrls: string[] = []
) {
  return apiFetch<{ application_id: string }>(`/api/jobs/${jobId}/apply`, {
    token,
    method: "POST",
    body: {
      pitch,
      proposed_rate: proposedRate ?? null,
      estimated_days: estimatedDays ?? null,
      reference_image_urls: referenceImageUrls
    }
  });
}

export function updateApplication(
  token: string,
  applicationId: string,
  payload: {
    pitch?: string;
    proposed_rate?: number | null;
    estimated_days?: number | null;
    reference_image_urls?: string[];
  }
) {
  return apiFetch<{ application: Application }>(`/api/applications/${applicationId}`, {
    token,
    method: "PATCH",
    body: payload
  });
}

export function uploadApplicationAttachment(token: string, applicationId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFormData<{ attachment: ProposalAttachment; attachments: ProposalAttachment[] }>(`/api/applications/${applicationId}/attachments`, formData, token);
}

export function getApplicationAttachmentAccess(token: string, applicationId: string, attachmentId: string) {
  return apiFetch<{ attachment: ProposalAttachment; signed_url: string; expires_in: number }>(`/api/applications/${applicationId}/attachments/${attachmentId}`, { token, cacheTtlMs: 0 });
}

export function deleteApplicationAttachment(token: string, applicationId: string, attachmentId: string) {
  return apiFetch<{ attachment_id: string; attachments: ProposalAttachment[] }>(`/api/applications/${applicationId}/attachments/${attachmentId}`, {
    token,
    method: "DELETE"
  });
}

export function inviteApplicationToChat(token: string, applicationId: string) {
  return apiFetch<{ invitation: { application_id: string; conversation_id: string; already_invited: boolean } }>(`/api/applications/${applicationId}/invite-chat`, {
    token,
    method: "POST",
    body: {}
  });
}

export function declineApplication(token: string, applicationId: string) {
  return apiFetch<{ decline: { application_id: string; previous_status: string; next_status: string } }>(`/api/applications/${applicationId}/decline`, {
    token,
    method: "POST",
    body: {}
  });
}
