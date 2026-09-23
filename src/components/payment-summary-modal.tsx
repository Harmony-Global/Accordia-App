"use client";

import { CheckCircle2, Printer, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button, IconButton, Spinner, SurfaceModal } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
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

export function PaymentSummaryModal({ reference, onClose }: { reference: string; onClose: () => void }) {
  const { token } = useAuth();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !reference) return;
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

  const serviceTitle = receipt?.appointment?.service?.title ?? "Appointment service";
  const amount = formatMoney(receipt?.amount, receipt?.currency);

  return (
    <SurfaceModal labelledBy="payment-summary-title" onClose={onClose} panelClassName="max-h-[94dvh] overflow-y-auto p-4 sm:p-7 lg:p-10" size="lg">
      <div className="flex items-start justify-between gap-4 border-b border-dashed border-[#b8d1da] pb-5">
        <div>
          <p className="text-sm font-semibold text-[#196c88]">{receipt?.receipt_number ?? "Accordia receipt"}</p>
          <h2 className="mt-2 text-[26px] font-semibold text-[#196c88] sm:text-[30px]" id="payment-summary-title">Payment Summary</h2>
        </div>
        <IconButton aria-label="Close payment summary" onClick={onClose} type="button" variant="ghost"><X size={22} /></IconButton>
      </div>

      {!receipt && !error ? <div className="grid min-h-72 place-items-center"><Spinner className="h-10 w-10 border-[4px] border-[#196c88] border-t-transparent" /></div> : null}
      {error ? <p className="mt-6 rounded-[6px] border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}

      {receipt ? (
        <div className="mt-7 rounded-[7px] border border-[#b8d1da] p-4 text-sm text-[#5e5e5e] shadow-sm sm:p-6">
          <section>
            <h3 className="text-lg font-semibold text-[#196c88]">Order Items</h3>
            <div className="mt-4 flex items-start justify-between gap-5 border-b border-[#e6eef1] pb-4">
              <div><p className="font-semibold">{serviceTitle}</p><p className="mt-1 text-xs text-[#757575]">Qty: 1</p></div>
              <p className="shrink-0 font-bold text-[#196c88]">{amount}</p>
            </div>
          </section>

          <section className="mt-6 border-b border-[#b8d1da] pb-5">
            <h3 className="mb-3 font-semibold text-[#196c88]">Service Details</h3>
            <dl className="grid gap-1">
              <DetailRow label="Service Title" value={serviceTitle} />
              <DetailRow label="Professional's Name" value={personName(receipt.professional)} />
              <DetailRow label="Agreed Price" value={amount} />
              <DetailRow label="Delivery Start Date" value={formatDate(receipt.appointment?.starts_at)} />
              <DetailRow label="Completion Date" value={formatDate(receipt.appointment?.ends_at)} />
            </dl>
          </section>

          <section className="mt-6 border-b border-[#b8d1da] pb-5">
            <h3 className="mb-3 font-semibold text-[#196c88]">Payment Breakdown</h3>
            <dl className="grid gap-1">
              <DetailRow label="Amount Paid" value={amount} />
              <DetailRow label="Total Amount Paid" strong value={amount} />
            </dl>
          </section>

          <section className="mt-6">
            <h3 className="mb-3 font-semibold text-[#196c88]">Payment Information</h3>
            <dl className="grid gap-1">
              <DetailRow label="Payment Provider" value={(receipt.provider ?? "Paystack").replace(/^./, (letter) => letter.toUpperCase())} />
              <DetailRow label="Payment Date" value={formatDate(receipt.paid_at)} />
              <DetailRow label="Payment Type" value="Full payment" />
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
          <p>Your payment was processed successfully through Paystack.</p>
        </div>
      ) : null}
    </SurfaceModal>
  );
}
