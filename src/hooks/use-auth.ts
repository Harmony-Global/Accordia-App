"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/components/session-provider";
import { login, register, type LoginPayload, type RegisterPayload } from "@/services/auth-service";

export function useAuth() {
  const router = useRouter();
  const session = useSession();

  function logout() {
    session.clear();
    router.replace("/login");
  }

  return { token: session.token, role: session.role, profile: session.profile, logout };
}

export function useRequireAuth() {
  const router = useRouter();
  const { ready, sessionExpired, token } = useSession();

  useEffect(() => {
    if (ready && !token) {
      router.replace(sessionExpired ? "/login?reason=session-expired" : "/login");
    }
  }, [ready, router, sessionExpired, token]);

  return token;
}

export function useProfile() {
  const token = useRequireAuth();
  const { profile, profileError, profileLoading, refreshProfile } = useSession();
  return { profile, error: profileError, loading: profileLoading, token, refresh: refreshProfile };
}

export function useLoginAction() {
  const router = useRouter();
  const { setSession } = useSession();

  return async (payload: LoginPayload) => {
    const data = await login(payload);
    setSession(data.session.access_token, data.profile.role, data.app_session_id, data.profile);
    router.push("/dashboard");
  };
}

export function useRegisterAction() {
  const router = useRouter();
  const { setSession } = useSession();

  return async (payload: RegisterPayload) => {
    const data = await register(payload);
    if (data.session?.access_token && data.app_session_id) {
      setSession(data.session.access_token, data.user.role, data.app_session_id, null);
      router.push(data.user.role === "professional" ? "/professional/categories" : "/dashboard");
      return;
    }
    router.push("/login");
  };
}

