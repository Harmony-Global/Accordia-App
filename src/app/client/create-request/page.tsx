"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button, CustomSelect, Spinner } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useCategories } from "@/hooks/use-categories";
import { useRequireAuth } from "@/hooks/use-auth";
import { createJob } from "@/services/job-service";

const MIN_PROFESSIONALS = 1;
const MAX_PROFESSIONALS = 50;
type WorkType = "remote" | "in_person";
type PriceType = "fixed" | "negotiable";

function clampProfessionals(value: number) {
  if (Number.isNaN(value)) return MIN_PROFESSIONALS;
  return Math.min(MAX_PROFESSIONALS, Math.max(MIN_PROFESSIONALS, value));
}

export default function NewJobPage() {
  const router = useRouter();
  const showToast = useToast();
  const token = useRequireAuth();
  const { categories, error: categoryError, loading: categoriesLoading } = useCategories();
  const [loading, setLoading] = useState(false);
  const [numberOfProfessionals, setNumberOfProfessionals] = useState(1);
  const [workType, setWorkType] = useState<WorkType>("in_person");
  const [priceType, setPriceType] = useState<PriceType>("negotiable");

  useEffect(() => {
    if (categoryError) {
      showToast({ tone: "error", title: "Categories unavailable", body: categoryError });
    }
  }, [categoryError, showToast]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);

    const form = new FormData(event.currentTarget);
    try {
      if (!token) throw new Error("Your session has expired. Please log in again.");
      const priceAmount = Number(form.get("price_amount"));
      if (!Number.isFinite(priceAmount) || priceAmount < 0) {
        throw new Error("Enter a valid request price.");
      }
      await createJob(token, {
        title: String(form.get("title")),
        description: String(form.get("description")),
        category_id: String(form.get("category_id")),
        number_of_professionals: numberOfProfessionals,
        price_type: priceType,
        price_amount: priceAmount,
        location: String(form.get("location")),
        state: String(form.get("state")),
        is_remote: workType === "remote"
      });
      showToast({
        tone: "success",
        title: "Request published",
        body: "Professionals can now find and apply to this request."
      });
      router.push("/client/my-requests");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create request";
      showToast({ tone: "error", title: "Could not publish request", body: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-8 space-y-3 pt-1 md:mb-10">
        <p className="text-sm font-medium leading-6 text-brand md:text-base">Create Request</p>
        <h1 className="max-w-5xl text-2xl font-normal leading-[1.45] text-[#5e5e5e] md:text-3xl lg:text-[32px]">
          Create and post service request for Professionals to apply to
        </h1>
      </div>
      <form className="rounded-[10px] border border-line bg-white p-4 shadow-[0_-2px_4px_rgba(0,0,0,0.05),0_2px_4px_rgba(0,0,0,0.05)] sm:p-6 md:p-8 lg:p-7" onSubmit={submit}>
        <div className="grid gap-6 lg:grid-cols-2">
          <label className="block text-sm font-medium leading-6 text-[#585858] lg:col-span-2">
            Service Request Title
            <input
              className="mt-2 h-12 w-full rounded-[10px] border border-[#d0d0d0] bg-white px-4 text-sm text-ink outline-none transition hover:border-[#a4a4a4] focus:border-brand focus:ring-4 focus:ring-teal-100"
              name="title"
              placeholder="Bathroom Leak repair"
              required
            />
          </label>

          <label className="block text-sm font-medium leading-6 text-[#585858]">
            Category
            <CustomSelect
              className="mt-2"
              triggerClassName="h-12 rounded-[10px] border-[#d0d0d0] px-4 text-sm text-ink hover:border-[#a4a4a4]"
              disabled={categoriesLoading || categories.length === 0}
              name="category_id"
              required
            >
              <option value="">{categoriesLoading ? "Loading categories..." : "Select Category"}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </CustomSelect>
          </label>

          <label className="block text-sm font-medium leading-6 text-[#585858]">
            Number of Professionals
            <span className="mt-2 flex h-12 w-full items-center rounded-[10px] border border-[#d0d0d0] bg-white px-3 transition focus-within:border-brand focus-within:ring-4 focus-within:ring-teal-100 hover:border-[#a4a4a4]">
              <input
                aria-label="Number of Professionals"
                className="min-w-0 flex-1 bg-transparent px-1 text-sm text-ink outline-none"
                max={MAX_PROFESSIONALS}
                min={MIN_PROFESSIONALS}
                name="number_of_professionals"
                onChange={(event) => setNumberOfProfessionals(clampProfessionals(Number(event.target.value)))}
                type="number"
                value={numberOfProfessionals}
              />
              <span className="flex items-center gap-3 text-[#757575]">
                <button
                  aria-label="Decrease number of professionals"
                  className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={numberOfProfessionals <= MIN_PROFESSIONALS}
                  onClick={() => setNumberOfProfessionals((current) => clampProfessionals(current - 1))}
                  type="button"
                >
                  <Minus size={16} />
                </button>
                <button
                  aria-label="Increase number of professionals"
                  className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={numberOfProfessionals >= MAX_PROFESSIONALS}
                  onClick={() => setNumberOfProfessionals((current) => clampProfessionals(current + 1))}
                  type="button"
                >
                  <Plus size={17} />
                </button>
              </span>
            </span>
          </label>

          <label className="block text-sm font-medium leading-6 text-[#585858]">
            Price
            <input
              className="mt-2 h-12 w-full rounded-[10px] border border-[#d0d0d0] bg-white px-4 text-sm text-ink outline-none transition hover:border-[#a4a4a4] focus:border-brand focus:ring-4 focus:ring-teal-100"
              min={0}
              name="price_amount"
              placeholder="Enter amount"
              required
              type="number"
            />
          </label>

          <label className="block text-sm font-medium leading-6 text-[#585858]">
            Price Type
            <CustomSelect
              className="mt-2"
              name="price_type"
              onChange={(event) => setPriceType(event.target.value as PriceType)}
              triggerClassName="h-12 rounded-[10px] border-[#d0d0d0] px-4 text-sm text-ink hover:border-[#a4a4a4]"
              value={priceType}
            >
              <option value="negotiable">Negotiable</option>
              <option value="fixed">Fixed</option>
            </CustomSelect>
          </label>

          <label className="block text-sm font-medium leading-6 text-[#585858]">
            Location
            <input
              className="mt-2 h-12 w-full rounded-[10px] border border-[#d0d0d0] bg-white px-4 text-sm text-ink outline-none transition hover:border-[#a4a4a4] focus:border-brand focus:ring-4 focus:ring-teal-100"
              name="location"
              placeholder="Lekki"
            />
          </label>

          <label className="block text-sm font-medium leading-6 text-[#585858]">
            State
            <input
              className="mt-2 h-12 w-full rounded-[10px] border border-[#d0d0d0] bg-white px-4 text-sm text-ink outline-none transition hover:border-[#a4a4a4] focus:border-brand focus:ring-4 focus:ring-teal-100"
              name="state"
              placeholder="Lagos"
            />
          </label>

          <label className="block text-sm font-medium leading-6 text-[#585858] lg:col-span-2">
            Description
            <textarea
              className="mt-2 min-h-[148px] w-full resize-y rounded-[10px] border border-[#d0d0d0] bg-white px-4 py-3 text-sm text-ink outline-none transition hover:border-[#a4a4a4] focus:border-brand focus:ring-4 focus:ring-teal-100 md:min-h-[188px]"
              name="description"
              placeholder="Describe service request clearly..."
              required
            />
          </label>

          <fieldset className="space-y-3 lg:col-span-2">
            <legend className="sr-only">Work type</legend>
            <div className="flex flex-wrap items-center gap-5 sm:gap-8">
              {[
                { value: "remote" as const, label: "Remote work" },
                { value: "in_person" as const, label: "In-person" }
              ].map((option) => {
                const selected = workType === option.value;
                return (
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-normal text-[#5e5e5e]" key={option.value}>
                    <input
                      checked={selected}
                      className="sr-only"
                      name="work_type"
                      onChange={() => setWorkType(option.value)}
                      type="radio"
                      value={option.value}
                    />
                    <span
                      aria-hidden="true"
                      className={`grid h-[18px] w-[18px] place-items-center rounded-[4px] border transition ${selected ? "border-[#135166] bg-[#135166]" : "border-[#757575] bg-white"}`}
                    >
                      {selected ? <span className="h-1.5 w-2.5 rotate-[-45deg] border-b-2 border-l-2 border-white" /> : null}
                    </span>
                    {option.label}
                  </label>
                );
              })}
            </div>
            <p className="max-w-4xl text-xs font-medium leading-5 text-[#196c88] sm:text-sm">
              For in-person jobs, contact details becomes available after an upfront payment is secured
            </p>
          </fieldset>
        </div>
        <Button aria-busy={loading} className="mt-5 w-full rounded-[5px] px-4 py-3 sm:w-auto" disabled={loading} type="submit">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="h-5 w-5 border-2" />
              Publishing
            </span>
          ) : "Publish Request"}
        </Button>
      </form>
    </AppShell>
  );
}
