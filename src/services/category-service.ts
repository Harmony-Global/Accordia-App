import { apiFetch } from "@/services/http";
import type { Category } from "@/types";

export function getCategories(token: string) {
  return apiFetch<{ categories: Category[] }>("/api/categories", { token });
}

export function getProfessionalCategories(token: string) {
  return apiFetch<{ categories: Category[] }>("/api/professional/categories", { token });
}

export function setProfessionalCategories(token: string, categoryIds: string[]) {
  return apiFetch<{ updated: boolean }>("/api/professional/categories", {
    token,
    method: "PUT",
    body: { category_ids: categoryIds }
  });
}
