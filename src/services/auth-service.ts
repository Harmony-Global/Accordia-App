import { apiFetch } from "@/services/http";
import type { Profile, Role } from "@/types";

export type AuthSession = {
  access_token: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = LoginPayload & {
  phone: string;
  role: Exclude<Role, "admin">;
  first_name: string;
  last_name: string;
};

export type LoginResponse = {
  session: AuthSession;
  profile: Profile;
  app_session_id: string;
};

export type RegisterResponse = {
  session: AuthSession | null;
  app_session_id: string | null;
  user: {
    id: string;
    email: string;
    phone: string;
    role: Role;
  };
};

export type OAuthProfilePayload = {
  role?: Exclude<Role, "admin">;
  phone?: string;
  first_name?: string;
  last_name?: string;
};

export type OAuthProfileResponse = {
  profile?: Profile;
  needs_profile: boolean;
  app_session_id?: string | null;
  required?: string[];
  user?: {
    email: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
};

export function login(payload: LoginPayload) {
  return apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: payload
  });
}

export function register(payload: RegisterPayload) {
  return apiFetch<RegisterResponse>("/api/auth/register", {
    method: "POST",
    body: payload
  });
}

export function startGoogleOAuth(redirectTo: string) {
  return apiFetch<{ url: string }>("/api/auth/oauth/google", {
    method: "POST",
    body: { redirect_to: redirectTo }
  });
}

export function completeOAuthProfile(token: string, payload: OAuthProfilePayload = {}) {
  return apiFetch<OAuthProfileResponse>("/api/auth/oauth/profile", {
    method: "POST",
    token,
    body: payload
  });
}

export function requestPasswordReset(email: string, redirectTo: string) {
  return apiFetch<{ message: string }>("/api/auth/password/forgot", {
    method: "POST",
    body: { email, redirect_to: redirectTo }
  });
}

export function resetPassword(token: string, password: string) {
  return apiFetch<{ message: string }>("/api/auth/password/reset", {
    method: "POST",
    token,
    body: { password }
  });
}
