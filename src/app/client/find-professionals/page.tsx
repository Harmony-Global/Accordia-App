"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BriefcaseBusiness, CalendarDays, MessageCircle, MapPin, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { AppShell, EmptyState } from "@/components/app-shell";
import { ChatModal } from "@/components/chat-modal";
import { Button, IconButton, PageLoader, SelectField, Spinner, StatusPill, TextAreaField, TextField } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useRequireAuth } from "@/hooks/use-auth";
import { useCategories } from "@/hooks/use-categories";
import { getAvailability, requestAppointment } from "@/services/appointment-service";
import { getProfessionalInquiries, startProfessionalInquiry } from "@/services/inquiry-service";
import { searchProfessionals, type ProfessionalSearchFilters } from "@/services/professional-service";
import type { AppointmentAvailability, Category, ProfessionalInquiry, ProfessionalSearchResult } from "@/types";

function profileName(professional: ProfessionalSearchResult) {
  return `${professional.profile?.first_name ?? ""} ${professional.profile?.last_name ?? ""}`.trim() || "Professional";
}

function categoryList(professional: ProfessionalSearchResult): Category[] {
  return professional.professional_categories?.map((item) => item.category).filter(Boolean) ?? [];
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
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
  const services = professional.professional_services?.filter((service) => service.is_active) ?? [];
  const location = [professional.location, professional.state].filter(Boolean).join(", ");
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
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <section className="max-h-[92vh] w-full overflow-y-auto rounded-t-lg border border-line bg-white p-4 shadow-xl sm:max-w-4xl sm:rounded-lg sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 text-brand">
              {professional.profile?.avatar_url ? <img alt="" className="h-full w-full object-cover" decoding="async" src={professional.profile.avatar_url} /> : <UserRound size={22} />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-brand">Professional profile</p>
              <h2 className="truncate text-2xl font-semibold text-ink">{profileName(professional)}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                <MapPin size={15} />
                {location || "Location not provided"}
              </p>
            </div>
          </div>
          <IconButton aria-label="Close professional profile" onClick={onClose} type="button" variant="ghost">
            <X size={18} />
          </IconButton>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-line bg-slate-50 p-3">
            <ShieldCheck className="text-brand" size={18} />
            <p className="mt-2 text-sm font-semibold text-ink">Verification</p>
            <p className="mt-1 text-sm text-muted">{professional.profile?.phone_verified ? "Phone verified" : "Phone not verified"}</p>
          </div>
          <div className="rounded-md border border-line bg-slate-50 p-3">
            <BriefcaseBusiness className="text-brand" size={18} />
            <p className="mt-2 text-sm font-semibold text-ink">Experience</p>
            <p className="mt-1 text-sm text-muted">{professional.years_experience ?? 0} year{professional.years_experience === 1 ? "" : "s"}</p>
          </div>
          <div className="rounded-md border border-line bg-slate-50 p-3">
            <CalendarDays className="text-brand" size={18} />
            <p className="mt-2 text-sm font-semibold text-ink">Availability</p>
            <p className="mt-1 text-sm text-muted">{professional.is_available ? "Available" : "Not marked available"}</p>
          </div>
        </div>

        {professional.bio ? (
          <section className="mt-5">
            <h3 className="font-semibold text-ink">Bio</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{professional.bio}</p>
          </section>
        ) : null}

        <section className="mt-5">
          <h3 className="font-semibold text-ink">Categories</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.length > 0 ? categories.map((category) => <StatusPill key={category.id}>{category.name}</StatusPill>) : <p className="text-sm text-muted">No categories listed.</p>}
          </div>
        </section>

        <section className="mt-5">
          <h3 className="font-semibold text-ink">Services and products</h3>
          {services.length === 0 ? <p className="mt-2 text-sm text-muted">No active services listed.</p> : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {services.map((service) => (
              <article className="rounded-md border border-line bg-white p-3" key={service.id}>
                <img alt={service.title} className="h-40 w-full rounded-md object-cover" decoding="async" loading="lazy" src={service.image_url} />
                <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-ink">{service.title}</h4>
                    {service.category ? <p className="mt-1 text-xs font-semibold text-brand">{service.category.name}</p> : null}
                  </div>
                  <StatusPill tone={service.offering_type === "product" ? "amber" : "teal"}>
                    {service.offering_type === "product" ? "Product" : "Service"}
                  </StatusPill>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{service.description}</p>
                <p className="mt-3 text-sm font-semibold text-ink">
                  {service.currency} {service.price_min.toLocaleString()} - {service.price_max.toLocaleString()}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-lg border border-line bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-ink">Request an appointment</h3>
              <p className="mt-1 text-sm leading-6 text-muted">Choose one of this professional&apos;s open slots. You can track the request from Appointments.</p>
            </div>
            <CalendarDays className="text-brand" size={22} />
          </div>
          {availabilityLoading ? (
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted"><Spinner className="h-5 w-5" /> Loading available slots</p>
          ) : availability.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No appointment slots are open right now.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              <SelectField label="Available slot" onChange={(event) => setSelectedAvailabilityId(event.target.value)} value={selectedAvailabilityId}>
                {availability.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {formatDateTime(slot.starts_at)} - {formatDateTime(slot.ends_at)}{slot.service ? ` / ${slot.service.title}` : ""}
                  </option>
                ))}
              </SelectField>
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

        <section className="mt-5 rounded-lg border border-line bg-slate-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-ink">Start an inquiry</h3>
              <p className="mt-1 text-sm leading-6 text-muted">Ask about availability, fit, timing, or a specific service before booking.</p>
            </div>
            <MessageCircle className="text-brand" size={22} />
          </div>
          <div className="mt-4 grid gap-3">
            <SelectField label="Related service" onChange={(event) => setSelectedServiceId(event.target.value)} value={selectedServiceId}>
              <option value="">General inquiry</option>
              {services.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}
            </SelectField>
            <TextAreaField
              label="Message"
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Hi, I would like to ask about your availability..."
              rows={4}
              value={message}
            />
            <Button className="w-full" disabled={startingInquiry} onClick={startInquiry} type="button">
              {startingInquiry ? <span className="inline-flex items-center gap-2"><Spinner className="h-6 w-6 border-[3px]" /> Opening chat</span> : <span className="inline-flex items-center gap-2"><MessageCircle size={18} /> Send inquiry</span>}
            </Button>
          </div>
        </section>
        {inquiry ? <ChatModal conversation={inquiry} kind="inquiry" onClose={() => setInquiry(null)} /> : null}
      </section>
    </div>
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
  const services = professional.professional_services?.filter((service) => service.is_active) ?? [];
  const location = [professional.location, professional.state].filter(Boolean).join(", ");

  return (
    <article className="rounded-lg border border-line bg-white p-4 shadow-sm transition hover:border-slate-300 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 text-brand">
          {professional.profile?.avatar_url ? <img alt="" className="h-full w-full object-cover" decoding="async" src={professional.profile.avatar_url} /> : <UserRound size={20} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-ink">{profileName(professional)}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                <MapPin size={15} />
                {location || "Location not provided"}
              </p>
            </div>
            <StatusPill tone={professional.profile?.phone_verified ? "green" : "gray"}>
              <ShieldCheck size={13} />
              <span className="ml-1">{professional.profile?.phone_verified ? "Verified" : "Unverified"}</span>
            </StatusPill>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {categories.slice(0, 4).map((category) => <StatusPill key={category.id}>{category.name}</StatusPill>)}
            {categories.length > 4 ? <StatusPill tone="gray">+{categories.length - 4} more</StatusPill> : null}
          </div>

          {professional.bio ? <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">{professional.bio}</p> : null}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-md bg-slate-50 p-3">
              <BriefcaseBusiness className="text-brand" size={18} />
              <p className="mt-2 text-sm font-semibold text-ink">{professional.years_experience ?? 0} years experience</p>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-muted">Offerings</p>
              <p className="mt-2 text-sm font-semibold text-ink">{services.length} active service{services.length === 1 ? "" : "s"}</p>
            </div>
          </div>

          {services.length > 0 ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {services.slice(0, 2).map((service) => (
                <div className="flex gap-3 rounded-md border border-line bg-white p-2" key={service.id}>
                  <img alt={service.title} className="h-16 w-16 rounded-md object-cover" decoding="async" loading="lazy" src={service.image_url} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{service.title}</p>
                    <p className="mt-1 text-xs text-muted">
                      {service.currency} {service.price_min.toLocaleString()} - {service.price_max.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <Button className="mt-4 w-full sm:w-auto" onClick={() => onViewProfile(professional)} type="button" variant="secondary">
            View profile
          </Button>
        </div>
      </div>
    </article>
  );
}

function ClientProfessionalsContent() {
  const token = useRequireAuth();
  const searchParams = useSearchParams();
  const showToast = useToast();
  const { categories, loading: categoriesLoading } = useCategories();
  const [professionals, setProfessionals] = useState<ProfessionalSearchResult[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<ProfessionalSearchResult | null>(null);
  const [activeInquiry, setActiveInquiry] = useState<ProfessionalInquiry | null>(null);
  const [openedInquiryId, setOpenedInquiryId] = useState("");
  const [filters, setFilters] = useState<ProfessionalSearchFilters>({});
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const inquiryIdParam = searchParams.get("inquiry_id");

  async function loadProfessionals(nextFilters: ProfessionalSearchFilters = filters, initial = false) {
    if (!token) return;
    initial ? setLoading(true) : setSearching(true);

    try {
      const data = await searchProfessionals(token, nextFilters);
      setProfessionals(data.professionals);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not search professionals";
      showToast({ tone: "error", title: "Search failed", body: message });
    } finally {
      setLoading(false);
      setSearching(false);
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
    const form = new FormData(event.currentTarget);
    const nextFilters = {
      q: String(form.get("q") ?? ""),
      category_id: String(form.get("category_id") ?? ""),
      state: String(form.get("state") ?? "")
    };

    setFilters(nextFilters);
    loadProfessionals(nextFilters);
  }

  if (loading || categoriesLoading) {
    return (
      <AppShell>
        <PageLoader />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-sm font-medium text-brand">Find professionals</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">Search trusted service providers</h1>
      </div>

      <form className="mb-5 grid gap-3 rounded-lg border border-line bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_220px_180px_auto]" onSubmit={submit}>
        <TextField label="Name or service" name="q" placeholder="Hairstylist, therapist..." />
        <SelectField label="Category" name="category_id">
          <option value="">All categories</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </SelectField>
        <TextField label="Location" name="state" placeholder="Lagos" />
        <Button className="self-end" disabled={searching} type="submit">
          {searching ? <span className="inline-flex items-center gap-2"><Spinner className="h-6 w-6 border-[3px]" /> Searching</span> : <span className="inline-flex items-center gap-2"><Search size={18} /> Search</span>}
        </Button>
      </form>

      {professionals.length === 0 ? <EmptyState title="No professionals found" body="Try another category, service name, or location." /> : null}
      <div className="grid gap-4">
        {professionals.map((professional) => (
          <ProfessionalCard
            key={professional.user_id ?? professional.id}
            professional={professional}
            onViewProfile={setSelectedProfessional}
          />
        ))}
      </div>
      {selectedProfessional ? <ProfessionalDetailModal professional={selectedProfessional} onClose={() => setSelectedProfessional(null)} /> : null}
      {activeInquiry ? <ChatModal conversation={activeInquiry} kind="inquiry" onClose={() => setActiveInquiry(null)} /> : null}
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
