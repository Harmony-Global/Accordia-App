import { apiFetch } from "@/services/http";
import type { Category } from "@/types";

export function getCategories(token: string, scope: "legacy" | "hierarchy" = "legacy") {
  return apiFetch<{ categories: Category[] }>(`/api/categories?scope=${scope}`, { token });
}

export function getProfessionalCategories(token: string) {
  return apiFetch<{ categories: Category[]; main_categories: Category[] }>("/api/professional/categories", { token });
}

export function setProfessionalCategories(token: string, mainCategoryIds: string[], categoryIds: string[]) {
  return apiFetch<{ updated: boolean }>("/api/professional/categories", {
    token,
    method: "PUT",
    body: { main_category_ids: mainCategoryIds, category_ids: categoryIds }
  });
}

export function createServiceCategory(token: string, parentId: string, name: string) {
  return apiFetch<{ category: Category }>("/api/professional/categories/service", {
    token, method: "POST", body: { parent_id: parentId, name }
  });
}
