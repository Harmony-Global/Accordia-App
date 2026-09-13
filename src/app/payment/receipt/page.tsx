"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ReceiptText } from "lucide-react";

import { Button, Spinner } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { getPaymentReceipt } from "@/services/conversation-service";

type Receipt = Record<string, unknown> & {
  amount?: number | string;
  currency?: string;
  paid_at?: string | null;
  payment_type?: string;
  provider_reference?: string;
  receipt_number?: string | null;
  job?: { title?: string | null } | null;
  quote?: { project_title?: string | null } | null;
  appointment?: { starts_at?: string | null; ends_at?: string | null; service?: { title?: string | null } | null } | null;
  payer?: { first_name?: string | null; last_name?: string | null; email?: string | null } | null;
  professional?: { first_name?: string | null; last_name?: string | null; email?: string | null } | null;
};

function personName(person?: { first_name?: string | null; last_name?: string | null; email?: string | null } | null) {
  return `${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim() || person?.email || "Accordia user";
}

function formatMoney(value: number | string | undefined, currency = "NGN") {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat(undefined, {
    currency,
    maximumFractionDigits: 0,
    style: "currency"
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function receiptTitle(receipt: Receipt) {
  if (receipt.payment_type === "appointment_full") return receipt.appointment?.service?.title ?? "Appointment payment";
  return receipt.quote?.project_title ?? receipt.job?.title ?? "Job request payment";
}

function ReceiptContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") ?? "";
  const { token } = useAuth();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");

  const dashboardPath = useMemo(() => receipt?.payment_type === "appointment_full" ? "/client/appointments" : "/client/my-requests", [receipt?.payment_type]);

  useEffect(() => {
    if (!reference) {
      setError("Payment reference is missing.");
      return;
    }
    if (!token) return;

    getPaymentReceipt(token, reference)
      .then((data) => setReceipt(data.receipt as Receipt))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load receipt."));
  }, [reference, token]);

  return (
    <main className="min-h-screen bg-[#f8fbfc] px-4 py-10">
      <section className="mx-auto w-full max-w-3xl rounded-[8px] border border-line bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-dashed border-[#a4a4a4] pb-5">
          <div>
            <p className="text-sm font-semibold text-[#196c88]">Accordia Receipt</p>
            <h1 className="mt-2 text-[26px] font-semibold text-[#5e5e5e]">{receipt?.receipt_number ?? "Payment receipt"}</h1>
          </div>
          <ReceiptText className="text-[#196c88]" size={36} />
        </div>

        {!receipt && !error ? (
          <div className="grid min-h-52 place-items-center">
            <Spinner className="h-10 w-10 border-[4px] border-[#196c88] border-t-transparent" />
          </div>
        ) : null}

        {error ? <p className="mt-6 rounded-[6px] border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}

        {receipt ? (
          <div className="mt-7 grid gap-5 text-sm text-[#5e5e5e]">
            <div>
              <p className="text-[#a4a4a4]">Payment For</p>
              <p className="mt-1 text-lg font-semibold">{receiptTitle(receipt)}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[6px] border border-line p-4">
                <p className="text-[#a4a4a4]">Amount Paid</p>
                <p className="mt-1 text-2xl font-semibold text-[#196c88]">{formatMoney(receipt.amount, receipt.currency)}</p>
              </div>
              <div className="rounded-[6px] border border-line p-4">
                <p className="text-[#a4a4a4]">Paid On</p>
                <p className="mt-1 font-semibold">{formatDate(receipt.paid_at)}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[#a4a4a4]">Client</p>
                <p className="mt-1 font-semibold">{personName(receipt.payer)}</p>
              </div>
              <div>
                <p className="text-[#a4a4a4]">Professional</p>
                <p className="mt-1 font-semibold">{personName(receipt.professional)}</p>
              </div>
            </div>
            <div className="rounded-[6px] bg-[#f8fbfc] p-4">
              <p><span className="text-[#a4a4a4]">Reference:</span> {receipt.provider_reference}</p>
              <p className="mt-2"><span className="text-[#a4a4a4]">Type:</span> {String(receipt.payment_type ?? "").replace(/_/g, " ")}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <Button className="rounded-[5px] px-6" onClick={() => window.print()} type="button">Print receipt</Button>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-[5px] border border-[#196c88] bg-white px-6 py-3 text-sm font-semibold text-[#196c88] shadow-sm transition hover:bg-slate-50" href={dashboardPath}>
            Return to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function PaymentReceiptPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-[#f8fbfc] px-4 py-10">
          <Spinner className="h-10 w-10 border-[4px] border-[#196c88] border-t-transparent" />
        </main>
      }
    >
      <ReceiptContent />
    </Suspense>
  );
}
