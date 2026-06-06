"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearSession, getRole, getToken, saveSession } from "@/lib/session";
import { getMyProfile } from "@/services/profile-service";
import type { Profile } from "@/types";

type SessionContextValue = {
  token: string | null;
  role: string | null;
  profile: Profile | null;
  profileError: string;
  profileLoading: boolean;
  ready: boolean;
  refreshProfile: () => Promise<void>;
  setSession: (accessToken: string, role: string, profile?: Profile | null) => void;
  updateProfile: (profile: Partial<Profile>) => void;
  clear: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedToken = getToken();
    setToken(storedToken);
    setRole(getRole());
    setProfileLoading(Boolean(storedToken));
    setReady(true);
  }, []);

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
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Could not load profile");
    } finally {
      setProfileLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const setSession = useCallback((accessToken: string, nextRole: string, nextProfile?: Profile | null) => {
    saveSession(accessToken, nextRole);
    setToken(accessToken);
    setRole(nextRole);
    if (nextProfile !== undefined) {
      setProfile(nextProfile);
      setProfileLoading(false);
    }
  }, []);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setProfile((current) => current ? { ...current, ...patch } : current);
  }, []);

  const clear = useCallback(() => {
    clearSession();
    setToken(null);
    setRole(null);
    setProfile(null);
    setProfileError("");
    setProfileLoading(false);
  }, []);

  const value = useMemo(() => ({
    token,
    role,
    profile,
    profileError,
    profileLoading,
    ready,
    refreshProfile,
    setSession,
    updateProfile,
    clear
  }), [clear, profile, profileError, profileLoading, ready, refreshProfile, role, setSession, token, updateProfile]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside SessionProvider");
  return session;
}
