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
};

export type RegisterResponse = {
  session: AuthSession | null;
  user: {
    id: string;
    email: string;
    phone: string;
    role: Role;
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
