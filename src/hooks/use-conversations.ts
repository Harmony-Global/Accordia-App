"use client";

import { useCallback, useEffect, useState } from "react";
import { useRequireAuth } from "@/hooks/use-auth";
import { getConversations } from "@/services/conversation-service";
import type { JobConversation } from "@/types";

const CONVERSATION_AUTO_REFRESH_MS = 15000;
type RefreshOptions = { silent?: boolean };

function shouldAutoRefresh() {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

export function useConversations(jobId?: string | null) {
  const token = useRequireAuth();
  const [conversations, setConversations] = useState<JobConversation[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback((options: RefreshOptions = {}) => {
    if (!token) return;
    if (!options.silent) setLoading(true);
    setError("");
    return getConversations(token, jobId)
      .then((data) => setConversations(Array.isArray(data.conversations) ? data.conversations : []))
      .catch((err) => {
        setConversations([]);
        setError(err instanceof Error ? err.message : "Could not load chats");
      })
      .finally(() => {
        if (!options.silent) setLoading(false);
      });
  }, [jobId, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!token) return;

    const timer = window.setInterval(() => {
      if (shouldAutoRefresh()) void refresh({ silent: true });
    }, CONVERSATION_AUTO_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [refresh, token]);

  return { conversations, error, loading, refresh };
}
