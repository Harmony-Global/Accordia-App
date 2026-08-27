"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearSession, getCachedProfile, getRole, getToken, saveCachedProfile, saveSession } from "@/lib/session";
import { isSessionExpiredError } from "@/services/http";
import { getMyProfile } from "@/services/profile-service";
import type { Profile } from "@/types";

type SessionContextValue = {
  token: string | null;
  role: string | null;
  profile: Profile | null;
  profileError: string;
  profileLoading: boolean;
  ready: boolean;
  sessionExpired: boolean;
  refreshProfile: () => Promise<void>;
  setSession: (accessToken: string, role: string, appSessionId: string, profile?: Profile | null) => void;
  updateProfile: (profile: Partial<Profile>) => void;
  clear: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const sessionExpiredMessage = "Your session has expired. Please log in again.";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const expireSession = useCallback(() => {
    clearSession();
    setToken(null);
    setRole(null);
    setProfile(null);
    setProfileError(sessionExpiredMessage);
    setProfileLoading(false);
    setSessionExpired(true);
    setReady(true);
  }, []);

  useEffect(() => {
    const storedToken = getToken();
    const cachedProfile = getCachedProfile();
    setToken(storedToken);
    setRole(getRole());
    setProfile(cachedProfile);
    setProfileLoading(Boolean(storedToken && !cachedProfile));
    setReady(true);
  }, []);

  useEffect(() => {
    window.addEventListener("accordia:session-expired", expireSession);
    return () => window.removeEventListener("accordia:session-expired", expireSession);
  }, [expireSession]);

  const refreshProfile = useCallback(async () => {
    if (!token) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileError("");
    setProfileLoading(true);
    try {
      const data = await getMyProfile(token);
      setProfile(data.profile);
      setRole(data.profile.role);
      saveCachedProfile(data.profile);
      setSessionExpired(false);
    } catch (err) {
      if (isSessionExpiredError(err)) {
        expireSession();
        return;
      }
      setProfileError(err instanceof Error ? err.message : "Could not load profile");
    } finally {
      setProfileLoading(false);
    }
  }, [expireSession, token]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const setSession = useCallback((accessToken: string, nextRole: string, appSessionId: string, nextProfile?: Profile | null) => {
    saveSession(accessToken, nextRole, appSessionId);
    setToken(accessToken);
    setRole(nextRole);
    setProfileError("");
    setSessionExpired(false);
    if (nextProfile !== undefined) {
      setProfile(nextProfile);
      saveCachedProfile(nextProfile);
      setProfileLoading(false);
    }
  }, []);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setProfile((current) => {
      if (!current) return current;
      const nextProfile = { ...current, ...patch };
      saveCachedProfile(nextProfile);
      return nextProfile;
    });
  }, []);

  const clear = useCallback(() => {
    clearSession();
    setToken(null);
    setRole(null);
    setProfile(null);
    setProfileError("");
    setProfileLoading(false);
    setSessionExpired(false);
  }, []);

  const value = useMemo(() => ({
    token,
    role,
    profile,
    profileError,
    profileLoading,
    ready,
    sessionExpired,
    refreshProfile,
    setSession,
    updateProfile,
    clear
  }), [clear, profile, profileError, profileLoading, ready, refreshProfile, role, sessionExpired, setSession, token, updateProfile]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside SessionProvider");
  return session;
}
