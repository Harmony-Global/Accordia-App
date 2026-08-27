"use client";

import Link from "next/link";
import { AlertCircle, BriefcaseBusiness, CalendarDays, MapPin, MessageSquareText, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell, EmptyState } from "@/components/app-shell";
import { ChatModal } from "@/components/chat-modal";
import { Button, PageLoader, ProfileAvatar, SkeletonBlock, Spinner, SurfaceModal } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useProfile } from "@/hooks/use-auth";
import { getAppointments, openAppointmentChat, updateAppointmentStatus } from "@/services/appointment-service";
import type { Appointment, Category, ProfessionalInquiry, ProfessionalProfile } from "@/types";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function statusLabel(status: string) {
  return status.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function personName(person?: { first_name?: string | null; last_name?: string | null } | null) {
  return `${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim() || "Professional";
}

function professionalProfile(appointment: Appointment): ProfessionalProfile | null {
  const profiles = appointment.professional?.professional_profiles;
  if (!profiles) return null;
  return Array.isArray(profiles) ? profiles[0] ?? null : profiles;
}

function professionalLocation(appointment: Appointment) {
  const profile = professionalProfile(appointment);
  return [profile?.location, profile?.state].filter(Boolean).join(", ") || "Location not provided";
}

function professionalCategories(appointment: Appointment): Category[] {
  return professionalProfile(appointment)?.professional_categories?.map((item) => item.category).filter(Boolean) ?? [];
}

function cancellationDeadline(appointment: Appointment) {
  return new Date(new Date(appointment.starts_at).getTime() - 60 * 60 * 1000);
}

function canRequestCancellation(appointment: Appointment) {
  return ["requested", "accepted"].includes(appointment.status);
}

function cancellationOpen(appointment: Appointment) {
  return canRequestCancellation(appointment) && Date.now() <= cancellationDeadline(appointment).getTime();
}

function appointmentTone(status: string): "teal" | "green" | "amber" | "gray" | "red" {
  if (status === "accepted" || status === "completed") return "teal";
  if (status === "requested") return "amber";
  if (status === "declined" || status === "cancelled") return "red";
  return "gray";
}

function workLabel(appointment: Appointment) {
  if (appointment.status === "completed") return "Completed";
  return "Not Started";
}

function workTone(appointment: Appointment) {
  if (appointment.status === "completed") return "text-[#0fa269]";
  return "text-[#f4a422]";
}

function CategoryPills({ categories }: { categories: Category[] }) {
  const visibleCategories = categories.slice(0, 2);
  const remaining = Math.max(0, categories.length - visibleCategories.length);

  return (
    <div className="flex flex-wrap gap-2">
      {(visibleCategories.length > 0 ? visibleCategories : [{ id: "general", name: "General" } as Category]).map((category) => (
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

function AppointmentSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <article className="rounded-[7px] border border-[#b8d1da] bg-white p-5 sm:p-6" key={index}>
          <div className="flex justify-between gap-4">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-10 w-10 rounded-full" />
              <div>
                <SkeletonBlock className="h-4 w-32" />
                <SkeletonBlock className="mt-2 h-4 w-24" />
              </div>
            </div>
            <div className="space-y-2">
              <SkeletonBlock className="h-4 w-36" />
              <SkeletonBlock className="h-4 w-28" />
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <SkeletonBlock className="h-8 w-24 rounded-full" />
            <SkeletonBlock className="h-8 w-24 rounded-full" />
            <SkeletonBlock className="h-8 w-20 rounded-full" />
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <SkeletonBlock className="h-12" />
            <SkeletonBlock className="h-12" />
          </div>
          <div className="mt-6 flex gap-3">
            <SkeletonBlock className="h-12 w-32" />
            <SkeletonBlock className="h-12 w-32" />
            <SkeletonBlock className="h-12 w-36" />
          </div>
          <SkeletonBlock className="mt-6 h-5 w-72" />
        </article>
      ))}
    </div>
  );
}

function CancellationConfirmModal({
  appointment,
  busy,
  onCancel,
  onClose
}: {
  appointment: Appointment;
  busy: boolean;
  onCancel: () => void;
  onClose: () => void;
}) {
  return (
    <SurfaceModal onClose={onClose} panelClassName="p-5 sm:p-6" size="sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#196c88]">Cancel appointment</p>
          <h2 className="mt-2 text-xl font-semibold text-[#5e5e5e]">Are you sure?</h2>
          <p className="mt-3 text-sm leading-6 text-[#757575]">
            This will cancel your appointment with {personName(appointment.professional)} and notify the professional.
          </p>
        </div>
        <button aria-label="Close cancellation confirmation" className="text-[#5e5e5e] hover:text-[#196c88]" onClick={onClose} type="button">
          <X size={20} />
        </button>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button disabled={busy} onClick={onCancel} type="button" variant="secondary">
          {busy ? <span className="inline-flex items-center gap-2"><Spinner className="h-5 w-5" /> Cancelling</span> : "Cancel appointment"}
        </Button>
        <Button disabled={busy} onClick={onClose} type="button">
          Keep appointment
        </Button>
      </div>
    </SurfaceModal>
  );
}

function ProfessionalProfileModal({
  appointment,
  onClose
}: {
  appointment: Appointment;
  onClose: () => void;
}) {
  const profile = professionalProfile(appointment);
  const services = profile?.professional_services?.filter((service) => service.is_active) ?? [];

  return (
    <SurfaceModal onClose={onClose} panelClassName="max-h-[92vh] overflow-y-auto p-5 sm:p-6" size="lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <ProfileAvatar avatarUrl={appointment.professional?.avatar_url} className="h-14 w-14" iconSize={22} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#196c88]">Professional profile</p>
            <h2 className="truncate text-2xl font-semibold text-[#5e5e5e]">{personName(appointment.professional)}</h2>
            <p className="mt-1 inline-flex items-center gap-2 text-sm text-[#757575]">
              <MapPin size={15} />
              {professionalLocation(appointment)}
            </p>
          </div>
        </div>
        <button aria-label="Close professional profile" className="text-[#5e5e5e] hover:text-[#196c88]" onClick={onClose} type="button">
          <X size={20} />
        </button>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[5px] border border-[#d5e4e9] bg-[#f8fbfc] p-4">
          <p className="text-sm font-semibold text-[#196c88]">Experience</p>
          <p className="mt-1 text-sm text-[#5e5e5e]">{profile?.years_experience ?? 0} years</p>
        </div>
        <div className="rounded-[5px] border border-[#d5e4e9] bg-[#f8fbfc] p-4">
          <p className="text-sm font-semibold text-[#196c88]">Verification</p>
          <p className="mt-1 text-sm text-[#5e5e5e]">{appointment.professional?.phone_verified ? "Phone verified" : "Phone not verified"}</p>
        </div>
      </div>
      {profile?.bio ? (
        <section className="mt-5">
          <h3 className="font-semibold text-[#5e5e5e]">Bio</h3>
          <p className="mt-2 text-sm leading-6 text-[#757575]">{profile.bio}</p>
        </section>
      ) : null}
      <section className="mt-5">
        <h3 className="font-semibold text-[#5e5e5e]">Categories</h3>
        <div className="mt-2">
          <CategoryPills categories={professionalCategories(appointment)} />
        </div>
      </section>
      <section className="mt-5">
        <h3 className="font-semibold text-[#5e5e5e]">Services</h3>
        {services.length === 0 ? <p className="mt-2 text-sm text-[#757575]">No active services listed.</p> : null}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {services.map((service) => (
            <article className="rounded-[5px] border border-[#d5e4e9] bg-white p-3" key={service.id}>
              <img alt={service.title} className="h-36 w-full rounded-[5px] object-cover" decoding="async" loading="lazy" src={service.image_url} />
              <h4 className="mt-3 font-semibold text-[#5e5e5e]">{service.title}</h4>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#757575]">{service.description}</p>
            </article>
          ))}
        </div>
      </section>
    </SurfaceModal>
  );
}

function AppointmentCard({
  appointment,
  busy,
  expiredHelpOpen,
  onCancelClick,
  onExpiredHelp,
  onOpenChat,
  onViewProfile
}: {
  appointment: Appointment;
  busy: boolean;
  expiredHelpOpen: boolean;
  onCancelClick: (appointment: Appointment) => void;
  onExpiredHelp: (appointmentId: string) => void;
  onOpenChat: (appointment: Appointment) => void;
  onViewProfile: (appointment: Appointment) => void;
}) {
  const categories = professionalCategories(appointment);
  const canCancel = canRequestCancellation(appointment);
  const canCancelNow = cancellationOpen(appointment);
  const status = statusLabel(appointment.status === "requested" ? "pending" : appointment.status);
  const showChat = appointment.status === "accepted";

  return (
    <article className="relative rounded-[7px] border border-[#b8d1da] bg-white p-5 sm:p-6 lg:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <ProfileAvatar avatarUrl={appointment.professional?.avatar_url} className="h-10 w-10 bg-white ring-1 ring-[#d5e4e9]" iconSize={18} />
          <div className="min-w-0">
            <h2 className="truncate text-[14px] font-semibold leading-[1.5] text-[#5e5e5e] md:text-[15px]">{personName(appointment.professional)}</h2>
            <p className="mt-1 inline-flex items-center gap-1 text-[13px] text-[#5e5e5e]">
              <MapPin size={16} strokeWidth={1.7} />
              {professionalLocation(appointment)}
            </p>
          </div>
        </div>
        <div className="space-y-2 text-[14px] font-semibold text-[#196c88]">
          <p className="flex items-center gap-2">
            <CalendarDays size={19} strokeWidth={1.7} />
            Appointment: <span className={appointment.status === "declined" || appointment.status === "cancelled" ? "text-red-600" : appointmentTone(appointment.status) === "amber" ? "text-[#f4a422]" : "text-[#196c88]"}>{status}</span>
          </p>
          {appointment.status !== "declined" && appointment.status !== "cancelled" ? (
            <p className="flex items-center gap-2">
              <BriefcaseBusiness size={19} strokeWidth={1.7} />
              Work: <span className={workTone(appointment)}>{workLabel(appointment)}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5">
        <CategoryPills categories={categories} />
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <p className="text-[14px] font-semibold text-[#5e5e5e]">Work type</p>
          <p className="mt-2 text-[14px] font-light text-[#a4a4a4]">Not specified</p>
        </div>
        <div>
          <p className="text-[14px] font-semibold text-[#5e5e5e]">Appointment Schedule</p>
          <p className="mt-2 text-[14px] font-light text-[#a4a4a4]">{formatDateTime(appointment.starts_at)} - {formatDateTime(appointment.ends_at)}</p>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        {showChat ? (
          <Button className="h-12 min-w-[128px] rounded-[5px] px-6 py-0 text-[15px]" disabled={busy} onClick={() => onOpenChat(appointment)} type="button">
            {busy ? <Spinner className="h-5 w-5" /> : <span className="inline-flex items-center gap-2"><MessageSquareText size={17} /> Chat</span>}
          </Button>
        ) : null}
        <Button className="h-12 min-w-[128px] rounded-[5px] border-[#196c88] px-6 py-0 text-[15px] font-medium text-[#196c88]" onClick={() => onViewProfile(appointment)} type="button" variant="secondary">
          View Profile
        </Button>
        {canCancel ? (
          <button
            aria-disabled={!canCancelNow}
            className={`min-h-12 px-2 text-[14px] font-semibold transition ${canCancelNow ? "text-[#196c88] hover:text-[#125A73]" : "text-[#cfcfcf]"}`}
            disabled={busy}
            onClick={() => {
              if (canCancelNow) onCancelClick(appointment);
              else onExpiredHelp(appointment.id);
            }}
            type="button"
          >
            Cancel appointment
          </button>
        ) : null}
      </div>

      {canCancel ? (
        <div className="relative mt-6">
          <p className="flex items-start gap-2 text-[14px] leading-6 text-[#757575]">
            <AlertCircle className="mt-0.5 shrink-0 text-[#f4a422]" size={22} strokeWidth={2} />
            <span>
              Cancellation deadline: <strong>{formatDateTime(cancellationDeadline(appointment).toISOString())}</strong>
            </span>
          </p>
          {!canCancelNow ? (
            <p className="ml-8 mt-1 text-[14px] leading-6 text-[#5e5e5e]">
              Need help? <a className="font-semibold text-[#196c88] hover:underline" href="mailto:support@accordia.app">contact support</a>
            </p>
          ) : null}
          {expiredHelpOpen ? (
            <div className="mt-3 max-w-sm rounded-[7px] border border-[#d5e4e9] bg-white p-4 text-[12px] leading-5 text-[#757575] shadow-lg sm:absolute sm:left-48 sm:top-4 sm:z-10">
              A penalty fee may be attached to cancellations done after the deadline. Please contact <span className="font-semibold text-[#196c88]">Accordia management</span> for urgent cases.
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export default function ClientAppointmentsPage() {
  const { profile, loading, token } = useProfile();
  const showToast = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [expiredHelpId, setExpiredHelpId] = useState("");
  const [profileTarget, setProfileTarget] = useState<Appointment | null>(null);
  const [chatInquiry, setChatInquiry] = useState<ProfessionalInquiry | null>(null);
  const [chatAppointment, setChatAppointment] = useState<Appointment | null>(null);

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((first, second) => new Date(first.starts_at).getTime() - new Date(second.starts_at).getTime());
  }, [appointments]);

  async function loadAppointments() {
    if (!token) return;
    setPageLoading(true);
    try {
      const data = await getAppointments(token);
      setAppointments(data.appointments);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load appointments";
      showToast({ tone: "error", title: "Appointments unavailable", body: message });
    } finally {
      setPageLoading(false);
    }
  }

  useEffect(() => {
    void loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function cancelAppointment() {
    if (!token || !cancelTarget) return;
    setBusyId(cancelTarget.id);
    try {
      const data = await updateAppointmentStatus(token, cancelTarget.id, "cancelled");
      setAppointments((current) => current.map((item) => item.id === cancelTarget.id ? data.appointment : item));
      setCancelTarget(null);
      showToast({ tone: "success", title: "Appointment cancelled", body: "The professional has been notified." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not cancel appointment";
      showToast({ tone: "error", title: "Cancellation failed", body: message });
    } finally {
      setBusyId("");
    }
  }

  async function openChat(appointment: Appointment) {
    if (!token) return;
    setBusyId(appointment.id);
    try {
      const data = await openAppointmentChat(token, appointment.id);
      setChatInquiry(data.inquiry);
      setChatAppointment(appointment);
      setAppointments((current) => current.map((item) => item.id === appointment.id ? { ...item, inquiry_id: data.inquiry.id } : item));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not open appointment chat";
      showToast({ tone: "error", title: "Chat unavailable", body: message });
    } finally {
      setBusyId("");
    }
  }

  if (loading) {
    return (
      <AppShell>
        <PageLoader />
      </AppShell>
    );
  }

  if (profile?.role !== "client") {
    return (
      <AppShell>
        <EmptyState title="Client account required" body="Appointment requests are available to client accounts." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="relative left-1/2 w-full max-w-[1180px] -translate-x-1/2">
        <div className="mb-10 mt-1 flex flex-col items-start gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[15px] font-medium leading-[1.5] text-[#196c88] md:text-[18px]">Appointments</p>
            <h1 className="mt-8 max-w-[860px] text-[28px] font-normal leading-[1.35] text-[#5e5e5e] md:text-[40px]">
              Manage all appointments you have requested with professionals from their profiles.
            </h1>
          </div>
          <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[5px] bg-[#196c88] px-5 py-3 text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#125A73]" href="/client/find-professionals">
            <Search size={17} /> Find professionals
          </Link>
        </div>

        {pageLoading ? <AppointmentSkeleton /> : null}

        {!pageLoading && sortedAppointments.length === 0 ? (
          <EmptyState title="No appointment requests yet" body="Search for a professional, open their profile, and request one of their available slots." />
        ) : null}

        {!pageLoading && sortedAppointments.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {sortedAppointments.map((appointment) => (
              <AppointmentCard
                appointment={appointment}
                busy={busyId === appointment.id}
                expiredHelpOpen={expiredHelpId === appointment.id}
                key={appointment.id}
                onCancelClick={setCancelTarget}
                onExpiredHelp={(appointmentId) => setExpiredHelpId((current) => current === appointmentId ? "" : appointmentId)}
                onOpenChat={openChat}
                onViewProfile={setProfileTarget}
              />
            ))}
          </div>
        ) : null}

        {cancelTarget ? (
          <CancellationConfirmModal
            appointment={cancelTarget}
            busy={busyId === cancelTarget.id}
            onCancel={cancelAppointment}
            onClose={() => setCancelTarget(null)}
          />
        ) : null}
        {profileTarget ? <ProfessionalProfileModal appointment={profileTarget} onClose={() => setProfileTarget(null)} /> : null}
        {chatInquiry ? (
          <ChatModal
            appointment={chatAppointment}
            conversation={chatInquiry}
            kind="inquiry"
            onAppointmentUpdated={(updatedAppointment) => {
              setChatAppointment(updatedAppointment);
              setAppointments((current) => current.map((item) => item.id === updatedAppointment.id ? updatedAppointment : item));
            }}
            onClose={() => {
              setChatInquiry(null);
              setChatAppointment(null);
            }}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
