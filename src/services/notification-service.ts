import { apiFetch } from "@/services/http";
import type { Notification } from "@/types";

export function getNotifications(token: string, unreadOnly = false) {
  return apiFetch<{ notifications: Notification[] }>(`/api/notifications${unreadOnly ? "?unread=true" : ""}`, { token });
}

export function markNotificationRead(token: string, notificationId: string, isRead = true) {
  return apiFetch<{ notification: Notification }>(`/api/notifications/${notificationId}/read`, {
    token,
    method: "PATCH",
    body: { is_read: isRead }
  });
}
