import { apiFetch } from "@/services/http";
import type { Verification } from "@/types";

export function getMyVerifications(token: string) {
  return apiFetch<{ verifications: Verification[] }>("/api/verifications/me", { token });
}

export function startPhoneVerification(token: string, phone?: string) {
  return apiFetch<{ verification: Verification; dev_code?: string }>("/api/verifications/phone/start", {
    token,
    method: "POST",
    body: phone ? { phone } : {}
  });
}

export function confirmPhoneVerification(token: string, code: string) {
  return apiFetch<{ verified: boolean; verification?: Verification }>("/api/verifications/phone/confirm", {
    token,
    method: "POST",
    body: { code }
  });
}
