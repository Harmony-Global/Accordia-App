"use client";

import Link from "next/link";
import { CalendarDays, MapPin, Search, UserRound, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell, EmptyState } from "@/components/app-shell";
import { Button, Card, PageLoader, Spinner, StatusPill } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useProfile } from "@/hooks/use-auth";
import { getAppointments, updateAppointmentStatus } from "@/services/appointment-service";
import type { Appointment } from "@/types";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function statusTone(status: string): "teal" | "green" | "amber" | "gray" | "red" {
  if (status === "accepted" || status === "completed") return "green";
  if (status === "requested") return "amber";
  if (status === "declined" || status === "cancelled") return "red";
  return "gray";
}

function statusLabel(status: string) {
  return status.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function personName(person?: { first_name?: string | null; last_name?: string | null } | null) {
  return `${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim() || "Professional";
}

function professionalLocation(appointment: Appointment) {
  const professionalProfiles = appointment.professional?.professional_profiles;
  const profile = Array.isArray(professionalProfiles) ? professionalProfiles[0] : professionalProfiles;
  return [profile?.location, profile?.state].filter(Boolean).join(", ");
}

export default function ClientAppointmentsPage() {
  const { profile, loading, token } = useProfile();
  const showToast = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

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

  async function cancelAppointment(appointment: Appointment) {
    if (!token) return;
    setBusyId(appointment.id);
    try {
      const data = await updateAppointmentStatus(token, appointment.id, "cancelled");
      setAppointments((current) => current.map((item) => item.id === appointment.id ? data.appointment : item));
      showToast({ tone: "success", title: "Appointment cancelled", body: "The professional has been notified." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not cancel appointment";
      showToast({ tone: "error", title: "Cancellation failed", body: message });
    } finally {
      setBusyId("");
    }
  }

  if (loading || pageLoading) {
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
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brand">Appointments</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">Your booking requests</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Track optional appointments you have requested with professionals from their profiles.
          </p>
        </div>
        <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#125A73]" href="/client/find-professionals">
          <Search size={17} /> Find professionals
        </Link>
      </div>

      {appointments.length === 0 ? (
        <EmptyState title="No appointment requests yet" body="Search for a professional, open their profile, and request one of their available slots." />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {appointments.map((appointment) => {
          const location = professionalLocation(appointment);
          const canCancel = appointment.status === "requested" || appointment.status === "accepted";

          return (
            <Card className="p-4 sm:p-5" key={appointment.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 text-brand">
                    {appointment.professional?.avatar_url ? <img alt="" className="h-full w-full object-cover" decoding="async" src={appointment.professional.avatar_url} /> : <UserRound size={19} />}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-ink">{personName(appointment.professional)}</h2>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                      <MapPin size={15} /> {location || "Location not provided"}
                    </p>
                  </div>
                </div>
                <StatusPill tone={statusTone(appointment.status)}>{statusLabel(appointment.status)}</StatusPill>
              </div>

              <div className="mt-4 rounded-md border border-line bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <CalendarDays className="text-brand" size={17} />
                  {formatDateTime(appointment.starts_at)}
                </div>
                <p className="mt-1 text-sm text-muted">Ends {formatDateTime(appointment.ends_at)}</p>
                {appointment.service ? <p className="mt-2 text-sm font-semibold text-brand">{appointment.service.title}</p> : null}
                {appointment.note ? <p className="mt-2 text-sm leading-6 text-muted">{appointment.note}</p> : null}
              </div>

              {canCancel ? (
                <Button className="mt-4 w-full" disabled={busyId === appointment.id} onClick={() => cancelAppointment(appointment)} type="button" variant="secondary">
                  {busyId === appointment.id ? <span className="inline-flex items-center gap-2"><Spinner className="h-5 w-5" /> Cancelling</span> : <span className="inline-flex items-center gap-2"><XCircle size={17} /> Cancel appointment</span>}
                </Button>
              ) : null}
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
