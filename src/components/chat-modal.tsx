"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Send, X } from "lucide-react";
import { Button, CustomSelect, IconButton, ProfileAvatar, Spinner, SurfaceModal } from "@/components/ui";
import { ScheduleServiceCalendar as SharedScheduleServiceCalendar } from "@/components/schedule-service-calendar";
import { useToast } from "@/components/toast";
import { useAuth, useRequireAuth } from "@/hooks/use-auth";
import { requestAppointmentReschedule, respondAppointmentReschedule } from "@/services/appointment-service";
import { getConversationMessages, hireConversationProfessional, markConversationRead, sendConversationMessage, setConversationWorkSchedule } from "@/services/conversation-service";
import { getInquiryMessages, markInquiryRead, sendInquiryMessage } from "@/services/inquiry-service";
import type { Appointment, AppointmentRescheduleRequest, ChatMessage, JobConversation, ProfessionalInquiry, Profile } from "@/types";

function participantName(profile?: Pick<Profile, "first_name" | "last_name"> | null) {
  return `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "Accordia user";
}

const IN_PERSON_CONTACT_LOCKED_MESSAGE = "This message was blocked! Make upfront payment and sharing of personal details will be activated to help coordinate meeting.";
const REMOTE_CONTACT_LOCKED_MESSAGE = "This message was blocked for violating platform rules of sharing link and phone number.";
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_PATTERN = /\+?\d[\d\s().-]{7,}\d/g;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/i;
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const YEAR_PAGE_SIZE = 12;
type TimePeriod = "am" | "pm";

function containsContactInfo(value: string) {
  if (EMAIL_PATTERN.test(value) || URL_PATTERN.test(value)) return true;
  const candidates = value.match(PHONE_PATTERN) ?? [];
  return candidates.some((candidate) => candidate.replace(/\D/g, "").length >= 9);
}

function dateOnly(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function sameDay(first: Date | null, second: Date | null) {
  return Boolean(
    first
    && second
    && first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate()
  );
}

function formatDateLabel(value: Date | null) {
  if (!value) return "Select date";
  const day = value.getDate();
  const suffix = day % 10 === 1 && day !== 11
    ? "st"
    : day % 10 === 2 && day !== 12
      ? "nd"
      : day % 10 === 3 && day !== 13
        ? "rd"
        : "th";
  return `${MONTH_NAMES[value.getMonth()].slice(0, 3)} ${day}${suffix}, ${value.getFullYear()}`;
}

function formatTimeValue(value: Date) {
  let hours = value.getHours();
  const minutes = value.getMinutes();
  hours = hours % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

function timePeriodFromDate(value: Date): TimePeriod {
  return value.getHours() >= 12 ? "pm" : "am";
}

function parseTimeValue(value: string, period: TimePeriod) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "");
  const twelveHour = normalized.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/);
  if (twelveHour) {
    let hours = Number(twelveHour[1]);
    const minutes = Number(twelveHour[2] ?? "0");
    if (hours < 1 || hours > 12 || minutes > 59) return null;
    if (twelveHour[3] === "pm" && hours !== 12) hours += 12;
    if (twelveHour[3] === "am" && hours === 12) hours = 0;
    return { hours, minutes };
  }

  const hourMinute = normalized.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (hourMinute) {
    let hours = Number(hourMinute[1]);
    const minutes = Number(hourMinute[2] ?? "0");
    if (hours < 1 || hours > 12 || minutes > 59) return null;
    if (period === "pm" && hours !== 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;
    return { hours, minutes };
  }

  const twentyFourHour = normalized.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (twentyFourHour) {
    return { hours: Number(twentyFourHour[1]), minutes: Number(twentyFourHour[2]) };
  }

  return null;
}

function combineDateAndTime(date: Date | null, time: string, period: TimePeriod) {
  if (!date) return null;
  const parsed = parseTimeValue(time, period);
  if (!parsed) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), parsed.hours, parsed.minutes);
}

function calendarCells(month: Date) {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayBasedDay = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - mondayBasedDay);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

function dayInRange(day: Date, startDate: Date | null, endDate: Date | null) {
  if (!startDate || !endDate) return false;
  const dayTime = dateOnly(day).getTime();
  const startTime = Math.min(startDate.getTime(), endDate.getTime());
  const endTime = Math.max(startDate.getTime(), endDate.getTime());
  return dayTime >= startTime && dayTime <= endTime;
}

function yearPageFor(year: number) {
  return year - Math.floor(YEAR_PAGE_SIZE / 2);
}

function ScheduleServiceCalendar({
  busy,
  currentEndDate,
  currentScheduleLabel,
  currentStartDate,
  endDate,
  endPeriod,
  endTime,
  month,
  mode,
  onClose,
  onEndPeriodChange,
  onEndTimeChange,
  onMonthChange,
  onModeChange,
  onSelectDate,
  onStartPeriodChange,
  onStartTimeChange,
  onSubmit,
  placement = "absolute",
  startDate,
  startPeriod,
  startTime
}: {
  busy: boolean;
  currentEndDate: Date | null;
  currentScheduleLabel: string;
  currentStartDate: Date | null;
  endDate: Date | null;
  endPeriod: TimePeriod;
  endTime: string;
  month: Date;
  mode: "start" | "end";
  onClose: () => void;
  onEndPeriodChange: (value: TimePeriod) => void;
  onEndTimeChange: (value: string) => void;
  onMonthChange: (value: Date) => void;
  onModeChange: (value: "start" | "end") => void;
  onSelectDate: (value: Date) => void;
  onStartPeriodChange: (value: TimePeriod) => void;
  onStartTimeChange: (value: string) => void;
  onSubmit: () => void;
  placement?: "absolute" | "fixed";
  startDate: Date | null;
  startPeriod: TimePeriod;
  startTime: string;
}) {
  const cells = useMemo(() => calendarCells(month), [month]);
  const today = useMemo(() => dateOnly(new Date()), []);
  const [calendarView, setCalendarView] = useState<"days" | "months" | "years">("days");
  const [yearPageStart, setYearPageStart] = useState(() => yearPageFor(month.getFullYear()));

  function moveMonth(direction: -1 | 1) {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + direction, 1));
  }

  function chooseMonth(monthIndex: number) {
    onMonthChange(new Date(month.getFullYear(), monthIndex, 1));
    setCalendarView("days");
  }

  function chooseYear(year: number) {
    onMonthChange(new Date(year, month.getMonth(), 1));
    setCalendarView("months");
  }

  function jumpToToday() {
    const currentToday = dateOnly(new Date());
    onMonthChange(new Date(currentToday.getFullYear(), currentToday.getMonth(), 1));
    onSelectDate(currentToday);
    setCalendarView("days");
  }

  function TimeControl({
    label,
    onPeriodChange,
    onTimeChange,
    period,
    time
  }: {
    label: string;
    onPeriodChange: (value: TimePeriod) => void;
    onTimeChange: (value: string) => void;
    period: TimePeriod;
    time: string;
  }) {
    function timeInputValue() {
      const parsed = parseTimeValue(time, period);
      if (!parsed) return "";
      return `${String(parsed.hours).padStart(2, "0")}:${String(parsed.minutes).padStart(2, "0")}`;
    }

    function handleTimeChange(value: string) {
      const nativeTime = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
      if (!nativeTime) {
        onTimeChange(value);
        return;
      }

      const date = new Date();
      date.setHours(Number(nativeTime[1]), Number(nativeTime[2]), 0, 0);
      onTimeChange(formatTimeValue(date));
      onPeriodChange(timePeriodFromDate(date));
    }

    return (
      <div className="grid w-full max-w-[172px] grid-cols-[94px_70px] gap-2">
        <input
          aria-label={label}
          className="min-h-11 rounded-[8px] border border-[#9f9f9f] px-2 text-center text-xs text-[#4f4f4f] outline-none transition focus:border-[#196c88] focus:ring-4 focus:ring-teal-100 sm:text-[13px]"
          onChange={(event) => handleTimeChange(event.target.value)}
          step={300}
          type="time"
          value={timeInputValue()}
        />
        <CustomSelect
          aria-label={`${label} period`}
          className="w-full"
          menuClassName="min-w-[70px]"
          onChange={(event) => onPeriodChange(event.target.value as TimePeriod)}
          triggerClassName="min-h-11 rounded-[8px] px-2 py-0 text-center text-xs font-semibold uppercase"
          value={period}
        >
          <option value="am">AM</option>
          <option value="pm">PM</option>
        </CustomSelect>
      </div>
    );
  }

  return (
    <div className={`${placement === "fixed" ? "fixed z-[90] bg-black/20" : "absolute z-30 bg-white/45"} inset-0 overflow-y-auto p-3 backdrop-blur-[1px]`}>
      <div className="flex min-h-full items-start justify-center py-3 sm:items-center">
      <div className="max-h-[calc(100dvh-48px)] w-full max-w-[620px] overflow-y-auto overflow-x-hidden rounded-[8px] border border-[#9fcbd8] bg-white p-4 shadow-[0_14px_45px_rgba(15,23,42,0.18)] sm:p-6">
        <div className="flex items-center justify-between gap-4 border-b border-[#b8d4dc] pb-4">
          <h2 className="text-[17px] font-semibold text-[#4f4f4f]">Schedule Service</h2>
          <button
            aria-label="Close schedule calendar"
            className="grid h-8 w-8 place-items-center text-black transition hover:text-[#196c88]"
            onClick={onClose}
            type="button"
          >
            <X size={24} />
          </button>
        </div>

        <div className="grid gap-5 pt-4 md:grid-cols-[1fr_1px_1.18fr]">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <button
                className="text-[18px] font-semibold text-[#196c88] transition hover:text-[#125a73]"
                onClick={() => {
                  setYearPageStart(yearPageFor(month.getFullYear()));
                  setCalendarView("years");
                }}
                type="button"
              >
                {month.getFullYear()}
              </button>
              <div className="flex items-center gap-3">
                <button
                  className="rounded-[4px] bg-[#196c88] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#125a73]"
                  onClick={() => setCalendarView(calendarView === "months" ? "days" : "months")}
                  type="button"
                >
                  {MONTH_NAMES[month.getMonth()]}
                </button>
                <button
                  aria-label={calendarView === "years" ? "Previous years" : calendarView === "months" ? "Previous year" : "Previous month"}
                  className="grid h-8 w-8 place-items-center rounded-[4px] text-black transition hover:bg-slate-100 hover:text-[#196c88]"
                  onClick={() => {
                    if (calendarView === "years") {
                      setYearPageStart((current) => current - YEAR_PAGE_SIZE);
                      return;
                    }
                    if (calendarView === "months") {
                      onMonthChange(new Date(month.getFullYear() - 1, month.getMonth(), 1));
                      return;
                    }
                    moveMonth(-1);
                  }}
                  type="button"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  aria-label={calendarView === "years" ? "Next years" : calendarView === "months" ? "Next year" : "Next month"}
                  className="grid h-8 w-8 place-items-center rounded-[4px] text-black transition hover:bg-slate-100 hover:text-[#196c88]"
                  onClick={() => {
                    if (calendarView === "years") {
                      setYearPageStart((current) => current + YEAR_PAGE_SIZE);
                      return;
                    }
                    if (calendarView === "months") {
                      onMonthChange(new Date(month.getFullYear() + 1, month.getMonth(), 1));
                      return;
                    }
                    moveMonth(1);
                  }}
                  type="button"
                >
                  <ChevronRight size={22} />
                </button>
              </div>
            </div>

            {calendarView === "days" ? (
              <>
                <button
                  className="mt-3 text-xs font-semibold text-[#196c88] transition hover:text-[#125a73]"
                  onClick={jumpToToday}
                  type="button"
                >
                  Today: {formatDateLabel(today)}
                </button>
                {currentScheduleLabel ? (
                  <div className="mt-2 flex items-start gap-2 rounded-[6px] bg-[#fff8df] px-3 py-2 text-xs leading-5 text-[#7a5a15]">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#f4a422]" />
                    <span>Current schedule: {currentScheduleLabel}</span>
                  </div>
                ) : null}
                <div className="mt-3 grid grid-cols-7 gap-x-1 gap-y-2 text-center text-sm">
                  {WEEKDAY_LABELS.map((day, index) => (
                    <span className={`text-xs font-medium ${index >= 5 ? "text-[#0084b8]" : "text-[#a8a8a8]"}`} key={day}>
                      {day}
                    </span>
                  ))}
                  {Array.from({ length: 6 }, (_, rowIndex) => {
                    const rowCells = cells.slice(rowIndex * 7, rowIndex * 7 + 7);
                    return (
                      <div className="contents" key={rowIndex}>
                        {rowCells.map((date) => {
                          const normalizedDate = dateOnly(date);
                          const inMonth = date.getMonth() === month.getMonth();
                          const selected = sameDay(date, mode === "start" ? startDate : endDate);
                          const rangeEdge = sameDay(date, startDate) || sameDay(date, endDate);
                          const selectedTrail = dayInRange(date, startDate, endDate);
                          const currentTrail = dayInRange(date, currentStartDate, currentEndDate);
                          const isToday = sameDay(date, today);
                          const isPast = normalizedDate < today;

                          return (
                            <button
                              aria-label={`${date.toDateString()}${isToday ? ", today" : ""}`}
                              aria-pressed={selected}
                              className={`relative grid h-8 min-w-0 place-items-center rounded-[4px] text-xs font-medium transition ${
                                selected
                                  ? "bg-[#196c88] text-white"
                                    : rangeEdge
                                      ? "bg-[#e7f2f5] text-[#196c88]"
                                      : selectedTrail
                                        ? "bg-[#f2f8fa] text-[#196c88]"
                                        : currentTrail
                                          ? "bg-[#fff8df] text-[#9b6500] ring-1 ring-[#f4a422]/35"
                                          : isPast
                                            ? "cursor-not-allowed text-slate-300"
                                            : inMonth
                                              ? "text-[#196c88] hover:bg-[#e7f2f5]"
                                              : "text-[#a8a8a8] hover:bg-slate-50"
                              } ${isToday && !selected ? "ring-1 ring-[#f4a422]" : ""}`}
                              disabled={isPast}
                              key={date.toISOString()}
                              onClick={() => onSelectDate(date)}
                              type="button"
                            >
                              {date.getDate()}
                              {currentTrail ? <span className={`absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full ${selected ? "bg-white" : "bg-[#f4a422]"}`} /> : null}
                              {isToday ? <span className={`absolute bottom-0.5 h-1 w-1 rounded-full ${selected ? "bg-white" : "bg-[#f4a422]"}`} /> : null}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}

            {calendarView === "months" ? (
              <div className="mt-5 grid grid-cols-3 gap-2">
                {MONTH_NAMES.map((monthName, index) => (
                  <button
                    className={`min-h-11 rounded-[6px] px-2 text-sm font-semibold transition ${month.getMonth() === index ? "bg-[#196c88] text-white" : "bg-slate-50 text-[#5e5e5e] hover:bg-[#e7f2f5] hover:text-[#196c88]"}`}
                    key={monthName}
                    onClick={() => chooseMonth(index)}
                    type="button"
                  >
                    {monthName.slice(0, 3)}
                  </button>
                ))}
              </div>
            ) : null}

            {calendarView === "years" ? (
              <div className="mt-5 grid grid-cols-3 gap-2">
                {Array.from({ length: YEAR_PAGE_SIZE }, (_, index) => yearPageStart + index).map((year) => (
                  <button
                    className={`min-h-11 rounded-[6px] px-2 text-sm font-semibold transition ${month.getFullYear() === year ? "bg-[#196c88] text-white" : "bg-slate-50 text-[#5e5e5e] hover:bg-[#e7f2f5] hover:text-[#196c88]"}`}
                    key={year}
                    onClick={() => chooseYear(year)}
                    type="button"
                  >
                    {year}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="hidden bg-[#b8d4dc] md:block" />

          <div className="min-w-0 space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-[#5e5e5e]">Start Date</p>
              <div className="grid gap-3 min-[560px]:grid-cols-[minmax(0,1fr)_172px]">
                <button
                  className={`min-h-11 truncate rounded-[8px] border px-3 text-xs transition sm:text-[13px] ${mode === "start" ? "border-[#196c88] bg-[#f2f8fa] text-[#196c88]" : "border-[#9f9f9f] bg-white text-[#4f4f4f]"}`}
                  onClick={() => onModeChange("start")}
                  type="button"
                >
                  {formatDateLabel(startDate)}
                </button>
                <TimeControl
                  label="Start time"
                  onPeriodChange={onStartPeriodChange}
                  onTimeChange={onStartTimeChange}
                  period={startPeriod}
                  time={startTime}
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-[#5e5e5e]">End Date</p>
              <div className="grid gap-3 min-[560px]:grid-cols-[minmax(0,1fr)_172px]">
                <button
                  className={`min-h-11 truncate rounded-[8px] border px-3 text-xs transition sm:text-[13px] ${mode === "end" ? "border-[#196c88] bg-[#f2f8fa] text-[#196c88]" : "border-[#9f9f9f] bg-white text-[#4f4f4f]"}`}
                  onClick={() => onModeChange("end")}
                  type="button"
                >
                  {formatDateLabel(endDate)}
                </button>
                <TimeControl
                  label="End time"
                  onPeriodChange={onEndPeriodChange}
                  onTimeChange={onEndTimeChange}
                  period={endPeriod}
                  time={endTime}
                />
              </div>
            </div>

            <div className="flex justify-end pt-8">
              <button
                className="min-h-10 px-2 text-sm font-semibold uppercase text-[#196c88] transition hover:text-[#125a73] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={busy}
                onClick={onSubmit}
                type="button"
              >
                {busy ? "Saving..." : "OK"}
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export function ChatModal({
  conversation,
  appointment,
  kind = "job",
  onHired,
  onAppointmentUpdated,
  onClose
}: {
  conversation: JobConversation | ProfessionalInquiry;
  appointment?: Appointment | null;
  kind?: "job" | "inquiry";
  onHired?: (conversation: JobConversation) => void;
  onAppointmentUpdated?: (appointment: Appointment) => void;
  onClose: () => void;
}) {
  const token = useRequireAuth();
  const { profile } = useAuth();
  const showToast = useToast();
  const [currentConversation, setCurrentConversation] = useState(conversation);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [contactWarning, setContactWarning] = useState("");
  const [hireStep, setHireStep] = useState<"ready" | "payment" | "paid">("ready");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hiring, setHiring] = useState(false);
  const [paymentNoticeOpen, setPaymentNoticeOpen] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(appointment ?? null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"start" | "end">("start");
  const [scheduleMonth, setScheduleMonth] = useState(() => dateOnly(new Date()));
  const [scheduleStartDate, setScheduleStartDate] = useState<Date | null>(null);
  const [scheduleEndDate, setScheduleEndDate] = useState<Date | null>(null);
  const [scheduleStartTime, setScheduleStartTime] = useState("8:00");
  const [scheduleEndTime, setScheduleEndTime] = useState("9:00");
  const [scheduleStartPeriod, setScheduleStartPeriod] = useState<TimePeriod>("am");
  const [scheduleEndPeriod, setScheduleEndPeriod] = useState<TimePeriod>("am");
  const [rescheduleBusy, setRescheduleBusy] = useState(false);

  useEffect(() => {
    setCurrentConversation(conversation);
    setHireStep("ready");
    setContactWarning("");
    setPaymentNoticeOpen(false);
  }, [conversation]);

  useEffect(() => {
    setCurrentAppointment(appointment ?? null);
  }, [appointment]);

  useEffect(() => {
    if (!paymentNoticeOpen) return;

    const timer = window.setTimeout(() => {
      setPaymentNoticeOpen(false);
    }, 6500);

    return () => window.clearTimeout(timer);
  }, [paymentNoticeOpen]);

  const otherParticipant = useMemo(() => {
    if (!profile) return currentConversation.professional ?? currentConversation.client;
    return profile.id === currentConversation.client_id ? currentConversation.professional : currentConversation.client;
  }, [currentConversation, profile]);
  const contextLabel = kind === "job"
    ? (currentConversation as JobConversation).job?.title ?? "Job chat"
    : (currentConversation as ProfessionalInquiry).service?.title ?? "Professional inquiry";
  const jobConversation = kind === "job" ? currentConversation as JobConversation : null;
  const isClient = Boolean(jobConversation && profile?.id === jobConversation.client_id);
  const isRemoteJob = jobConversation?.job?.is_remote === true;
  const isInPersonJob = jobConversation?.job?.is_remote === false;
  const hasUpfrontPayment = Boolean(jobConversation?.upfront_payment_made_at);
  const isHired = ["selected", "awarded", "hired", "in_progress", "inprogress"].includes(jobConversation?.application?.status?.toLowerCase() ?? "");
  const canExchangeContactInfo = Boolean(jobConversation && isInPersonJob && hasUpfrontPayment);
  const latestPendingReschedule = useMemo(() => {
    const requests = currentAppointment?.reschedule_requests ?? [];
    return [...requests]
      .filter((request) => request.status === "pending")
      .sort((first, second) => new Date(second.created_at).getTime() - new Date(first.created_at).getTime())[0] ?? null;
  }, [currentAppointment?.reschedule_requests]);
  const canRescheduleAppointment = kind === "inquiry" && currentAppointment?.status === "accepted";
  const canScheduleWork = Boolean(jobConversation && !isClient);
  const canRespondToReschedule = Boolean(latestPendingReschedule && profile?.id === latestPendingReschedule.requested_for);
  const chatDisclaimer = isInPersonJob
    ? hasUpfrontPayment
      ? "For in-person jobs, contact details can now be exchanged because an upfront payment has been secured to help you coordinate the meeting."
      : "For in-person jobs, contact details can be exchanged after an upfront payment is secured to help you coordinate the meeting."
    : "For remote jobs, communication is managed through Accordia's messaging system. Phone numbers, addresses and external links are restricted to help keep projects secure.";
  const hireName = participantName(otherParticipant);

  const loadMessages = useCallback(async (showLoading = false) => {
    if (!token) return;
    if (showLoading) setLoading(true);

    const data = kind === "job"
      ? await getConversationMessages(token, currentConversation.id)
      : await getInquiryMessages(token, currentConversation.id);
    setMessages((current) => {
      if (
        current.length === data.messages.length
        && current[current.length - 1]?.id === data.messages[data.messages.length - 1]?.id
      ) {
        return current;
      }

      return data.messages;
    });
    await (kind === "job" ? markConversationRead(token, currentConversation.id) : markInquiryRead(token, currentConversation.id)).catch(() => undefined);
  }, [currentConversation.id, kind, token]);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    setLoading(true);

    loadMessages()
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Could not load chat";
        if (isMounted) showToast({ tone: "error", title: "Chat unavailable", body: message });
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    const refreshTimer = window.setInterval(() => {
      loadMessages().catch(() => undefined);
    }, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(refreshTimer);
    };
  }, [loadMessages, showToast, token]);

  async function sendMessage() {
    const body = draft.trim();
    if (!token || !body) return;
    if (containsContactInfo(body) && !canExchangeContactInfo) {
      setContactWarning(jobConversation && isInPersonJob ? IN_PERSON_CONTACT_LOCKED_MESSAGE : REMOTE_CONTACT_LOCKED_MESSAGE);
      return;
    }

    setSending(true);
    try {
      const data = kind === "job"
        ? await sendConversationMessage(token, currentConversation.id, body)
        : await sendInquiryMessage(token, currentConversation.id, body);
      setMessages((current) => [...current, data.message]);
      await (kind === "job" ? markConversationRead(token, currentConversation.id) : markInquiryRead(token, currentConversation.id)).catch(() => undefined);
      setDraft("");
      setContactWarning("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not send message";
      showToast({ tone: "error", title: "Message failed", body: message });
    } finally {
      setSending(false);
    }
  }

  async function confirmUpfrontPayment() {
    if (!token || !jobConversation) return;
    setHiring(true);

    try {
      const data = await hireConversationProfessional(token, jobConversation.id);
      setCurrentConversation(data.conversation);
      setHireStep("paid");
      setPaymentNoticeOpen(true);
      onHired?.(data.conversation);
      showToast({
        tone: "success",
        title: "Upfront payment has been made",
        body: "The professional has been moved to hired."
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not complete upfront payment";
      showToast({ tone: "error", title: "Payment failed", body: message });
    } finally {
      setHiring(false);
    }
  }

  function formatRescheduleRange(request: Pick<AppointmentRescheduleRequest, "proposed_starts_at" | "proposed_ends_at">) {
    return `${new Date(request.proposed_starts_at).toLocaleString()} - ${new Date(request.proposed_ends_at).toLocaleString()}`;
  }

  function openRescheduleCalendar() {
    const baseStart = currentAppointment?.starts_at
      ? new Date(currentAppointment.starts_at)
      : jobConversation?.work_starts_at
        ? new Date(jobConversation.work_starts_at)
        : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const baseEnd = currentAppointment?.ends_at
      ? new Date(currentAppointment.ends_at)
      : jobConversation?.work_ends_at
        ? new Date(jobConversation.work_ends_at)
        : new Date(baseStart.getTime() + 60 * 60 * 1000);

    setScheduleMode("start");
    setScheduleMonth(new Date(baseStart.getFullYear(), baseStart.getMonth(), 1));
    setScheduleStartDate(dateOnly(baseStart));
    setScheduleEndDate(dateOnly(baseEnd));
    setScheduleStartTime(formatTimeValue(baseStart));
    setScheduleEndTime(formatTimeValue(baseEnd));
    setScheduleStartPeriod(timePeriodFromDate(baseStart));
    setScheduleEndPeriod(timePeriodFromDate(baseEnd));
    setRescheduleOpen(true);
  }

  function selectScheduleDate(value: Date) {
    const selectedDate = dateOnly(value);
    if (scheduleMode === "start") {
      setScheduleStartDate(selectedDate);
      if (!scheduleEndDate || selectedDate > scheduleEndDate) setScheduleEndDate(selectedDate);
      setScheduleMode("end");
      return;
    }

    setScheduleEndDate(selectedDate);
    if (scheduleStartDate && selectedDate < scheduleStartDate) setScheduleStartDate(selectedDate);
  }

  async function proposeReschedule() {
    if (!token) return;
    const proposedStart = combineDateAndTime(scheduleStartDate, scheduleStartTime, scheduleStartPeriod);
    const proposedEnd = combineDateAndTime(scheduleEndDate, scheduleEndTime, scheduleEndPeriod);

    if (!proposedStart || !proposedEnd) {
      showToast({ tone: "error", title: "Choose a new time", body: "Add both the new start and end time." });
      return;
    }
    if (proposedStart <= new Date()) {
      showToast({ tone: "error", title: "Choose a future schedule", body: "The new appointment start time must be in the future." });
      return;
    }
    if (proposedEnd <= proposedStart) {
      showToast({ tone: "error", title: "Choose a valid schedule", body: "End time must be after the start time." });
      return;
    }

    setRescheduleBusy(true);
    try {
      if (currentAppointment) {
        const data = await requestAppointmentReschedule(token, currentAppointment.id, {
          starts_at: proposedStart.toISOString(),
          ends_at: proposedEnd.toISOString(),
          note: null
        });
        setCurrentAppointment(data.appointment);
        onAppointmentUpdated?.(data.appointment);
        setMessages((current) => [...current, data.message]);
        showToast({ tone: "success", title: "Reschedule requested", body: "The other party has been notified." });
      } else if (jobConversation) {
        const data = await setConversationWorkSchedule(token, jobConversation.id, proposedStart.toISOString(), proposedEnd.toISOString());
        setCurrentConversation(data.conversation);
        setMessages((current) => [...current, data.message]);
        showToast({ tone: "success", title: "Work schedule saved", body: "The schedule has been posted in the chat." });
      }
      setRescheduleOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save schedule";
      showToast({ tone: "error", title: currentAppointment ? "Reschedule failed" : "Schedule failed", body: message });
    } finally {
      setRescheduleBusy(false);
    }
  }

  async function respondToReschedule(status: "accepted" | "declined") {
    if (!token || !currentAppointment || !latestPendingReschedule) return;

    setRescheduleBusy(true);
    try {
      const data = await respondAppointmentReschedule(token, currentAppointment.id, latestPendingReschedule.id, status);
      setCurrentAppointment(data.appointment);
      onAppointmentUpdated?.(data.appointment);
      if (data.message) setMessages((current) => [...current, data.message as ChatMessage]);
      showToast({
        tone: "success",
        title: status === "accepted" ? "Reschedule accepted" : "Reschedule declined",
        body: status === "accepted" ? "The appointment schedule has been updated." : "The current appointment time remains unchanged."
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not respond to reschedule";
      showToast({ tone: "error", title: "Reschedule not updated", body: message });
    } finally {
      setRescheduleBusy(false);
    }
  }

  return (
    <SurfaceModal onClose={onClose} panelClassName="flex h-[calc(100dvh-24px)] max-h-[900px] min-h-0 flex-col overflow-hidden sm:h-[calc(100vh-48px)] sm:min-h-[680px]" size="chat">
        {rescheduleOpen ? (
          <SharedScheduleServiceCalendar
            busy={rescheduleBusy}
            currentEndDate={currentAppointment?.ends_at ? dateOnly(new Date(currentAppointment.ends_at)) : jobConversation?.work_ends_at ? dateOnly(new Date(jobConversation.work_ends_at)) : null}
            currentScheduleLabel={
              currentAppointment?.starts_at && currentAppointment?.ends_at
                ? `${new Date(currentAppointment.starts_at).toLocaleString()} - ${new Date(currentAppointment.ends_at).toLocaleString()}`
                : jobConversation?.work_starts_at && jobConversation?.work_ends_at
                  ? `${new Date(jobConversation.work_starts_at).toLocaleString()} - ${new Date(jobConversation.work_ends_at).toLocaleString()}`
                : ""
            }
            currentStartDate={currentAppointment?.starts_at ? dateOnly(new Date(currentAppointment.starts_at)) : jobConversation?.work_starts_at ? dateOnly(new Date(jobConversation.work_starts_at)) : null}
            endDate={scheduleEndDate}
            endPeriod={scheduleEndPeriod}
            endTime={scheduleEndTime}
            mode={scheduleMode}
            month={scheduleMonth}
            onClose={() => setRescheduleOpen(false)}
            onEndPeriodChange={setScheduleEndPeriod}
            onEndTimeChange={setScheduleEndTime}
            onModeChange={setScheduleMode}
            onMonthChange={setScheduleMonth}
            onSelectDate={selectScheduleDate}
            onStartPeriodChange={setScheduleStartPeriod}
            onStartTimeChange={setScheduleStartTime}
            onSubmit={proposeReschedule}
            placement="fixed"
            startDate={scheduleStartDate}
            startPeriod={scheduleStartPeriod}
            startTime={scheduleStartTime}
          />
        ) : null}
        {isClient && jobConversation && !isHired && !hasUpfrontPayment && hireStep === "ready" ? (
          <div className="m-4 mb-0 rounded-[8px] border-b-[3px] border-[#f4a422] bg-[#fffbe6] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <CheckCircle2 className="mt-0.5 shrink-0 text-[#f4a422]" size={28} strokeWidth={1.7} />
                <div>
                  <p className="text-[16px] font-semibold text-[#5e5e5e]">Ready to hire {hireName}?</p>
                  <p className="mt-1 text-sm leading-5 text-[#757575]">If you are satisfied with your conversation, hire this professional to continue.</p>
                </div>
              </div>
              <Button className="shrink-0 rounded-[5px] px-5" onClick={() => setHireStep("payment")} type="button">
                Hire Professional
              </Button>
            </div>
          </div>
        ) : null}
        {isClient && jobConversation && !isHired && !hasUpfrontPayment && hireStep === "payment" ? (
          <div className="m-4 mb-0 rounded-[8px] border-b-[3px] border-[#f4a422] bg-[#fffbe6] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <CheckCircle2 className="mt-0.5 shrink-0 text-[#f4a422]" size={28} strokeWidth={1.7} />
                <div>
                  <p className="text-[16px] font-semibold text-[#5e5e5e]">Make Upfront Payment</p>
                  <p className="mt-1 text-sm leading-5 text-[#757575]">Accordia securely holds your payment until you confirm satisfactory completion of job.</p>
                </div>
              </div>
              <Button className="shrink-0 rounded-[5px] px-7" disabled={hiring} onClick={confirmUpfrontPayment} type="button">
                {hiring ? <span className="inline-flex items-center gap-2"><Spinner className="h-5 w-5 border-[3px]" /> Processing</span> : "Proceed"}
              </Button>
            </div>
          </div>
        ) : null}
        {jobConversation && hireStep === "paid" && paymentNoticeOpen ? (
          <div className="relative m-3 mb-0 rounded-[8px] border-b-[3px] border-[#0fa269] bg-[#f3fef3] p-3 pr-10 sm:m-4 sm:mb-0 sm:p-4 sm:pr-12">
            <button aria-label="Dismiss payment notice" className="absolute right-3 top-3 text-black transition hover:text-[#0fa269]" onClick={() => setPaymentNoticeOpen(false)} type="button">
              <X size={17} />
            </button>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <CheckCircle2 className="mt-0.5 shrink-0 text-[#0fa269]" size={24} strokeWidth={1.7} />
                <div>
                  <p className="text-[15px] font-semibold text-[#5e5e5e] sm:text-[16px]">Upfront payment successfully made</p>
                  <p className="mt-1 text-xs leading-5 text-[#757575] sm:text-sm">{isInPersonJob ? "Contacts can now be exchanged to help meeting coordination." : "Monitor active jobs from the active jobs page."}</p>
                </div>
              </div>
              <Button className="shrink-0 rounded-[5px] px-4" size="sm" type="button" variant="secondary">
                View details
              </Button>
            </div>
          </div>
        ) : null}
        <header className="flex items-start justify-between gap-4 border-b border-line p-4">
          <div className="flex min-w-0 items-center gap-3">
            <ProfileAvatar avatarUrl={otherParticipant?.avatar_url} className="h-9 w-9" iconSize={17} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{participantName(otherParticipant)}</p>
              <p className="truncate text-sm text-muted">{contextLabel}</p>
            </div>
          </div>
          <IconButton aria-label="Close chat" onClick={onClose} type="button" variant="ghost">
            <X size={18} />
          </IconButton>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-5 sm:px-6 lg:px-7">
          {loading ? (
            <div className="flex h-full items-center justify-center text-brand">
              <Spinner className="h-14 w-14 border-[3px]" />
            </div>
          ) : null}
          {!loading && messages.length === 0 ? (
            <div className="mx-auto mt-12 max-w-sm text-center">
              <h2 className="text-lg font-semibold text-ink">Start the conversation</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Share next steps, timing, materials, and anything needed before work begins.</p>
            </div>
          ) : null}
          {!loading ? (
            <div className="space-y-4">
              {messages.map((message) => {
                const mine = message.sender_id === profile?.id;
                return (
                  <div className={`flex ${mine ? "justify-end" : "justify-start"}`} key={message.id}>
                    <div className={`max-w-[82%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[52%] ${mine ? "bg-brand text-white" : "border border-line bg-white text-ink"}`}>
                      <p>{message.body}</p>
                      <p className={`mt-2 text-[11px] ${mine ? "text-white/75" : "text-muted"}`}>
                        {new Date(message.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
              {contactWarning ? (
                <div className="flex justify-center sm:justify-end sm:pr-12">
                  <div className="relative w-full max-w-[560px] rounded-[10px] border border-red-100 border-b-[3px] border-b-red-700 bg-red-50 px-4 py-5 pr-11 text-[15px] font-medium leading-7 text-[#5e5e5e] shadow-sm sm:px-7 sm:py-6 sm:text-[18px]">
                    <button aria-label="Dismiss blocked message" className="absolute right-4 top-4 text-black transition hover:text-red-700" onClick={() => setContactWarning("")} type="button">
                      <X size={18} />
                    </button>
                    <div className="flex items-center gap-4">
                      <AlertCircle className="shrink-0 text-red-700" size={36} strokeWidth={2.1} />
                      <p>{contactWarning}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <footer className="border-t border-line bg-white p-4 sm:px-6 lg:px-7">
          {latestPendingReschedule ? (
            <div className="mb-3 rounded-[6px] border border-[#f9d999] bg-[#fffbe6] p-3 text-sm text-[#5e5e5e]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-[#196c88]">Appointment reschedule requested</p>
                  <p className="mt-1 leading-5">{formatRescheduleRange(latestPendingReschedule)}</p>
                  {latestPendingReschedule.note ? <p className="mt-1 leading-5 text-[#757575]">{latestPendingReschedule.note}</p> : null}
                </div>
                {canRespondToReschedule ? (
                  <div className="flex shrink-0 gap-2">
                    <Button className="h-10 rounded-[5px] px-4 py-0" disabled={rescheduleBusy} onClick={() => respondToReschedule("accepted")} type="button">
                      {rescheduleBusy ? <Spinner className="h-4 w-4" /> : "Accept"}
                    </Button>
                    <Button className="h-10 rounded-[5px] px-4 py-0" disabled={rescheduleBusy} onClick={() => respondToReschedule("declined")} type="button" variant="secondary">
                      Decline
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-[#f4a422]">Awaiting response</p>
                )}
              </div>
            </div>
          ) : null}
          <div className="relative">
            <label className="sr-only" htmlFor="chat-message-input">Message</label>
            <textarea
              className="min-h-[120px] w-full resize-none rounded-[6px] border border-line bg-white px-4 py-4 pr-20 text-sm outline-none transition duration-200 hover:border-slate-300 focus:border-brand focus:ring-4 focus:ring-teal-100 sm:min-h-[132px] lg:min-h-[144px]"
              id="chat-message-input"
              onChange={(event) => {
                setDraft(event.target.value);
                if (contactWarning && (!containsContactInfo(event.target.value) || canExchangeContactInfo)) setContactWarning("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type message..."
              rows={3}
              value={draft}
            />
            <Button
              aria-label={sending ? "Sending message" : "Send message"}
              className="absolute bottom-4 right-4 h-12 w-12 rounded-[5px] p-0 sm:h-12 sm:w-12"
              disabled={sending || draft.trim().length === 0}
              onClick={sendMessage}
              type="button"
            >
              {sending ? <Spinner className="h-5 w-5 border-2" /> : <Send size={22} />}
            </Button>
          </div>
          {(canRescheduleAppointment || canScheduleWork) && !latestPendingReschedule && !rescheduleOpen ? (
            <button
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-[5px] border border-[#196c88] px-4 text-sm font-semibold text-[#196c88] transition hover:bg-[#f2f6f8]"
              onClick={openRescheduleCalendar}
              type="button"
            >
              <CalendarDays size={17} />
              {canRescheduleAppointment ? "Re-schedule appointment" : jobConversation?.work_starts_at ? "Re-schedule Start Date" : "Schedule Start Date"}
            </button>
          ) : null}
          {jobConversation ? (
            <div className="mt-4 flex items-start gap-3 text-sm font-medium leading-6 text-[#5e5e5e]">
              <AlertCircle className="mt-0.5 shrink-0 text-[#f4a422]" size={22} />
              <p>
                {chatDisclaimer}
              </p>
            </div>
          ) : null}
        </footer>
    </SurfaceModal>
  );
}
