"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui";

const authImages = {
  logo: "/images/auth/figma/accordia-logo.png",
  signup: "/images/auth/figma/signup-milestone.png",
  login: "/images/auth/figma/login-create-services.png",
  carousel: [
    {
      src: "/images/auth/figma/pre-hair-stylist.png",
      eyebrow: "SKILLED LOCAL WORK",
      title: "Hair Sylist"
    },
    {
      src: "/images/auth/figma/pre-carpenter.png",
      eyebrow: "SKILLED LOCAL WORK",
      title: "Carpenter"
    },
    {
      src: "/images/auth/figma/pre-web-developer.png",
      eyebrow: "PROFESSIONAL WORK",
      title: "Web Developer"
    },
    {
      src: "/images/auth/figma/pre-fashion-designer.png",
      eyebrow: "SKILLED LOCAL WORK",
      title: "Fashion Designer"
    }
  ]
};

export function FigmaAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-white px-4 py-4 text-[#585858] sm:px-6 lg:px-12 xl:px-16">
      <div className="mx-auto max-w-[1180px]">
        <Link aria-label="Accordia home" className="relative block h-[48px] w-[132px] sm:h-[56px] sm:w-[154px]" href="/">
          <Image alt="Accordia" className="object-contain" fill priority sizes="154px" src={authImages.logo} />
        </Link>
        {children}
      </div>
    </main>
  );
}

export function AuthLoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white text-[#196c88]">
      <Spinner className="h-24 w-24 border-4" />
    </main>
  );
}

