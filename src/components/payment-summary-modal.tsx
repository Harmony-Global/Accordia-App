"use client";

import Link from "next/link";
import { CheckCircle2, Printer, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button, IconButton, Spinner, SurfaceModal } from "@/components/ui";
import { useProfile } from "@/hooks/use-auth";
import { getPaymentReceipt } from "@/services/conversation-service";

type Receipt = {
  amount?: number | string;
  currency?: string;
  paid_at?: string | null;
  payment_type?: string;
  provider?: string;
  provider_reference?: string;
  receipt_number?: string | null;
  status?: string;
  job?: { title?: string | null } | null;
  quote?: { project_title?: string | null } | null;
  appointment?: {
    starts_at?: string | null;
    ends_at?: string | null;
    service?: { title?: string | null } | null;
  } | null;
  payer?: { first_name?: string | null; last_name?: string | null; email?: string | null } | null;
  professional?: { first_name?: string | null; last_name?: string | null; email?: string | null } | null;
};

function personName(person?: Receipt["payer"]) {
  return `${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim() || person?.email || "Accordia user";
}

function formatMoney(value?: number | string, currency = "NGN") {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat(undefined, {
    currency,
    maximumFractionDigits: 2,
    style: "currency"
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function DetailRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex flex-col gap-1 py-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <dt className="text-[#757575]">{label}</dt>
      <dd className={`break-words text-left text-[#196c88] sm:max-w-[60%] sm:text-right ${strong ? "text-base font-bold" : "font-semibold"}`}>{value}</dd>
    </div>
  );
}

