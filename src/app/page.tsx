import { ArrowCta, FigmaAuthShell, PreSignupCarousel, TrustList } from "@/components/auth/auth-ui";

export default function HomePage() {
  return (
    <FigmaAuthShell>
      <section className="mt-8 flex flex-col overflow-hidden rounded-[10px] border-[0.5px] border-[#196c88] bg-[#fcfdfd] md:mt-14 lg:mt-14 lg:grid lg:min-h-[540px] lg:grid-cols-[1fr_500px] lg:items-center xl:mt-16 xl:grid-cols-[1fr_520px]">
        <div className="order-2 px-5 py-8 sm:px-8 md:py-10 lg:order-1 lg:px-9">
          <div className="max-w-[600px]">
            <h1 className="max-w-[560px] text-[32px] font-medium leading-[1.25] text-[#196c88] sm:text-[40px] lg:text-[44px]">
              Start Your Journey With Accordia
            </h1>
            <p className="mt-4 max-w-[570px] text-[16px] font-normal leading-[1.55] text-[#5e5e5e] sm:text-[19px] lg:text-[20px]">
              Whether you are hiring or offering your services, create an account to connect with trusted professionals, discover opportunities, manage projects, collaborate and build meaningful relationships - All in one place
            </p>
            <div className="mt-7 lg:mt-6">
              <TrustList />
            </div>
            <div className="mt-9 grid gap-4 sm:flex sm:items-center">
              <ArrowCta href="/register" tone="primary">Create Account</ArrowCta>
              <ArrowCta href="/login" tone="secondary">Sign in</ArrowCta>
            </div>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <PreSignupCarousel />
        </div>
      </section>
    </FigmaAuthShell>
  );
}