export function PreSignupCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % authImages.carousel.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="relative min-h-[240px] overflow-hidden rounded-b-[10px] bg-white md:min-h-[300px] lg:min-h-[540px] lg:rounded-b-none lg:rounded-r-[10px]">
      {authImages.carousel.map((item, index) => (
        <Image
          alt={item.title}
          className={`object-cover transition-opacity duration-700 ${index === activeIndex ? "opacity-100" : "opacity-0"}`}
          fill
          key={item.src}
          priority={index === 0}
          sizes="(min-width: 1024px) 545px, 100vw"
          src={item.src}
        />
      ))}
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute bottom-5 left-5 text-white sm:bottom-7 sm:left-7 lg:bottom-6 lg:left-8">
        <p className="text-[13px] leading-[1.5] text-white/75 sm:text-[15px]">{authImages.carousel[activeIndex].eyebrow}</p>
        <h2 className="mt-1 text-[21px] font-medium leading-[1.4] sm:text-[23px]">{authImages.carousel[activeIndex].title}</h2>
        <div className="mt-3 flex gap-2.5" aria-label="Profession carousel progress">
          {authImages.carousel.map((item, index) => (
            <button
              aria-label={`Show ${item.title}`}
              className={`h-2 rounded-full transition-all ${index === activeIndex ? "w-[30px] bg-white" : "w-2 bg-[#d4d4d4]"}`}
              key={item.title}
              onClick={() => setActiveIndex(index)}
              type="button"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function AuthVisualPanel({
  image,
  label,
  title,
  body,
  className = ""
}: {
  image: "signup" | "login";
  label: string;
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <section className={`h-full overflow-hidden border-[#196c88] bg-[#fcfdfd] lg:border-r-[0.5px] ${className}`}>
      <div className="relative h-[210px] overflow-hidden rounded-t-[10px] bg-white sm:h-[240px] lg:h-[260px] lg:rounded-r-none">
        <Image
          alt={label}
          className={`object-cover ${image === "login" ? "object-[center_72%]" : "object-center"}`}
          fill
          priority
          sizes="(min-width: 1024px) 586px, 100vw"
          src={authImages[image]}
        />
        <div className="absolute inset-0 bg-black/25" />
        <p className="absolute bottom-5 left-5 text-[18px] font-bold leading-normal text-white sm:left-7 sm:text-[22px]">{label}</p>
      </div>
      <div className="px-5 py-7 sm:px-7 sm:py-8 lg:py-8">
        <h2 className="max-w-[580px] text-[28px] font-medium leading-[1.25] text-[#196c88] sm:text-[34px] lg:text-[38px]">{title}</h2>
        <p className="mt-4 max-w-[580px] text-[16px] leading-[1.55] text-[#5e5e5e] sm:text-[18px] lg:text-[20px]">{body}</p>
      </div>
    </section>
  );
}

export function AuthPrimaryButton({ children, loading }: { children: React.ReactNode; loading?: boolean }) {
  return (
    <button
      className="inline-flex h-12 w-full items-center justify-center rounded-[5px] bg-[#196c88] px-4 text-[15px] font-normal leading-[1.5] text-white transition hover:bg-[#17617a] disabled:cursor-not-allowed disabled:opacity-70 sm:h-[52px] sm:text-[16px]"
      disabled={loading}
      type="submit"
    >
      {loading ? <span className="inline-flex items-center gap-2"><Spinner className="h-6 w-6 border-[3px]" /> {children}</span> : children}
    </button>
  );
}

export function AuthGoogleButton({ disabled, label, loading, onClick }: { disabled?: boolean; label: string; loading?: boolean; onClick: () => void }) {
  return (
    <button
      className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-[5px] border border-[#196c88] bg-white px-4 text-[15px] font-normal leading-[1.5] text-[#196c88] transition hover:bg-[#f8fbfc] disabled:cursor-not-allowed disabled:opacity-70 sm:h-[52px] sm:text-[16px]"
      disabled={disabled || loading}
      onClick={onClick}
      type="button"
    >
      {loading ? <Spinner className="h-5 w-5 border-[3px]" /> : <GoogleIcon />}
      {loading ? "Opening Google" : label}
    </button>
  );
}

export function AuthDivider() {
  return (
    <div className="flex h-[24px] items-center justify-center gap-2 text-[15px] leading-[1.5] text-[#196c88] sm:text-[16px]">
      <span className="h-px flex-1 bg-[#196c88]" />
      OR
      <span className="h-px flex-1 bg-[#196c88]" />
    </div>
  );
}

export function AuthTextField({
  className = "",
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={`block text-[16px] font-normal leading-[1.5] text-[#585858] sm:text-[18px] ${className}`}>
      {label}
      <input
        className="mt-2 h-12 w-full rounded-[10px] border-[0.5px] border-[#5e5e5e] bg-white px-4 text-[16px] font-normal text-[#585858] outline-none transition placeholder:text-[#a4a4a4] hover:border-[#196c88] focus:border-[#196c88] focus:ring-4 focus:ring-[#196c88]/10 sm:h-[52px] sm:px-5 sm:text-[17px]"
        {...props}
      />
    </label>
  );
}

export function AuthPasswordField({
  className = "",
  forgotHref,
  label = "Password",
  name = "password",
  showPassword,
  togglePassword,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  forgotHref?: string;
  label?: string;
  name?: string;
  showPassword: boolean;
  togglePassword: () => void;
}) {
  return (
    <label className={`block text-[16px] font-normal leading-[1.5] text-[#585858] sm:text-[18px] ${className}`}>
      <span className="flex items-center justify-between gap-4">
        {label}
        {forgotHref ? <Link className="text-[15px] text-[#585858] sm:text-[17px]" href={forgotHref}>Forgot Password</Link> : null}
      </span>
      <span className="mt-2 flex h-12 rounded-[10px] border-[0.5px] border-[#5e5e5e] bg-white transition hover:border-[#196c88] focus-within:border-[#196c88] focus-within:ring-4 focus-within:ring-[#196c88]/10 sm:h-[52px]">
        <input
          className="min-w-0 flex-1 rounded-[10px] bg-transparent px-4 text-[16px] font-normal text-[#585858] outline-none placeholder:text-[#a4a4a4] sm:px-5 sm:text-[17px]"
          name={name}
          type={showPassword ? "text" : "password"}
          {...props}
        />
        <button
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="grid w-14 place-items-center rounded-[10px] text-[#a4a4a4] transition hover:bg-slate-50 hover:text-[#196c88]"
          onClick={togglePassword}
          type="button"
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </span>
    </label>
  );
}

export function TrustList() {
  return (
    <div className="grid gap-3 text-[#006071] sm:grid-cols-3 lg:flex lg:gap-8">
      {["Phone-first trust", "Matched Job feed", "Progress timeline"].map((item) => (
        <div className="flex items-center gap-4" key={item}>
          <CheckCircle2 size={16} strokeWidth={1.6} />
          <span className="text-[14px] leading-[1.5] sm:text-[15px]">{item}</span>
        </div>
      ))}
    </div>
  );
}

export function ArrowCta({ href, tone, children }: { href: string; tone: "primary" | "secondary"; children: React.ReactNode }) {
  const classes = tone === "primary"
    ? "bg-[#196c88] text-white hover:bg-[#17617a]"
    : "border border-[#196c88] bg-white text-[#196c88] hover:bg-[#f8fbfc]";

  return (
    <Link className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-[5px] px-4 text-[15px] leading-[1.5] transition sm:h-[52px] sm:w-[190px] sm:text-[16px] ${classes}`} href={href}>
      {children}
      <ArrowRight size={20} strokeWidth={1.7} />
    </Link>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 18 18">
      <path fill="#4285f4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.86 2.7-6.62Z" />
      <path fill="#34a853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.58-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#fbbc05" d="M3.95 10.7a5.4 5.4 0 0 1 0-3.4V4.97H.96a9 9 0 0 0 0 8.06l2.99-2.33Z" />
      <path fill="#ea4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.42 0 9 0A9 9 0 0 0 .96 4.97L3.95 7.3C4.66 5.16 6.65 3.58 9 3.58Z" />
    </svg>
  );
}
