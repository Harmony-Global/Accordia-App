import { apiFetch, apiFormData } from "@/services/http";
import type { ChatMessage, DeliverableAttachment, JobConversation, JobQuote, JobQuoteAttachment } from "@/types";

export function getConversations(token: string, jobId?: string | null) {
  const query = jobId ? `?job_id=${encodeURIComponent(jobId)}` : "";
  return apiFetch<{ conversations: JobConversation[] }>(`/api/conversations${query}`, { token });
}

export function getConversationMessages(token: string, conversationId: string) {
  return apiFetch<{ messages: ChatMessage[] }>(`/api/conversations/${conversationId}/messages`, { token });
}

export function sendConversationMessage(token: string, conversationId: string, body: string) {
  return apiFetch<{ message: ChatMessage }>(`/api/conversations/${conversationId}/messages`, {
    token,
    method: "POST",
    body: { body }
  });
}

export function setConversationWorkSchedule(token: string, conversationId: string, startsAt: string, endsAt: string) {
  return apiFetch<{ conversation: JobConversation; message: ChatMessage }>(`/api/conversations/${conversationId}/schedule`, {
    token,
    method: "POST",
    body: {
      starts_at: startsAt,
      ends_at: endsAt
    }
  });
}

export function getConversationQuotes(token: string, conversationId: string) {
  return apiFetch<{ quotes: JobQuote[] }>(`/api/conversations/${conversationId}/quotes`, { token, cacheTtlMs: 0 });
}

export function sendConversationQuote(
  token: string,
  conversationId: string,
  payload: {
    project_title: string;
    project_description: string;
    total_budget: number;
    duration_days: number;
    attachments?: JobQuoteAttachment[];
  }
) {
  return apiFetch<{ quote: JobQuote; message: ChatMessage }>(`/api/conversations/${conversationId}/quotes`, {
    token,
    method: "POST",
    body: { ...payload, attachments: payload.attachments ?? [] }
  });
}

export function acceptConversationQuote(token: string, conversationId: string, quoteId: string) {
  return apiFetch<{ quote: JobQuote; message?: ChatMessage }>(`/api/conversations/${conversationId}/quotes/${quoteId}/accept`, {
    token,
    method: "POST",
    body: {}
  });
}

export function requestConversationQuoteReview(token: string, conversationId: string, quoteId: string, note: string) {
  return apiFetch<{ quote: JobQuote; message?: ChatMessage }>(`/api/conversations/${conversationId}/quotes/${quoteId}/review`, {
    token,
    method: "POST",
    body: { note }
  });
}

export function uploadConversationQuoteAttachment(token: string, conversationId: string, quoteId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFormData<{ attachment: JobQuoteAttachment; quote: JobQuote }>(
    `/api/conversations/${conversationId}/quotes/${quoteId}/attachments`,
    formData,
    token
  );
}

export function getConversationQuoteAttachmentAccess(token: string, conversationId: string, quoteId: string, attachmentId: string) {
  return apiFetch<{ attachment: JobQuoteAttachment; signed_url: string; expires_in: number }>(
    `/api/conversations/${conversationId}/quotes/${quoteId}/attachments/${attachmentId}`,
    { token }
  );
}

export function hireConversationProfessional(token: string, conversationId: string) {
  return apiFetch<{ conversation: JobConversation; application: JobConversation["application"] }>(`/api/conversations/${conversationId}/hire`, {
    token,
    method: "POST",
    body: {}
  });
}

export function markConversationRead(token: string, conversationId: string) {
  return apiFetch<{ updated: number }>(`/api/conversations/${conversationId}/read`, {
    token,
    method: "PATCH",
    body: {}
  });
}

export function uploadConversationDeliverable(token: string, conversationId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFormData<{ deliverable: DeliverableAttachment; conversation: JobConversation }>(
    `/api/conversations/${conversationId}/deliverables`,
    formData,
    token
  );
}

export function getConversationDeliverableAccess(token: string, conversationId: string, deliverableId: string) {
  return apiFetch<{ deliverable: DeliverableAttachment; signed_url: string; expires_in: number }>(
    `/api/conversations/${conversationId}/deliverables/${deliverableId}`,
    { token }
  );
}

export function makeConversationFinalPayment(token: string, conversationId: string) {
  return apiFetch<{ conversation: JobConversation }>(`/api/conversations/${conversationId}/final-payment`, {
    token,
    method: "POST",
    body: {}
  });
}

export function confirmConversationCompletion(token: string, conversationId: string) {
  return apiFetch<{ conversation: JobConversation }>(`/api/conversations/${conversationId}/complete`, {
    token,
    method: "POST",
    body: {}
  });
}

export function requestConversationRevision(token: string, conversationId: string, note: string) {
  return apiFetch<{ conversation: JobConversation }>(`/api/conversations/${conversationId}/revision`, {
    token,
    method: "POST",
    body: { note }
  });
}

export function reviewConversationProfessional(
  token: string,
  conversationId: string,
  payload: { rating?: number | null; review_text?: string | null; skipped?: boolean }
) {
  return apiFetch<{ conversation: JobConversation }>(`/api/conversations/${conversationId}/review`, {
    token,
    method: "POST",
    body: payload
  });
}
