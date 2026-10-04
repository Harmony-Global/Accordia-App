"use client";

import Link from "next/link";
import { BriefcaseBusiness, Check, ChevronDown, ChevronLeft, ChevronRight, Clapperboard, Lightbulb, PenTool, Plus, Search, UsersRound, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Category } from "@/types";
import { AccentCheckbox } from "@/components/ui";

type Mode = "service" | "subcategory" | "filter";
type Stage = "main" | "sub" | "service" | "legacy";
type Props = {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
  mode: Mode;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  includeLegacy?: boolean;
  selectedSubcategoryIds?: string[];
  ownerId?: string;
  onCreateService?: (parentId: string, name: string) => Promise<Category>;
  className?: string;
};

const icons = [Lightbulb, PenTool, Clapperboard, UsersRound, BriefcaseBusiness];

export function CategorySelect({
  categories, value, onChange, mode, name, placeholder = "Select a category", disabled,
  includeLegacy = false, selectedSubcategoryIds = [], ownerId, onCreateService, className = ""
}: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("main");
  const [mainId, setMainId] = useState("");
  const [subId, setSubId] = useState("");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [customName, setCustomName] = useState("");
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  const byId = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const selected = byId.get(value);
  const main = byId.get(mainId);
  const sub = byId.get(subId);

  function pathLabel(category?: Category) {
    if (!category) return placeholder;
    if (category.level === "legacy") return `Legacy / Unmapped > ${category.name}`;
    const parent = category.parent_id ? byId.get(category.parent_id) : undefined;
    const grandparent = parent?.parent_id ? byId.get(parent.parent_id) : undefined;
    return [grandparent?.name, parent?.name, category.name].filter(Boolean).join(" > ");
  }

  useEffect(() => {
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  useEffect(() => {
    if (open) searchInput.current?.focus();
  }, [open]);

  function openPicker() {
    if (disabled) return;
    if (open) { setOpen(false); return; }
    const parent = selected?.parent_id ? byId.get(selected.parent_id) : undefined;
    setMainId(selected?.level === "main" ? selected.id : parent?.level === "main" ? parent.id : parent?.parent_id ?? "");
    setSubId(selected?.level === "sub" ? selected.id : parent?.level === "sub" ? parent.id : "");
    setStage(selected?.level === "service" ? "service" : selected?.level === "sub" ? "sub" : selected?.level === "legacy" ? "legacy" : "main");
    setSearch(""); setCreating(false); setCreateError(""); setOpen(true);
  }

  function choose(category: Category) {
    onChange(category.id);
    setOpen(false); setSearch(""); setCreating(false);
  }

  function selectRow(category: Category) {
    if (category.level === "main") {
      setMainId(category.id); setSubId(""); setStage("sub"); setSearch("");
    } else if (category.level === "sub" && mode === "service") {
      setMainId(category.parent_id ?? ""); setSubId(category.id); setStage("service"); setSearch("");
    } else {
      choose(category);
    }
  }

  const options = useMemo(() => {
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      return categories.filter((category) => {
        if (category.level === "legacy") return includeLegacy && category.name.toLowerCase().includes(term);
        if (category.level === "service") return mode === "service" && category.created_by === ownerId && category.name.toLowerCase().includes(term);
        return category.name.toLowerCase().includes(term);
      });
    }
    if (stage === "main") return categories.filter((category) => category.level === "main");
    if (stage === "sub") return categories.filter((category) => category.level === "sub" && category.parent_id === mainId);
    if (stage === "service") return categories.filter((category) => category.level === "service" && category.parent_id === subId && category.created_by === ownerId);
    return categories.filter((category) => category.level === "legacy");
  }, [categories, includeLegacy, mainId, mode, ownerId, search, stage, subId]);

  async function createService() {
    if (!onCreateService || !subId || !customName.trim() || saving) return;
    setSaving(true); setCreateError("");
    try {
      const category = await onCreateService(subId, customName.trim());
      setCustomName(""); choose(category);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Could not add service");
    } finally { setSaving(false); }
  }

  const heading = stage === "main" ? "Main Categories" : stage === "sub" ? "Sub Categories" : stage === "service" ? "Services" : "Legacy / Unmapped";
  const breadcrumb = stage === "sub" ? main?.name : stage === "service" ? sub?.name : "";
  const canCreate = stage === "service" && selectedSubcategoryIds.includes(subId) && Boolean(onCreateService);

  return (
    <div className={`relative ${className}`} ref={root}>
      {name ? <input name={name} type="hidden" value={value} /> : null}
      <button aria-controls={`${id}-panel`} aria-expanded={open} aria-haspopup="dialog" className="flex h-14 w-full items-center justify-between gap-3 rounded-[5px] border border-[#b9b9b9] bg-white px-4 text-left text-sm text-[#5e5e5e] outline-none hover:border-[#91bfd0] focus-visible:border-[#196c88] focus-visible:ring-2 focus-visible:ring-[#c9e3ed] disabled:cursor-not-allowed disabled:bg-[#f7f9fa]" disabled={disabled} onClick={openPicker} type="button">
        <span className={`min-w-0 truncate ${selected ? "" : "text-[#999]"}`}>{pathLabel(selected)}</span>
        <ChevronDown className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} size={17} />
      </button>
      {open ? <div aria-label="Choose category" className="absolute left-0 top-full z-[70] mt-8 w-full min-w-0 rounded-[6px] border border-[#b9d6e1] bg-white p-2 shadow-[0_3px_8px_rgba(0,0,0,0.09)]" id={`${id}-panel`} role="dialog">
        <div className="flex h-11 items-center gap-2 rounded-[5px] border border-[#b9d6e1] px-3 text-[#999]"><Search size={16} /><input aria-label="Search for categories" className="min-w-0 flex-1 bg-transparent text-sm text-[#5e5e5e] outline-none" onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }} placeholder="Search For Categories" ref={searchInput} value={search} /></div>
        {stage !== "main" && !search ? <button className="mt-4 flex max-w-full items-center gap-2 text-left text-sm text-[#5e5e5e]" onClick={() => { setStage(stage === "service" ? "sub" : "main"); setCreating(false); }} type="button"><ChevronLeft size={17} /><span className="truncate">{breadcrumb || "Main Categories"}</span></button> : null}
        <p className="mt-3 px-1 text-sm text-[#5e5e5e]">{search ? "Search Results" : heading}</p>
        <div className="mt-1 max-h-[min(260px,42vh)] overflow-y-auto pr-1">
          {!search && stage === "main" && mode === "filter" ? <button className="flex min-h-10 w-full items-center rounded-[4px] px-3 text-left text-sm text-[#196c88] hover:bg-[#f0f5f7]" onClick={() => { onChange(""); setOpen(false); }} type="button">All Categories</button> : null}
          {!search && stage === "sub" && mode === "filter" && main ? <button className="flex min-h-10 w-full items-center gap-2 rounded-[4px] px-3 text-left text-sm text-[#196c88] hover:bg-[#f0f5f7]" onClick={() => choose(main)} type="button">All in {main.name}</button> : null}
          {options.map((category, index) => {
            const Icon = icons[index % icons.length];
            const selectedRow = category.id === value;
            const unavailable = mode === "service" && (category.level === "legacy" || category.level === "service") && !selectedSubcategoryIds.includes(category.level === "legacy" ? category.id : category.parent_id ?? "");
            return <button aria-current={selectedRow ? "true" : undefined} className="flex min-h-10 w-full items-center gap-2 rounded-[4px] px-3 text-left text-sm text-[#666] hover:bg-[#f0f5f7] disabled:cursor-not-allowed disabled:opacity-45" disabled={unavailable} key={category.id} onClick={() => selectRow(category)} title={search ? pathLabel(category) : undefined} type="button"><Icon className="shrink-0 text-[#196c88]" size={17} /><span className="min-w-0 flex-1 truncate">{search ? pathLabel(category) : category.name}</span>{selectedRow ? <Check className="shrink-0 text-[#0a9f62]" size={17} /> : category.level === "main" || category.level === "sub" && mode === "service" ? <ChevronRight className="shrink-0 text-[#333]" size={17} /> : null}</button>;
          })}
          {!search && stage === "main" && includeLegacy ? <button className="flex min-h-10 w-full items-center gap-2 rounded-[4px] px-3 text-left text-sm text-[#666] hover:bg-[#f0f5f7]" onClick={() => setStage("legacy")} type="button"><BriefcaseBusiness className="text-[#196c88]" size={17} /><span className="flex-1">Legacy / Unmapped</span><ChevronRight size={17} /></button> : null}
          {options.length === 0 ? <p className="px-3 py-4 text-sm text-[#999]">No categories found</p> : null}
          {!search && stage === "service" && canCreate ? <button className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-[4px] bg-[#f5f9fa] px-3 text-left text-sm text-[#666] hover:bg-[#eaf3f6]" onClick={() => setCreating(true)} type="button"><Plus className="text-[#196c88]" size={18} />Add a Different service</button> : null}
        </div>
        {!search && stage === "service" && !selectedSubcategoryIds.includes(subId) ? <Link className="mt-3 block text-xs text-[#196c88] underline" href="/profile#categories">Select this subcategory on your profile first</Link> : null}
        {creating && canCreate ? <div className="mt-2 rounded-[6px] border border-[#b9d6e1] p-4 shadow-sm"><div className="flex justify-between gap-3 text-sm text-[#5e5e5e]"><span>Add a custom service</span><button aria-label="Close custom service" onClick={() => setCreating(false)} type="button"><X size={18} /></button></div><label className="mt-2 block text-xs text-[#999]">Enter the service name you offer<input className="mt-3 h-12 w-full rounded-[5px] border border-[#b9b9b9] px-3 text-sm text-[#5e5e5e] outline-none focus:border-[#196c88]" maxLength={100} minLength={2} onChange={(event) => setCustomName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void createService(); } }} placeholder="e.g Mobile App Design" value={customName} /></label>{createError ? <p className="mt-2 text-xs text-red-600">{createError}</p> : null}<div className="mt-3 flex justify-end gap-2"><button className="h-10 min-w-20 rounded-[5px] bg-[#196c88] px-4 text-sm text-white disabled:opacity-60" disabled={saving || customName.trim().length < 2} onClick={() => void createService()} type="button">{saving ? "Adding..." : "Add"}</button><button className="h-10 min-w-20 rounded-[5px] border border-[#196c88] px-4 text-sm text-[#196c88]" onClick={() => setCreating(false)} type="button">Cancel</button></div></div> : null}
      </div> : null}
    </div>
  );
}

