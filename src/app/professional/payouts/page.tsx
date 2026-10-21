"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp, Landmark, Printer, Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DateRangeCalendar } from "@/components/schedule-service-calendar";
import { CustomSelect } from "@/components/ui";
import { useProfile } from "@/hooks/use-auth";
import { getEarnings, getPayoutBanks, getPayoutDestination, getPayoutHistory, getPayoutStatement, getPayoutSummary, savePayoutDestination, type Earning, type Payout, type PayoutBank, type PayoutDestination, type PayoutFilter, type PayoutMetrics, type PayoutPeriod } from "@/services/payout-service";

const formatMoney = (kobo: number) => `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (value: string) => new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
const initialFilter: PayoutFilter = { period: "today", page: 1 };
const periods: { label: string; value: PayoutPeriod }[] = [{ label: "Today", value: "today" }, { label: "Last 7 Days", value: "7d" }, { label: "Last 14 Days", value: "14d" }, { label: "Last 30 Days", value: "30d" }, { label: "Custom Date Range", value: "custom" }];
const inputClass = "h-12 w-full rounded-[5px] border border-[#d8e3e8] bg-white px-4 text-sm outline-none focus:border-[#196c88]";
const cardClass = "rounded-[7px] border border-[#d9e8ee] bg-white";

function DateFilter({ value, onChange }: { value: PayoutFilter; onChange: (value: PayoutFilter) => void }) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const selectId = useId();

  useEffect(() => {
    if (!calendarOpen) return;
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") setCalendarOpen(false); }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [calendarOpen]);

  function closeCalendar() {
    setCalendarOpen(false);
    document.getElementById(selectId)?.focus();
  }

  return <div className="relative flex flex-wrap items-center justify-end gap-2">
    <CalendarDays aria-hidden="true" className="h-4 w-4 text-[#196c88]" />
    <CustomSelect aria-label="Date range" className="min-w-[170px]" id={selectId} triggerClassName="h-10 rounded-[5px] border-[#d9e8ee] py-2" value={value.period} onChange={(event) => { const period = event.target.value as PayoutPeriod; if (period === "custom") setCalendarOpen(true); else { setCalendarOpen(false); onChange({ period, page: 1 }); } }}>{periods.map((period) => <option key={period.value} value={period.value}>{period.label}</option>)}</CustomSelect>
    {value.period === "custom" && value.from && value.to ? <button className="text-xs text-[#196c88] underline" onClick={() => setCalendarOpen(true)} type="button">{formatDate(`${value.from}T12:00:00Z`)} – {formatDate(`${value.to}T12:00:00Z`)}</button> : null}
    {calendarOpen ? <><button aria-label="Dismiss date range calendar" className="fixed inset-0 z-[95] bg-black/25 sm:bg-transparent" onClick={closeCalendar} type="button" /><div className="fixed inset-x-3 top-1/2 z-[100] mx-auto max-w-[360px] -translate-y-1/2 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[360px] sm:translate-y-0"><DateRangeCalendar from={value.from} to={value.to} onApply={(from, to) => { onChange({ period: "custom", from, to, page: 1 }); closeCalendar(); }} onClose={closeCalendar} /></div></> : null}
  </div>;
}

function Pagination({ page, total, size, onChange }: { page: number; total: number; size: number; onChange: (page: number) => void }) {
  if (total <= size) return <span className="text-xs text-[#777]">Showing {total} of {total}</span>;
  return <div className="flex items-center gap-2 text-xs text-[#777]"><span>Showing {(page - 1) * size + 1}–{Math.min(page * size, total)} of {total}</span><button className="rounded border px-2 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button><button className="rounded border px-2 py-1 disabled:opacity-40" disabled={page * size >= total} onClick={() => onChange(page + 1)}>Next</button></div>;
}

function EmptyHistory({ type }: { type: "payout" | "earning" }) {
  return <div className="flex min-h-72 flex-col items-center justify-center px-5 py-10 text-center"><Image alt="" className="h-28 w-32 object-contain" height={112} src="/images/payouts/Empty-State-No-User-Found-1%20Streamline%20Milano.svg" width={128} /><h3 className="mt-4 text-lg text-[#5e5e5e]">No {type === "payout" ? "payouts" : "earnings"} yet</h3><p className="mt-1 text-sm text-[#777]">No records match this date range.</p><Link className="mt-4 rounded-[5px] bg-[#196c88] px-4 py-2 text-sm text-white" href="/professional/jobs">Find Service Request</Link></div>;
}

function HistorySkeleton({ columns }: { columns: number }) {
  return <div aria-label="Loading history" className="animate-pulse" role="status"><div className="grid gap-4 bg-[#f6f9fa] px-5 py-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>{Array.from({ length: columns }, (_, index) => <div className="h-3 rounded bg-[#dce8ed]" key={index} />)}</div>{Array.from({ length: 4 }, (_, row) => <div className="grid gap-4 border-t border-[#edf0f2] px-5 py-5" key={row} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>{Array.from({ length: columns }, (_, column) => <div className="h-3 rounded bg-[#e7eff2]" key={column} />)}</div>)}<div className="flex justify-between border-t px-5 py-5"><div className="h-3 w-28 rounded bg-[#e7eff2]" /><div className="h-3 w-24 rounded bg-[#e7eff2]" /></div></div>;
}

export default function ProfessionalPayoutsPage() {
  const { token, profile } = useProfile();
  const [tab, setTab] = useState<"history" | "info">("history");
  const [summary, setSummary] = useState<PayoutMetrics | null>(null);
  const [cutoff, setCutoff] = useState("");
  const [eligibleKobo, setEligibleKobo] = useState(0);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [earningsTotal, setEarningsTotal] = useState(0);
  const [payoutsTotal, setPayoutsTotal] = useState(0);
  const [earnedMetrics, setEarnedMetrics] = useState<PayoutMetrics | null>(null);
  const [earningsFilter, setEarningsFilter] = useState<PayoutFilter>(initialFilter);
  const [payoutsFilter, setPayoutsFilter] = useState<PayoutFilter>(initialFilter);
  const [earningsOpen, setEarningsOpen] = useState(true);
  const [payoutsOpen, setPayoutsOpen] = useState(true);
  const [destination, setDestination] = useState<PayoutDestination | null>(null);
  const [banks, setBanks] = useState<PayoutBank[]>([]);
  const [holderName, setHolderName] = useState("");
  const [email, setEmail] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [payoutsLoading, setPayoutsLoading] = useState(true);
  const [earningsError, setEarningsError] = useState("");
  const [payoutsError, setPayoutsError] = useState("");
  const [message, setMessage] = useState("");

  const refreshOverview = useCallback(async () => {
    if (!token) return;
    const [overview, info] = await Promise.all([getPayoutSummary(token), getPayoutDestination(token)]);
    setSummary(overview.summary); setEligibleKobo(overview.eligible_kobo); setCutoff(overview.next_cutoff_at); setDestination(info.destination);
    if (info.destination) { setHolderName(info.destination.holder_name); setEmail(info.destination.notification_email); setBankCode(info.destination.bank_code); }
    else if (profile) { setHolderName(`${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()); setEmail(profile.email ?? ""); }
  }, [token, profile]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    Promise.all([getPayoutSummary(token), getPayoutDestination(token)]).then(([overview, info]) => {
      if (!active) return;
      setSummary(overview.summary); setEligibleKobo(overview.eligible_kobo); setCutoff(overview.next_cutoff_at); setDestination(info.destination);
      setHolderName(info.destination?.holder_name ?? `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim());
      setEmail(info.destination?.notification_email ?? profile?.email ?? ""); setBankCode(info.destination?.bank_code ?? "");
    }).catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "Could not load payout details."); }).finally(() => { if (active) setLoading(false); });
    getPayoutBanks(token).then((bankList) => { if (active) setBanks(bankList.banks); }).catch(() => { if (active) setMessage("Bank list is temporarily unavailable. Earnings history remains available."); });
    return () => { active = false; };
  }, [token, profile?.first_name, profile?.last_name, profile?.email]);

  useEffect(() => {
    if (!token) return;
    if (earningsFilter.period === "custom" && (!earningsFilter.from || !earningsFilter.to)) { setEarningsLoading(false); return; }
    let active = true;
    setEarningsLoading(true);
    setEarningsError("");
    getEarnings(token, earningsFilter).then((data) => { if (active) { setEarnings(data.earnings); setEarningsTotal(data.total); setEarnedMetrics(data.metrics); } }).catch((error) => { if (active) setEarningsError(error instanceof Error ? error.message : "Could not load earnings."); }).finally(() => { if (active) setEarningsLoading(false); });
    return () => { active = false; };
  }, [token, earningsFilter]);
  useEffect(() => {
    if (!token) return;
    if (payoutsFilter.period === "custom" && (!payoutsFilter.from || !payoutsFilter.to)) { setPayoutsLoading(false); return; }
    let active = true;
    setPayoutsLoading(true);
    setPayoutsError("");
    getPayoutHistory(token, payoutsFilter).then((data) => { if (active) { setPayouts(data.payouts); setPayoutsTotal(data.total); } }).catch((error) => { if (active) setPayoutsError(error instanceof Error ? error.message : "Could not load payouts."); }).finally(() => { if (active) setPayoutsLoading(false); });
    return () => { active = false; };
  }, [token, payoutsFilter]);

  function updateEarningsFilter(value: PayoutFilter) {
    setEarningsLoading(value.period !== "custom" || Boolean(value.from && value.to));
    setEarningsFilter(value);
  }

  function updatePayoutsFilter(value: PayoutFilter) {
    setPayoutsLoading(value.period !== "custom" || Boolean(value.from && value.to));
    setPayoutsFilter(value);
  }

  async function saveDestination(event: React.FormEvent) {
    event.preventDefault(); if (!token) return;
    if (!bankCode) { setMessage("Select a bank before saving payout details."); return; }
    setBusy(true); setMessage("");
    try { const result = await savePayoutDestination(token, { holder_name: holderName, notification_email: email, bank_code: bankCode, account_number: accountNumber }); await refreshOverview(); setAccountNumber(""); setMessage(result.review_required ? "Bank details saved. An admin must review the account name before payouts can use it." : "Payout destination saved."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not save payout destination."); }
    finally { setBusy(false); }
  }
  async function printStatement(id: string) {
    if (!token) return;
    try { const html = await getPayoutStatement(token, id); const tab = window.open("", "_blank"); if (!tab) throw new Error("Allow pop-ups to print the statement."); tab.document.write(html); tab.document.close(); tab.focus(); tab.print(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not open payout statement."); }
  }

  return <AppShell><main className="mx-auto w-full max-w-[1320px] px-5 pb-14 pt-10 sm:px-8">
    <p className="text-lg text-[#196c88]">Earnings &amp; Payout</p><h1 className="mt-3 max-w-5xl text-2xl font-normal text-[#626262] sm:text-4xl">Keep track of your earnings, manage your payout details and payment methods.</h1>
    <div className="mt-7 flex gap-7 overflow-x-auto border-b border-[#d9e8ee] text-sm sm:text-base"><button className={`shrink-0 pb-3 ${tab === "history" ? "border-b-2 border-[#196c88] text-[#196c88]" : "text-[#606060]"}`} onClick={() => setTab("history")}>Payout History/Earning History</button><button className={`shrink-0 pb-3 ${tab === "info" ? "border-b-2 border-[#196c88] text-[#196c88]" : "text-[#606060]"}`} onClick={() => setTab("info")}>Payout Info</button></div>
    {message ? <div aria-live="polite" className="mt-5 rounded-[5px] border border-[#d9e8ee] bg-[#f4f9fa] px-4 py-3 text-sm">{message}</div> : null}
    {loading ? <div className="mt-8 grid gap-5 sm:grid-cols-2"><div className="h-40 animate-pulse rounded bg-[#edf3f5]" /><div className="h-40 animate-pulse rounded bg-[#edf3f5]" /><div className="h-72 animate-pulse rounded bg-[#edf3f5] sm:col-span-2" /></div> : tab === "history" ? <div className="mt-7 space-y-7">
      <div className="grid gap-5 sm:grid-cols-2"><div className={`${cardClass} bg-[#f0f6f8] p-5 sm:p-6`}><div className="flex justify-between text-sm text-[#636363]"><span>Total Earnings</span><Wallet className="h-5 w-5 text-[#196c88]" /></div><strong className="mt-4 block text-3xl font-normal text-[#196c88]">{formatMoney(summary?.total_net_kobo ?? 0)}</strong><p className="mt-3 text-xs text-[#777]">Net earnings after the 10% service fee.</p></div><div className={`${cardClass} p-5 sm:p-6`}><div className="flex justify-between text-sm text-[#636363]"><span>Total Paid Out</span><Landmark className="h-5 w-5 text-[#196c88]" /></div><strong className="mt-4 block text-3xl font-normal text-[#34494f]">{formatMoney(summary?.total_paid_out_kobo ?? 0)}</strong><p className="mt-3 text-xs text-[#777]">Confirmed transfers to your bank account.</p></div></div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[5px] bg-[#f0f6f8] px-4 py-3 text-sm text-[#405760]"><span className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-[#196c88]" />Next Friday 00:00 Lagos cutoff: {cutoff ? formatDate(cutoff) : "—"}. Eligible from prior cutoffs: {formatMoney(eligibleKobo)}. Payouts are reviewed manually.</span><button className="font-medium text-[#196c88]" onClick={() => setTab("info")}>View payout info</button></div>
      <section className={cardClass}><div className="flex flex-wrap items-center justify-between gap-3 p-5"><div><h2 className="text-xl text-[#34494f]">Payout history</h2><p className="mt-1 text-xs text-[#777]">Verified transfers to your payout account.</p></div><DateFilter value={payoutsFilter} onChange={updatePayoutsFilter} /></div>{payoutsOpen ? payoutsLoading ? <HistorySkeleton columns={5} /> : payoutsFilter.period === "custom" && (!payoutsFilter.from || !payoutsFilter.to) ? <p className="px-5 py-12 text-center text-sm text-[#777]">Select both dates to view history.</p> : payoutsError ? <p className="px-5 py-12 text-center text-sm text-red-700" role="alert">{payoutsError}</p> : payouts.length ? <><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#f6f9fa] text-xs text-[#777]"><tr>{["Date", "Payout ID", "Total Amount Paid", "Status", "Receipt / Invoice"].map((label) => <th className="px-5 py-4 font-normal" key={label}>{label}</th>)}</tr></thead><tbody>{payouts.map((payout) => <tr className="border-t border-[#edf0f2]" key={payout.id}><td className="px-5 py-4">{formatDate(payout.display_at)}</td><td className="px-5 py-4">{payout.provider_reference}</td><td className="px-5 py-4">{formatMoney(payout.amount_kobo)}</td><td className={`px-5 py-4 ${payout.status === "success" ? "text-emerald-700" : "text-amber-600"}`}>{payout.status === "success" ? "Completed" : payout.status}</td><td className="px-5 py-4">{payout.status === "success" ? <button className="inline-flex items-center gap-2 text-[#196c88]" onClick={() => void printStatement(payout.id)}><Printer className="h-4 w-4" />Print statement</button> : "—"}</td></tr>)}</tbody></table></div><div className="flex flex-wrap items-center justify-between gap-2 border-t p-5"><Pagination page={payoutsFilter.page} total={payoutsTotal} size={10} onChange={(page) => updatePayoutsFilter({ ...payoutsFilter, page })} /><span className="text-xs text-emerald-700">Confirmed payouts only count toward Total Paid Out</span></div></> : <EmptyHistory type="payout" /> : null}<div className="flex justify-end p-4"><button aria-label={payoutsOpen ? "Collapse payout history" : "Expand payout history"} className="rounded-full border border-[#196c88] p-2 text-[#196c88]" onClick={() => setPayoutsOpen(!payoutsOpen)}>{payoutsOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</button></div></section>
      <section className={cardClass}><div className="flex flex-wrap items-center justify-between gap-3 p-5"><div><h2 className="text-xl text-[#34494f]">Earnings history</h2><p className="mt-1 text-xs text-[#777]">Earnings from completed, paid work.</p></div><DateFilter value={earningsFilter} onChange={updateEarningsFilter} /></div>{earningsOpen ? earningsLoading ? <HistorySkeleton columns={6} /> : earningsFilter.period === "custom" && (!earningsFilter.from || !earningsFilter.to) ? <p className="px-5 py-12 text-center text-sm text-[#777]">Select both dates to view history.</p> : earningsError ? <p className="px-5 py-12 text-center text-sm text-red-700" role="alert">{earningsError}</p> : earnings.length ? <><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-[#f6f9fa] text-xs text-[#777]"><tr>{["Date", "Services", "Gross Amount", "Service Fee", "Net Earnings", "Status"].map((label) => <th className="px-5 py-4 font-normal" key={label}>{label}</th>)}</tr></thead><tbody>{earnings.map((earning) => <tr className="border-t border-[#edf0f2]" key={earning.id}><td className="px-5 py-4">{formatDate(earning.earned_at)}</td><td className="px-5 py-4 font-medium">{earning.title}</td><td className="px-5 py-4">{formatMoney(earning.gross_kobo)}</td><td className="px-5 py-4">{formatMoney(earning.fee_kobo)}</td><td className="px-5 py-4">{formatMoney(earning.net_kobo)}</td><td className="px-5 py-4">{earning.hold_reason ? "On hold" : earning.status === "paid_out" ? "Paid out" : earning.status === "partially_paid" ? "Partially paid" : "Pending"}</td></tr>)}</tbody></table></div><div className="flex flex-wrap items-center justify-between gap-2 border-t p-5"><Pagination page={earningsFilter.page} total={earningsTotal} size={10} onChange={(page) => updateEarningsFilter({ ...earningsFilter, page })} /><span className="rounded bg-[#f3fbf8] px-2 py-1 text-xs text-emerald-700">{earnedMetrics?.paid_earnings_count ?? 0}/{earnedMetrics?.total_earnings_count ?? 0} earnings fully paid out</span></div></> : <EmptyHistory type="earning" /> : null}<div className="flex justify-end p-4"><button aria-label={earningsOpen ? "Collapse earnings history" : "Expand earnings history"} className="rounded-full border border-[#196c88] p-2 text-[#196c88]" onClick={() => setEarningsOpen(!earningsOpen)}>{earningsOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</button></div></section>
    </div> : <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(270px,1fr)]"><form className={`${cardClass} p-5 sm:p-8`} onSubmit={(event) => void saveDestination(event)}><h2 className="text-xl text-[#34494f]">Your payout details</h2><p className="mt-2 text-sm text-[#777]">Tell us where to send your earnings. Use a bank account in your own name.</p><h3 className="mt-8 text-sm font-medium text-[#196c88]">Account holder</h3><div className="mt-5 grid gap-5 sm:grid-cols-2"><label className="text-sm">Account holder’s full name<input className={`${inputClass} mt-2`} required value={holderName} onChange={(event) => setHolderName(event.target.value)} /></label><label className="text-sm">Payout notification email<input className={`${inputClass} mt-2`} required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label></div><p className="mt-3 text-xs text-[#777]">Your account holder name must match the name registered with your bank.</p><div className="my-7 border-t border-[#d9e8ee]" /><h3 className="text-sm font-medium text-[#196c88]">Bank account details</h3><div className="mt-5 grid gap-5 sm:grid-cols-2"><label className="text-sm">Bank country<input className={`${inputClass} mt-2`} readOnly value="Nigeria" /></label><label className="text-sm">Payout currency<input className={`${inputClass} mt-2`} readOnly value="NGN — Nigerian naira" /></label><label className="text-sm">Bank name<CustomSelect className="mt-2" triggerClassName="h-12 rounded-[5px] border-[#d8e3e8] px-4 py-2" searchable required value={bankCode} onChange={(event) => setBankCode(event.target.value)}><option value="">Select bank</option>{banks.map((bank) => <option key={bank.code} value={bank.code}>{bank.name}</option>)}</CustomSelect></label><label className="text-sm">Account number<input className={`${inputClass} mt-2`} inputMode="numeric" maxLength={10} minLength={10} pattern="[0-9]{10}" placeholder={destination ? `•••• ${destination.account_last4} (leave blank if unchanged)` : "Enter account number"} required={!destination} value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} /></label></div>{destination ? <p className="mt-4 text-sm text-[#196c88]">{destination.resolved_name} · {destination.status === "verified" ? "Verified" : "Pending admin review"}</p> : null}<div className="mt-6 rounded-[5px] bg-[#f5f9fa] p-4 text-xs text-[#666]">Bank details are used only for payouts and are not shown to clients. Changing your bank pauses unpaid earnings until admin review.</div><div className="mt-6 flex flex-wrap items-center justify-between gap-4"><span className="text-xs text-[#777]">Changes can be made later.</span><button className="rounded-[5px] bg-[#196c88] px-5 py-3 text-sm text-white disabled:opacity-50" disabled={busy} type="submit">{busy ? "Saving..." : "Save payout details"}</button></div></form><aside className="space-y-5"><div className={`${cardClass} p-5`}><h3 className="text-base">Payment Destination</h3>{destination ? <><div className="mt-5 flex items-center gap-3"><Landmark className="h-9 w-9 rounded bg-[#f1f7f9] p-2 text-[#196c88]" /><div><p>{destination.bank_name} •••• {destination.account_last4}</p><p className="text-xs text-[#777]">{destination.resolved_name} · NGN</p></div></div><p className="mt-4 text-xs text-[#777]">{destination.status === "verified" ? "Verified" : "Awaiting admin review"} · Updated {formatDate(destination.updated_at)}</p></> : <div className="py-5 text-center"><Image alt="" className="mx-auto h-24 w-28 object-contain" height={96} src="/images/payouts/Card-Hand-1%20Streamline%20Ux.svg" width={112} /><p className="mt-2 text-sm text-[#777]">Payout details not added yet</p></div>}</div><div className={`${cardClass} bg-[#f6f9fa] p-5`}><CalendarDays className="h-5 w-5 text-[#196c88]" /><h3 className="mt-3 font-medium">When will I get paid?</h3><p className="mt-3 text-sm text-[#777]">Friday 00:00 Africa/Lagos is the eligibility cutoff. Transfers are reviewed and sent manually; this is not a guaranteed payout or bank-arrival time.</p></div><div className={`${cardClass} bg-[#f6f9fa] p-5`}><Landmark className="h-5 w-5 text-[#196c88]" /><h3 className="mt-3 font-medium">Updating your bank account</h3><p className="mt-3 text-sm text-[#777]">A bank change places unpaid earnings on hold until an admin reviews your destination.</p></div><p className="px-2 text-sm text-[#777]">Need help with your payout?<br /><a className="text-[#196c88]" href="mailto:support@accordia.app">Contact Accordia support →</a></p></aside></div>}
    <footer className="mt-8 flex flex-wrap justify-between gap-3 border-t border-[#d9e8ee] pt-5 text-xs text-[#777]"><span>Have a question about payment? <a className="text-[#196c88]" href="mailto:support@accordia.app">Contact support</a></span><span>All amounts are in Nigerian naira (NGN)</span></footer>
  </main></AppShell>;
}
