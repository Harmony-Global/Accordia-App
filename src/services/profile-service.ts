import { apiFetch, apiFormData } from "@/services/http";
import type { PortfolioEntry, Profile, ProfessionalService, ProfessionalServicesProgress } from "@/types";

export function getMyProfile(token: string) {
  return apiFetch<{ profile: Profile; professional_services_progress: ProfessionalServicesProgress | null;
    rating_average: number | null; review_count: number; portfolio: PortfolioEntry[]; verification_progress: number }>("/api/profile/me", { token });
}

export type ProfilePatch = {
  profile?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    location?: string | null;
    state?: string | null;
    avatar_url?: string | null;
  };
  professional_profile?: {
    bio?: string | null;
    years_experience?: number;
    location?: string | null;
    state?: string | null;
    is_available?: boolean;
  };
};

export function requestEmailChange(token: string, email: string) {
  return apiFetch<{ confirmation_sent: boolean }>("/api/profile/email-change", { token, method: "POST", body: { email } });
}

export function addPortfolioEntry(token: string, title: string, description: string, file: File) {
  const form = new FormData();
  form.append("title", title); form.append("description", description); form.append("file", file);
  return apiFormData<{ id: string }>("/api/professional/portfolio", form, token);
}

export function editPortfolioEntry(token: string, id: string, title: string, description: string, file?: File) {
  const form = new FormData();
  form.append("title", title); form.append("description", description);
  if (file) form.append("file", file);
  return apiFormData<{ updated: boolean }>(`/api/professional/portfolio/${id}`, form, token);
}

export function removePortfolioEntry(token: string, id: string) {
  return apiFetch<{ deleted: boolean }>(`/api/professional/portfolio/${id}`, { token, method: "DELETE" });
}

export function updateMyProfile(token: string, payload: ProfilePatch) {
  return apiFetch<{ updated: boolean }>("/api/profile/me", {
    token,
    method: "PATCH",
    body: payload
  });
}

export type ProfessionalServicePayload = {
  category_id?: string | null;
  offering_type: "service" | "product";
  title: string;
  description: string;
  image_url: string;
  image_urls?: string[];
  price_min: number;
  price_max: number;
  currency?: string;
  is_active?: boolean;
  is_visible_on_profile?: boolean;
};

export type ProfessionalServicePatch = Partial<ProfessionalServicePayload>;

export function getProfessionalServices(token: string, professionalId?: string) {
  const query = professionalId ? `?professional_id=${encodeURIComponent(professionalId)}` : "";
  return apiFetch<{ services: ProfessionalService[] } & ProfessionalServicesProgress>(`/api/professional/services${query}`, { token });
}

export function createProfessionalService(token: string, payload: ProfessionalServicePayload) {
  return apiFetch<{ service: ProfessionalService } & ProfessionalServicesProgress>("/api/professional/services", {
    token,
    method: "POST",
    body: payload
  });
}

export function updateProfessionalService(token: string, serviceId: string, payload: ProfessionalServicePatch) {
  return apiFetch<{ service: ProfessionalService }>(`/api/professional/services/${serviceId}`, {
    token,
    method: "PATCH",
    body: payload
  });
}

export type ServiceDetails = {
  service: ProfessionalService;
  professional: Pick<Profile, "first_name" | "last_name" | "avatar_url" | "phone_verified">;
  metrics: { profile_views: number; requests: number; completed: number };
  reviews: { id: string; rating: number; review_text: string | null; created_at: string;
    client?: { first_name: string; last_name: string; avatar_url?: string | null } | null }[];
};

export function getProfessionalServiceDetails(token: string, serviceId: string) {
  return apiFetch<ServiceDetails>(`/api/professional/services/${serviceId}`, { token });
}

export function deleteProfessionalService(token: string, serviceId: string) {
  return apiFetch<{ deleted: boolean; archived: boolean; service_id: string }>(`/api/professional/services/${serviceId}`, {
    token,
    method: "DELETE"
  });
}

export function uploadProfessionalServiceImage(token: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiFormData<{ image_url: string; path: string }>("/api/professional/services/upload", formData, token);
}

export function uploadProfileAvatar(token: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiFormData<{ avatar_url: string; path: string }>("/api/profile/avatar", formData, token);
}
