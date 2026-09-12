"use client";

import type { Profile } from "@/types";

const TOKEN_KEY = "accordia_access_token";
const REFRESH_TOKEN_KEY = "accordia_refresh_token";
const ROLE_KEY = "accordia_role";
const PROFILE_KEY = "accordia_profile";
export const APP_SESSION_ID_KEY = "accordia_app_session_id";

function storage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export function saveSession(accessToken: string, role: string, appSessionId: string, refreshToken?: string | null) {
  const store = storage();
  if (!store) return;
  store.setItem(TOKEN_KEY, accessToken);
  store.setItem(ROLE_KEY, role);
  store.setItem(APP_SESSION_ID_KEY, appSessionId);
  if (refreshToken) store.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function getToken() {
  return storage()?.getItem(TOKEN_KEY) ?? null;
}

export function getRefreshToken() {
  return storage()?.getItem(REFRESH_TOKEN_KEY) ?? null;
}

export function getRole() {
  return storage()?.getItem(ROLE_KEY) ?? null;
}

export function getAppSessionId() {
  return storage()?.getItem(APP_SESSION_ID_KEY) ?? null;
}

export function saveCachedProfile(profile: Profile | null) {
  const store = storage();
  if (!store) return;
  if (profile) {
    store.setItem(PROFILE_KEY, JSON.stringify(profile));
  } else {
    store.removeItem(PROFILE_KEY);
  }
}

export function getCachedProfile() {
  const store = storage();
  if (!store) return null;
  const rawProfile = store.getItem(PROFILE_KEY);
  if (!rawProfile) return null;

  try {
    return JSON.parse(rawProfile) as Profile;
  } catch {
    store.removeItem(PROFILE_KEY);
    return null;
  }
}

export function clearSession() {
  const store = storage();
  if (!store) return;
  store.removeItem(TOKEN_KEY);
  store.removeItem(REFRESH_TOKEN_KEY);
  store.removeItem(ROLE_KEY);
  store.removeItem(PROFILE_KEY);
  store.removeItem(APP_SESSION_ID_KEY);
}
