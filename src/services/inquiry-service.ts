import { apiFetch } from "@/services/http";
import type { ChatMessage, ProfessionalInquiry } from "@/types";

export function getProfessionalInquiries(token: string) {
  return apiFetch<{ inquiries: ProfessionalInquiry[] }>("/api/professional-inquiries", { token });
}

export function startProfessionalInquiry(
  token: string,
  payload: {
    professional_id: string;
    service_id?: string | null;
    message: string;
  }
) {
  return apiFetch<{ inquiry: ProfessionalInquiry; message: ChatMessage }>("/api/professional-inquiries", {
    token,
    method: "POST",
    body: payload
  });
}

function appointmentQuery(appointmentId?: string | null) {
  return appointmentId ? `?appointment_id=${encodeURIComponent(appointmentId)}` : "";
}

export function getInquiryMessages(token: string, inquiryId: string, appointmentId?: string | null) {
  return apiFetch<{ messages: ChatMessage[] }>(`/api/professional-inquiries/${inquiryId}/messages${appointmentQuery(appointmentId)}`, { token });
}

export function sendInquiryMessage(token: string, inquiryId: string, body: string, appointmentId?: string | null) {
  return apiFetch<{ message: ChatMessage }>(`/api/professional-inquiries/${inquiryId}/messages${appointmentQuery(appointmentId)}`, {
    token,
    method: "POST",
    body: { body }
  });
}

export function markInquiryRead(token: string, inquiryId: string, appointmentId?: string | null) {
  return apiFetch<{ updated: number }>(`/api/professional-inquiries/${inquiryId}/read${appointmentQuery(appointmentId)}`, {
    token,
    method: "PATCH",
    body: {}
  });
}
