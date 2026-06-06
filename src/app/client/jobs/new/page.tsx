"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Alert, Button, PageLoader, SelectField, Spinner, TextAreaField, TextField } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useCategories } from "@/hooks/use-categories";
import { useClientJobs } from "@/hooks/use-jobs";

export default function NewJobPage() {
  const router = useRouter();
  const showToast = useToast();
  const { categories, error: categoryError, loading: categoriesLoading } = useCategories();
  const { publishJob } = useClientJobs();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    try {
      await publishJob({
        title: String(form.get("title")),
        description: String(form.get("description")),
        category_id: String(form.get("category_id")),
        budget_min: Number(form.get("budget_min")),
        budget_max: Number(form.get("budget_max")),
        budget_type: String(form.get("budget_type")) as "fixed" | "hourly",
        location: String(form.get("location")),
        state: String(form.get("state")),
        is_remote: form.get("is_remote") === "on"
      });
      showToast({
        tone: "success",
        title: "Job published",
        body: "Professionals can now find and apply to this job."
      });
      router.push("/client/jobs");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create job";
      setError(message);
      showToast({ tone: "error", title: "Could not publish job", body: message });
    } finally {
      setLoading(false);
    }
  }

  if (categoriesLoading) {
    return (
      <AppShell>
        <PageLoader />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-sm font-medium text-brand">Client workspace</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">Post a job</h1>
      </div>
      <form className="rounded-lg border border-line bg-white p-4 shadow-sm sm:p-5" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField className="md:col-span-2" label="Job title" name="title" placeholder="Bathroom leak repair" required />
          <SelectField label="Category" name="category_id" required>
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </SelectField>
          <SelectField label="Budget type" name="budget_type">
            <option value="fixed">Fixed</option>
            <option value="hourly">Hourly</option>
          </SelectField>
          <TextField label="Budget min" name="budget_min" required type="number" />
          <TextField label="Budget max" name="budget_max" required type="number" />
          <TextField label="Location" name="location" placeholder="Lekki" />
          <TextField label="State" name="state" placeholder="Lagos" />
          <TextAreaField className="md:col-span-2" label="Description" name="description" placeholder="Describe the work clearly..." required rows={7} />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input name="is_remote" type="checkbox" />
            Remote work
          </label>
        </div>
        {categoryError ? <div className="mt-4"><Alert>{categoryError}</Alert></div> : null}
        {error ? <div className="mt-4"><Alert>{error}</Alert></div> : null}
        <Button className="mt-5" disabled={loading} type="submit">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner />
              Publishing
            </span>
          ) : "Publish job"}
        </Button>
      </form>
    </AppShell>
  );
}