export function ProfileCategorySelect({ categories, mainIds, categoryIds, onChange }: {
  categories: Category[];
  mainIds: string[];
  categoryIds: string[];
  onChange: (mains: string[], categories: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [legacy, setLegacy] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const byId = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const options = categories.filter((category) => {
    if (query.trim()) return ["main", "sub", "legacy"].includes(category.level ?? "") && category.name.toLowerCase().includes(query.toLowerCase());
    if (legacy) return category.level === "legacy";
    return parentId ? category.level === "sub" && category.parent_id === parentId : category.level === "main";
  });
  function toggle(category: Category) {
    if (category.level === "main") {
      if (mainIds.includes(category.id)) {
        onChange(mainIds.filter((id) => id !== category.id), categoryIds.filter((id) => byId.get(id)?.parent_id !== category.id));
      } else if (mainIds.length < 5) onChange([...mainIds, category.id], categoryIds);
    } else if (category.level === "legacy" || category.level === "sub" && category.parent_id && mainIds.includes(category.parent_id)) {
      onChange(mainIds, categoryIds.includes(category.id) ? categoryIds.filter((id) => id !== category.id) : [...categoryIds, category.id]);
    }
  }
  return <div className="relative" ref={root}>
    <button aria-expanded={open} className="flex h-12 w-full items-center justify-between rounded-[5px] border border-[#b9b9b9] bg-white px-4 text-left text-sm text-[#999]" onClick={() => setOpen(!open)} type="button">Select categories <ChevronDown size={16} /></button>
    {open ? <div className="absolute left-0 top-full z-[70] mt-2 w-full rounded-[6px] border border-[#b9d6e1] bg-white p-2 shadow-lg">
      <div className="flex h-10 items-center gap-2 rounded-[5px] border border-[#b9d6e1] px-3 text-[#999]"><Search size={16} /><input aria-label="Search for categories" className="min-w-0 flex-1 text-sm outline-none" onChange={(event) => setQuery(event.target.value)} placeholder="Search For Categories" value={query} /></div>
      {(parentId || legacy) && !query ? <button className="mt-3 flex items-center gap-2 text-sm text-[#5e5e5e]" onClick={() => { setParentId(null); setLegacy(false); }} type="button"><ChevronLeft size={16} />{parentId ? byId.get(parentId)?.name : "Main Categories"}</button> : null}
      <p className="mt-3 px-1 text-sm text-[#5e5e5e]">{query ? "Search Results" : legacy ? "Legacy / Unmapped" : parentId ? "Sub Categories" : "Categories"}</p>
      <div className="mt-1 max-h-[260px] overflow-y-auto">
        {options.map((category, index) => { const Icon = icons[index % icons.length]; const selected = category.level === "main" ? mainIds.includes(category.id) : categoryIds.includes(category.id); const disabled = category.level === "main" && !selected && mainIds.length >= 5 || category.level === "sub" && !mainIds.includes(category.parent_id ?? "");
          return <div className="flex min-h-10 items-center gap-2 rounded-[4px] px-2 text-sm text-[#666] hover:bg-[#f0f5f7]" key={category.id}><Icon className="shrink-0 text-[#196c88]" size={17} /><span className="min-w-0 flex-1 truncate" title={category.name}>{category.name}</span><AccentCheckbox aria-label={`Select ${category.name}`} checked={selected} disabled={disabled} onChange={() => toggle(category)}>{""}</AccentCheckbox>{category.level === "main" ? <button aria-label={`View ${category.name} subcategories`} className="p-1 text-[#333]" onClick={() => { setParentId(category.id); setLegacy(false); setQuery(""); }} type="button"><ChevronRight size={18} /></button> : null}</div>;
        })}
        {!query && !parentId && !legacy ? <button className="flex min-h-10 w-full items-center gap-2 px-2 text-left text-sm text-[#666]" onClick={() => setLegacy(true)} type="button"><BriefcaseBusiness className="text-[#196c88]" size={17} />Legacy / Unmapped<ChevronRight className="ml-auto" size={17} /></button> : null}
        {!options.length ? <p className="p-3 text-sm text-[#999]">No categories found</p> : null}
      </div>
    </div> : null}
    <div className="mt-3 flex flex-wrap gap-2">{[...mainIds, ...categoryIds].map((id) => { const category = byId.get(id); return category ? <button aria-label={`Remove ${category.name}`} className="inline-flex max-w-full items-center gap-2 rounded-[5px] bg-[#edf3f5] px-3 py-2 text-xs text-[#196c88]" key={id} onClick={() => toggle(category)} type="button"><span className="truncate">{category.name}</span><X size={14} /></button> : null; })}</div>
  </div>;
}