export function PaymentSummaryModal({ reference, onClose, mode = "modal" }: { reference: string; onClose?: () => void; mode?: "modal" | "page" }) {
  const { token, profile } = useProfile();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!reference) {
      setError("Payment reference is missing.");
      return;
    }
    if (!token) return;
    let active = true;

    getPaymentReceipt(token, reference)
      .then((data) => {
        if (active) setReceipt(data.receipt as Receipt);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Could not load payment summary.");
      });

    return () => {
      active = false;
    };
  }, [reference, token]);

  const isJobPayment = receipt?.payment_type === "job_upfront" || receipt?.payment_type === "job_final";
  const itemTitle = isJobPayment
    ? receipt?.quote?.project_title ?? receipt?.job?.title ?? "Job request"
    : receipt?.appointment?.service?.title ?? "Appointment service";
  const paymentType = receipt?.payment_type === "job_upfront" ? "Upfront payment" : receipt?.payment_type === "job_final" ? "Final payment" : "Full payment";
  const returnPath = profile?.role === "professional" ? "/professional/jobs" : isJobPayment ? "/client/my-requests" : "/client/appointments";
  const amount = formatMoney(receipt?.amount, receipt?.currency);

  const content = (
    <>
      <div className="flex items-start justify-between gap-4 border-b border-dashed border-[#b8d1da] pb-5">
        <div>
          <p className="text-sm font-semibold text-[#196c88]">{receipt?.receipt_number ?? "Accordia receipt"}</p>
          <h2 className="mt-2 text-[26px] font-semibold text-[#196c88] sm:text-[30px]" id="payment-summary-title">Payment Summary</h2>
        </div>
        {mode === "modal" && onClose ? <IconButton aria-label="Close payment summary" onClick={onClose} type="button" variant="ghost"><X size={22} /></IconButton> : null}
      </div>

      {!receipt && !error ? <div className="grid min-h-72 place-items-center"><Spinner className="h-10 w-10 border-[4px] border-[#196c88] border-t-transparent" /></div> : null}
      {error ? <p className="mt-6 rounded-[6px] border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}

      {receipt ? (
        <div className="mt-7 rounded-[7px] border border-[#b8d1da] p-4 text-sm text-[#5e5e5e] shadow-sm sm:p-6">
          <section>
            <h3 className="text-lg font-semibold text-[#196c88]">Order Items</h3>
            <div className="mt-4 flex flex-col gap-2 border-b border-[#e6eef1] pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
              <div className="min-w-0"><p className="break-words font-semibold">{itemTitle}</p><p className="mt-1 text-xs text-[#757575]">{paymentType}</p></div>
              <p className="shrink-0 font-bold text-[#196c88]">{amount}</p>
            </div>
          </section>

          <section className="mt-6 border-b border-[#b8d1da] pb-5">
            <h3 className="mb-3 font-semibold text-[#196c88]">{isJobPayment ? "Job Details" : "Service Details"}</h3>
            <dl className="grid gap-1">
              <DetailRow label={isJobPayment ? "Job Title" : "Service Title"} value={isJobPayment ? receipt.job?.title ?? itemTitle : itemTitle} />
              {isJobPayment && receipt.quote?.project_title ? <DetailRow label="Quote" value={receipt.quote.project_title} /> : null}
              <DetailRow label={profile?.role === "professional" ? "Client's Name" : "Professional's Name"} value={personName(profile?.role === "professional" ? receipt.payer : receipt.professional)} />
              {isJobPayment ? null : <>
                <DetailRow label="Agreed Price" value={amount} />
                <DetailRow label="Delivery Start Date" value={formatDate(receipt.appointment?.starts_at)} />
                <DetailRow label="Completion Date" value={formatDate(receipt.appointment?.ends_at)} />
              </>}
            </dl>
          </section>

          <section className="mt-6 border-b border-[#b8d1da] pb-5">
            <h3 className="mb-3 font-semibold text-[#196c88]">Payment Breakdown</h3>
            <dl className="grid gap-1">
              <DetailRow label={profile?.role === "professional" ? "Verified Client Payment" : "Amount Paid"} value={amount} />
              <DetailRow label={profile?.role === "professional" ? "Total Verified Payment" : "Total Amount Paid"} strong value={amount} />
            </dl>
          </section>

          <section className="mt-6">
            <h3 className="mb-3 font-semibold text-[#196c88]">Payment Information</h3>
            <dl className="grid gap-1">
              <DetailRow label="Payment Provider" value={(receipt.provider ?? "Paystack").replace(/^./, (letter) => letter.toUpperCase())} />
              <DetailRow label="Payment Date" value={formatDate(receipt.paid_at)} />
              <DetailRow label="Payment Type" value={paymentType} />
              <DetailRow label="Payment Status" value={receipt.status === "success" ? "Payment successful" : receipt.status ?? "Not available"} />
              <DetailRow label="Payment Reference ID" value={receipt.provider_reference ?? "Not available"} />
            </dl>
          </section>

          <Button className="mt-7 w-full rounded-[5px]" onClick={() => window.print()} type="button"><Printer size={17} /> Print Summary</Button>
        </div>
      ) : null}

      {receipt ? (
        <div className="mx-auto mt-6 flex max-w-2xl items-start justify-center gap-2 rounded-[6px] border border-[#f4c465] bg-[#fffbe6] p-4 text-xs leading-5 text-[#5e5e5e] sm:text-sm">
          <CheckCircle2 className="mt-0.5 shrink-0 text-[#0fa269]" size={18} />
          <p>{profile?.role === "professional" ? "The client's payment was verified. Payout information is not shown here." : "Your payment was processed successfully through Paystack."}</p>
        </div>
      ) : null}
      {mode === "page" ? <Link className="mt-6 inline-flex min-h-11 items-center justify-center rounded-[5px] border border-[#196c88] bg-white px-5 text-sm font-semibold text-[#196c88]" href={returnPath}>Return to dashboard</Link> : null}
    </>
  );

  if (mode === "page") return <main className="min-h-screen bg-[#f8fbfc] px-3 py-6 sm:px-5 sm:py-10"><section aria-labelledby="payment-summary-title" className="mx-auto w-full max-w-4xl rounded-[8px] border border-[#b8d1da] bg-white p-4 shadow-sm sm:p-7 lg:p-10">{content}</section></main>;
  return <SurfaceModal labelledBy="payment-summary-title" onClose={onClose} panelClassName="max-h-[94dvh] overflow-y-auto p-4 sm:p-7 lg:p-10" size="lg">{content}</SurfaceModal>;
}
