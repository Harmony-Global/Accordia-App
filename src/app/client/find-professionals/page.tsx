"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Star,
  X
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ChatModal } from "@/components/chat-modal";
import { Button, CustomSelect, IconButton, PageLoader, ProfileAvatar, SkeletonBlock, Spinner, SurfaceModal, TextAreaField } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useRequireAuth } from "@/hooks/use-auth";
import { useCategories } from "@/hooks/use-categories";
import { getAvailability, requestAppointment } from "@/services/appointment-service";
import { getProfessionalInquiries, startProfessionalInquiry } from "@/services/inquiry-service";
import { searchProfessionals, type ProfessionalSearchFilters } from "@/services/professional-service";
import type { AppointmentAvailability, Category, ProfessionalInquiry, ProfessionalSearchResult, ProfessionalService } from "@/types";

const locationSuggestions = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Enugu"];

function normalizeFilters(filters: ProfessionalSearchFilters): ProfessionalSearchFilters {
  return {
    q: filters.q?.trim() ?? "",
    category_id: filters.category_id ?? "",
    state: filters.state?.trim() ?? ""
  };
}

function filtersAreEmpty(filters: ProfessionalSearchFilters) {
  const normalizedFilters = normalizeFilters(filters);
  return !normalizedFilters.q && !normalizedFilters.category_id && !normalizedFilters.state;
}

function profileName(professional: ProfessionalSearchResult) {
  return `${professional.profile?.first_name ?? ""} ${professional.profile?.last_name ?? ""}`.trim() || "Professional";
}

function categoryList(professional: ProfessionalSearchResult): Category[] {
  return professional.professional_categories?.map((item) => item.category).filter(Boolean) ?? [];
}

function activeServices(professional: ProfessionalSearchResult): ProfessionalService[] {
  return professional.professional_services?.filter((service) => service.is_active) ?? [];
}

function professionalLocation(professional: ProfessionalSearchResult) {
  return [professional.location, professional.state].filter(Boolean).join(", ") || "Location not provided";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatPrice(service: ProfessionalService) {
  return `${service.currency}${service.price_min.toLocaleString()}-${service.currency}${service.price_max.toLocaleString()}`;
}

function ratingLabel(professional: ProfessionalSearchResult) {
  const rating = professional.rating_average ?? 0;
  const reviews = professional.review_count ?? 0;
  return `${rating > 0 ? rating.toFixed(1) : "0.0"}(${reviews} review${reviews === 1 ? "" : "s"})`;
}

function shuffleProfessionals(professionals: ProfessionalSearchResult[]) {
  return [...professionals]
    .map((professional) => ({ professional, sort: Math.random() }))
    .sort((first, second) => first.sort - second.sort)
    .map((item) => item.professional);
}

function topProfessionals(professionals: ProfessionalSearchResult[]) {
  return [...professionals].sort((first, second) => {
    const reviewDifference = (second.review_count ?? 0) - (first.review_count ?? 0);
    if (reviewDifference !== 0) return reviewDifference;
    const ratingDifference = (second.rating_average ?? 0) - (first.rating_average ?? 0);
    return ratingDifference;
  });
}

function SearchField({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0 text-[15px] font-medium leading-[1.5] text-[#5e5e5e] md:text-[17px]">
      {label}
      {children}
    </label>
  );
}

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="mt-3 h-12 w-full rounded-[5px] border border-[#a4a4a4] bg-white px-4 text-[15px] font-light leading-[1.5] text-[#5e5e5e] outline-none transition placeholder:text-[#a4a4a4] focus:border-[#196c88] focus:ring-2 focus:ring-[#196c88]/10 md:h-[52px] md:text-[17px]"
      {...props}
    />
  );
}

function StyledSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <CustomSelect
      className="mt-3"
      triggerClassName="h-12 rounded-[5px] border-[#a4a4a4] px-4 text-[15px] font-light leading-[1.5] text-[#5e5e5e] focus:ring-2 focus:ring-[#196c88]/10 md:h-[52px] md:text-[17px]"
      {...props}
    />
  );
}

