import { apiFetch } from "@/services/http";
import type { PayoutFilter } from "@/services/payout-service";

type Relation<T> = T | T[] | null;
type PaymentDetails = {
  payment_type: "job_upfront" | "job_final" | "appointment_full";
  provider_reference: string;
  job: Relation<{ title: string }>;
  appointment: Relation<{ service: Relation<{ title: string }> }>;
};

export type ClientCharge = PaymentDetails & {
  id: string; amount: number; currency: string; status: string; paid_at: string;
  conversation: Relation<{ work_status: string }>;
};
export type ClientRefund = {
  id: string; amount_kobo: number; currency: string; status: string;
  initiated_at: string; processed_at: string | null; payment: PaymentDetails;
};
export type ClientPaymentSummary = {
  gross_kobo: number; refunded_kobo: number; total_kobo: number; completed_charge_count: number;
};

function query(section: string, filter: PayoutFilter) {
  const params = new URLSearchParams({ section, period: filter.period, page: String(filter.page) });
  if (filter.period === "custom") {
    if (filter.from) params.set("from", filter.from);
    if (filter.to) params.set("to", filter.to);
  }
  return params.toString();
}

export const getClientPaymentSummary = (token: string) => apiFetch<{ summary: ClientPaymentSummary }>("/api/client/payments", { token, cacheTtlMs: 0 });
export const getClientCharges = (token: string, filter: PayoutFilter) => apiFetch<{ charges: ClientCharge[]; total: number; page_size: number }>(`/api/client/payments?${query("charges", filter)}`, { token, cacheTtlMs: 0 });
export const getClientRefunds = (token: string, filter: PayoutFilter) => apiFetch<{ refunds: ClientRefund[]; total: number; page_size: number }>(`/api/client/payments?${query("refunds", filter)}`, { token, cacheTtlMs: 0 });
