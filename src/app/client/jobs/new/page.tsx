"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, SelectField, Spinner, TextAreaField, TextField } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useCategories } from "@/hooks/use-categories";
import { useRequireAuth } from "@/hooks/use-auth";
import { createJob } from "@/services/job-service";

export default function NewJobPage() {
  const router = useRouter();
  const showToast = useToast();
  const token = useRequireAuth();
  const { categories, error: categoryError, loading: categoriesLoading } = useCategories();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (categoryError) {
      showToast({ tone: "error", title: "Categories unavailable", body: categoryError });
    }
  }, [categoryError, showToast]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const form = new FormData(event.currentTarget);
    try {
      if (!token) throw new Error("Your session has expired. Please log in again.");
      await createJob(token, {
        title: String(form.get("title")),
        description: String(form.get("description")),
        category_id: String(form.get("category_id")),
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
      showToast({ tone: "error", title: "Could not publish job", body: message });
    } finally {
      setLoading(false);
    }
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
          <SelectField disabled={categoriesLoading || categories.length === 0} label="Category" name="category_id" required>
            <option value="">{categoriesLoading ? "Loading categories..." : "Select category"}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </SelectField>
          <TextField label="Location" name="location" placeholder="Lekki" />
          <TextField label="State" name="state" placeholder="Lagos" />
          <TextAreaField className="md:col-span-2" label="Description" name="description" placeholder="Describe the work clearly..." required rows={7} />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input name="is_remote" type="checkbox" />
            Remote work
          </label>
        </div>
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
