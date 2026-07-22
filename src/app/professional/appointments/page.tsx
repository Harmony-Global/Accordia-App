"use client";

import { CalendarDays, CheckCircle2, Clock3, Trash2, UserRound, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell, EmptyState } from "@/components/app-shell";
import { Button, Card, PageLoader, SelectField, Spinner, StatusPill, TextAreaField, TextField } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useProfile } from "@/hooks/use-auth";
import {
  createAvailability,
  deleteAvailability,
  getAppointments,
  getAvailability,
  updateAppointmentStatus
} from "@/services/appointment-service";
import type { Appointment, AppointmentAvailability, ProfessionalProfile, ProfessionalService } from "@/types";

function getProfessionalProfile(profile: ReturnType<typeof useProfile>["profile"]): ProfessionalProfile | null {
  if (!profile?.professional_profiles) return null;
  return Array.isArray(profile.professional_profiles) ? profile.professional_profiles[0] ?? null : profile.professional_profiles;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function statusTone(status: string): "teal" | "green" | "amber" | "gray" | "red" {
  if (status === "accepted" || status === "completed" || status === "open") return "green";
  if (status === "requested" || status === "booked") return "amber";
  if (status === "declined" || status === "cancelled") return "red";
  return "gray";
}

function statusLabel(status: string) {
  return status.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function personName(person?: { first_name?: string | null; last_name?: string | null } | null) {
  return `${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim() || "Client";
}

export default function ProfessionalAppointmentsPage() {
  const { profile, loading, token } = useProfile();
  const showToast = useToast();
  const professionalProfile = useMemo(() => getProfessionalProfile(profile), [profile]);
  const services = useMemo<ProfessionalService[]>(
    () => professionalProfile?.professional_services?.filter((service) => service.is_active) ?? [],
    [professionalProfile?.professional_services]
  );
  const [availability, setAvailability] = useState<AppointmentAvailability[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [savingSlot, setSavingSlot] = useState(false);
  const [busyId, setBusyId] = useState("");

  async function loadData() {
    if (!token) return;
    setPageLoading(true);
    try {
      const [slotsData, appointmentsData] = await Promise.all([
        getAvailability(token),
        getAppointments(token)
      ]);
      setAvailability(slotsData.availability);
      setAppointments(appointmentsData.appointments);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load appointments";
      showToast({ tone: "error", title: "Appointments unavailable", body: message });
    } finally {
      setPageLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function saveSlot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    const form = new FormData(event.currentTarget);
    const startsAt = String(form.get("starts_at") ?? "");
    const endsAt = String(form.get("ends_at") ?? "");

    if (!startsAt || !endsAt) {
      showToast({ tone: "error", title: "Choose a time", body: "Add both a start and end time for this appointment slot." });
      return;
    }

    setSavingSlot(true);
    try {
      const data = await createAvailability(token, {
        service_id: String(form.get("service_id") || "") || null,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        note: String(form.get("note") || "") || null
      });
      setAvailability((current) => [data.availability, ...current]);
      showToast({ tone: "success", title: "Slot added", body: "Clients can now request this appointment time." });
      event.currentTarget.reset();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not add appointment slot";
      showToast({ tone: "error", title: "Slot not added", body: message });
    } finally {
      setSavingSlot(false);
    }
  }

  async function removeSlot(slot: AppointmentAvailability) {
    if (!token) return;
    setBusyId(slot.id);
    try {
      await deleteAvailability(token, slot.id);
      setAvailability((current) => current.filter((item) => item.id !== slot.id));
      showToast({ tone: "success", title: "Slot removed" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not remove appointment slot";
      showToast({ tone: "error", title: "Slot not removed", body: message });
    } finally {
      setBusyId("");
    }
  }

  async function changeAppointmentStatus(appointment: Appointment, status: "accepted" | "declined" | "completed") {
    if (!token) return;
    setBusyId(appointment.id);
    try {
      const data = await updateAppointmentStatus(token, appointment.id, status);
      setAppointments((current) => current.map((item) => item.id === appointment.id ? data.appointment : item));
      if (status === "declined") {
        await loadData();
      }
      showToast({ tone: "success", title: `Appointment ${statusLabel(status).toLowerCase()}` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update appointment";
      showToast({ tone: "error", title: "Appointment not updated", body: message });
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

  if (profile?.role !== "professional") {
    return (
      <AppShell>
        <EmptyState title="Professional account required" body="Appointment slot management is available to professional accounts." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brand">Appointments</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">Manage booking availability</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Publish optional time slots for services that need appointments, then accept or decline client requests.
          </p>
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-md bg-teal-50 text-brand">
          <CalendarDays size={24} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="grid gap-5">
          <Card className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <Clock3 className="text-brand" size={20} />
              <h2 className="text-lg font-semibold text-ink">Appointment requests</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {appointments.length === 0 ? (
                <EmptyState title="No appointment requests yet" body="When clients request your open slots, you will review them here." />
              ) : appointments.map((appointment) => (
                <article className="rounded-lg border border-line bg-white p-4" key={appointment.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 text-brand">
                        {appointment.client?.avatar_url ? <img alt="" className="h-full w-full object-cover" src={appointment.client.avatar_url} /> : <UserRound size={18} />}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-ink">{personName(appointment.client)}</h3>
                        <p className="mt-1 text-sm text-muted">{formatDateTime(appointment.starts_at)} - {formatDateTime(appointment.ends_at)}</p>
                      </div>
                    </div>
                    <StatusPill tone={statusTone(appointment.status)}>{statusLabel(appointment.status)}</StatusPill>
                  </div>
                  {appointment.service ? <p className="mt-3 text-sm font-semibold text-brand">{appointment.service.title}</p> : null}
                  {appointment.note ? <p className="mt-2 text-sm leading-6 text-muted">{appointment.note}</p> : null}
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {appointment.status === "requested" ? (
                      <>
                        <Button disabled={busyId === appointment.id} onClick={() => changeAppointmentStatus(appointment, "accepted")} type="button">
                          {busyId === appointment.id ? <Spinner className="h-5 w-5" /> : <><CheckCircle2 size={17} /> Accept</>}
                        </Button>
                        <Button disabled={busyId === appointment.id} onClick={() => changeAppointmentStatus(appointment, "declined")} type="button" variant="secondary">
                          <XCircle size={17} /> Decline
                        </Button>
                      </>
                    ) : null}
                    {appointment.status === "accepted" ? (
                      <Button disabled={busyId === appointment.id} onClick={() => changeAppointmentStatus(appointment, "completed")} type="button" variant="secondary">
                        <CheckCircle2 size={17} /> Mark completed
                      </Button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </Card>
        </section>

        <aside className="grid content-start gap-5">
          <Card className="p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-ink">Add available slot</h2>
            <form className="mt-4 grid gap-3" onSubmit={saveSlot}>
              <SelectField label="Related service" name="service_id">
                <option value="">General appointment</option>
                {services.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}
              </SelectField>
              <TextField label="Starts" name="starts_at" required type="datetime-local" />
              <TextField label="Ends" name="ends_at" required type="datetime-local" />
              <TextAreaField label="Slot note" name="note" placeholder="Optional note clients will see" rows={3} />
              <Button className="w-full" disabled={savingSlot} type="submit">
                {savingSlot ? <span className="inline-flex items-center gap-2"><Spinner className="h-5 w-5" /> Adding slot</span> : "Add slot"}
              </Button>
            </form>
          </Card>

          <Card className="p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-ink">Open slots</h2>
            <div className="mt-4 grid gap-3">
              {availability.length === 0 ? <p className="text-sm leading-6 text-muted">No open slots yet. Add one when you want clients to request a booking.</p> : null}
              {availability.map((slot) => (
                <article className="rounded-md border border-line bg-slate-50 p-3" key={slot.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{formatDateTime(slot.starts_at)}</p>
                      <p className="mt-1 text-xs text-muted">Ends {formatDateTime(slot.ends_at)}</p>
                    </div>
                    <StatusPill tone={statusTone(slot.status)}>{statusLabel(slot.status)}</StatusPill>
                  </div>
                  {slot.service ? <p className="mt-2 text-sm font-medium text-brand">{slot.service.title}</p> : null}
                  {slot.note ? <p className="mt-2 text-sm leading-5 text-muted">{slot.note}</p> : null}
                  {slot.status === "open" ? (
                    <Button className="mt-3 w-full" disabled={busyId === slot.id} onClick={() => removeSlot(slot)} type="button" variant="secondary">
                      {busyId === slot.id ? <Spinner className="h-5 w-5" /> : <><Trash2 size={16} /> Remove slot</>}
                    </Button>
                  ) : null}
                </article>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
