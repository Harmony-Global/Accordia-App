import { apiFetch } from "@/services/http";
import type { ChatMessage, JobConversation } from "@/types";

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
