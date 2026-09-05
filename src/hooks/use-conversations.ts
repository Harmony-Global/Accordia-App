"use client";

import { useCallback, useEffect, useState } from "react";
import { useRequireAuth } from "@/hooks/use-auth";
import { getConversations } from "@/services/conversation-service";
import type { JobConversation } from "@/types";

export function useConversations(jobId?: string | null) {
  const token = useRequireAuth();
  const [conversations, setConversations] = useState<JobConversation[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError("");
    getConversations(token, jobId)
      .then((data) => setConversations(Array.isArray(data.conversations) ? data.conversations : []))
      .catch((err) => {
        setConversations([]);
        setError(err instanceof Error ? err.message : "Could not load chats");
      })
      .finally(() => setLoading(false));
  }, [jobId, token]);

  useEffect(() => refresh(), [refresh]);

  return { conversations, error, loading, refresh };
}
