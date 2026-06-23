"use client";

import { useEffect, useState } from "react";
import { ImagePlus, PencilLine, Save, Send, X } from "lucide-react";
import { AppShell, EmptyState } from "@/components/app-shell";
import { ApplicationStatusPill, Button, IconButton, PageLoader, Spinner, StatusPill, TextAreaField, TextField } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useMatchedJobs, useMyApplications } from "@/hooks/use-jobs";
import type { Application } from "@/types";

function readImages(files: FileList | null): Promise<string[]> {
  const images = Array.from(files ?? []).filter((file) => file.type.startsWith("image/")).slice(0, 3);

  return Promise.all(images.map((file) => new Promise<string>((resolve, reject) => {
    if (file.size > 750 * 1024) {
      reject(new Error("Each reference image must be smaller than 750KB."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Could not read one of the selected images."));
    reader.readAsDataURL(file);
  })));
}

function ReferenceImages({ images }: { images: string[] }) {
  if (images.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {images.map((image, index) => (
        <img alt={`Work reference ${index + 1}`} className="h-20 w-24 rounded-md border border-line object-cover" key={image.slice(0, 48)} src={image} />
      ))}
    </div>
  );
}

function FileActionButton({
  label,
  onChange
}: {
  label: string;
  onChange: (files: FileList | null) => void;
}) {
  return (
    <label className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md active:translate-y-0">
        <ImagePlus size={18} />
        {label}
      <input accept="image/*" className="sr-only" multiple onChange={(event) => onChange(event.target.files)} type="file" />
    </label>
  );
}

export default function ProfessionalJobsPage() {
  const { jobs, error: loadError, loading, apply: submitApplication, refresh: refreshMatchedJobs } = useMatchedJobs();
  const { applications, error: applicationError, loading: applicationsLoading, saveApplication, refresh: refreshApplications } = useMyApplications();
  const showToast = useToast();
  const [pitchByJob, setPitchByJob] = useState<Record<string, string>>({});
  const [referencesByJob, setReferencesByJob] = useState<Record<string, string[]>>({});
  const [editing, setEditing] = useState<Record<string, { pitch: string; proposed_rate: string; reference_image_urls: string[] }>>({});
  const [applyingJobId, setApplyingJobId] = useState("");
  const [savingApplicationId, setSavingApplicationId] = useState("");
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

  async function apply(jobId: string) {
    setApplyingJobId(jobId);

    try {
      await submitApplication(jobId, pitchByJob[jobId], null, referencesByJob[jobId] ?? []);
      showToast({
        tone: "success",
        title: "Application sent",
        body: "The client can now review your pitch and references."
      });
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

  function startEditing(application: Application) {
    setEditing((current) => ({
      ...current,
      [application.id]: {
        pitch: application.pitch,
        proposed_rate: application.proposed_rate ? String(application.proposed_rate) : "",
        reference_image_urls: application.reference_image_urls ?? []
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
                      <FileActionButton label="Replace references" onChange={(files) => uploadApplicationReferences(application.id, files)} />
                      <ReferenceImages images={references} />
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
                      <ReferenceImages images={references} />
                    </>
                  )}
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
                <div className="mt-3">
                  <FileActionButton label="Add references" onChange={(files) => uploadReferences(job.id, files)} />
                </div>
                <ReferenceImages images={referencesByJob[job.id] ?? []} />
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
    </AppShell>
  );
}
