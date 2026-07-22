import { apiFetch } from "@/services/http";
import type { ProfessionalSearchResult } from "@/types";

export type ProfessionalSearchFilters = {
  q?: string;
  category_id?: string;
  state?: string;
};

export function searchProfessionals(token: string, filters: ProfessionalSearchFilters = {}) {
  const params = new URLSearchParams();

  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.category_id) params.set("category_id", filters.category_id);
  if (filters.state?.trim()) params.set("state", filters.state.trim());

  const query = params.toString();
  return apiFetch<{ professionals: ProfessionalSearchResult[] }>(`/api/professionals${query ? `?${query}` : ""}`, { token });
}