function CategoryPills({ categories }: { categories: Category[] }) {
  const visible = categories.slice(0, 2);
  const remaining = Math.max(0, categories.length - visible.length);

  if (categories.length === 0) {
    return (
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex h-8 items-center rounded-full bg-[#f2f6f8] px-4 text-[13px] font-medium text-[#196c88]">General</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((category) => (
        <span className="inline-flex h-8 items-center rounded-full bg-[#f2f6f8] px-4 text-[13px] font-medium text-[#196c88]" key={category.id}>
          {category.name}
        </span>
      ))}
      {remaining > 0 ? (
        <span className="inline-flex h-8 items-center rounded-full bg-[#f2f6f8] px-4 text-[13px] font-medium text-[#196c88]">+{remaining}more</span>
      ) : null}
    </div>
  );
}

function VerificationPill({ verified }: { verified?: boolean }) {
  return (
    <span className={`inline-flex h-8 items-center gap-2 rounded-full px-4 text-[13px] font-medium ${verified ? "bg-[#0fa269] text-white" : "bg-[#f2f6f8] text-[#196c88]"}`}>
      <ShieldCheck size={15} strokeWidth={1.7} />
      {verified ? "Verified" : "Unverified"}
    </span>
  );
}

function ProfessionalInfoTile({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="grid min-h-[70px] place-items-center rounded-[4px] bg-[#f8fbfc] px-3 text-center">
      <p className="inline-flex items-center gap-3 text-[14px] font-medium text-[#196c88]">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-[13px] font-light text-[#5e5e5e]">{value}</p>
    </div>
  );
}

function FeaturedServiceCard({ service }: { service: ProfessionalService }) {
  return (
    <article className="grid min-h-[92px] grid-cols-[112px_minmax(0,1fr)] items-center gap-3 rounded-[5px] border border-[#d5e4e9] bg-white p-3">
      <img alt={service.title} className="h-[60px] w-[112px] rounded-[5px] object-cover" decoding="async" loading="lazy" src={service.image_url} />
      <div className="min-w-0 text-center">
        <h4 className="truncate text-[14px] font-medium leading-[1.4] text-[#5e5e5e]">{service.title}</h4>
        <p className="mt-2 line-clamp-2 text-[13px] font-light leading-[1.35] text-[#757575]">{service.description}</p>
        <p className="mt-2 text-[13px] font-medium text-[#5e5e5e]">{formatPrice(service)}</p>
      </div>
    </article>
  );
}

function ProfessionalCard({
  professional,
  onViewProfile
}: {
  professional: ProfessionalSearchResult;
  onViewProfile: (professional: ProfessionalSearchResult) => void;
}) {
  const categories = categoryList(professional);
  const services = activeServices(professional).slice(0, 2);

  return (
    <article className="rounded-[7px] border border-[#b8d1da] bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <ProfileAvatar avatarUrl={professional.profile?.avatar_url} className="h-10 w-10 bg-white ring-1 ring-[#d5e4e9]" iconSize={19} />
          <div className="min-w-0">
            <h3 className="truncate text-[14px] font-medium leading-[1.5] text-[#5e5e5e] md:text-[15px]">{profileName(professional)}</h3>
            <p className="mt-1 inline-flex items-center gap-1 text-[13px] font-light text-[#5e5e5e]">
              <Star className="fill-[#f4a422] text-[#f4a422]" size={18} strokeWidth={0} />
              {ratingLabel(professional)}
            </p>
          </div>
        </div>
        <VerificationPill verified={professional.profile?.phone_verified} />
      </div>

      <div className="mt-5">
        <CategoryPills categories={categories} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ProfessionalInfoTile icon={<MapPin size={18} strokeWidth={1.7} />} label="Location" value={professionalLocation(professional)} />
        <ProfessionalInfoTile icon={<BriefcaseBusiness size={18} strokeWidth={1.7} />} label="Experience" value={`${professional.years_experience ?? 0} years`} />
      </div>

      <p className="mt-6 text-[14px] font-light leading-[1.5] text-[#5e5e5e]">Featured Service</p>
      <div className="mt-3 grid gap-2">
        {services.length > 0 ? services.map((service) => <FeaturedServiceCard key={service.id} service={service} />) : <p className="rounded-[5px] border border-dashed border-[#d5e4e9] p-4 text-sm text-[#a4a4a4]">No featured services yet.</p>}
      </div>

      <Button className="mt-6 h-12 rounded-[5px] border-[#196c88] px-6 py-0 text-[15px] font-medium text-[#196c88]" onClick={() => onViewProfile(professional)} type="button" variant="secondary">
        View Profile
      </Button>
    </article>
  );
}

function ProfessionalSection({
  title,
  professionals,
  onViewProfile
}: {
  title: string;
  professionals: ProfessionalSearchResult[];
  onViewProfile: (professional: ProfessionalSearchResult) => void;
}) {
  const [page, setPage] = useState(0);
  const pageSize = 2;
  const totalPages = Math.max(1, Math.ceil(professionals.length / pageSize));
  const visibleProfessionals = professionals.slice(page * pageSize, page * pageSize + pageSize);

  useEffect(() => {
    setPage(0);
  }, [professionals]);

  if (professionals.length === 0) return null;

  return (
    <section className="rounded-[7px] border border-[#b8d1da] bg-white px-4 py-6 sm:px-8 md:px-10">
      <h2 className="text-[22px] font-medium leading-[1.4] text-[#5e5e5e] md:text-[28px]">{title}</h2>
      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        {visibleProfessionals.map((professional) => (
          <ProfessionalCard key={professional.user_id ?? professional.id} professional={professional} onViewProfile={onViewProfile} />
        ))}
      </div>
      <div className="mt-9 flex justify-end gap-3">
        <IconButton
          aria-label={`Previous ${title}`}
          className="h-9 w-9 border-[#b8d1da] text-[#196c88] disabled:opacity-40"
          disabled={page === 0}
          onClick={() => setPage((current) => Math.max(0, current - 1))}
          type="button"
          variant="secondary"
        >
          <ChevronLeft size={18} />
        </IconButton>
        <IconButton
          aria-label={`Next ${title}`}
          className="h-9 w-9 border-[#b8d1da] text-[#196c88] disabled:opacity-40"
          disabled={page >= totalPages - 1}
          onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
          type="button"
          variant="secondary"
        >
          <ChevronRight size={18} />
        </IconButton>
      </div>
    </section>
  );
}

function ProfessionalsSkeleton() {
  return (
    <section className="rounded-[7px] border border-[#b8d1da] bg-white px-4 py-6 sm:px-8 md:px-10">
      <SkeletonBlock className="h-9 w-72" />
      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="rounded-[7px] border border-[#d5e4e9] bg-white p-5 sm:p-6" key={index}>
            <div className="flex justify-between gap-4">
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-10 w-10 rounded-full" />
                <div>
                  <SkeletonBlock className="h-4 w-32" />
                  <SkeletonBlock className="mt-2 h-4 w-24" />
                </div>
              </div>
              <SkeletonBlock className="h-8 w-28 rounded-full" />
            </div>
            <div className="mt-5 flex gap-2">
              <SkeletonBlock className="h-8 w-24 rounded-full" />
              <SkeletonBlock className="h-8 w-24 rounded-full" />
              <SkeletonBlock className="h-8 w-20 rounded-full" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <SkeletonBlock className="h-[70px]" />
              <SkeletonBlock className="h-[70px]" />
            </div>
            <SkeletonBlock className="mt-6 h-4 w-32" />
            <SkeletonBlock className="mt-3 h-[92px]" />
            <SkeletonBlock className="mt-2 h-[92px]" />
            <SkeletonBlock className="mt-6 h-12 w-36" />
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptySearchState() {
  return (
    <section className="grid min-h-[560px] place-items-center text-center">
      <div>
        <img
          alt=""
          className="mx-auto h-auto w-[190px] max-w-full object-contain md:w-[230px]"
          decoding="async"
          src="/images/find-professionals/no-search-results.png"
        />
        <h2 className="mt-8 text-[24px] font-medium leading-[1.4] text-[#5e5e5e] md:text-[28px]">Oops! No search result found</h2>
        <p className="mx-auto mt-5 max-w-[360px] text-[17px] font-light leading-[1.5] text-[#a4a4a4] md:text-[20px]">
          Try another category, service name, or location.
        </p>
      </div>
    </section>
  );
}

function ProfessionalDetailModal({
  professional,
  onClose
}: {
  professional: ProfessionalSearchResult;
  onClose: () => void;
}) {
  const token = useRequireAuth();
  const showToast = useToast();
  const categories = categoryList(professional);
  const services = activeServices(professional);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [message, setMessage] = useState("");
  const [startingInquiry, setStartingInquiry] = useState(false);
  const [inquiry, setInquiry] = useState<ProfessionalInquiry | null>(null);
  const [availability, setAvailability] = useState<AppointmentAvailability[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [selectedAvailabilityId, setSelectedAvailabilityId] = useState("");
  const [appointmentNote, setAppointmentNote] = useState("");
  const [requestingAppointment, setRequestingAppointment] = useState(false);

  useEffect(() => {
    if (!token || !professional.user_id) return;

    setAvailabilityLoading(true);
    getAvailability(token, professional.user_id)
      .then((data) => {
        setAvailability(data.availability);
        setSelectedAvailabilityId(data.availability[0]?.id ?? "");
      })
      .catch(() => setAvailability([]))
      .finally(() => setAvailabilityLoading(false));
  }, [professional.user_id, token]);

  async function requestBooking() {
    if (!token || !selectedAvailabilityId) return;

    const slot = availability.find((item) => item.id === selectedAvailabilityId);
    if (!slot) {
      showToast({ tone: "error", title: "Choose a slot", body: "Select an available appointment time first." });
      return;
    }

    setRequestingAppointment(true);
    try {
      await requestAppointment(token, {
        availability_id: slot.id,
        service_id: (slot.service_id ?? selectedServiceId) || null,
        inquiry_id: inquiry?.id ?? null,
        note: appointmentNote.trim() || null
      });
      const remaining = availability.filter((item) => item.id !== slot.id);
      setAvailability(remaining);
      setSelectedAvailabilityId(remaining[0]?.id ?? "");
      setAppointmentNote("");
      showToast({ tone: "success", title: "Appointment requested", body: "The professional has been notified and can accept or decline it." });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Could not request appointment";
      showToast({ tone: "error", title: "Booking failed", body: errorMessage });
    } finally {
      setRequestingAppointment(false);
    }
  }

  async function startInquiry() {
    if (!token || !professional.user_id) return;
    const body = message.trim();
    if (!body) {
      showToast({ tone: "error", title: "Message required", body: "Write a short message before starting the chat." });
      return;
    }

    setStartingInquiry(true);
    try {
      const data = await startProfessionalInquiry(token, {
        professional_id: professional.user_id,
        service_id: selectedServiceId || null,
        message: body
      });
      setInquiry(data.inquiry);
      setMessage("");
      showToast({ tone: "success", title: "Inquiry sent", body: "A chat has been opened with this professional." });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Could not start inquiry";
      showToast({ tone: "error", title: "Inquiry failed", body: errorMessage });
    } finally {
      setStartingInquiry(false);
    }
  }

  return (
    <SurfaceModal onClose={onClose} panelClassName="max-h-[92vh] overflow-y-auto p-4 sm:p-5" size="lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <ProfileAvatar avatarUrl={professional.profile?.avatar_url} className="h-14 w-14" iconSize={22} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#196c88]">Professional profile</p>
            <h2 className="truncate text-2xl font-semibold text-[#5e5e5e]">{profileName(professional)}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#757575]">
              <MapPin size={15} />
              {professionalLocation(professional)}
            </p>
          </div>
        </div>
        <IconButton aria-label="Close professional profile" onClick={onClose} type="button" variant="ghost">
          <X size={18} />
        </IconButton>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-[#d5e4e9] bg-[#f8fbfc] p-3">
          <ShieldCheck className="text-[#196c88]" size={18} />
          <p className="mt-2 text-sm font-semibold text-[#5e5e5e]">Verification</p>
          <p className="mt-1 text-sm text-[#757575]">{professional.profile?.phone_verified ? "Phone verified" : "Phone not verified"}</p>
        </div>
        <div className="rounded-md border border-[#d5e4e9] bg-[#f8fbfc] p-3">
          <BriefcaseBusiness className="text-[#196c88]" size={18} />
          <p className="mt-2 text-sm font-semibold text-[#5e5e5e]">Experience</p>
          <p className="mt-1 text-sm text-[#757575]">{professional.years_experience ?? 0} year{professional.years_experience === 1 ? "" : "s"}</p>
        </div>
        <div className="rounded-md border border-[#d5e4e9] bg-[#f8fbfc] p-3">
          <Star className="fill-[#f4a422] text-[#f4a422]" size={18} strokeWidth={0} />
          <p className="mt-2 text-sm font-semibold text-[#5e5e5e]">Rating</p>
          <p className="mt-1 text-sm text-[#757575]">{ratingLabel(professional)}</p>
        </div>
      </div>

      {professional.bio ? (
        <section className="mt-5">
          <h3 className="font-semibold text-[#5e5e5e]">Bio</h3>
          <p className="mt-2 text-sm leading-6 text-[#757575]">{professional.bio}</p>
        </section>
      ) : null}

      <section className="mt-5">
        <h3 className="font-semibold text-[#5e5e5e]">Categories</h3>
        <div className="mt-2">
          <CategoryPills categories={categories} />
        </div>
      </section>

      <section className="mt-5">
        <h3 className="font-semibold text-[#5e5e5e]">Services and products</h3>
        {services.length === 0 ? <p className="mt-2 text-sm text-[#757575]">No active services listed.</p> : null}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {services.map((service) => (
            <article className="rounded-md border border-[#d5e4e9] bg-white p-3" key={service.id}>
              <img alt={service.title} className="h-40 w-full rounded-md object-cover" decoding="async" loading="lazy" src={service.image_url} />
              <h4 className="mt-3 font-semibold text-[#5e5e5e]">{service.title}</h4>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#757575]">{service.description}</p>
              <p className="mt-3 text-sm font-semibold text-[#5e5e5e]">{formatPrice(service)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-[#d5e4e9] bg-white p-4">
        <h3 className="font-semibold text-[#5e5e5e]">Request an appointment</h3>
        {availabilityLoading ? (
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-[#757575]"><Spinner className="h-5 w-5" /> Loading available slots</p>
        ) : availability.length === 0 ? (
          <p className="mt-4 text-sm text-[#757575]">No appointment slots are open right now.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            <label className="block text-sm font-semibold text-[#5e5e5e]">
              Available slot
              <StyledSelect onChange={(event) => setSelectedAvailabilityId(event.target.value)} value={selectedAvailabilityId}>
                {availability.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {formatDateTime(slot.starts_at)} - {formatDateTime(slot.ends_at)}{slot.service ? ` / ${slot.service.title}` : ""}
                  </option>
                ))}
              </StyledSelect>
            </label>
            <TextAreaField
              label="Booking note"
              onChange={(event) => setAppointmentNote(event.target.value)}
              placeholder="Share anything the professional should know before accepting."
              rows={3}
              value={appointmentNote}
            />
            <Button className="w-full" disabled={requestingAppointment || !selectedAvailabilityId} onClick={requestBooking} type="button">
              {requestingAppointment ? <span className="inline-flex items-center gap-2"><Spinner className="h-6 w-6 border-[3px]" /> Requesting</span> : <span className="inline-flex items-center gap-2"><CalendarDays size={18} /> Request appointment</span>}
            </Button>
          </div>
        )}
      </section>

      <section className="mt-5 rounded-lg border border-[#d5e4e9] bg-[#f8fbfc] p-4">
        <h3 className="font-semibold text-[#5e5e5e]">Start an inquiry</h3>
        <div className="mt-4 grid gap-3">
          <label className="block text-sm font-semibold text-[#5e5e5e]">
            Related service
            <StyledSelect onChange={(event) => setSelectedServiceId(event.target.value)} value={selectedServiceId}>
              <option value="">General inquiry</option>
              {services.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}
            </StyledSelect>
          </label>
          <label className="block text-sm font-semibold text-[#5e5e5e]">
            Message
            <span className="relative mt-2 block">
              <textarea
                className="min-h-[118px] w-full resize-none rounded-[6px] border border-line bg-white px-4 py-4 pr-20 text-sm outline-none transition duration-200 hover:border-slate-300 focus:border-brand focus:ring-4 focus:ring-teal-100"
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Hi, I would like to ask about your availability..."
                rows={4}
                value={message}
              />
              <Button
                aria-label={startingInquiry ? "Opening inquiry chat" : "Send inquiry"}
                className="absolute bottom-4 right-4 h-11 w-11 rounded-[5px] p-0"
                disabled={startingInquiry || message.trim().length === 0}
                onClick={startInquiry}
                type="button"
              >
                {startingInquiry ? <Spinner className="h-5 w-5 border-2" /> : <Send size={20} />}
              </Button>
            </span>
          </label>
        </div>
      </section>
      {inquiry ? <ChatModal conversation={inquiry} kind="inquiry" onClose={() => setInquiry(null)} /> : null}
    </SurfaceModal>
  );
}

function ClientProfessionalsContent() {
  const token = useRequireAuth();
  const searchParams = useSearchParams();
  const showToast = useToast();
  const { categories, loading: categoriesLoading } = useCategories();
  const [professionals, setProfessionals] = useState<ProfessionalSearchResult[]>([]);
  const [recommendedProfessionals, setRecommendedProfessionals] = useState<ProfessionalSearchResult[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<ProfessionalSearchResult | null>(null);
  const [activeInquiry, setActiveInquiry] = useState<ProfessionalInquiry | null>(null);
  const [openedInquiryId, setOpenedInquiryId] = useState("");
  const [filters, setFilters] = useState<ProfessionalSearchFilters>({});
  const [formFilters, setFormFilters] = useState<ProfessionalSearchFilters>({});
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inquiryIdParam = searchParams.get("inquiry_id");
  const rankedProfessionals = useMemo(() => topProfessionals(professionals), [professionals]);

  async function loadProfessionals(nextFilters: ProfessionalSearchFilters = filters, initial = false, refreshOnly = false) {
    if (!token) return;
    if (initial) setLoading(true);
    else if (refreshOnly) setRefreshing(true);
    else setSearching(true);

    try {
      const data = await searchProfessionals(token, nextFilters);
      setProfessionals(data.professionals);
      if (initial || refreshOnly || filtersAreEmpty(nextFilters)) setRecommendedProfessionals(shuffleProfessionals(data.professionals));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not search professionals";
      showToast({ tone: "error", title: "Search failed", body: message });
    } finally {
      setLoading(false);
      setSearching(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadProfessionals({}, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token || !inquiryIdParam || openedInquiryId === inquiryIdParam) return;

    getProfessionalInquiries(token)
      .then((data) => {
        const inquiry = data.inquiries.find((item) => item.id === inquiryIdParam);
        if (inquiry) {
          setActiveInquiry(inquiry);
          setOpenedInquiryId(inquiryIdParam);
        }
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Could not open inquiry";
        showToast({ tone: "error", title: "Inquiry unavailable", body: message });
      });
  }, [inquiryIdParam, openedInquiryId, showToast, token]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextFilters = normalizeFilters(formFilters);

    setFilters(nextFilters);
    setHasSearched(!filtersAreEmpty(nextFilters));
    loadProfessionals(nextFilters);
  }

  function updateFormFilter(key: keyof ProfessionalSearchFilters, value: string) {
    const nextFilters = { ...formFilters, [key]: value };
    setFormFilters(nextFilters);

    if (hasSearched && filtersAreEmpty(nextFilters)) {
      setFilters({});
      setHasSearched(false);
      loadProfessionals({}, false, true);
    }
  }

  function clearFilters() {
    setFormFilters({});
    setFilters({});
    setHasSearched(false);
    loadProfessionals({}, false, true);
  }

  function refreshProfessionals() {
    loadProfessionals(filters, false, true);
  }

  const professionalsBusy = loading || searching || refreshing || categoriesLoading;
  const hasDraftFilters = !filtersAreEmpty(formFilters);

  return (
    <AppShell>
      <div className="relative left-1/2 w-full max-w-[1180px] -translate-x-1/2">
        <div className="mb-8 mt-1 flex flex-col items-start gap-4 md:mb-10 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[15px] font-medium leading-[1.5] text-[#196c88] md:text-[18px]">Find Professionals</p>
            <h1 className="mt-8 text-[28px] font-normal leading-[1.25] text-[#5e5e5e] md:text-[40px]">Search trusted service providers</h1>
          </div>
          <button
            aria-label={professionalsBusy ? "Refreshing professionals" : "Refresh professionals"}
            className="grid h-11 w-11 place-items-center rounded-full text-[#196c88] transition hover:bg-[#f2f6f8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#196c88] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={professionalsBusy}
            onClick={refreshProfessionals}
            type="button"
          >
            <RefreshCw className={professionalsBusy ? "animate-spin" : ""} size={25} strokeWidth={2} />
          </button>
        </div>

        <form className="relative z-20 mb-6 rounded-[7px] border border-[#edf1f3] bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.08)] md:p-7" onSubmit={submit}>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(220px,1fr)_minmax(180px,0.8fr)_140px] lg:items-end">
            <SearchField label="Name or Service">
              <StyledInput name="q" onChange={(event) => updateFormFilter("q", event.target.value)} placeholder="Hairstylist, Therapist..." value={formFilters.q ?? ""} />
            </SearchField>
            <SearchField label="Categories">
              <StyledSelect name="category_id" onChange={(event) => updateFormFilter("category_id", event.target.value)} value={formFilters.category_id ?? ""}>
                <option value="">All Categories</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </StyledSelect>
            </SearchField>
            <SearchField label="Location">
              <StyledInput list="professional-location-suggestions" name="state" onChange={(event) => updateFormFilter("state", event.target.value)} placeholder="Lagos" value={formFilters.state ?? ""} />
              <datalist id="professional-location-suggestions">
                {locationSuggestions.map((location) => <option key={location} value={location} />)}
              </datalist>
            </SearchField>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] lg:grid-cols-1">
              <Button className="h-12 rounded-[5px] bg-[#196c88] px-5 py-0 text-[15px] md:h-[52px]" disabled={searching} type="submit">
                {searching ? <span className="inline-flex items-center gap-2"><Spinner className="h-5 w-5 border-[3px]" /> Search</span> : <span className="inline-flex items-center gap-3"><Search size={18} /> Search</span>}
              </Button>
              {hasSearched || hasDraftFilters ? (
                <button
                  className="h-12 rounded-[5px] px-3 text-[14px] font-medium text-[#196c88] transition hover:bg-[#f2f6f8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#196c88] md:h-[52px]"
                  disabled={professionalsBusy}
                  onClick={clearFilters}
                  type="button"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        </form>

        {professionalsBusy ? (
          <div className="grid gap-6">
            <ProfessionalsSkeleton />
            <ProfessionalsSkeleton />
          </div>
        ) : hasSearched ? (
          professionals.length > 0 ? (
            <div className="grid gap-6">
              <p className="text-[24px] font-normal leading-[1.4] text-[#5e5e5e]">
                {professionals.length}+ <span className="text-[#a4a4a4]">Service Providers found</span>
              </p>
              <ProfessionalSection title="Search Results" professionals={professionals} onViewProfile={setSelectedProfessional} />
            </div>
          ) : (
            <EmptySearchState />
          )
        ) : (
          <div className="grid gap-6">
            <ProfessionalSection title="Recommended Service Providers" professionals={recommendedProfessionals} onViewProfile={setSelectedProfessional} />
            <ProfessionalSection title="Top Service Providers" professionals={rankedProfessionals} onViewProfile={setSelectedProfessional} />
          </div>
        )}

        {selectedProfessional ? <ProfessionalDetailModal professional={selectedProfessional} onClose={() => setSelectedProfessional(null)} /> : null}
        {activeInquiry ? <ChatModal conversation={activeInquiry} kind="inquiry" onClose={() => setActiveInquiry(null)} /> : null}
      </div>
    </AppShell>
  );
}

export default function ClientProfessionalsPage() {
  return (
    <Suspense fallback={<AppShell><PageLoader /></AppShell>}>
      <ClientProfessionalsContent />
    </Suspense>
  );
}
