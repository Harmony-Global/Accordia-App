"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/hooks/use-auth";
import { getCategories, getProfessionalCategories, setProfessionalCategories } from "@/services/category-service";
import type { Category } from "@/types";

export function useCategories() {
  const token = useRequireAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    Promise.all([
      getCategories(token),
      getProfessionalCategories(token).catch(() => ({ categories: [] }))
    ])
      .then(([allCategories, selectedCategories]) => {
        setCategories(allCategories.categories);
        setSelectedCategoryIds(selectedCategories.categories.map((category) => category.id));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load categories"))
      .finally(() => setLoading(false));
  }, [token]);

  async function saveCategories(categoryIds: string[]) {
    if (!token) throw new Error("You need to log in again");
    const result = await setProfessionalCategories(token, categoryIds);
    setSelectedCategoryIds(categoryIds);
    return result;
  }

  return { categories, selectedCategoryIds, error, loading, saveCategories };
}
