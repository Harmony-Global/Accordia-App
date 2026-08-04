"use client";

import { useCallback, useEffect, useState } from "react";
import { useRequireAuth } from "@/hooks/use-auth";
import { getConversations } from "@/services/conversation-service";
import {
  applyToJob,
  awardApplication,
  createJob,
  getClientJobs,
  getJobApplications,
  getJobViews,
  getMatchedJobs,
  getMyApplications,
  sealJobAwards,
  undoAwardApplication,
  updateApplication,
  type CreateJobPayload
} from "@/services/job-service";
import type { Application, Job, JobConversation, JobView } from "@/types";

let cachedClientJobs: Job[] = [];
let cachedMatchedJobs: Job[] = [];
let cachedMyApplications: Application[] = [];

export function useClientJobs() {
  const token = useRequireAuth();
  const [jobs, setJobs] = useState<Job[]>(cachedClientJobs);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(cachedClientJobs.length === 0);

  const refresh = useCallback(() => {
    if (!token) return;
    if (cachedClientJobs.length === 0) setLoading(true);
    getClientJobs(token)
      .then((data) => {
        cachedClientJobs = data.jobs;
        setJobs(data.jobs);
      })
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
  const [jobs, setJobs] = useState<Job[]>(cachedMatchedJobs);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(cachedMatchedJobs.length === 0);

  const refresh = useCallback(() => {
    if (!token) return;
    if (cachedMatchedJobs.length === 0) setLoading(true);
    getMatchedJobs(token)
      .then((data) => {
        cachedMatchedJobs = data.jobs;
        setJobs(data.jobs);
      })
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
  const [applications, setApplications] = useState<Application[]>(cachedMyApplications);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(cachedMyApplications.length === 0);

  const refresh = useCallback(() => {
    if (!token) return;
    if (cachedMyApplications.length === 0) setLoading(true);
    getMyApplications(token)
      .then((data) => {
        cachedMyApplications = data.applications;
        setApplications(data.applications);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load applications"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => refresh(), [refresh]);

  async function saveApplication(applicationId: string, payload: { pitch?: string; proposed_rate?: number | null; reference_image_urls?: string[] }) {
    if (!token) throw new Error("You need to log in again");
    const data = await updateApplication(token, applicationId, payload);
    setApplications((current) => {
      const nextApplications = current.map((item) => item.id === applicationId ? data.application : item);
      cachedMyApplications = nextApplications;
      return nextApplications;
    });
    return data.application;
  }

  return { applications, error, loading, refresh, saveApplication };
}

export function useJobEngagement(jobId: string | null) {
  const token = useRequireAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [conversations, setConversations] = useState<JobConversation[]>([]);
  const [views, setViews] = useState<JobView[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!token || !jobId) return;
    setLoading(true);
    setError("");
    Promise.all([getJobApplications(token, jobId), getJobViews(token, jobId), getConversations(token, jobId)])
      .then(([applicationData, viewData, conversationData]) => {
        setApplications(applicationData.applications);
        setViews(viewData.views);
        setConversations(conversationData.conversations);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load job activity"))
      .finally(() => setLoading(false));
  }, [jobId, token]);

  useEffect(() => refresh(), [refresh]);

  async function award(applicationId: string) {
    if (!token) throw new Error("You need to log in again");
    const data = await awardApplication(token, applicationId);
    setApplications((current) => current.map((item) => item.id === applicationId ? { ...item, ...data.application } : item));
    return data;
  }

  async function undoAward(applicationId: string) {
    if (!token) throw new Error("You need to log in again");
    const data = await undoAwardApplication(token, applicationId);
    setApplications((current) => current.map((item) => item.id === applicationId ? { ...item, ...data.application } : item));
    return data;
  }

  async function sealAwards() {
    if (!token || !jobId) throw new Error("Select a job first");
    const data = await sealJobAwards(token, jobId);
    const conversationData = await getConversations(token, jobId);
    setConversations(conversationData.conversations);
    return data;
  }

  return { applications, conversations, views, error, loading, refresh, award, undoAward, sealAwards };
}
