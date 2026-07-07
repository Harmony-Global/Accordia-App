import { apiFetch } from "@/services/http";
import type { Appointment, AppointmentAvailability } from "@/types";

export function getAvailability(token: string, professionalId?: string) {
  const params = new URLSearchParams();
  if (professionalId) params.set("professional_id", professionalId);
  const query = params.toString();
  return apiFetch<{ availability: AppointmentAvailability[] }>(`/api/appointments/availability${query ? `?${query}` : ""}`, { token });
}

export function createAvailability(
  token: string,
  payload: {
    service_id?: string | null;
    starts_at: string;
    ends_at: string;
    note?: string | null;
  }
) {
  return apiFetch<{ availability: AppointmentAvailability }>("/api/appointments/availability", {
    token,
    method: "POST",
    body: payload
  });
}

export function deleteAvailability(token: string, availabilityId: string) {
  return apiFetch<{ ok: true }>(`/api/appointments/availability/${availabilityId}`, {
    token,
    method: "DELETE"
  });
}

export function getAppointments(token: string) {
  return apiFetch<{ appointments: Appointment[] }>("/api/appointments", { token });
}

export function requestAppointment(
  token: string,
  payload: {
    availability_id: string;
    service_id?: string | null;
    inquiry_id?: string | null;
    note?: string | null;
  }
) {
  return apiFetch<{ appointment: Appointment }>("/api/appointments", {
    token,
    method: "POST",
    body: payload
  });
}

export function updateAppointmentStatus(
  token: string,
  appointmentId: string,
  status: "accepted" | "declined" | "cancelled" | "completed"
) {
  return apiFetch<{ appointment: Appointment }>(`/api/appointments/${appointmentId}/status`, {
    token,
    method: "PATCH",
    body: { status }
  });
}
