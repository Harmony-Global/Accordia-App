import { apiFetch } from "@/services/http";
import type { Profile } from "@/types";

export function getMyProfile(token: string) {
  return apiFetch<{ profile: Profile }>("/api/profile/me", { token });
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
    hourly_rate?: number | null;
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
