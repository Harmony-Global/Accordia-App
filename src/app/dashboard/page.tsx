"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BriefcaseBusiness, ListChecks, MessageSquare, SearchCheck, ShieldCheck, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageLoader } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useProfile } from "@/hooks/use-auth";
import { useClientJobs } from "@/hooks/use-jobs";

function getProfessionalCategoryCount(profile: NonNullable<ReturnType<typeof useProfile>["profile"]>) {
  const professionalProfile = Array.isArray(profile.professional_profiles)
    ? profile.professional_profiles[0]
    : profile.professional_profiles;

  return professionalProfile?.professional_categories?.length ?? 0;
}

const clientHeroSlides = [
  {
    src: "/images/client-home/massage.png",
    eyebrow: "FIND A PROFESSIONAL",
    title: "Welcome Progress"
  },
  {
    src: "/images/client-home/tailor.png",
    eyebrow: "FIND A PROFESSIONAL",
    title: "Welcome Progress"
  },
  {
    src: "/images/client-home/carpenter.png",
    eyebrow: "FIND A PROFESSIONAL",
    title: "Welcome Progress"
  },
  {
    src: "/images/client-home/web-developer.png",
    eyebrow: "HIRE SKILLED PROFESSIONAL",
    title: "Welcome Progress"
  }
];

const professionalHeroSlides = [
  {
    src: "/images/dashboard-professions/electrician.png",
    eyebrow: "MATCH WITH CLIENTS",
    title: "Welcome Progress"
  },
  {
    src: "/images/dashboard-professions/plumber.png",
    eyebrow: "SEND PROPOSALS",
    title: "Welcome Progress"
  },
  {
    src: "/images/dashboard-professions/carpenter.png",
    eyebrow: "TRACK ACTIVE WORK",
    title: "Welcome Progress"
  },
  {
    src: "/images/dashboard-professions/cleaner.png",
    eyebrow: "BUILD TRUST",
    title: "Welcome Progress"
  }
];

