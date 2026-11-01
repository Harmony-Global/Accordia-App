"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp, CreditCard, RotateCcw, Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DateRangeCalendar } from "@/components/schedule-service-calendar";
import { CustomSelect } from "@/components/ui";
import { useProfile } from "@/hooks/use-auth";
import { getClientCharges, getClientPaymentSummary, getClientRefunds, type ClientCharge, type ClientRefund, type ClientPaymentSummary } from "@/services/client-payment-service";
import type { PayoutFilter, PayoutPeriod } from "@/services/payout-service";

const initialFilter: PayoutFilter = { period: "today", page: 1 };
const periods: { value: PayoutPeriod; label: string }[] = [
  { value: "today", label: "Today" }, { value: "7d", label: "Last 7 Days" },
  { value: "14d", label: "Last 14 Days" }, { value: "30d", label: "Last 30 Days" },
  { value: "custom", label: "Custom Date Range" }
];
const money = (kobo: number) => `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (value: string) => new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
const one = <T,>(relation: T | T[] | null | undefined): T | null => Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
const title = (item: ClientCharge | ClientRefund["payment"]) => one(item.job)?.title ?? one(one(item.appointment)?.service)?.title ?? "Service";
const cardClass = "rounded-[7px] border border-[#d9e8ee] bg-white";

function DateFilter({ value, onChange }: { value: PayoutFilter; onChange: (value: PayoutFilter) => void }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
  return <div className="relative flex flex-wrap items-center justify-end gap-2">
    <CalendarDays aria-hidden="true" className="h-4 w-4 text-[#196c88]" />
    <CustomSelect aria-label="Date range" className="min-w-[170px]" id={id} triggerClassName="h-10 rounded-[5px] border-[#d9e8ee] py-2" value={value.period} onChange={(event) => {
      const period = event.target.value as PayoutPeriod;
      if (period === "custom") setOpen(true);
      else { setOpen(false); onChange({ period, page: 1 }); }
    }}>{periods.map((period) => <option key={period.value} value={period.value}>{period.label}</option>)}</CustomSelect>
    {value.period === "custom" && value.from && value.to ? <button className="text-xs text-[#196c88] underline" onClick={() => setOpen(true)} type="button">{value.from} to {value.to}</button> : null}
    {open ? <><button aria-label="Dismiss date range calendar" className="fixed inset-0 z-[95] bg-black/25 sm:bg-transparent" onClick={() => setOpen(false)} type="button" /><div className="fixed inset-x-3 top-1/2 z-[100] mx-auto max-w-[360px] -translate-y-1/2 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[360px] sm:translate-y-0"><DateRangeCalendar from={value.from} to={value.to} onApply={(from, to) => { onChange({ period: "custom", from, to, page: 1 }); setOpen(false); }} onClose={() => setOpen(false)} /></div></> : null}
  </div>;
}

function HistorySkeleton({ columns }: { columns: number }) {
  return <div aria-label="Loading payment history" className="animate-pulse" role="status">{Array.from({ length: 5 }, (_, row) => <div className="grid gap-4 border-t border-[#edf0f2] px-5 py-5" key={row} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>{Array.from({ length: columns }, (_, column) => <div className="h-3 rounded bg-[#e7eff2]" key={column} />)}</div>)}</div>;
}

function EmptyHistory({ kind }: { kind: "payment" | "refund" }) {
  return <div className="flex min-h-64 flex-col items-center justify-center px-5 py-8 text-center"><Image alt="" className="h-28 w-32 object-contain" height={112} src="/images/payouts/Empty-State-No-User-Found-1%20Streamline%20Milano.svg" width={128} /><h3 className="mt-3 text-lg text-[#5e5e5e]">No {kind === "payment" ? "payments" : "refunds"} yet</h3><p className="mt-1 text-sm text-[#777]">No records match this date range.</p></div>;
}

function Pagination({ filter, total, onChange }: { filter: PayoutFilter; total: number; onChange: (value: PayoutFilter) => void }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f2] px-5 py-4 text-xs text-[#777]"><span>Showing {total ? (filter.page - 1) * 10 + 1 : 0}–{Math.min(filter.page * 10, total)} of {total}</span>{total > 10 ? <div className="flex gap-2"><button className="rounded border px-2 py-1 disabled:opacity-40" disabled={filter.page === 1} onClick={() => onChange({ ...filter, page: filter.page - 1 })} type="button">Previous</button><button className="rounded border px-2 py-1 disabled:opacity-40" disabled={filter.page * 10 >= total} onClick={() => onChange({ ...filter, page: filter.page + 1 })} type="button">Next</button></div> : null}</div>;
}

export default function ClientPaymentsPage() {
  const { token } = useProfile();
  const [tab, setTab] = useState<"history" | "refund" | "method">("history");
  const [summary, setSummary] = useState<ClientPaymentSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const [charges, setCharges] = useState<ClientCharge[]>([]);
  const [refunds, setRefunds] = useState<ClientRefund[]>([]);
  const [chargesTotal, setChargesTotal] = useState(0);
  const [refundsTotal, setRefundsTotal] = useState(0);
  const [chargesFilter, setChargesFilter] = useState<PayoutFilter>(initialFilter);
  const [refundsFilter, setRefundsFilter] = useState<PayoutFilter>(initialFilter);
  const [chargesLoading, setChargesLoading] = useState(true);
  const [refundsLoading, setRefundsLoading] = useState(true);
  const [chargesError, setChargesError] = useState("");
  const [refundsError, setRefundsError] = useState("");
  const [chargesOpen, setChargesOpen] = useState(true);
  const [refundsOpen, setRefundsOpen] = useState(true);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setSummaryLoading(true);
    getClientPaymentSummary(token).then((result) => { if (active) setSummary(result.summary); })
      .catch((error) => { if (active) setSummaryError(error instanceof Error ? error.message : "Could not load payment total."); })
      .finally(() => { if (active) setSummaryLoading(false); });
    return () => { active = false; };
  }, [token]);
  useEffect(() => {
    if (!token || (chargesFilter.period === "custom" && (!chargesFilter.from || !chargesFilter.to))) return;
    let active = true;
    setChargesLoading(true); setChargesError("");
    getClientCharges(token, chargesFilter).then((result) => { if (active) { setCharges(result.charges); setChargesTotal(result.total); } })
      .catch((error) => { if (active) setChargesError(error instanceof Error ? error.message : "Could not load payments."); })
      .finally(() => { if (active) setChargesLoading(false); });
    return () => { active = false; };
  }, [token, chargesFilter]);
  useEffect(() => {
    if (!token || (refundsFilter.period === "custom" && (!refundsFilter.from || !refundsFilter.to))) return;
    let active = true;
    setRefundsLoading(true); setRefundsError("");
    getClientRefunds(token, refundsFilter).then((result) => { if (active) { setRefunds(result.refunds); setRefundsTotal(result.total); } })
      .catch((error) => { if (active) setRefundsError(error instanceof Error ? error.message : "Could not load refunds."); })
      .finally(() => { if (active) setRefundsLoading(false); });
    return () => { active = false; };
  }, [token, refundsFilter]);

  return <AppShell><main className="mx-auto w-full max-w-[1320px] px-5 pb-14 pt-10 sm:px-8">
    <p className="text-lg text-[#196c88]">Payment History</p>
    <h1 className="mt-4 text-2xl font-normal leading-tight text-[#626262] sm:text-3xl">Keep track of your payments and manage your payment methods.</h1>
    <div aria-label="Payment views" className="mt-7 flex gap-5 overflow-x-auto border-b border-[#d9e8ee] sm:gap-9" role="tablist">
      {([ ["history", "Payment History"], ["refund", "Refund Info"], ["method", "Payment method"] ] as const).map(([value, label]) => <button aria-selected={tab === value} className={`shrink-0 border-b-2 pb-3 text-sm sm:text-base ${tab === value ? "border-[#196c88] text-[#196c88]" : "border-transparent text-[#626262]"}`} key={value} onClick={() => setTab(value)} role="tab" type="button">{label}</button>)}
    </div>
    {tab === "history" ? <div className="mt-7 space-y-6">
      <section className="rounded-[7px] border border-[#bdd9e4] bg-[#f0f6f8] p-6 sm:p-8"><div className="flex justify-between"><p className="text-sm text-[#626262]">Total Paid Out</p><Wallet aria-hidden="true" className="h-5 w-5 text-[#196c88]" /></div>{summaryLoading ? <div className="mt-4 h-10 w-56 animate-pulse rounded bg-[#dce8ed]" /> : summaryError ? <p className="mt-4 text-sm text-red-700" role="alert">{summaryError}</p> : <p className="mt-4 text-3xl text-[#196c88]">{money(summary?.total_kobo ?? 0)}</p>}<p className="mt-3 text-xs text-[#777]">Verified payments for completed work, less processed refunds.</p></section>
      <section className={cardClass}><div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6"><div><h2 className="text-xl text-[#34494f]">Payment history</h2><p className="mt-1 text-xs text-[#777]">Original charges, including payments for work still in progress.</p></div><DateFilter value={chargesFilter} onChange={(value) => { setChargesLoading(true); setChargesFilter(value); }} /></div>{chargesOpen ? chargesLoading ? <HistorySkeleton columns={5} /> : chargesError ? <p className="p-8 text-sm text-red-700" role="alert">{chargesError}</p> : charges.length ? <><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-[#f6f9fa] text-xs text-[#777]"><tr>{["Date", "Service", "Payment Type", "Amount", "Status"].map((heading) => <th className="px-5 py-4 font-normal" key={heading}>{heading}</th>)}</tr></thead><tbody>{charges.map((charge) => <tr className="border-t border-[#edf0f2]" key={charge.id}><td className="px-5 py-4">{date(charge.paid_at)}</td><td className="px-5 py-4 font-medium text-[#34494f]">{title(charge)}<Link className="mt-1 block text-xs font-normal text-[#196c88] underline" href={`/payment/receipt?reference=${encodeURIComponent(charge.provider_reference)}`}>View receipt</Link></td><td className="px-5 py-4">{charge.payment_type === "job_upfront" ? "Job upfront" : charge.payment_type === "job_final" ? "Job final" : "Appointment"}</td><td className="px-5 py-4">{money(Math.round(Number(charge.amount) * 100))}</td><td className="px-5 py-4 text-emerald-700">Paid</td></tr>)}</tbody></table></div><Pagination filter={chargesFilter} total={chargesTotal} onChange={setChargesFilter} /></> : <EmptyHistory kind="payment" /> : null}<div className="flex justify-end p-4"><button aria-label={chargesOpen ? "Collapse payment history" : "Expand payment history"} className="rounded-full border border-[#196c88] p-2 text-[#196c88]" onClick={() => setChargesOpen(!chargesOpen)} type="button">{chargesOpen ? <ChevronUp size={19} /> : <ChevronDown size={19} />}</button></div></section>
      <section className={cardClass}><div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6"><div><h2 className="text-xl text-[#34494f]">Refund history</h2><p className="mt-1 text-xs text-[#777]">Refunds recorded by Paystack.</p></div><DateFilter value={refundsFilter} onChange={(value) => { setRefundsLoading(true); setRefundsFilter(value); }} /></div>{refundsOpen ? refundsLoading ? <HistorySkeleton columns={4} /> : refundsError ? <p className="p-8 text-sm text-red-700" role="alert">{refundsError}</p> : refunds.length ? <><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-[#f6f9fa] text-xs text-[#777]"><tr>{["Date", "Service", "Refund Amount", "Status"].map((heading) => <th className="px-5 py-4 font-normal" key={heading}>{heading}</th>)}</tr></thead><tbody>{refunds.map((refund) => <tr className="border-t border-[#edf0f2]" key={refund.id}><td className="px-5 py-4">{date(refund.initiated_at)}</td><td className="px-5 py-4 font-medium text-[#34494f]">{title(refund.payment)}</td><td className="px-5 py-4">{money(refund.amount_kobo)}</td><td className={`px-5 py-4 ${refund.status === "processed" ? "text-emerald-700" : refund.status === "failed" ? "text-red-700" : "text-amber-600"}`}>{refund.status === "processed" ? "Processed" : refund.status === "needs-attention" ? "Needs attention" : refund.status.charAt(0).toUpperCase() + refund.status.slice(1)}</td></tr>)}</tbody></table></div><Pagination filter={refundsFilter} total={refundsTotal} onChange={setRefundsFilter} /></> : <EmptyHistory kind="refund" /> : null}<div className="flex justify-end p-4"><button aria-label={refundsOpen ? "Collapse refund history" : "Expand refund history"} className="rounded-full border border-[#196c88] p-2 text-[#196c88]" onClick={() => setRefundsOpen(!refundsOpen)} type="button">{refundsOpen ? <ChevronUp size={19} /> : <ChevronDown size={19} />}</button></div></section>
    </div> : null}
    {tab === "refund" ? <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]"><section className={`${cardClass} p-6 sm:p-8`}><RotateCcw className="h-6 w-6 text-[#196c88]" /><h2 className="mt-4 text-xl text-[#34494f]">Refund Info</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#626262]">Refunds are handled through the original payment method by Paystack. Accordia support can help with a payment or refund question; no bank details are needed here unless Paystack specifically requests them.</p><a className="mt-6 inline-block text-sm font-medium text-[#196c88] underline" href="mailto:support@accordia.app">Contact support</a></section><aside className={`${cardClass} p-6`}><h3 className="text-base text-[#34494f]">Your refund history</h3><p className="mt-3 text-sm leading-6 text-[#777]">The Payment History tab shows each original charge and any Paystack refund separately.</p><button className="mt-4 text-sm text-[#196c88] underline" onClick={() => setTab("history")} type="button">View history</button></aside></div> : null}
    {tab === "method" ? <section className={`${cardClass} mt-7 p-6 sm:p-8`}><CreditCard className="h-6 w-6 text-[#196c88]" /><h2 className="mt-4 text-xl text-[#34494f]">Payment method</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#626262]">Choose your payment method when completing a job or appointment payment in Paystack Checkout. Accordia does not collect or store your card number or security code.</p></section> : null}
    <footer className="mt-8 flex flex-wrap justify-between gap-3 border-t border-[#d9e8ee] pt-5 text-xs text-[#777]"><span>Have a question about payment? <a className="text-[#196c88]" href="mailto:support@accordia.app">Contact support</a></span><span>All amounts are in Nigerian naira (NGN)</span></footer>
  </main></AppShell>;
}
