import { apiDocument, apiFetch } from "@/services/http";

export type PayoutPeriod = "today" | "7d" | "14d" | "30d" | "custom";
export type PayoutFilter = { period: PayoutPeriod; from?: string; to?: string; page: number };
export type PayoutMetrics = {
  total_net_kobo: number;
  total_paid_out_kobo: number;
  paid_earnings_count: number;
  total_earnings_count: number;
  unpaid_kobo: number;
  available_kobo: number;
};
export type Earning = {
  id: string; title: string; source_type: "job" | "appointment"; earned_at: string;
  gross_kobo: number; fee_kobo: number; net_kobo: number; paid_kobo: number;
  hold_reason: string | null; status: "pending" | "partially_paid" | "paid_out";
};
export type Payout = {
  id: string; provider_reference: string; amount_kobo: number; status: "pending" | "success" | "failed" | "reversed";
  display_at: string; transferred_at: string | null;
  destination: { bank_name: string; account_last4: string } | null;
};
export type PayoutDestination = {
  id: string; bank_code: string; bank_name: string; account_last4: string;
  resolved_name: string; holder_name: string; notification_email: string;
  status: "verified" | "pending_review"; updated_at: string;
};
export type PayoutBank = { name: string; code: string };

function query(filter: PayoutFilter, section: string) {
  const params = new URLSearchParams({ section, period: filter.period, page: String(filter.page) });
  if (filter.period === "custom") {
    if (filter.from) params.set("from", filter.from);
    if (filter.to) params.set("to", filter.to);
  }
  return params.toString();
}

export const getPayoutSummary = (token: string) => apiFetch<{ summary: PayoutMetrics; eligible_kobo: number; next_cutoff_at: string }>("/api/professional/payouts", { token, cacheTtlMs: 0 });
export const getEarnings = (token: string, filter: PayoutFilter) => apiFetch<{ earnings: Earning[]; total: number; page: number; page_size: number; metrics: PayoutMetrics }>(`/api/professional/payouts?${query(filter, "earnings")}`, { token, cacheTtlMs: 0 });
export const getPayoutHistory = (token: string, filter: PayoutFilter) => apiFetch<{ payouts: Payout[]; total: number; page: number; page_size: number }>(`/api/professional/payouts?${query(filter, "history")}`, { token, cacheTtlMs: 0 });
export const getPayoutDestination = (token: string) => apiFetch<{ destination: PayoutDestination | null }>("/api/professional/payouts/destination", { token, cacheTtlMs: 0 });
export const getPayoutBanks = (token: string) => apiFetch<{ banks: PayoutBank[] }>("/api/professional/payouts/banks", { token });
export const savePayoutDestination = (token: string, body: { holder_name: string; notification_email: string; bank_code: string; account_number: string }) =>
  apiFetch<{ destination_id: string; review_required: boolean }>("/api/professional/payouts/destination", { token, method: "PUT", body });
export const getPayoutStatement = (token: string, id: string) => apiDocument(`/api/professional/payouts/${id}/statement`, token);

export type AdminQueueEarning = {
  earning_id: string; professional_id: string; professional_name: string; title: string; earned_at: string;
  net_kobo: number; paid_kobo: number; reserved_kobo: number; available_kobo: number;
  hold_reason: string | null; destination_id: string | null; destination_status: string | null;
  bank_name: string | null; account_last4: string | null;
};
export type AdminDestination = PayoutDestination & { professional_id: string; professional: { first_name: string; last_name: string } | null };
export type AdminException = { id: string; professional_id: string | null; source_type: string; source_id: string | null; reason: string; created_at: string };

export const getAdminPayoutQueue = (token: string, page = 1) => apiFetch<{ earnings: AdminQueueEarning[]; has_more: boolean; cutoff_at: string }>(`/api/admin/payouts?view=queue&page=${page}`, { token, cacheTtlMs: 0 });
export const getAdminPayoutDestinations = (token: string) => apiFetch<{ destinations: AdminDestination[] }>("/api/admin/payouts?view=destinations", { token, cacheTtlMs: 0 });
export const getAdminPayoutExceptions = (token: string) => apiFetch<{ exceptions: AdminException[] }>("/api/admin/payouts?view=exceptions", { token, cacheTtlMs: 0 });
export const getAdminPayoutHistory = (token: string) => apiFetch<{ payouts: (Payout & { professional_id: string })[] }>("/api/admin/payouts?view=history", { token, cacheTtlMs: 0 });
export const approvePayoutDestination = (token: string, id: string) => apiFetch<{ approved: boolean }>(`/api/admin/payouts/destinations/${id}`, { token, method: "PATCH" });
export const setEarningHold = (token: string, id: string, hold_reason: string | null) => apiFetch<{ earning: { id: string; hold_reason: string | null } }>(`/api/admin/payouts/earnings/${id}`, { token, method: "PATCH", body: { hold_reason } });
export const reconcilePayout = (token: string, payload: { destination_id: string; reference: string; allocations: { id: string; amount_kobo: number }[] }) =>
  apiFetch<{ payout_id: string; status: string }>("/api/admin/payouts", { token, method: "POST", body: payload });