function DashboardHeroCarousel({
  slides
}: {
  slides: typeof clientHeroSlides;
}) {
  const [activeIndex, setActiveIndex] = useState(3);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  return (
    <section className="relative hidden h-[300px] overflow-hidden bg-white sm:block md:h-[340px] lg:h-[360px]">
      {slides.map((slide, index) => (
        <Image
          alt={slide.eyebrow}
          className={`object-cover transition-opacity duration-700 ${index === activeIndex ? "opacity-100" : "opacity-0"}`}
          fill
          key={slide.src}
          priority={index === activeIndex}
          sizes="100vw"
          src={slide.src}
        />
      ))}
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-x-6 top-[130px] flex flex-col items-center text-center text-white md:top-[145px] lg:top-[155px]">
        <p className="text-[18px] font-medium leading-[1.5] text-[#f1f1f1] lg:text-[22px]">{slides[activeIndex].eyebrow}</p>
        <h2 className="mt-1 text-[30px] font-medium leading-[1.25] lg:text-[36px]">{slides[activeIndex].title}</h2>
        <div className="mt-3 flex items-center gap-3" aria-label="Dashboard carousel progress">
          {slides.map((slide, index) => (
            <button
              aria-label={`Show ${slide.eyebrow.toLowerCase()} slide`}
              className={`h-2.5 rounded-full transition-all ${index === activeIndex ? "w-10 bg-white" : "w-2.5 bg-white/70"}`}
              key={slide.src}
              onClick={() => setActiveIndex(index)}
              type="button"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function DashboardActionCard({
  body,
  desktopTitle,
  href,
  icon,
  mobileTitle
}: {
  body: string;
  desktopTitle: string;
  href: string;
  icon: LucideIcon;
  mobileTitle: string;
}) {
  const Icon = icon;

  return (
    <Link
      className="block rounded-[10px] bg-white px-7 py-5 shadow-[0_-3px_2px_rgba(0,0,0,0.06),0_3px_2px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_-3px_2px_rgba(0,0,0,0.06),0_6px_8px_rgba(0,0,0,0.1)] md:min-h-[176px] md:p-6 lg:min-h-[168px] lg:px-7 lg:py-6"
      href={href}
    >
      <span className="grid h-11 w-11 place-items-center rounded-[5px] bg-[#f2f6f8] text-[#196c88]">
        <Icon size={22} strokeWidth={1.5} />
      </span>
      <span className="mt-5 block text-[22px] font-medium leading-[1.35] text-[#196c88] lg:mt-4 lg:text-[21px]">
        <span className="lg:hidden">{mobileTitle}</span>
        <span className="hidden lg:inline">{desktopTitle}</span>
      </span>
      <span className="mt-2 block max-w-[420px] text-[15px] font-light leading-[1.5] text-[#5e5e5e] lg:text-[15px]">
        {body}
      </span>
    </Link>
  );
}

function getClientOnboardingSteps({
  clientJobsCount,
  profile
}: {
  clientJobsCount: number;
  profile: NonNullable<ReturnType<typeof useProfile>["profile"]>;
}) {
  return [
    {
      done: profile.phone_verified,
      title: "Verify Phone",
      body: "Give applicant confidence that they can reach you",
      href: "/profile"
    },
    {
      done: clientJobsCount > 0,
      title: "Post your first clear job",
      body: "Start with scope, budget, location, and timeline",
      href: "/client/create-request"
    }
  ].filter((step) => !step.done);
}

function ClientOnboardingCard({
  clientJobsCount,
  profile
}: {
  clientJobsCount: number;
  profile: NonNullable<ReturnType<typeof useProfile>["profile"]>;
}) {
  const steps = getClientOnboardingSteps({ clientJobsCount, profile });

  if (steps.length === 0) return null;

  return (
    <section className="rounded-[10px] border-[0.5px] border-[#196c88] bg-white px-6 py-4 md:px-7 md:pb-5 lg:p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[22px] font-medium leading-[1.4] text-[#196c88] lg:text-[21px]">Onboarding</h2>
        <p className="text-[14px] leading-[1.5] text-[#f4a422] lg:text-[15px]">Action Needed</p>
      </div>
      <p className="mt-2 text-[15px] font-light leading-[1.5] text-[#5e5e5e] lg:text-[15px]">
        Finish the trust and setup steps that make Accordia work better for you
      </p>
      <div className="mt-4 grid gap-3">
        {steps.map((step) => (
          <Link className="flex items-start gap-3 rounded-[10px] border-[0.5px] border-[#196c88] px-4 py-4 transition hover:bg-[#f2f6f8] md:items-center lg:px-4 lg:py-4" href={step.href} key={step.title}>
            <span className="grid h-10 w-10 shrink-0 place-items-center text-[#f4a422]">
              <ShieldCheck size={28} strokeWidth={1.5} />
            </span>
            <span className="min-w-0">
              <span className="block text-[20px] font-medium leading-[1.35] text-[#196c88] lg:text-[19px]">{step.title}</span>
              <span className="mt-1 block text-[15px] font-light leading-[1.5] text-[#5e5e5e] lg:text-[15px]">{step.body}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function getProfessionalOnboardingSteps(profile: NonNullable<ReturnType<typeof useProfile>["profile"]>) {
  const categoryCount = getProfessionalCategoryCount(profile);

  return [
    {
      done: profile.phone_verified,
      title: "Verify Phone",
      body: "Show clients that your account is reachable",
      href: "/profile"
    },
    {
      done: categoryCount > 0,
      title: "Set your categories",
      body: "Choose the kinds of service requests you want to receive",
      href: "/professional/categories"
    }
  ].filter((step) => !step.done);
}

function ProfessionalOnboardingCard({
  profile
}: {
  profile: NonNullable<ReturnType<typeof useProfile>["profile"]>;
}) {
  const steps = getProfessionalOnboardingSteps(profile);

  if (steps.length === 0) return null;

  return (
    <section className="rounded-[10px] border-[0.5px] border-[#196c88] bg-white px-6 py-4 md:px-7 md:pb-5 lg:p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[22px] font-medium leading-[1.4] text-[#196c88] lg:text-[21px]">Onboarding</h2>
        <p className="text-[14px] leading-[1.5] text-[#f4a422] lg:text-[15px]">Action Needed</p>
      </div>
      <p className="mt-2 text-[15px] font-light leading-[1.5] text-[#5e5e5e] lg:text-[15px]">
        Finish the trust and setup steps that make Accordia work better for you
      </p>
      <div className="mt-4 grid gap-3">
        {steps.map((step) => (
          <Link className="flex items-start gap-3 rounded-[10px] border-[0.5px] border-[#196c88] px-4 py-4 transition hover:bg-[#f2f6f8] md:items-center lg:px-4 lg:py-4" href={step.href} key={step.title}>
            <span className="grid h-10 w-10 shrink-0 place-items-center text-[#f4a422]">
              <ShieldCheck size={28} strokeWidth={1.5} />
            </span>
            <span className="min-w-0">
              <span className="block text-[20px] font-medium leading-[1.35] text-[#196c88] lg:text-[19px]">{step.title}</span>
              <span className="mt-1 block text-[15px] font-light leading-[1.5] text-[#5e5e5e] lg:text-[15px]">{step.body}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ClientDashboardHome({
  clientJobsCount,
  profile
}: {
  clientJobsCount: number;
  profile: NonNullable<ReturnType<typeof useProfile>["profile"]>;
}) {
  return (
    <div className="bg-[#fcfdfd] pb-16">
      <DashboardHeroCarousel slides={clientHeroSlides} />
      <div className="mx-auto max-w-[1180px] px-6 pt-7 md:px-8 md:pt-10 lg:px-10 lg:pt-9 xl:px-0">
        <h1 className="text-[30px] font-semibold leading-[1.35] text-[#196c88] md:text-[40px] md:font-medium lg:text-[38px]">
          Welcome, {profile.first_name}
        </h1>

        <div className="mt-6 grid gap-4 md:mt-10 md:grid-cols-2 md:gap-6 lg:mt-9 lg:gap-8">
          <DashboardActionCard
            body="Create a service request and post for professionals to apply to"
            desktopTitle="Create Request"
            href="/client/create-request"
            icon={BriefcaseBusiness}
            mobileTitle="Post Job"
          />
          <DashboardActionCard
            body="See Views, application and job status"
            desktopTitle="Track Service Request"
            href="/client/my-requests"
            icon={MessageSquare}
            mobileTitle="Track My Jobs"
          />
        </div>

        <div className="mt-6 md:mt-7 lg:mt-7">
          <ClientOnboardingCard clientJobsCount={clientJobsCount} profile={profile} />
        </div>

        <section className="mt-7 rounded-[10px] bg-[#e9ebf8] px-6 py-4 shadow-[0_3px_2px_rgba(0,0,0,0.18)] md:mt-8 md:px-8 lg:mt-7 lg:px-7">
          <h2 className="text-[22px] font-medium leading-[1.4] text-[#196c88] lg:text-[21px]">Hiring Flow</h2>
          <p className="mt-2 text-[15px] leading-[1.5] text-[#585858] lg:text-[15px]">
            Post a clear job, review pitches, accept applicant, then track progress until both sides mark it done
          </p>
        </section>
      </div>
    </div>
  );
}

function ProfessionalDashboardHome({
  profile
}: {
  profile: NonNullable<ReturnType<typeof useProfile>["profile"]>;
}) {
  return (
    <div className="bg-[#fcfdfd] pb-16">
      <DashboardHeroCarousel slides={professionalHeroSlides} />
      <div className="mx-auto max-w-[1180px] px-6 pt-7 md:px-8 md:pt-10 lg:px-10 lg:pt-9 xl:px-0">
        <h1 className="text-[30px] font-semibold leading-[1.35] text-[#196c88] md:text-[40px] md:font-medium lg:text-[38px]">
          Welcome, {profile.first_name}
        </h1>

        <div className="mt-6 grid gap-4 md:mt-10 md:grid-cols-2 md:gap-6 lg:mt-9 lg:gap-8">
          <DashboardActionCard
            body="Choose your categories so Accordia can match you with the right service requests"
            desktopTitle="Set Categories"
            href="/professional/categories"
            icon={ListChecks}
            mobileTitle="Set Categories"
          />
          <DashboardActionCard
            body="Review matched requests, manage applications, chats, quotes, and active work"
            desktopTitle="Track Service Requests"
            href="/professional/jobs"
            icon={SearchCheck}
            mobileTitle="Track Jobs"
          />
        </div>

        <div className="mt-6 md:mt-7 lg:mt-7">
          <ProfessionalOnboardingCard profile={profile} />
        </div>

        <section className="mt-7 rounded-[10px] bg-[#e9ebf8] px-6 py-4 shadow-[0_3px_2px_rgba(0,0,0,0.18)] md:mt-8 md:px-8 lg:mt-7 lg:px-7">
          <h2 className="text-[22px] font-medium leading-[1.4] text-[#196c88] lg:text-[21px]">Service Flow</h2>
          <p className="mt-2 text-[15px] leading-[1.5] text-[#585858] lg:text-[15px]">
            Match with requests, send a proposal, discuss details, share quotes, then track delivery until completion
          </p>
        </section>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { profile, error, loading } = useProfile();
  const { jobs: clientJobs, error: clientJobsError, loading: clientJobsLoading } = useClientJobs();
  const showToast = useToast();

  useEffect(() => {
    if (error) {
      showToast({ tone: "error", title: "Could not load profile", body: error });
    }
  }, [error, showToast]);

  useEffect(() => {
    if (clientJobsError && profile?.role === "client") {
      showToast({ tone: "error", title: "Could not load jobs", body: clientJobsError });
    }
  }, [clientJobsError, profile?.role, showToast]);

  if (loading || (profile?.role === "client" && clientJobsLoading)) {
    return (
      <AppShell variant={profile?.role === "client" ? "client-home" : "default"}>
        <PageLoader />
      </AppShell>
    );
  }

  if (profile?.role === "client") {
    return (
      <AppShell variant="client-home">
        <ClientDashboardHome clientJobsCount={clientJobs.length} profile={profile} />
      </AppShell>
    );
  }

  return (
    <AppShell variant={profile?.role === "professional" ? "client-home" : "default"}>
      {profile?.role === "professional" ? <ProfessionalDashboardHome profile={profile} /> : null}
    </AppShell>
  );
}
