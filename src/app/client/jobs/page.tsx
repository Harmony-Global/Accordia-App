"use client";

import Link from "next/link";
import { useState } from "react";
import { Award, Eye, FileText, UserRound } from "lucide-react";
import { AppShell, EmptyState } from "@/components/app-shell";
import { Alert, Button, PageLoader, Spinner, StatusPill } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useClientJobs, useJobEngagement } from "@/hooks/use-jobs";
import type { Application, JobView, ProfessionalProfile, ProfessionalService } from "@/types";

function PersonAvatar({ avatarUrl }: { avatarUrl?: string | null }) {
  return (
    <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-slate-100 text-brand">
      {avatarUrl ? <img alt="" className="h-full w-full object-cover" src={avatarUrl} /> : <UserRound size={18} />}
    </span>
  );
}

function References({ application }: { application: Application }) {
  const images = application.reference_image_urls ?? [];
  if (images.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {images.map((image, index) => (
        <img alt={`Applicant reference ${index + 1}`} className="h-20 w-24 rounded-md border border-line object-cover" key={image.slice(0, 48)} src={image} />
      ))}
    </div>
  );
}

function getApplicantServices(application: Application): ProfessionalService[] {
  const profiles = application.professional?.professional_profiles;
  const professionalProfile: ProfessionalProfile | null = Array.isArray(profiles) ? profiles[0] ?? null : profiles ?? null;
  return professionalProfile?.professional_services?.filter((service) => service.is_active) ?? [];
}

