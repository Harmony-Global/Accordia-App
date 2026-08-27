"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/hooks/use-auth";
import { getCategories, getProfessionalCategories, setProfessionalCategories } from "@/services/category-service";
import type { Category } from "@/types";

let cachedCategories: Category[] = [];
let cachedSelectedCategoryIds: string[] = [];

export function useCategories() {
  const token = useRequireAuth();
  const [categories, setCategories] = useState<Category[]>(cachedCategories);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(cachedSelectedCategoryIds);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(cachedCategories.length === 0);

  useEffect(() => {
    if (!token) return;
    if (cachedCategories.length === 0) setLoading(true);

    Promise.all([
      getCategories(token),
      getProfessionalCategories(token).catch(() => ({ categories: [] }))
    ])
      .then(([allCategories, selectedCategories]) => {
        const nextCategories = allCategories.categories;
        const nextSelectedCategoryIds = selectedCategories.categories.map((category) => category.id);
        cachedCategories = nextCategories;
        cachedSelectedCategoryIds = nextSelectedCategoryIds;
        setCategories(nextCategories);
        setSelectedCategoryIds(nextSelectedCategoryIds);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load categories"))
      .finally(() => setLoading(false));
  }, [token]);

  async function saveCategories(categoryIds: string[]) {
    if (!token) throw new Error("You need to log in again");
    const result = await setProfessionalCategories(token, categoryIds);
    cachedSelectedCategoryIds = categoryIds;
    setSelectedCategoryIds(categoryIds);
    return result;
  }

  return { categories, selectedCategoryIds, error, loading, saveCategories };
}
