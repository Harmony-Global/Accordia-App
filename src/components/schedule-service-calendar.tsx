"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, X } from "lucide-react";
import { CustomSelect } from "@/components/ui";

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

export type TimePeriod = "am" | "pm";

export function dateOnly(value: Date) {
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

export function formatDateLabel(value: Date | null) {
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

export function formatTimeValue(value: Date) {
  let hours = value.getHours();
  const minutes = value.getMinutes();
  hours = hours % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

export function timePeriodFromDate(value: Date): TimePeriod {
  return value.getHours() >= 12 ? "pm" : "am";
}

function parseClockTime(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "");
  const twelveHour = normalized.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/);
  if (twelveHour) {
    const hours = Number(twelveHour[1]);
    const minutes = Number(twelveHour[2] ?? "0");
    if (hours < 1 || hours > 12 || minutes > 59) return null;
    return { hours, minutes, period: twelveHour[3] as TimePeriod };
  }

  const twentyFourHour = normalized.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (twentyFourHour) {
    const fullHours = Number(twentyFourHour[1]);
    const minutes = Number(twentyFourHour[2]);
    if (fullHours === 0 || fullHours > 12) {
      return {
        hours: fullHours % 12 || 12,
        minutes,
        period: fullHours >= 12 ? "pm" as TimePeriod : "am" as TimePeriod
      };
    }
  }

  const compactTime = normalized.match(/^(\d{3,4})$/);
  if (compactTime) {
    const digits = compactTime[1];
    const hours = Number(digits.slice(0, -2));
    const minutes = Number(digits.slice(-2));
    if (minutes > 59) return null;
    if (hours === 0 || hours > 12) {
      if (hours > 23) return null;
      return {
        hours: hours % 12 || 12,
        minutes,
        period: hours >= 12 ? "pm" as TimePeriod : "am" as TimePeriod
      };
    }
    if (hours < 1) return null;
    return { hours, minutes, period: null };
  }

  const hourMinute = normalized.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (hourMinute) {
    const hours = Number(hourMinute[1]);
    const minutes = Number(hourMinute[2] ?? "0");
    if (hours < 1 || hours > 12 || minutes > 59) return null;
    return { hours, minutes, period: null };
  }

  return null;
}

function formatClockTime({ hours, minutes }: { hours: number; minutes: number }) {
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

function parseTimeValue(value: string, period: TimePeriod) {
  const parsed = parseClockTime(value);
  if (!parsed) return null;

  let hours = parsed.hours;
  const minutes = parsed.minutes;
  const selectedPeriod = parsed.period ?? period;

  if (selectedPeriod === "pm" && hours !== 12) hours += 12;
  if (selectedPeriod === "am" && hours === 12) hours = 0;

  return { hours, minutes };
}

export function combineDateAndTime(date: Date | null, time: string, period: TimePeriod) {
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

function stepTimeValue(value: string, period: TimePeriod, minutes: number) {
  const parsed = parseClockTime(value) ?? { hours: 8, minutes: 0 };
  const currentMinutes = (parsed.hours % 12) * 60 + parsed.minutes;
  const nextMinutes = (currentMinutes + minutes + 12 * 60) % (12 * 60);
  const nextHours = Math.floor(nextMinutes / 60) || 12;

  return {
    period,
    time: formatClockTime({ hours: nextHours, minutes: nextMinutes % 60 })
  };
}

function CalendarTimeControl({
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
  function stepTime(minutes: number) {
    const next = stepTimeValue(time, period, minutes);
    onTimeChange(next.time);
    onPeriodChange(next.period);
  }

  function normalizeTime() {
    const parsed = parseClockTime(time);
    if (!parsed) return;
    onTimeChange(formatClockTime(parsed));
    if (parsed.period) onPeriodChange(parsed.period);
  }

  function handleTimeChange(value: string) {
    onTimeChange(value);
    const parsed = parseClockTime(value);
    if (!parsed?.period) return;
    onTimeChange(formatClockTime(parsed));
    onPeriodChange(parsed.period);
  }

  return (
    <div className="grid w-full max-w-[172px] grid-cols-[94px_70px] gap-2">
      <div className="grid min-h-11 grid-cols-[1fr_24px] overflow-hidden rounded-[8px] border border-[#9f9f9f] bg-white transition focus-within:border-[#196c88] focus-within:ring-4 focus-within:ring-teal-100">
        <input
          aria-label={label}
          className="min-w-0 border-0 px-2 text-center text-xs text-[#4f4f4f] outline-none sm:text-[13px]"
          inputMode="text"
          onBlur={normalizeTime}
          onChange={(event) => handleTimeChange(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp") {
              event.preventDefault();
              stepTime(1);
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              stepTime(-1);
            }
          }}
          onMouseUp={(event) => event.preventDefault()}
          placeholder="8:00"
          spellCheck={false}
          value={time}
        />
        <div className="grid border-l border-[#d4e4e9]">
          <button
            aria-label={`Increase ${label}`}
            className="grid min-h-0 place-items-center text-[#196c88] transition hover:bg-[#e7f2f5]"
            onClick={() => stepTime(1)}
            type="button"
          >
            <ChevronUp size={13} strokeWidth={2.2} />
          </button>
          <button
            aria-label={`Decrease ${label}`}
            className="grid min-h-0 place-items-center border-t border-[#d4e4e9] text-[#196c88] transition hover:bg-[#e7f2f5]"
            onClick={() => stepTime(-1)}
            type="button"
          >
            <ChevronDown size={13} strokeWidth={2.2} />
          </button>
        </div>
      </div>
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

export function ScheduleServiceCalendar({
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
  title = "Schedule Service",
  variant = "range",
  startDate,
  startPeriod,
  startTime
}: {
  busy: boolean;
  currentEndDate?: Date | null;
  currentScheduleLabel?: string;
  currentStartDate?: Date | null;
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
  title?: string;
  variant?: "range" | "start";
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

  return (
    <div className={`${placement === "fixed" ? "fixed z-[90] bg-black/20" : "absolute z-30 bg-white/45"} inset-0 overflow-y-auto p-3 backdrop-blur-[1px]`}>
      <div className="flex min-h-full items-start justify-center py-3 sm:items-center">
        <div className="max-h-[calc(100dvh-48px)] w-full max-w-[620px] overflow-y-auto overflow-x-hidden rounded-[8px] border border-[#9fcbd8] bg-white p-4 shadow-[0_14px_45px_rgba(15,23,42,0.18)] sm:p-6">
          <div className="flex items-center justify-between gap-4 border-b border-[#b8d4dc] pb-4">
            <h2 className="text-[17px] font-semibold text-[#4f4f4f]">{title}</h2>
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
                            const currentTrail = dayInRange(date, currentStartDate ?? null, currentEndDate ?? null);
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
                <CalendarTimeControl
                    label="Start time"
                    onPeriodChange={onStartPeriodChange}
                    onTimeChange={onStartTimeChange}
                    period={startPeriod}
                    time={startTime}
                  />
                </div>
              </div>

              {variant === "range" ? <div>
                <p className="mb-2 text-sm font-semibold text-[#5e5e5e]">End Date</p>
                <div className="grid gap-3 min-[560px]:grid-cols-[minmax(0,1fr)_172px]">
                  <button
                  className={`min-h-11 truncate rounded-[8px] border px-3 text-xs transition sm:text-[13px] ${mode === "end" ? "border-[#196c88] bg-[#f2f8fa] text-[#196c88]" : "border-[#9f9f9f] bg-white text-[#4f4f4f]"}`}
                    onClick={() => onModeChange("end")}
                    type="button"
                  >
                    {formatDateLabel(endDate)}
                  </button>
                <CalendarTimeControl
                    label="End time"
                    onPeriodChange={onEndPeriodChange}
                    onTimeChange={onEndTimeChange}
                    period={endPeriod}
                    time={endTime}
                  />
                </div>
              </div> : null}

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
