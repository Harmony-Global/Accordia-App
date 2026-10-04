"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/hooks/use-auth";
import { useSession } from "@/components/session-provider";
import { getCategories, getProfessionalCategories, setProfessionalCategories } from "@/services/category-service";
import type { Category } from "@/types";

export function useCategories(scope: "legacy" | "hierarchy" = "legacy") {
  const token = useRequireAuth();
  const { role } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedMainIds, setSelectedMainIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setSelectedCategoryIds([]);
    setSelectedMainIds([]);
    setCategories([]);
    setError("");
    setLoading(true);

    Promise.all([
      getCategories(token, scope),
      role === "professional" ? getProfessionalCategories(token) : Promise.resolve({ categories: [], main_categories: [] })
    ])
      .then(([allCategories, selectedCategories]) => {
        if (!Array.isArray(allCategories.categories)) {
          throw new Error("Category list is unavailable. Please try again.");
        }
        const nextCategories = allCategories.categories;
        setCategories(nextCategories);
        if (!Array.isArray(selectedCategories.categories)) {
          setError("Saved professional categories could not be loaded. Editing is unavailable.");
          return;
        }
        const nextSelectedCategoryIds = selectedCategories.categories.map((category) => category.id);
        setSelectedCategoryIds(nextSelectedCategoryIds);
        if (role === "professional" && scope === "hierarchy" && !Array.isArray(selectedCategories.main_categories)) {
          const byId = new Map(nextCategories.map((category) => [category.id, category]));
          const inferredMainIds = [...new Set(nextSelectedCategoryIds.map((id) => byId.get(id)?.parent_id).filter((id): id is string => Boolean(id)))];
          setSelectedMainIds(inferredMainIds);
          setError("Categories loaded, but saving requires the updated backend. Your saved selections have not changed.");
          return;
        }
        const nextSelectedMainIds = (Array.isArray(selectedCategories.main_categories) ? selectedCategories.main_categories : []).map((category) => category.id);
        setSelectedMainIds(nextSelectedMainIds);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load categories"))
      .finally(() => setLoading(false));
  }, [token, scope, role]);

  async function saveCategories(mainIds: string[], categoryIds: string[]) {
    if (!token) throw new Error("You need to log in again");
    const result = await setProfessionalCategories(token, mainIds, categoryIds);
    setSelectedMainIds(mainIds);
    setSelectedCategoryIds(categoryIds);
    return result;
  }

  return { categories, selectedMainIds, selectedCategoryIds, error, loading, saveCategories };
}
