"use client";

import { AlertCircle, BriefcaseBusiness, CalendarDays, Check, Edit2, MessageSquareText, Pause, Play, Plus, Star, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell, EmptyState } from "@/components/app-shell";
import { ChatModal } from "@/components/chat-modal";
import { PaymentSummaryModal } from "@/components/payment-summary-modal";
import { ScheduleServiceCalendar, combineDateAndTime, dateOnly, formatTimeValue, timePeriodFromDate, type TimePeriod } from "@/components/schedule-service-calendar";
import { Button, PageLoader, ProfileAvatar, SelectField, Spinner, SurfaceModal, TextAreaField } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useProfile } from "@/hooks/use-auth";
import { createAvailability, deleteAvailability, getAppointments, getAvailability, openAppointmentChat, updateAppointmentStatus, updateAvailability } from "@/services/appointment-service";
import { markNotificationRead } from "@/services/notification-service";
import type { Appointment, AppointmentAvailability, ProfessionalInquiry } from "@/types";

type Tab = "requests" | "upcoming" | "completed";
const time = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const timestamp = (value?: string | null) => value ? new Date(value).getTime() || 0 : 0;
const name = (person?: { first_name?: string | null; last_name?: string | null } | null) => `${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim() || "Client";
const reviewOf = (item: Appointment) => Array.isArray(item.review) ? item.review[0] : item.review;
const slotServiceValid = (slot: AppointmentAvailability) => {
  const price = Number(slot.service?.price_min);
  return Boolean(slot.service?.is_active && Number.isFinite(price) && price > 0 && Number(slot.service?.price_max) === price);
};

function indicator(item: Appointment, userId: string) {
  const items: Array<{ kind: "action" | "message" | "update"; at: number }> = [];
  const reschedules = item.reschedule_requests?.filter((request) => request.status === "pending" && request.requested_for === userId) ?? [];
  if (item.status === "requested" || reschedules.length) items.push({ kind: "action", at: Math.max(timestamp(item.created_at), ...reschedules.map((request) => timestamp(request.created_at))) });
  if ((item.unread_message_count ?? 0) > 0) items.push({ kind: "message", at: timestamp(item.latest_message_at) });
  if ((item.unread_update_count ?? 0) > 0) items.push({ kind: "update", at: timestamp(item.latest_update_at) });
  return items.sort((a, b) => b.at - a.at)[0] ?? null;
}

export default function ProfessionalAppointmentsPage() {
  const { profile, loading, token } = useProfile();
  const toast = useToast();
  const professional = Array.isArray(profile?.professional_profiles) ? profile.professional_profiles[0] : profile?.professional_profiles;
  const services = professional?.professional_services?.filter((service) => service.is_active && Number(service.price_min) > 0 && Number(service.price_max) === Number(service.price_min)) ?? [];
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [slots, setSlots] = useState<AppointmentAvailability[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("requests");
  const [busy, setBusy] = useState("");
  const [slotModal, setSlotModal] = useState(false);
  const [editing, setEditing] = useState<AppointmentAvailability | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [capacity, setCapacity] = useState(1);
  const [note, setNote] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState("8:00");
  const [endTime, setEndTime] = useState("9:00");
  const [startPeriod, setStartPeriod] = useState<TimePeriod>("am");
  const [endPeriod, setEndPeriod] = useState<TimePeriod>("am");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMode, setCalendarMode] = useState<"start" | "end">("start");
  const [month, setMonth] = useState(() => dateOnly(new Date()));
  const [chatInquiry, setChatInquiry] = useState<ProfessionalInquiry | null>(null);
  const [chatAppointment, setChatAppointment] = useState<Appointment | null>(null);
  const [summaryReference, setSummaryReference] = useState("");

  async function refresh(showLoading = false) {
    if (!token) return;
    if (showLoading) setInitialLoading(true);
    try {
      const [availability, bookings] = await Promise.all([getAvailability(token), getAppointments(token)]);
      setSlots(availability.availability);
      setAppointments(bookings.appointments);
    } catch (error) {
      if (showLoading) toast({ tone: "error", title: "Appointments unavailable", body: error instanceof Error ? error.message : "Please try again." });
    } finally {
      if (showLoading) setInitialLoading(false);
    }
  }
  useEffect(() => {
    void refresh(true);
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 30000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const groups = useMemo(() => ({
    requests: appointments.filter((item) => ["requested", "declined", "cancelled"].includes(item.status)),
    upcoming: appointments.filter((item) => item.status === "accepted"),
    completed: appointments.filter((item) => item.status === "completed")
  }), [appointments]);
  const visible = [...groups[tab]].sort((a, b) => {
    const first = indicator(a, profile?.id ?? "");
    const second = indicator(b, profile?.id ?? "");
    if (Boolean(first) !== Boolean(second)) return first ? -1 : 1;
    if (first && second && first.at !== second.at) return second.at - first.at;
    return timestamp(b.updated_at) - timestamp(a.updated_at);
  });

  function openSlot(slot?: AppointmentAvailability) {
    setEditing(slot ?? null);
    setServiceId(slot?.service_id ?? services[0]?.id ?? "");
    setCapacity(slot?.capacity ?? 1);
    setNote(slot?.note ?? "");
    const start = slot ? new Date(slot.starts_at) : new Date(Date.now() + 3600000);
    const end = slot ? new Date(slot.ends_at) : new Date(start.getTime() + 3600000);
    setStartDate(dateOnly(start)); setEndDate(dateOnly(end));
    setStartTime(formatTimeValue(start)); setEndTime(formatTimeValue(end));
    setStartPeriod(timePeriodFromDate(start)); setEndPeriod(timePeriodFromDate(end));
    setMonth(new Date(start.getFullYear(), start.getMonth(), 1));
    setSlotModal(true);
  }
  async function saveSlot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const start = combineDateAndTime(startDate, startTime, startPeriod);
    const end = combineDateAndTime(endDate, endTime, endPeriod);
    if (!start || !end || start <= new Date() || end <= start || !serviceId || !Number.isInteger(capacity) || capacity < 1) {
      toast({ tone: "error", title: "Check slot details", body: "Choose a fixed-price service, a valid future schedule, and a whole number of slots." });
      return;
    }
    setBusy(editing?.id ?? "new");
    try {
      const payload = { service_id: serviceId, starts_at: start.toISOString(), ends_at: end.toISOString(), capacity, note: note || null };
      if (editing) await updateAvailability(token, editing.id, { action: "edit", ...payload });
      else await createAvailability(token, payload);
      setSlotModal(false); await refresh();
      toast({ tone: "success", title: editing ? "Slot updated" : "Slot added" });
    } catch (error) {
      toast({ tone: "error", title: "Slot not saved", body: error instanceof Error ? error.message : "Please try again." });
    } finally { setBusy(""); }
  }
  async function slotAction(slot: AppointmentAvailability, action: "pause" | "resume" | "delete") {
    if (!token) return;
    setBusy(slot.id);
    try {
      if (action === "delete") await deleteAvailability(token, slot.id);
      else await updateAvailability(token, slot.id, { action });
      await refresh();
    } catch (error) {
      toast({ tone: "error", title: "Slot not updated", body: error instanceof Error ? error.message : "Please try again." });
    } finally { setBusy(""); }
  }
  async function changeStatus(item: Appointment, status: "accepted" | "declined" | "cancelled" | "completed") {
    if (!token) return;
    setBusy(item.id);
    try {
      await updateAppointmentStatus(token, item.id, status);
      await refresh();
      toast({ tone: "success", title: `Appointment ${status}` });
    } catch (error) {
      toast({ tone: "error", title: "Appointment not updated", body: error instanceof Error ? error.message : "Please try again." });
    } finally { setBusy(""); }
  }
  async function openChat(item: Appointment) {
    if (!token) return;
    setBusy(item.id);
    try {
      const data = await openAppointmentChat(token, item.id);
      setChatAppointment(item); setChatInquiry(data.inquiry);
      setAppointments((current) => current.map((entry) => entry.id === item.id ? { ...entry, inquiry_id: data.inquiry.id, unread_message_count: 0 } : entry));
    } catch (error) {
      toast({ tone: "error", title: "Chat unavailable", body: error instanceof Error ? error.message : "Please try again." });
    } finally { setBusy(""); }
  }
  async function acknowledge(item: Appointment) {
    if (!token) return;
    setAppointments((current) => current.map((entry) => entry.id === item.id ? { ...entry, unread_update_count: 0, unread_update_notification_ids: [] } : entry));
    await Promise.allSettled((item.unread_update_notification_ids ?? []).map((id) => markNotificationRead(token, id, true)));
  }

  if (loading) return <AppShell><PageLoader /></AppShell>;
  if (profile?.role !== "professional") return <AppShell><EmptyState title="Professional account required" body="This page is for professional appointments." /></AppShell>;
  if (initialLoading) return <AppShell><PageLoader /></AppShell>;
  return <AppShell>
    <main className="mx-auto max-w-[1180px] pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-lg font-medium text-[#196c88]">Appointments</p><h1 className="mt-6 max-w-2xl text-[28px] font-normal leading-tight text-[#5e5e5e] sm:text-[40px]">Manage your booking requests and appointments here</h1></div>{tab === "requests" ? <Button onClick={() => openSlot()} type="button"><Plus size={17} /> Create appointment slot</Button> : null}</div>
      <nav aria-label="Appointment views" className="mt-8 grid grid-cols-3 gap-2 border-b border-[#d5e4e9] text-xs sm:text-base">{([["requests", "Booking Requests / Appointment Slots", groups.requests.length], ["upcoming", "Upcoming Appointments", groups.upcoming.length], ["completed", "Completed Appointments", groups.completed.length]] as const).map(([value, label, count]) => <button aria-current={tab === value ? "page" : undefined} className={`min-w-0 border-b-[3px] px-1 pb-3 text-center font-medium ${tab === value ? "border-[#196c88] text-[#196c88]" : "border-transparent text-[#969696]"}`} key={value} onClick={() => setTab(value)} type="button">{label} ({count})</button>)}</nav>
      <h2 className="mt-9 text-2xl font-medium text-[#5e5e5e]">{tab === "requests" ? "Booking requests" : tab === "upcoming" ? "Upcoming appointments" : "Completed appointments"}</h2>
      <div className="mt-6 grid gap-5">{visible.length === 0 ? <EmptyState title="No appointments here" body="Appointments will appear here as they progress." /> : null}
        {visible.map((item) => {
          const alert = indicator(item, profile.id)?.kind;
          const paid = Boolean(item.payment_made_at);
          const remaining = slots.find((slot) => slot.id === item.availability_id)?.remaining_count ?? 1;
          const rated = Boolean(reviewOf(item)?.rating);
          return <article className={`relative rounded-[7px] border border-[#b8d1da] bg-white p-4 sm:p-6 ${alert ? "pt-8" : ""}`} key={item.id}>
            {alert ? <div className="absolute -top-3 left-3">{alert === "action" ? <span className="rounded border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">New Action</span> : alert === "message" ? <button className="rounded border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800" onClick={() => openChat(item)} type="button">New Message</button> : <button className="rounded border border-[#e9b85c] bg-[#ffe6aa] px-3 py-1 text-xs font-semibold text-[#754600]" onClick={() => acknowledge(item)} type="button">New Update</button>}</div> : null}
            <div className="flex flex-wrap items-start justify-between gap-4"><span className="rounded-full bg-[#f2f6f8] px-4 py-1 text-sm font-medium text-[#196c88]">{item.service?.title ?? "Appointment"}</span><div className="text-right text-sm font-semibold text-[#196c88]"><p className="flex items-center justify-end gap-2"><CalendarDays size={17} /> Appointment: <span className={item.status === "requested" ? "text-amber-600" : ""}>{item.status === "requested" ? "Pending" : item.status === "accepted" ? "Accepted" : item.status === "completed" ? "Completed" : item.status === "declined" ? "Declined" : "Cancelled"}</span></p><p className="mt-2 flex items-center justify-end gap-2"><BriefcaseBusiness size={17} /> Work: <span className={paid ? "text-green-600" : "text-amber-600"}>{item.status === "completed" ? "Completed" : paid ? "In Progress" : "Not Started"}</span></p></div></div>
            <div className="mt-5 grid gap-5 text-sm sm:grid-cols-3 sm:items-start">
              <div className="flex items-center gap-3">
                <ProfileAvatar avatarUrl={item.client?.avatar_url} className="h-10 w-10" iconSize={18} />
                <div><p className="font-semibold text-[#5e5e5e]">{name(item.client)}</p></div>
              </div>
              <div><p className="font-semibold text-[#5e5e5e]">Appointment Schedule</p><p className="mt-1 text-[#999]">{time(item.starts_at)} - {time(item.ends_at)}</p></div>
              <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
                {item.status === "requested" ? <><Button disabled={busy === item.id || remaining < 1 || !item.price_amount} onClick={() => changeStatus(item, "accepted")} type="button"><Check size={16} /> Accept</Button><Button disabled={busy === item.id} onClick={() => changeStatus(item, "declined")} type="button" variant="secondary"><X size={16} /> Decline</Button></> : null}
                {item.status === "accepted" ? <><Button disabled={busy === item.id || !paid} onClick={() => changeStatus(item, "completed")} type="button"><Check size={16} /> Mark Complete</Button><Button disabled={busy === item.id} onClick={() => openChat(item)} type="button" variant="secondary"><MessageSquareText size={16} /> Chat{(item.unread_message_count ?? 0) > 0 ? <span className="ml-1 rounded-full bg-red-600 px-1.5 text-xs text-white">{item.unread_message_count}</span> : null}</Button></> : null}
                {item.status === "completed" && item.payment_reference ? <Button onClick={() => setSummaryReference(item.payment_reference!)} type="button">View Summary</Button> : null}
              </div>
            </div>
            {item.status === "requested" && !item.price_amount ? <p className="mt-3 text-sm text-amber-700">This older request has no agreed price. Decline it and ask the client to rebook on a priced slot.</p> : null}
            {item.note ? <p className="mt-4 text-sm text-[#757575]">{item.note}</p> : null}
            <div className="mt-5 flex flex-wrap items-end justify-between gap-4 text-sm">
              <div>
                <p className="flex items-center gap-2 text-[#757575]"><AlertCircle className="text-amber-500" size={17} /> Cancellation deadline: {time(new Date(timestamp(item.starts_at) - 3600000).toISOString())}</p>
                {item.status === "accepted" || item.status === "completed" ? <p className={`mt-3 font-semibold ${paid ? "text-green-700" : "text-amber-600"}`}>{paid ? "Fully Paid" : "Awaiting Payment"}</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {item.status === "accepted" && !paid && timestamp(item.starts_at) > Date.now() ? <button className="text-sm font-medium text-red-700 underline" disabled={busy === item.id} onClick={() => changeStatus(item, "cancelled")} type="button">Cancel</button> : null}
                {rated ? <span className="inline-flex items-center gap-1 text-amber-600"><Star size={16} fill="currentColor" /> Rated</span> : null}
                {item.hired_at && ["accepted", "completed"].includes(item.status) ? <span className="rounded-full bg-[#f2f6f8] px-5 py-1 font-semibold text-[#196c88]">Hired</span> : null}
              </div>
            </div>
            {item.status === "accepted" && (paid || timestamp(item.starts_at) <= Date.now()) ? <p className="mt-3 text-xs text-[#757575]">Need to cancel or report an issue? <a className="font-semibold text-[#196c88] underline" href="mailto:support@accordia.app">Contact support</a>.</p> : null}
          </article>;
        })}
      </div>
      {tab === "requests" ? <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-medium text-[#5e5e5e]">My appointment slots</h2><Button onClick={() => openSlot()} type="button" variant="secondary"><Plus size={17} /> Add new slot</Button></div>
        {slots.length === 0 ? <p className="mt-5 text-sm text-[#757575]">No slots yet.</p> : <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {slots.map((slot) => <article className="rounded-[7px] border border-[#b8d1da] bg-white p-4" key={slot.id}>
            <div className="flex items-start justify-between gap-2"><h3 className="font-semibold text-[#5e5e5e]">{slot.service?.title ?? "General slot"}</h3><span className={`text-xs font-semibold ${slot.status === "open" ? "text-green-700" : "text-[#757575]"}`}>{slot.status === "booked" ? "Fully Booked" : slot.is_paused ? "Paused" : slot.status === "blocked" ? "Unavailable" : "Open"}</span></div>
            <p className="mt-3 text-sm text-[#999]">{time(slot.starts_at)} - {time(slot.ends_at)}</p>
            {slot.note ? <p className="mt-3 text-sm text-[#757575]">{slot.note}</p> : null}
            <p className="mt-3 text-sm text-[#757575]">{slot.remaining_count ?? slot.capacity} of {slot.capacity} spots available</p>
            {!slotServiceValid(slot) ? <p className="mt-2 text-xs text-amber-700">A fixed-price active service is required before booking.</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button disabled={busy === slot.id} onClick={() => openSlot(slot)} type="button" variant="secondary"><Edit2 size={15} /> Edit</Button>
              {slot.status === "open" ? <Button disabled={busy === slot.id} onClick={() => slotAction(slot, "pause")} type="button" variant="secondary"><Pause size={15} /> Pause</Button> : null}
              {slot.status === "blocked" && slot.is_paused ? <Button disabled={busy === slot.id || (slot.remaining_count ?? 0) < 1 || !slotServiceValid(slot)} onClick={() => slotAction(slot, "resume")} type="button" variant="secondary"><Play size={15} /> Resume</Button> : null}
              {!slot.has_bookings ? <Button disabled={busy === slot.id} onClick={() => slotAction(slot, "delete")} type="button" variant="secondary"><Trash2 size={15} /> Remove</Button> : null}
            </div>
          </article>)}
        </div>}
      </section> : null}
    </main>
    {slotModal ? <SurfaceModal onClose={() => setSlotModal(false)} panelClassName="max-h-[90dvh] overflow-y-auto p-5 sm:p-8" size="lg"><div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-medium text-[#5e5e5e]">{editing ? "Edit Slot" : "Add New Slot"}</h2><button aria-label="Close" onClick={() => setSlotModal(false)} type="button"><X size={20} /></button></div><form className="mt-6 grid gap-5" onSubmit={saveSlot}><SelectField disabled={Boolean(editing?.has_bookings)} label="Related Service" onChange={(event) => setServiceId(event.target.value)} required value={serviceId}><option value="">Choose a fixed-price service</option>{services.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}</SelectField><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-ink">Number of Slots<input className="mt-2 h-12 w-full rounded-md border border-line px-3" min={Math.max(1, editing?.confirmed_count ?? 0)} onChange={(event) => setCapacity(Number(event.target.value))} required type="number" value={capacity} /></label><div><p className="text-sm font-semibold text-ink">Appointment Schedule</p><button className="mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-md border border-line px-3 text-left text-sm" disabled={Boolean(editing?.has_bookings)} onClick={() => { setCalendarMode("start"); setCalendarOpen(true); }} type="button"><span>{startDate && endDate ? `${time(combineDateAndTime(startDate, startTime, startPeriod)!.toISOString())} - ${time(combineDateAndTime(endDate, endTime, endPeriod)!.toISOString())}` : "Choose date and time"}</span><CalendarDays size={17} /></button></div></div><TextAreaField label="Slot Note (Optional)" onChange={(event) => setNote(event.target.value)} rows={3} value={note} /><Button disabled={Boolean(busy)} type="submit">{busy ? <Spinner /> : <><Plus size={17} /> {editing ? "Save Slot" : "Add Slot"}</>}</Button></form></SurfaceModal> : null}
    {calendarOpen ? <ScheduleServiceCalendar busy={false} endDate={endDate} endPeriod={endPeriod} endTime={endTime} mode={calendarMode} month={month} onClose={() => setCalendarOpen(false)} onEndPeriodChange={setEndPeriod} onEndTimeChange={setEndTime} onModeChange={setCalendarMode} onMonthChange={setMonth} onSelectDate={(value) => { const selected = dateOnly(value); if (calendarMode === "start") { setStartDate(selected); if (!endDate || selected > endDate) setEndDate(selected); setCalendarMode("end"); } else { setEndDate(selected); if (startDate && selected < startDate) setStartDate(selected); } }} onStartPeriodChange={setStartPeriod} onStartTimeChange={setStartTime} onSubmit={() => setCalendarOpen(false)} placement="fixed" startDate={startDate} startPeriod={startPeriod} startTime={startTime} /> : null}
    {chatInquiry ? <ChatModal appointment={chatAppointment} conversation={chatInquiry} kind="inquiry" onAppointmentUpdated={(updated) => { setChatAppointment(updated); setAppointments((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item)); }} onClose={() => { setChatInquiry(null); setChatAppointment(null); void refresh(); }} /> : null}
    {summaryReference ? <PaymentSummaryModal onClose={() => setSummaryReference("")} reference={summaryReference} /> : null}
  </AppShell>;
}
