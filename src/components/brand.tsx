import {
  Building2,
  Hammer,
  Paintbrush,
  PlugZap,
  Sparkles,
  UserRound,
} from "lucide-react";
import Image from "next/image";

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
  const cards =
    variant === "client"
      ? [
          { label: "Post job", icon: Building2, tone: "bg-teal-50 text-brand" },
          { label: "Review pros", icon: UserRound, tone: "bg-amber-50 text-amber" },
          { label: "Track progress", icon: Sparkles, tone: "bg-green-50 text-green" }
        ]
      : variant === "professional"
        ? [
            { label: "Plumbing", icon: Hammer, tone: "bg-teal-50 text-brand" },
            { label: "Electrical", icon: PlugZap, tone: "bg-amber-50 text-amber" },
            { label: "Design", icon: Paintbrush, tone: "bg-green-50 text-green" }
          ]
        : [
            { label: "Clients", icon: Building2, tone: "bg-teal-50 text-brand" },
            { label: "Artisans", icon: Hammer, tone: "bg-amber-50 text-amber" },
            { label: "Specialists", icon: UserRound, tone: "bg-green-50 text-green" }
          ];

  return (
    <div className="relative overflow-hidden rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="absolute right-4 top-4 rounded-md border border-line px-3 py-1 text-xs font-semibold text-muted">
        Illustration slot
      </div>
      <div className="mt-8 grid gap-3">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div className={`flex items-center gap-3 rounded-lg border border-line p-4 ${index === 1 ? "ml-8" : ""}`} key={card.label}>
              <div className={`grid h-12 w-12 place-items-center rounded-md ${card.tone}`}>
                <Icon size={22} />
              </div>
              <div>
                <p className="font-semibold text-ink">{card.label}</p>
                <p className="text-sm text-muted">Cartoon image placeholder</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 rounded-md bg-slate-50 p-4">
        <p className="text-sm leading-6 text-muted">
          Replace this area with friendly cartoon artwork showing artisans, service workers, office professionals, and clients working together.
        </p>
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
