"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button, PageLoader, Spinner } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useCategories } from "@/hooks/use-categories";

export default function ProfessionalCategoriesPage() {
  const { categories, selectedCategoryIds, error: loadError, loading, saveCategories } = useCategories();
  const showToast = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  useEffect(() => {
    setSelected(selectedCategoryIds);
  }, [selectedCategoryIds]);

  useEffect(() => {
    if (loadError) {
      showToast({ tone: "error", title: "Could not load categories", body: loadError });
    }
  }, [loadError, showToast]);

  async function save() {
    setSaving(true);

    try {
      await saveCategories(selected);
      showToast({
        tone: "success",
        title: "Categories saved",
        body: "Your matched job feed will use these choices."
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save categories";
      showToast({ tone: "error", title: "Could not save categories", body: message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <PageLoader />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-brand">Professional setup</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">Choose your categories</h1>
        </div>
        <Button disabled={selected.length === 0 || saving} onClick={save} type="button">
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <Spinner />
              Saving
            </span>
          ) : "Save categories"}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => (
          <button
            className={`rounded-lg border bg-white p-4 text-left shadow-sm transition ${selected.includes(category.id) ? "border-brand bg-teal-50 ring-2 ring-teal-100" : "border-line hover:border-brand"}`}
            key={category.id}
            onClick={() => toggle(category.id)}
            type="button"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold text-ink">{category.name}</h2>
              {selected.includes(category.id) ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-bold text-brand">
                  <CheckCircle2 size={14} />
                  Selected
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">{category.description}</p>
          </button>
        ))}
      </div>
    </AppShell>
  );
}
