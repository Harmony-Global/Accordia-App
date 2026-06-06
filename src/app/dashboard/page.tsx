"use client";

import Link from "next/link";
import { BriefcaseBusiness, CheckCircle2, ListChecks, MessageSquare, SearchCheck, ShieldCheck, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { WorkIllustration } from "@/components/brand";
import { Alert, Card, PageLoader, StatusPill } from "@/components/ui";
import { useProfile } from "@/hooks/use-auth";
import { useClientJobs } from "@/hooks/use-jobs";

function ActionCard({
  href,
  title,
  body,
  icon: Icon
}: {
  href: string;
  title: string;
  body: string;
  icon: LucideIcon;
}) {
  return (
    <Link className="motion-panel rounded-lg border border-line bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-brand hover:shadow-md" href={href}>
      <div className="motion-float grid h-11 w-11 place-items-center rounded-md bg-teal-50 text-brand">
        <Icon size={22} />
      </div>
      <h2 className="mt-4 font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
    </Link>
  );
}

function getProfessionalCategoryCount(profile: NonNullable<ReturnType<typeof useProfile>["profile"]>) {
  const professionalProfile = Array.isArray(profile.professional_profiles)
    ? profile.professional_profiles[0]
    : profile.professional_profiles;

  return professionalProfile?.professional_categories?.length ?? 0;
}

function OnboardingCard({
  profile,
  clientJobsCount
}: {
  profile: NonNullable<ReturnType<typeof useProfile>["profile"]>;
  clientJobsCount: number;
}) {
  const categoryCount = getProfessionalCategoryCount(profile);
  const steps = (profile.role === "professional" ? [
    {
      done: profile.phone_verified,
      title: "Verify your phone",
      body: "Show clients that your account is reachable.",
      href: "/profile"
    },
    {
      done: categoryCount > 0,
      title: "Complete your service setup",
      body: "Choose categories and keep your professional details sharp.",
      href: "/professional/categories"
    }
  ] : [
    {
      done: profile.phone_verified,
      title: "Verify your phone",
      body: "Give applicants confidence that they can reach you.",
      href: "/profile"
    },
    {
      done: clientJobsCount > 0,
      title: "Post your first clear job",
      body: "Start with scope, budget, location, and timeline.",
      href: "/client/jobs/new"
    }
  ]).filter((step) => !step.done);

  if (steps.length === 0) return null;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-ink">Onboarding</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Finish the trust and setup steps that make Accordia work better for you.</p>
        </div>
        <StatusPill tone="amber">Action needed</StatusPill>
      </div>
      <div className="mt-4 grid gap-3">
        {steps.map((step) => (
          <Link className="flex items-start gap-3 rounded-md border border-line p-3 transition hover:border-brand hover:bg-teal-50" href={step.href} key={step.title}>
            <span className={`mt-0.5 grid h-7 w-7 place-items-center rounded-full ${step.done ? "bg-green-50 text-green" : "bg-amber-50 text-amber"}`}>
              {step.done ? <CheckCircle2 size={16} /> : <ShieldCheck size={16} />}
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink">{step.title}</span>
              <span className="mt-1 block text-sm leading-5 text-muted">{step.body}</span>
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { profile, error, loading } = useProfile();
  const { jobs: clientJobs, error: clientJobsError, loading: clientJobsLoading } = useClientJobs();

  if (loading || (profile?.role === "client" && clientJobsLoading)) {
    return (
      <AppShell>
        <PageLoader />
      </AppShell>
    );
  }

  return (
    <AppShell>
      {error ? <Alert>{error}</Alert> : null}
      {clientJobsError && profile?.role === "client" ? <div className="mb-4"><Alert>{clientJobsError}</Alert></div> : null}
      <div className="mb-6">
        <h1 className="mt-1 text-3xl font-semibold text-ink">
          {profile ? `Welcome, ${profile.first_name}` : "Welcome"}
        </h1>
      </div>
      {profile?.role === "professional" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4 md:grid-cols-2">
            <ActionCard body="Choose the kinds of jobs you want to see." href="/professional/categories" icon={ListChecks} title="Set your categories" />
            <ActionCard body="View jobs that match your selected categories." href="/professional/jobs" icon={SearchCheck} title="Browse matched jobs" />
            <div className="md:col-span-2"><OnboardingCard clientJobsCount={0} profile={profile} /></div>
          </div>
          <WorkIllustration variant="professional" />
        </div>
      ) : null}
      {profile?.role === "client" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4 md:grid-cols-2">
            <ActionCard body="Create a new job for professionals to apply to." href="/client/jobs/new" icon={BriefcaseBusiness} title="Post a job" />
            <ActionCard body="Review views, applications, and job statuses." href="/client/jobs" icon={MessageSquare} title="Track my jobs" />
            <div className="md:col-span-2"><OnboardingCard clientJobsCount={clientJobs.length} profile={profile} /></div>
            <Card className="p-5 md:col-span-2">
              <h2 className="font-semibold text-ink">Hiring flow</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Post a clear job, review pitches, award the work, then track progress until both sides mark it done.
              </p>
            </Card>
          </div>
          <WorkIllustration variant="client" />
        </div>
      ) : null}
    </AppShell>
  );
}