function ApplicationRow({
  application,
  awarding,
  onAward
}: {
  application: Application;
  awarding: boolean;
  onAward: (application: Application) => void;
}) {
  const services = getApplicantServices(application);
  const canAward = ["pending", "reviewed", "shortlisted"].includes(application.status);

  return (
    <article className="rounded-md border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        <PersonAvatar avatarUrl={application.professional?.avatar_url} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-ink">
              {application.professional?.first_name} {application.professional?.last_name}
            </h3>
            <StatusPill tone={application.status === "awarded" ? "green" : "teal"}>{application.status}</StatusPill>
          </div>
          <p className="mt-1 text-sm text-muted">
            {application.professional?.phone_verified ? "Phone verified" : "Phone not verified"}
            {application.proposed_rate ? ` • Proposed: NGN ${application.proposed_rate.toLocaleString()}` : ""}
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">{application.pitch}</p>
          <References application={application} />
          {services.length > 0 ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase text-muted">Profile offerings</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {services.slice(0, 4).map((service) => (
                  <div className="flex gap-3 rounded-md border border-line bg-slate-50 p-2" key={service.id}>
                    <img alt={service.title} className="h-14 w-16 rounded object-cover" src={service.image_url} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{service.title}</p>
                      <p className="text-xs text-muted">
                        {service.currency} {service.price_min.toLocaleString()} - {service.price_max.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {canAward ? (
            <Button className="mt-4" disabled={awarding} onClick={() => onAward(application)} type="button">
              {awarding ? <span className="inline-flex items-center gap-2"><Spinner /> Awarding</span> : <span className="inline-flex items-center gap-2"><Award size={16} /> Award job</span>}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ViewRow({ view }: { view: JobView }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-white p-4">
      <PersonAvatar avatarUrl={view.professional?.avatar_url} />
      <div>
        <p className="font-semibold text-ink">{view.professional?.first_name} {view.professional?.last_name}</p>
        <p className="text-sm text-muted">
          {view.professional?.phone_verified ? "Phone verified" : "Phone not verified"} • Viewed {new Date(view.viewed_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

function JobEngagementPanel({ jobId, onAwarded }: { jobId: string | null; onAwarded: () => void }) {
  const { applications, views, error, loading, award } = useJobEngagement(jobId);
  const showToast = useToast();
  const [awardingApplicationId, setAwardingApplicationId] = useState("");

  async function awardJob(application: Application) {
    setAwardingApplicationId(application.id);

    try {
      await award(application.id);
      showToast({
        tone: "success",
        title: "Job awarded",
        body: "Other applicants will be notified that the job is no longer accepting offers."
      });
      onAwarded();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not award job";
      showToast({ tone: "error", title: "Award failed", body: message });
    } finally {
      setAwardingApplicationId("");
    }
  }

  if (!jobId) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-white p-6 text-sm text-muted">
        Select views or applications on a job to inspect activity.
      </div>
    );
  }

  return (
    <aside className="rounded-lg border border-line bg-slate-50 p-4 sm:p-5">
      <h2 className="font-semibold text-ink">Job activity</h2>
      {loading ? <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted"><Spinner /> Loading activity</p> : null}
      {error ? <div className="mt-4"><Alert>{error}</Alert></div> : null}
      {!loading ? (
        <div className="mt-4 grid gap-5">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <FileText className="text-brand" size={18} />
              <h3 className="font-semibold text-ink">Applications</h3>
            </div>
            {applications.length === 0 ? <p className="text-sm text-muted">No applications yet.</p> : null}
            <div className="grid gap-3">
              {applications.map((application) => (
                <ApplicationRow
                  application={application}
                  awarding={awardingApplicationId === application.id}
                  key={application.id}
                  onAward={awardJob}
                />
              ))}
            </div>
          </section>
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Eye className="text-brand" size={18} />
              <h3 className="font-semibold text-ink">Views</h3>
            </div>
            {views.length === 0 ? <p className="text-sm text-muted">No professional views yet.</p> : null}
            <div className="grid gap-3">
              {views.map((view) => <ViewRow key={view.id} view={view} />)}
            </div>
          </section>
        </div>
      ) : null}
    </aside>
  );
}

export default function ClientJobsPage() {
  const { jobs, error, loading, refresh } = useClientJobs();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  if (loading) {
    return (
      <AppShell>
        <PageLoader />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-brand">Client workspace</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">My jobs</h1>
        </div>
        <Link className="rounded-md bg-brand px-4 py-3 text-sm font-medium text-white sm:text-base" href="/client/jobs/new">
          Post job
        </Link>
      </div>
      {error ? <div className="mb-4"><Alert>{error}</Alert></div> : null}
      {jobs.length === 0 ? <EmptyState title="No jobs yet" body="Post your first job and start receiving applications." /> : null}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          {jobs.map((job) => (
            <article className={`rounded-lg border bg-white p-4 shadow-sm sm:p-5 ${selectedJobId === job.id ? "border-brand ring-2 ring-teal-100" : "border-line"}`} key={job.id}>
              <div className="flex flex-wrap justify-between gap-3">
                <div className="min-w-0">
                  <StatusPill>{job.categories?.name ?? "General service"}</StatusPill>
                  <h2 className="mt-1 text-lg font-semibold text-ink sm:text-xl">{job.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">{job.description}</p>
                </div>
                <div className="grid w-full grid-cols-3 gap-2 text-center text-sm sm:w-auto">
                  <button className="rounded-md bg-slate-50 px-3 py-2 font-medium text-ink hover:bg-teal-50" onClick={() => setSelectedJobId(job.id)} type="button">
                    {job.status}
                    <span className="block text-xs text-muted">status</span>
                  </button>
                  <button className="rounded-md bg-slate-50 px-3 py-2 font-medium text-ink hover:bg-teal-50" onClick={() => setSelectedJobId(job.id)} type="button">
                    {job.views_count}
                    <span className="block text-xs text-muted">views</span>
                  </button>
                  <button className="rounded-md bg-slate-50 px-3 py-2 font-medium text-ink hover:bg-teal-50" onClick={() => setSelectedJobId(job.id)} type="button">
                    {job.applications_count}
                    <span className="block text-xs text-muted">apps</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        <JobEngagementPanel jobId={selectedJobId} onAwarded={refresh} />
      </div>
    </AppShell>
  );
}
