import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { BrandLockup, WorkIllustration } from "@/components/brand";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto grid min-h-screen max-w-6xl content-center gap-10 px-5 py-10 md:grid-cols-[1fr_430px] md:items-center">
        <div>
          <BrandLockup />
          <h1 className="mt-8 max-w-3xl text-4xl font-semibold tracking-normal text-ink md:text-6xl">
            Find trusted professionals and manage jobs from first message to completion.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
            Connect with artisans, service workers, creatives, and office professionals through category-matched jobs, structured applications, and visible progress tracking.
          </p>
          <div className="mt-6 grid gap-3 text-sm text-ink sm:grid-cols-3">
            {["Phone-first trust", "Matched job feed", "Progress timeline"].map((item) => (
              <div className="flex items-center gap-2" key={item}>
                <CheckCircle2 className="text-green" size={18} />
                {item}
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="inline-flex items-center gap-2 rounded-md bg-brand px-5 py-3 font-medium text-white" href="/register">
              Create account
              <ArrowRight size={18} />
            </Link>
            <Link className="rounded-md border border-line px-5 py-3 font-medium text-ink" href="/login">
              Login
            </Link>
          </div>
        </div>
        <WorkIllustration />
      </section>
    </main>
  );
}
