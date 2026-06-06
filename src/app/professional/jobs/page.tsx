"use client";

import { useState } from "react";
import { ImagePlus, PencilLine, Save, X } from "lucide-react";
import { AppShell, EmptyState } from "@/components/app-shell";
import { Alert, Button, PageLoader, Spinner, StatusPill, TextAreaField, TextField } from "@/components/ui";
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

export default function ProfessionalJobsPage() {
  const { jobs, error: loadError, loading, apply: submitApplication, refresh: refreshMatchedJobs } = useMatchedJobs();
  const { applications, error: applicationError, loading: applicationsLoading, saveApplication, refresh: refreshApplications } = useMyApplications();
  const showToast = useToast();
  const [pitchByJob, setPitchByJob] = useState<Record<string, string>>({});
  const [referencesByJob, setReferencesByJob] = useState<Record<string, string[]>>({});
  const [editing, setEditing] = useState<Record<string, { pitch: string; proposed_rate: string; reference_image_urls: string[] }>>({});
  const [applyingJobId, setApplyingJobId] = useState("");
  const [savingApplicationId, setSavingApplicationId] = useState("");
  const [error, setError] = useState("");

  async function apply(jobId: string) {
    setError("");
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
      setError(message);
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
      setError(message);
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
      setError(message);
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
    setError("");

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
      setError(message);
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
      {loadError ? <div className="mb-4"><Alert>{loadError}</Alert></div> : null}
      {applicationError ? <div className="mb-4"><Alert>{applicationError}</Alert></div> : null}
      {error ? <div className="mb-4"><Alert>{error}</Alert></div> : null}

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
                      <StatusPill tone={application.status === "awarded" ? "green" : "teal"}>{application.status}</StatusPill>
                      <h3 className="mt-2 text-lg font-semibold text-ink sm:text-xl">{application.job?.title ?? "Applied job"}</h3>
                      <p className="mt-1 text-sm text-muted">{application.job?.category?.name ?? application.job?.categories?.name ?? "General service"}</p>
                    </div>
                    {draft ? (
                      <button aria-label="Close edit form" className="grid h-10 w-10 place-items-center rounded-full border border-line text-muted hover:bg-slate-50 hover:text-ink" onClick={() => closeEditing(application.id)} type="button">
                        <X size={18} />
                      </button>
                    ) : (
                      <Button onClick={() => startEditing(application)} type="button" variant="secondary">
                        <PencilLine size={16} />
                        Edit
                      </Button>
                    )}
                  </div>
                  {draft ? (
                    <div className="mt-4 grid gap-4">
                      <TextAreaField label="Pitch" onChange={(event) => setEditing((current) => ({ ...current, [application.id]: { ...draft, pitch: event.target.value } }))} rows={5} value={draft.pitch} />
                      <TextField label="Proposed rate" onChange={(event) => setEditing((current) => ({ ...current, [application.id]: { ...draft, proposed_rate: event.target.value } }))} type="number" value={draft.proposed_rate} />
                      <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md border border-line px-4 py-3 text-sm font-semibold text-ink hover:bg-slate-50">
                        <ImagePlus size={16} />
                        Replace references
                        <input accept="image/*" className="sr-only" multiple onChange={(event) => uploadApplicationReferences(application.id, event.target.files)} type="file" />
                      </label>
                      <ReferenceImages images={references} />
                      <div className="flex flex-wrap gap-2">
                        <Button disabled={savingApplicationId === application.id} onClick={() => save(application)} type="button">
                          {savingApplicationId === application.id ? <span className="inline-flex items-center gap-2"><Spinner /> Saving</span> : <span className="inline-flex items-center gap-2"><Save size={16} /> Save application</span>}
                        </Button>
    
                      </div>
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
          {jobs.length === 0 ? <EmptyState title="No new matched jobs" body="You can still manage your existing applications above." /> : null}
          <div className="space-y-4">
            {jobs.map((job) => (
              <article className="rounded-lg border border-line bg-white p-4 shadow-sm sm:p-5" key={job.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <StatusPill>{job.categories?.name ?? "General service"}</StatusPill>
                    <h3 className="mt-1 text-lg font-semibold text-ink sm:text-xl">{job.title}</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{job.description}</p>
                  </div>
                  <div className="rounded-md bg-slate-50 px-3 py-2 text-sm font-medium text-ink">
                    {job.currency} {job.budget_min ?? 0} - {job.budget_max ?? 0}
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
                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border border-line px-4 py-3 text-sm font-semibold text-ink hover:bg-slate-50">
                  <ImagePlus size={16} />
                  Add references
                  <input accept="image/*" className="sr-only" multiple onChange={(event) => uploadReferences(job.id, event.target.files)} type="file" />
                </label>
                <ReferenceImages images={referencesByJob[job.id] ?? []} />
                <Button className="mt-3" disabled={applyingJobId === job.id} onClick={() => apply(job.id)} type="button">
                  {applyingJobId === job.id ? <span className="inline-flex items-center gap-2"><Spinner /> Applying</span> : "Apply"}
                </Button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
