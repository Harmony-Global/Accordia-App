import { apiFetch } from "@/services/http";
import type { Application, Job, JobView } from "@/types";

export type CreateJobPayload = {
  title: string;
  description: string;
  category_id: string;
  budget_min: number;
  budget_max: number;
  budget_type: "fixed" | "hourly";
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
  referenceImageUrls: string[] = []
) {
  return apiFetch<{ application_id: string }>(`/api/jobs/${jobId}/apply`, {
    token,
    method: "POST",
    body: {
      pitch,
      proposed_rate: proposedRate ?? null,
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
    reference_image_urls?: string[];
  }
) {
  return apiFetch<{ application: Application }>(`/api/applications/${applicationId}`, {
    token,
    method: "PATCH",
    body: payload
  });
}
