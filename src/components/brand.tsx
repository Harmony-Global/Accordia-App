"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const professionScenes = [
  {
    title: "Electrical work",
    src: "/images/dashboard-professions/electrician.png",
    alt: "Professional electrician installing a ceiling light fixture"
  },
  {
    title: "Plumbing repairs",
    src: "/images/dashboard-professions/plumber.png",
    alt: "Professional plumber repairing pipes under a kitchen sink"
  },
  {
    title: "Carpentry",
    src: "/images/dashboard-professions/carpenter.png",
    alt: "Professional carpenter measuring a wooden cabinet panel"
  },
  {
    title: "Home cleaning",
    src: "/images/dashboard-professions/cleaner.png",
    alt: "Professional cleaner steam cleaning a sofa"
  }
];

const clientScenes = [
  {
    title: "Review quotes",
    src: "/images/dashboard-clients/quote-review.png",
    alt: "Client reviewing a home service quote on a phone"
  },
  {
    title: "Plan the work",
    src: "/images/dashboard-clients/paint-consultation.png",
    alt: "Client discussing paint colors with a professional painter"
  },
  {
    title: "Inspect progress",
    src: "/images/dashboard-clients/finished-work.png",
    alt: "Clients inspecting finished cabinetry work with a carpenter"
  },
  {
    title: "Welcome pros",
    src: "/images/dashboard-clients/cleaner-arrival.png",
    alt: "Client welcoming a professional cleaner at the doorway"
  }
];

export function LogoMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const classes = {
    sm: "h-9 w-9",
    md: "h-12 w-12",
    lg: "h-16 w-16"
  };

  return (
    <div className={`${classes[size]} relative overflow-hidden`}>
      <Image
        alt="Accordia logomark"
        className="object-contain"
        fill
        priority
        sizes={size === "lg" ? "64px" : size === "md" ? "48px" : "36px"}
        src="/brand/accordia-logomark.png"
      />
    </div>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-0.5 transition duration-200 hover:opacity-90">
      <LogoMark size={compact ? "sm" : "md"} />
      <span className={`-ml-1 font-semibold tracking-wide text-ink ${compact ? "text-xl" : "text-2xl"}`}>ccordia</span>
    </div>
  );
}

export function WorkIllustration({ variant = "mixed" }: { variant?: "mixed" | "client" | "professional" }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scenes = variant === "client" ? clientScenes : professionScenes;
  const eyebrow = variant === "client" ? "Find skilled help" : variant === "professional" ? "Work across trades" : "Skilled local work";

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % scenes.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, [scenes.length]);

  return (
    <div className="relative overflow-hidden rounded-lg">
      <div className="relative aspect-[16/10] min-h-[280px] overflow-hidden rounded-lg bg-slate-100 sm:min-h-[320px] xl:min-h-[360px]">
        {scenes.map((scene, index) => (
          <Image
            alt={scene.alt}
            className={`object-cover transition-opacity duration-700 ease-out ${index === activeIndex ? "opacity-100" : "opacity-0"}`}
            fill
            key={scene.src}
            priority={index === 0}
            quality={95}
            sizes="(min-width: 1280px) 360px, (min-width: 768px) 42vw, 100vw"
            src={scene.src}
          />
        ))}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-semibold">{scenes[activeIndex].title}</h2>
          <div className="mt-4 flex gap-2" aria-label="Profession carousel progress">
            {scenes.map((scene, index) => (
              <button
                aria-label={`Show ${scene.title}`}
                className={`h-2 rounded-full transition-all ${index === activeIndex ? "w-8 bg-white" : "w-2 bg-white/50"}`}
                key={scene.title}
                onClick={() => setActiveIndex(index)}
                type="button"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StoryImageCarousel({ role = "mixed" }: { role?: "mixed" | "client" | "professional" }) {
  const scenes = [
    {
      title: "Hire local service pros",
      tone: "from-teal-50 to-white",
      src: "/images/auth/service-client.png",
      alt: "Flat cartoon illustration of a client meeting service professionals"
    },
    {
      title: "Skilled people, clear work",
      tone: "from-amber-50 to-white",
      src: "/images/auth/office-specialist.png",
      alt: "Flat cartoon illustration of a professional reviewing work on a computer"
    },
    {
      title: "Track every milestone",
      tone: "from-green-50 to-white",
      src: "/images/auth/specialist-team.png",
      alt: "Flat cartoon illustration of specialists and a client reviewing project milestones"
    }
  ];
  const activeIndex = role === "professional" ? 1 : role === "client" ? 0 : 2;
  const scene = scenes[activeIndex];

  return (
    <div className="motion-panel overflow-hidden">
      <div className={`rounded-xl bg-gradient-to-br ${scene.tone} p-3`}>
        <div className="relative h-80 overflow-hidden rounded-lg">
          <Image
            alt={scene.alt}
            className="motion-image object-cover"
            fill
            priority
            sizes="(min-width: 1024px) 420px, 100vw"
            src={scene.src}
          />
        </div>
        <h2 className="motion-panel motion-delay-1 mt-5 text-2xl font-bold text-ink">{scene.title}</h2>
      </div>
      <div className="mt-4 flex gap-2">
        {scenes.map((item, index) => (
          <span className={`h-2 rounded-full ${index === activeIndex ? "w-8 bg-brand" : "w-2 bg-slate-300"}`} key={item.title} />
        ))}
      </div>
    </div>
  );
}
