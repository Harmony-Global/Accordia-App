import { apiFetch, apiFormData } from "@/services/http";
import type { Profile, ProfessionalService, ProfessionalServicesProgress } from "@/types";

export function getMyProfile(token: string) {
  return apiFetch<{ profile: Profile; professional_services_progress: ProfessionalServicesProgress | null }>("/api/profile/me", { token });
}

export type ProfilePatch = {
  profile?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
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
  price_min: number;
  price_max: number;
  currency?: string;
  is_active?: boolean;
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

export function deleteProfessionalService(token: string, serviceId: string) {
  return apiFetch<{ deleted: boolean; service_id: string }>(`/api/professional/services/${serviceId}`, {
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
