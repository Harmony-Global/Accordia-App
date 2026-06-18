"use client";

import { useCallback, useEffect, useState } from "react";
import { useRequireAuth } from "@/hooks/use-auth";
import {
  applyToJob,
  awardApplication,
  createJob,
  getClientJobs,
  getJobApplications,
  getJobViews,
  getMatchedJobs,
  getMyApplications,
  updateApplication,
  type CreateJobPayload
} from "@/services/job-service";
import type { Application, Job, JobView } from "@/types";

export function useClientJobs() {
  const token = useRequireAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!token) return;
    setLoading(true);
    getClientJobs(token)
      .then((data) => setJobs(data.jobs))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load jobs"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => refresh(), [refresh]);

  async function publishJob(payload: CreateJobPayload) {
    if (!token) throw new Error("You need to log in again");
    return createJob(token, payload);
  }

  return { jobs, error, loading, refresh, publishJob };
}

export function useMatchedJobs() {
  const token = useRequireAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!token) return;
    setLoading(true);
    getMatchedJobs(token)
      .then((data) => setJobs(data.jobs))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load matched jobs"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => refresh(), [refresh]);

  async function apply(jobId: string, pitch: string, proposedRate?: number | null, referenceImageUrls: string[] = []) {
    if (!token) throw new Error("You need to log in again");
    return applyToJob(token, jobId, pitch, proposedRate, referenceImageUrls);
  }

  return { jobs, error, loading, refresh, apply };
}

export function useMyApplications() {
  const token = useRequireAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!token) return;
    setLoading(true);
    getMyApplications(token)
      .then((data) => setApplications(data.applications))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load applications"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => refresh(), [refresh]);

  async function saveApplication(applicationId: string, payload: { pitch?: string; proposed_rate?: number | null; reference_image_urls?: string[] }) {
    if (!token) throw new Error("You need to log in again");
    const data = await updateApplication(token, applicationId, payload);
    setApplications((current) => current.map((item) => item.id === applicationId ? data.application : item));
    return data.application;
  }

  return { applications, error, loading, refresh, saveApplication };
}

export function useJobEngagement(jobId: string | null) {
  const token = useRequireAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [views, setViews] = useState<JobView[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!token || !jobId) return;
    setLoading(true);
    setError("");
    Promise.all([getJobApplications(token, jobId), getJobViews(token, jobId)])
      .then(([applicationData, viewData]) => {
        setApplications(applicationData.applications);
        setViews(viewData.views);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load job activity"))
      .finally(() => setLoading(false));
  }, [jobId, token]);

  useEffect(() => refresh(), [refresh]);

  async function award(applicationId: string) {
    if (!token) throw new Error("You need to log in again");
    const data = await awardApplication(token, applicationId);
    refresh();
    return data;
  }

  return { applications, views, error, loading, refresh, award };
}
