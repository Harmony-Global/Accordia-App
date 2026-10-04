"use client";

import Link from "next/link";
import { ArrowLeft, Bell, CheckCircle2, Eye, ImagePlus, MoreHorizontal, Pencil, Plus, ShieldCheck, Star, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { CategorySelect } from "@/components/category-select";
import { useToast } from "@/components/toast";
import { AccentCheckbox, Button, CustomSelect, ProfileAvatar, SkeletonBlock, Spinner, SurfaceModal } from "@/components/ui";
import { useProfile } from "@/hooks/use-auth";
import { useCategories } from "@/hooks/use-categories";
import { createServiceCategory } from "@/services/category-service";
import { createProfessionalService, deleteProfessionalService, getProfessionalServiceDetails, getProfessionalServices, updateProfessionalService, uploadProfessionalServiceImage, type ServiceDetails } from "@/services/profile-service";
import type { Category, ProfessionalService } from "@/types";

type Mode = "list" | "form" | "detail";
type Action = "pause" | "resume" | "remove";
const money = (service: ProfessionalService) => `${service.currency} ${Number(service.price_min).toLocaleString()}`;
const field = "mt-2 h-12 w-full rounded-[5px] border border-[#b9b9b9] bg-white px-4 text-sm text-[#5e5e5e]";

export default function MyServicesPage() {
  const { profile, token } = useProfile();
  const { categories: loadedCategories, selectedCategoryIds } = useCategories("hierarchy");
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<ProfessionalService[]>([]);
  const [mode, setMode] = useState<Mode>("list");
  const [editing, setEditing] = useState<ProfessionalService | null>(null);
  const [detail, setDetail] = useState<ServiceDetails | null>(null);
  const [more, setMore] = useState<{ service: ProfessionalService; left: number; top: number } | null>(null);
  const [confirm, setConfirm] = useState<{ service: ProfessionalService; action: Action } | null>(null);
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [offeringType, setOfferingType] = useState<"service" | "product">("service");

  useEffect(() => setCategories(loadedCategories), [loadedCategories]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "create") setMode("form");
    if (params.get("view") === "edit" && services.length && categories.length && !editing) {
      const service = services.find((item) => item.id === params.get("id"));
      if (service) form(service);
    }
  }, [services, categories, editing]);
  const refresh = useCallback(async () => {
    if (!token) return;
    try { setServices((await getProfessionalServices(token)).services); }
    catch (error) { toast({ tone: "error", title: "Could not load services", body: error instanceof Error ? error.message : "Please try again." }); }
    finally { setLoading(false); }
  }, [token, toast]);
  useEffect(() => { void refresh(); }, [refresh]);

  const counts = useMemo(() => ({
    active: services.filter((service) => service.is_active).length,
    paused: services.filter((service) => !service.is_active).length
  }), [services]);
  const selectedCategory = categories.find((category) => category.id === categoryId);

  useEffect(() => {
    if (!more) return;
    const close = () => setMore(null);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => { window.removeEventListener("resize", close); window.removeEventListener("scroll", close, true); };
  }, [more]);

  function openMore(event: React.MouseEvent<HTMLButtonElement>, service: ProfessionalService) {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
    const top = Math.max(12, Math.min(rect.bottom + 12, window.innerHeight - 244));
    setMore({ service, left, top });
  }

  function addFiles(selected: File[]) {
    if (selected.length + files.length + imageUrls.length > 5) {
      toast({ tone: "error", title: "Maximum five images", body: "Remove an image before adding another." });
      return;
    }
    if (selected.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size < 1 || file.size > 5 * 1024 * 1024)) {
      toast({ tone: "error", title: "Invalid image", body: "Use JPEG, PNG, or WebP images under 5 MB." });
      return;
    }
    setFiles((current) => [...current, ...selected]);
  }

  function list() {
    setMode("list"); setEditing(null); setDetail(null);
    window.history.replaceState(null, "", "/professional/services");
  }
  function form(service: ProfessionalService | null) {
    setEditing(service); setMore(null); setMode("form");
    setOfferingType(service?.offering_type ?? "service");
    setCategoryId(service?.category_id ?? "");
    setImageUrls(service ? service.images?.length ? [...service.images].sort((a, b) => a.position - b.position).map((item) => item.image_url) : [service.image_url] : []);
    setFiles([]);
    window.history.replaceState(null, "", service ? `/professional/services?view=edit&id=${service.id}` : "/professional/services?view=create");
  }
  async function showDetail(service: ProfessionalService) {
    if (!token) return;
    setMore(null); setMode("detail"); setDetail(null);
    try { setDetail(await getProfessionalServiceDetails(token, service.id)); }
    catch (error) { toast({ tone: "error", title: "Could not load service", body: error instanceof Error ? error.message : "Please try again." }); }
  }
  async function addCategory(parentId: string, name: string) {
    if (!token) throw new Error("You need to log in again");
    try {
      const result = await createServiceCategory(token, parentId, name);
      setCategories((current) => [...current, result.category]);
      toast({ tone: "success", title: "Service Category added" });
      return result.category;
    } catch (error) {
      toast({ tone: "error", title: "Could not add category", body: error instanceof Error ? error.message : "Please try again." });
      throw error;
    }
  }
  async function runAction() {
    if (!token || !confirm) return;
    setBusy(true);
    try {
      if (confirm.action === "remove") await deleteProfessionalService(token, confirm.service.id);
      else await updateProfessionalService(token, confirm.service.id, { is_active: confirm.action === "resume" });
      toast({ tone: "success", title: confirm.action === "remove" ? "Service removed" : confirm.action === "pause" ? "Service paused" : "Service resumed" });
      setConfirm(null); await refresh();
    } catch (error) {
      toast({ tone: "error", title: "Could not update service", body: error instanceof Error ? error.message : "Please try again." });
    } finally { setBusy(false); }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    if (offeringType === "service" && (!categoryId || !["service", "legacy"].includes(selectedCategory?.level ?? ""))) {
      toast({ tone: "error", title: "Choose a Service Category" }); return;
    }
    if (imageUrls.length + files.length < 1 || imageUrls.length + files.length > 5) {
      toast({ tone: "error", title: "Add one to five images" }); return;
    }
    if (files.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size < 1 || file.size > 5 * 1024 * 1024)) {
      toast({ tone: "error", title: "Invalid image", body: "Use JPEG, PNG, or WebP images under 5 MB." }); return;
    }
    const data = new FormData(event.currentTarget);
    const price = Number(data.get("price"));
    if (!Number.isFinite(price) || price < 0 || (offeringType === "service" && price === 0)) { toast({ tone: "error", title: "Enter a valid fixed price" }); return; }
    setBusy(true);
    try {
      const uploaded = await Promise.all(files.map((file) => uploadProfessionalServiceImage(token, file)));
      const urls = [...imageUrls, ...uploaded.map((image) => image.image_url)];
      const payload = {
        category_id: categoryId || null, offering_type: offeringType, title: String(data.get("title")).trim(),
        description: String(data.get("description")).trim(), image_url: urls[0], image_urls: urls,
        price_min: price, price_max: price, currency: String(data.get("currency") || "NGN"),
        is_visible_on_profile: data.get("visible") === "on"
      };
      if (editing) await updateProfessionalService(token, editing.id, payload);
      else await createProfessionalService(token, { ...payload, is_active: true });
      setSuccess(editing ? "Offering Edited" : "Offering added"); await refresh();
    } catch (error) {
      toast({ tone: "error", title: "Could not save offering", body: error instanceof Error ? error.message : "Please try again." });
    } finally { setBusy(false); }
  }

  return <AppShell>
    <main className="mx-auto w-full max-w-[1280px] px-5 py-8 md:px-8 lg:px-10">
      {mode === "list" ? <>
        <p className="text-lg font-medium text-[#196c88]">My Services</p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl text-[#626262] md:text-4xl">Manage services you offer here</h1>
          <button className="inline-flex items-center gap-2 text-[#196c88]" onClick={() => form(null)} type="button"><Plus size={20} /> Create Service</button>
        </div>
        <div className="mt-8 flex gap-5 text-lg font-medium"><span className="text-[#078053]">Active ({loading ? "..." : counts.active})</span><span className="text-[#c48100]">Paused ({loading ? "..." : counts.paused})</span></div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {loading ? Array.from({ length: 3 }, (_, index) => <article aria-label="Loading service" className="overflow-hidden rounded-[6px] border border-[#b8d1da] bg-white" key={index}><SkeletonBlock className="aspect-[16/8.5] w-full" /><div className="space-y-3 p-5"><SkeletonBlock className="h-5 w-2/3" /><SkeletonBlock className="h-7 w-4/5" /><SkeletonBlock className="h-16 w-full" /><SkeletonBlock className="h-5 w-1/3" /></div></article>) : null}
          {services.map((service) => <article className="overflow-hidden rounded-[6px] border border-[#b8d1da] bg-white" key={service.id}>
            <img alt="" className="aspect-[16/8.5] w-full bg-[#eef4f6] object-cover" src={service.image_url} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-2"><p className="min-w-0 truncate text-lg font-medium text-[#196c88]">{service.offering_type.toUpperCase()} | {service.category?.name ?? "Uncategorized"}</p><button aria-label={`Manage ${service.title}`} className="p-1" onClick={(event) => openMore(event, service)} type="button"><MoreHorizontal size={20} /></button></div>
              <h2 className="mt-3 line-clamp-2 text-xl text-[#5e5e5e]">{service.title}</h2>
              <p className="mt-3 min-h-14 line-clamp-3 text-sm leading-5 text-[#777]">{service.description}</p>
              <p className="mt-5 text-lg font-medium text-[#555]">{money(service)}</p>
              <div className="mt-3 flex items-center justify-between gap-3"><span className={service.is_active ? "text-[#078053]" : "text-[#c48100]"}>{service.is_active ? "Active" : "Paused"}</span><button className="rounded-[5px] border border-[#196c88] px-3 py-1 text-sm text-[#196c88]" onClick={() => setConfirm({ service, action: service.is_active ? "pause" : "resume" })} type="button">{service.is_active ? "Pause" : "Resume"}</button></div>
              {!service.is_visible_on_profile ? <p className="mt-2 text-xs text-[#777]">Hidden from profile and booking</p> : null}
            </div>
          </article>)}
        </div>
        {!loading && services.length === 0 ? <p className="mt-8 text-[#777]">No offerings yet.</p> : null}
      </> : null}
      {mode === "form" ? <>
        <button className="inline-flex items-center gap-2 text-sm text-[#196c88]" onClick={list} type="button"><ArrowLeft size={16} />My Services</button>
        <p className="mt-5 text-lg font-medium text-[#196c88]">{editing ? "Edit Offering" : "Create Service"}</p>
        <h1 className="mt-6 text-2xl text-[#626262] md:text-4xl">{editing ? "Make adjustments to this offering" : "What are you offering clients? Add to the list"}</h1>
        <form className="mt-8 rounded-[6px] border border-[#e4e9eb] bg-white p-5 md:p-10" onSubmit={save}>
          <h2 className="text-2xl text-[#5e5e5e]">{editing ? "Edit Offering" : "Add Offering"}</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="text-sm text-[#5e5e5e]">Offering Title<input className={field} defaultValue={editing?.title} maxLength={160} minLength={3} name="title" required /></label>
            <label className="text-sm text-[#5e5e5e]">Offering Type<CustomSelect className="mt-2" triggerClassName="h-12 rounded-[5px] border-[#b9b9b9] px-4 text-sm" onChange={(event) => { setOfferingType(event.target.value as "service" | "product"); setCategoryId(""); }} value={offeringType}><option value="service">Service</option><option value="product">Product</option></CustomSelect></label>
            <div className="min-w-0 text-sm text-[#5e5e5e]">Category<CategorySelect categories={categories} className="mt-2" disabled={!categories.length} includeLegacy mode={offeringType === "service" ? "service" : "subcategory"} onChange={setCategoryId} onCreateService={addCategory} ownerId={profile?.id} selectedSubcategoryIds={selectedCategoryIds} value={categoryId} /></div>
            <label className="text-sm text-[#5e5e5e]">Currency type<CustomSelect className="mt-2" defaultValue={editing?.currency ?? "NGN"} name="currency" triggerClassName="h-12 rounded-[5px] border-[#b9b9b9] px-4 text-sm"><option value="NGN">NGN</option></CustomSelect></label>
            <label className="text-sm text-[#5e5e5e]">Fixed Price<input className={field} defaultValue={editing?.price_min} min={offeringType === "service" ? "0.01" : "0"} name="price" required step="0.01" type="number" /></label>
            <label className="text-sm text-[#5e5e5e] md:col-span-2">Offering Description<textarea className="mt-2 min-h-36 w-full rounded-[5px] border border-[#b9b9b9] p-4" defaultValue={editing?.description} maxLength={3000} minLength={10} name="description" required /></label>
          </div>
          <div className="mt-5"><h3 className="text-sm font-medium text-[#5e5e5e]">Attachments</h3><p className="text-sm text-[#888]">Add images that support your offering (JPEG, PNG, WebP)</p>
            <div className="mt-3 flex flex-wrap gap-2">{imageUrls.map((url, index) => <div className="flex items-center gap-2 rounded-[5px] border border-[#b9b9b9] px-3 py-2 text-sm" key={url}><img alt="" className="h-8 w-8 object-cover" src={url} />Image {index + 1}<button aria-label={`Remove image ${index + 1}`} onClick={() => setImageUrls((current) => current.filter((item) => item !== url))} type="button"><X size={16} /></button></div>)}{files.map((file, index) => <div className="flex items-center gap-2 rounded-[5px] border border-[#b9b9b9] px-3 py-2 text-sm" key={`${file.name}-${index}`}><ImagePlus size={18} /><span className="max-w-40 truncate">{file.name}</span><button aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, position) => position !== index))} type="button"><X size={16} /></button></div>)}</div>
            <label className="mt-4 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-[5px] border border-dashed border-[#b9b9b9] text-center text-sm text-[#196c88]" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(Array.from(event.dataTransfer.files)); }}><span>Click to upload or drag and drop files</span><span className="mt-1 text-[#999]">Maximum 5 images, 5 MB each</span><input accept="image/jpeg,image/png,image/webp" className="sr-only" multiple onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} type="file" /></label>
          </div>
          <AccentCheckbox className="mt-5" defaultChecked={editing?.is_visible_on_profile ?? true} name="visible">Show this offering on my profile</AccentCheckbox>
          <div className="mt-5"><Button className="gap-2" disabled={busy} type="submit">{busy ? <Spinner /> : <Plus size={16} />}{editing ? "Save" : "Add Offering"}</Button></div>
          {offeringType === "service" ? <div className="mx-auto mt-8 flex w-full max-w-[760px] items-start gap-2 rounded-[5px] border border-[#f3cc72] bg-[#fffbea] px-4 py-3 text-xs leading-5 text-[#666]"><Bell aria-hidden="true" className="mt-0.5 shrink-0 text-[#ee9a13]" size={17} strokeWidth={1.8} /><span>Accordia charges professionals 10% service fee on completed services. This fee is deducted from your earnings when payment is realised.</span></div> : null}
        </form>
      </> : null}
      {mode === "detail" ? <>
        <button className="inline-flex items-center gap-2 text-sm text-[#196c88]" onClick={list} type="button"><ArrowLeft size={16} />My Services</button>
        {!detail ? <div className="mt-8"><Spinner /></div> : <div className="mt-7 rounded-[6px] border border-[#b8d1da] bg-white p-5 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-5 border-b border-dashed border-[#b9b9b9] pb-6"><div className="flex items-center gap-4"><ProfileAvatar avatarUrl={detail.professional.avatar_url} className="h-16 w-16" /><div><h1 className="text-xl text-[#5e5e5e]">{detail.professional.first_name} {detail.professional.last_name}</h1><p className={detail.professional.phone_verified ? "text-[#078053]" : "text-[#999]"}>{detail.professional.phone_verified ? "Verified" : "Phone not verified"}</p></div></div><p className="text-sm text-[#999]">Created on {new Date(detail.service.created_at).toLocaleString()}</p></div>
          <div className="mt-6 flex justify-end"><button className="inline-flex items-center gap-2 text-[#196c88]" onClick={() => form(detail.service)} type="button"><Pencil size={17} />Edit Service</button></div>
          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]"><div><div className="grid grid-cols-3 gap-3">{([["Profile Views", detail.metrics.profile_views], ["Requests", detail.metrics.requests], ["Completed", detail.metrics.completed]] as const).map(([label, value]) => <div className="rounded-[6px] border border-[#b8d1da] bg-[#f7fafb] p-3 text-center" key={label}><p className="text-sm text-[#666]">{label}</p><strong className="mt-2 block text-2xl text-[#5e5e5e]">{value}</strong></div>)}</div><p className="mt-2 text-xs text-[#888]">Profile views are tracked from this release onward.</p><section className="mt-6 rounded-[6px] border border-[#b8d1da] p-5"><h2 className="text-2xl text-[#5e5e5e]">{detail.service.title}</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#777]">{detail.service.description}</p><div className="mt-5 flex flex-wrap justify-between gap-3 text-[#5e5e5e]"><span>Fixed Price: {money(detail.service)}</span><span>Offering Type: {detail.service.offering_type}</span></div><div className="mt-4 flex flex-wrap gap-2">{(detail.service.images ?? []).map((item) => <img alt="Service example" className="h-24 w-24 rounded-[4px] object-cover" key={item.image_url} src={item.image_url} />)}</div></section></div>
            <aside className="space-y-5"><div className="rounded-[6px] border border-[#b8d1da] bg-[#f7fafb] p-5">{detail.professional.phone_verified ? <><ShieldCheck className="text-[#0a9f62]" size={28} /><p className="mt-3 text-[#666]">Clients can confidently trust your service and delivery.</p></> : <><h2 className="text-xl text-[#5e5e5e]">Boost Credibility</h2><p className="mt-3 text-[#777]">Help clients see you as a credible professional for hire.</p><Link className="mt-5 inline-flex rounded-[5px] bg-[#196c88] px-4 py-2 text-white" href="/profile">Verify Now</Link></>}</div><div className="rounded-[6px] border border-[#b8d1da] bg-[#f7fafb] p-5"><h2 className="text-xl text-[#5e5e5e]">Recent Reviews</h2>{detail.reviews.length ? detail.reviews.map((review) => <div className="mt-4" key={review.id}><p className="text-sm text-[#666]">{review.client?.first_name} {review.client?.last_name} <span aria-label={`${review.rating} out of 5 stars`} className="inline-flex text-[#ee9a13]">{Array.from({ length: review.rating }, (_, index) => <Star fill="currentColor" key={index} size={14} />)}</span></p><p className="mt-1 text-sm text-[#777]">{review.review_text}</p></div>) : <p className="mt-3 text-sm text-[#999]">No appointment reviews yet.</p>}</div></aside>
          </div>
        </div>}
      </> : null}
    </main>
    {more ? <><button aria-label="Close Manage Services" className="fixed inset-0 z-[70] bg-black/25" onClick={() => setMore(null)} type="button" /><div aria-label="Manage Services" className="fixed z-[80] w-[min(360px,calc(100vw-24px))] rounded-[6px] bg-white p-5 shadow-xl" role="dialog" style={{ left: more.left, top: more.top }}><div className="flex items-center justify-between gap-3"><h2 className="text-xl text-[#5e5e5e]">Manage Services</h2><button aria-label="Close" onClick={() => setMore(null)} type="button"><X size={20} /></button></div><div className="mt-4 border-t border-[#999] pt-2"><button className="flex w-full items-center gap-3 py-2 text-sm text-[#666] hover:text-[#196c88]" onClick={() => void showDetail(more.service)} type="button"><Eye size={17} />View Service</button><button className="flex w-full items-center gap-3 py-2 text-sm text-[#666] hover:text-[#196c88]" onClick={() => form(more.service)} type="button"><Pencil size={17} />Edit Service</button><button className="flex w-full items-center gap-3 py-2 text-sm text-[#666] hover:text-[#196c88]" onClick={() => { setConfirm({ service: more.service, action: "remove" }); setMore(null); }} type="button"><Trash2 size={17} />Remove Service</button></div></div></> : null}
    {confirm ? <SurfaceModal onClose={() => setConfirm(null)} size="sm"><div className="p-6 text-center"><button aria-label="Close" className="absolute right-4 top-4" onClick={() => setConfirm(null)} type="button"><X size={20} /></button><h2 className="text-xl text-[#5e5e5e]">Are you sure?</h2><p className="mt-4 text-sm leading-6 text-[#666]">{confirm.action === "pause" ? "Pausing will not affect existing appointments. This service will not accept new requests until resumed." : confirm.action === "resume" ? "This service will become available again if it is shown on your profile." : "The service will be removed. Historical appointments and receipts remain available."}</p><div className="mt-5 flex justify-center gap-2"><Button onClick={() => setConfirm(null)} type="button" variant="secondary">Cancel</Button><Button disabled={busy} onClick={() => void runAction()} type="button">{busy ? <Spinner /> : confirm.action === "pause" ? "Pause Service" : confirm.action === "resume" ? "Resume" : "Remove Service"}</Button></div></div></SurfaceModal> : null}
    {success ? <SurfaceModal onClose={() => { setSuccess(""); list(); }} size="sm"><div className="flex min-h-72 flex-col items-center justify-center p-8"><CheckCircle2 className="text-[#078053]" size={88} strokeWidth={1.5} /><h2 className="mt-6 text-2xl text-[#5e5e5e]">{success}</h2><Button className="mt-6" onClick={() => { setSuccess(""); list(); }} type="button">Done</Button></div></SurfaceModal> : null}
  </AppShell>;
}
