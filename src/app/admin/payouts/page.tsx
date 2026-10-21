"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useProfile } from "@/hooks/use-auth";
import { approvePayoutDestination, getAdminPayoutDestinations, getAdminPayoutExceptions, getAdminPayoutHistory, getAdminPayoutQueue, reconcilePayout, setEarningHold, type AdminDestination, type AdminException, type AdminQueueEarning, type Payout } from "@/services/payout-service";

const money = (kobo: number) => `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
const when = (iso: string) => new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium" }).format(new Date(iso));
type AdminPayout = Payout & { professional_id: string };

export default function AdminPayoutsPage() {
  const { token, profile, loading: profileLoading } = useProfile();
  const [view, setView] = useState<"queue" | "destinations" | "history" | "exceptions">("queue");
  const [queue, setQueue] = useState<AdminQueueEarning[]>([]);
  const [destinations, setDestinations] = useState<AdminDestination[]>([]);
  const [history, setHistory] = useState<AdminPayout[]>([]);
  const [exceptions, setExceptions] = useState<AdminException[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [cutoff, setCutoff] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [professional, setProfessional] = useState("");
  const [reference, setReference] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!token || profile?.role !== "admin") return;
    setLoading(true);
    try {
      const [q, d, h, e] = await Promise.all([getAdminPayoutQueue(token, page), getAdminPayoutDestinations(token), getAdminPayoutHistory(token), getAdminPayoutExceptions(token)]);
      setQueue(q.earnings); setHasMore(q.has_more); setCutoff(q.cutoff_at); setDestinations(d.destinations); setHistory(h.payouts); setExceptions(e.exceptions);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load payout workspace."); }
    finally { setLoading(false); }
  }, [token, profile?.role, page]);
  useEffect(() => { void load(); }, [load]);

  const selected = useMemo(() => queue.filter((item) => item.professional_id === professional), [queue, professional]);
  const destination = selected.find((item) => item.destination_id && item.destination_status === "verified")?.destination_id;
  const allocations = selected.map((item) => ({ id: item.earning_id, amount_kobo: Math.round(Number(amounts[item.earning_id] || 0) * 100) })).filter((item) => item.amount_kobo > 0);
  const allocated = allocations.reduce((sum, item) => sum + item.amount_kobo, 0);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true); setMessage("");
    try { await action(); setMessage(success); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Action failed."); }
    finally { setBusy(false); }
  }
  async function reconcile(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !destination || !allocations.length) return;
    setBusy(true); setMessage("");
    try {
      await reconcilePayout(token, { destination_id: destination, reference: reference.trim(), allocations });
      setMessage("Transfer verified against Paystack and recorded."); setReference(""); setAmounts({}); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not verify transfer."); }
    finally { setBusy(false); }
  }

  if (!profileLoading && profile?.role !== "admin") return <AppShell><main className="mx-auto max-w-5xl p-8"><h1 className="text-2xl">Admin access required</h1><Link className="text-[#196c88]" href="/dashboard">Return to dashboard</Link></main></AppShell>;
  return <AppShell><main className="mx-auto max-w-[1320px] px-5 py-10 sm:px-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[#196c88]">Admin · Payouts</p><h1 className="mt-2 text-2xl text-[#34494f]">Manual payout workspace</h1><p className="mt-2 text-sm text-[#777]">Accordia records a transfer only after Paystack verification. Transfers are still sent in the Paystack dashboard.</p></div><button className="rounded border border-[#196c88] px-4 py-2 text-sm text-[#196c88] disabled:opacity-50" disabled={loading} onClick={() => void load()}>Refresh</button></div>
    {message ? <div aria-live="polite" className="mt-5 rounded border border-[#d9e8ee] bg-[#f4f9fa] p-3 text-sm">{message}</div> : null}
    <div className="mt-7 flex gap-6 overflow-x-auto border-b border-[#d9e8ee]">{(["queue", "destinations", "history", "exceptions"] as const).map((item) => <button className={`shrink-0 pb-3 text-sm capitalize ${view === item ? "border-b-2 border-[#196c88] text-[#196c88]" : "text-[#666]"}`} key={item} onClick={() => setView(item)}>{item === "queue" ? "Eligible earnings" : item === "destinations" ? `Destination reviews (${destinations.length})` : item === "history" ? "Payout history" : `Exceptions (${exceptions.length})`}</button>)}</div>
    {loading ? <div className="mt-6 h-72 animate-pulse rounded bg-[#edf3f5]" /> : view === "queue" ? <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]"><section className="overflow-hidden rounded-[7px] border border-[#d9e8ee] bg-white"><div className="p-5"><h2 className="text-lg">Eligible earnings</h2><p className="mt-1 text-sm text-[#777]">Completed before Friday 00:00 Africa/Lagos, {cutoff ? when(cutoff) : ""}. Held rows require review.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-[#f6f9fa] text-xs"><tr>{["Professional / Service", "Earned", "Available", "Destination", "Hold"].map((label) => <th className="px-4 py-3 font-normal" key={label}>{label}</th>)}</tr></thead><tbody>{queue.map((item) => <tr className="border-t border-[#edf0f2]" key={item.earning_id}><td className="px-4 py-3"><strong className="font-medium">{item.professional_name}</strong><br /><span className="text-xs text-[#777]">{item.title}</span></td><td className="px-4 py-3">{when(item.earned_at)}</td><td className="px-4 py-3">{money(item.available_kobo)}</td><td className="px-4 py-3">{item.destination_status === "verified" ? `${item.bank_name} •••• ${item.account_last4}` : "Review required"}</td><td className="px-4 py-3">{item.hold_reason ? <><span className="block max-w-48 text-xs text-amber-700">{item.hold_reason}</span><button className="mt-1 text-xs text-[#196c88] disabled:opacity-50" disabled={busy} onClick={() => token && void run(() => setEarningHold(token, item.earning_id, null), "Hold released.")}>Release</button></> : <button className="text-xs text-[#196c88] disabled:opacity-50" disabled={busy} onClick={() => { const reason = window.prompt("Reason for payout hold"); if (reason?.trim() && token) void run(() => setEarningHold(token, item.earning_id, reason.trim()), "Earning placed on hold."); }}>Place hold</button>}</td></tr>)}</tbody></table></div>{queue.length === 0 ? <p className="p-8 text-center text-sm text-[#777]">No eligible earnings at this cutoff.</p> : null}<div className="flex justify-end gap-2 p-4 text-sm"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>{page}</span><button disabled={!hasMore} onClick={() => setPage(page + 1)}>Next</button></div></section><form className="self-start rounded-[7px] border border-[#d9e8ee] bg-white p-5" onSubmit={(event) => void reconcile(event)}><h2 className="text-lg">Record dashboard transfer</h2><p className="mt-2 text-sm text-[#777]">Enter the reference after sending a transfer in Paystack. Amount, recipient, currency and status are verified before recording it.</p><label className="mt-5 block text-sm">Professional<select className="mt-2 h-11 w-full rounded border border-[#d9e8ee] px-3" required value={professional} onChange={(event) => { setProfessional(event.target.value); setAmounts({}); }}><option value="">Select professional</option>{Array.from(new Map(queue.map((item) => [item.professional_id, item.professional_name])).entries()).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>{professional ? <div className="mt-4 space-y-3">{selected.map((item) => <label className="flex items-center justify-between gap-3 text-sm" key={item.earning_id}><span className="min-w-0 flex-1 truncate" title={item.title}>{item.title}<small className="block text-[#777]">Up to {money(item.available_kobo)}</small></span><input aria-label={`Allocation for ${item.title}`} className="w-28 rounded border border-[#d9e8ee] px-2 py-2" max={item.available_kobo / 100} min="0" step="0.01" type="number" value={amounts[item.earning_id] ?? ""} onChange={(event) => setAmounts({ ...amounts, [item.earning_id]: event.target.value })} /></label>)}</div> : null}<label className="mt-5 block text-sm">Paystack transfer reference<input className="mt-2 h-11 w-full rounded border border-[#d9e8ee] px-3" minLength={8} required value={reference} onChange={(event) => setReference(event.target.value)} /></label><p className="mt-4 text-sm">Allocated: <strong>{money(allocated)}</strong></p><button className="mt-5 w-full rounded bg-[#196c88] px-4 py-3 text-sm text-white disabled:opacity-50" disabled={busy || !destination || !allocations.length || selected.some((item) => allocations.some((allocation) => allocation.id === item.earning_id && (allocation.amount_kobo > item.available_kobo || item.hold_reason)))} type="submit">{busy ? "Verifying..." : "Verify and record transfer"}</button>{professional && !destination ? <p className="mt-2 text-xs text-amber-700">This professional needs an approved payout destination.</p> : null}</form></div> : null}
    {view === "destinations" ? <section className="mt-6 grid gap-4 md:grid-cols-2">{destinations.map((item) => <article className="rounded-[7px] border border-[#d9e8ee] bg-white p-5" key={item.id}><h2 className="font-medium">{item.professional ? `${item.professional.first_name} ${item.professional.last_name}` : item.professional_id}</h2><p className="mt-2 text-sm">{item.bank_name} •••• {item.account_last4}</p><p className="text-sm">Resolved name: {item.resolved_name}</p><p className="text-sm">Entered name: {item.holder_name}</p><p className="mt-2 text-xs text-[#777]">Updated {when(item.updated_at)}</p><button className="mt-4 rounded border border-[#196c88] px-4 py-2 text-sm text-[#196c88] disabled:opacity-50" disabled={busy} onClick={() => { if (token && window.confirm("Approve this verified bank destination and release bank-change holds?")) void run(() => approvePayoutDestination(token, item.id), "Destination approved."); }}>Approve destination</button></article>)}{destinations.length === 0 ? <p className="text-sm text-[#777]">No destinations awaiting review.</p> : null}</section> : null}
    {view === "history" ? <section className="mt-6 overflow-x-auto rounded-[7px] border border-[#d9e8ee] bg-white"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-[#f6f9fa]"><tr>{["Date", "Professional ID", "Reference", "Amount", "Status"].map((label) => <th className="px-4 py-3 font-normal" key={label}>{label}</th>)}</tr></thead><tbody>{history.map((item) => <tr className="border-t" key={item.id}><td className="px-4 py-3">{when(item.display_at)}</td><td className="px-4 py-3">{item.professional_id}</td><td className="px-4 py-3">{item.provider_reference}</td><td className="px-4 py-3">{money(item.amount_kobo)}</td><td className="px-4 py-3 capitalize">{item.status}</td></tr>)}</tbody></table>{history.length === 0 ? <p className="p-8 text-center text-sm text-[#777]">No transfers reconciled yet.</p> : null}</section> : null}
    {view === "exceptions" ? <section className="mt-6 space-y-3">{exceptions.map((item) => <article className="rounded-[7px] border border-[#d9e8ee] bg-white p-4 text-sm" key={item.id}><strong className="capitalize">{item.source_type} · {item.source_id ?? "Unknown"}</strong><p className="mt-1">{item.reason}</p><p className="mt-1 text-xs text-[#777]">{item.professional_id ?? "No professional linked"} · {when(item.created_at)}</p></article>)}{exceptions.length === 0 ? <p className="text-sm text-[#777]">No open reconciliation exceptions.</p> : null}</section> : null}
  </main></AppShell>;
}
