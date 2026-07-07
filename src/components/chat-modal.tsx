"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Send, UserRound, X } from "lucide-react";
import { Button, IconButton, Spinner, TextAreaField } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useAuth, useRequireAuth } from "@/hooks/use-auth";
import { getConversationMessages, markConversationRead, sendConversationMessage } from "@/services/conversation-service";
import { getInquiryMessages, markInquiryRead, sendInquiryMessage } from "@/services/inquiry-service";
import type { ChatMessage, JobConversation, ProfessionalInquiry, Profile } from "@/types";

function Avatar({ profile }: { profile?: Pick<Profile, "first_name" | "last_name" | "avatar_url"> | null }) {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 text-brand">
      {profile?.avatar_url ? <img alt="" className="h-full w-full object-cover" src={profile.avatar_url} /> : <UserRound size={17} />}
    </span>
  );
}

function participantName(profile?: Pick<Profile, "first_name" | "last_name"> | null) {
  return `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "Accordia user";
}

export function ChatModal({
  conversation,
  kind = "job",
  onClose
}: {
  conversation: JobConversation | ProfessionalInquiry;
  kind?: "job" | "inquiry";
  onClose: () => void;
}) {
  const token = useRequireAuth();
  const { profile } = useAuth();
  const showToast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const otherParticipant = useMemo(() => {
    if (!profile) return conversation.professional ?? conversation.client;
    return profile.id === conversation.client_id ? conversation.professional : conversation.client;
  }, [conversation, profile]);
  const contextLabel = kind === "job"
    ? (conversation as JobConversation).job?.title ?? "Awarded job chat"
    : (conversation as ProfessionalInquiry).service?.title ?? "Professional inquiry";

  const loadMessages = useCallback(async (showLoading = false) => {
    if (!token) return;
    if (showLoading) setLoading(true);

    const data = kind === "job"
      ? await getConversationMessages(token, conversation.id)
      : await getInquiryMessages(token, conversation.id);
    setMessages((current) => {
      if (
        current.length === data.messages.length
        && current[current.length - 1]?.id === data.messages[data.messages.length - 1]?.id
      ) {
        return current;
      }

      return data.messages;
    });
    await (kind === "job" ? markConversationRead(token, conversation.id) : markInquiryRead(token, conversation.id)).catch(() => undefined);
  }, [conversation.id, kind, token]);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    setLoading(true);

    loadMessages()
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Could not load chat";
        if (isMounted) showToast({ tone: "error", title: "Chat unavailable", body: message });
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    const refreshTimer = window.setInterval(() => {
      loadMessages().catch(() => undefined);
    }, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(refreshTimer);
    };
  }, [loadMessages, showToast, token]);

  async function sendMessage() {
    const body = draft.trim();
    if (!token || !body) return;

    setSending(true);
    try {
      const data = kind === "job"
        ? await sendConversationMessage(token, conversation.id, body)
        : await sendInquiryMessage(token, conversation.id, body);
      setMessages((current) => [...current, data.message]);
      await (kind === "job" ? markConversationRead(token, conversation.id) : markInquiryRead(token, conversation.id)).catch(() => undefined);
      setDraft("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not send message";
      showToast({ tone: "error", title: "Message failed", body: message });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <section className="flex h-[92vh] w-full flex-col rounded-t-lg border border-line bg-white shadow-xl sm:h-[min(720px,88vh)] sm:max-w-2xl sm:rounded-lg">
        <header className="flex items-start justify-between gap-4 border-b border-line p-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar profile={otherParticipant} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{participantName(otherParticipant)}</p>
              <p className="truncate text-sm text-muted">{contextLabel}</p>
            </div>
          </div>
          <IconButton aria-label="Close chat" onClick={onClose} type="button" variant="ghost">
            <X size={18} />
          </IconButton>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-5">
          {loading ? (
            <div className="flex h-full items-center justify-center text-brand">
              <Spinner className="h-14 w-14 border-[3px]" />
            </div>
          ) : null}
          {!loading && messages.length === 0 ? (
            <div className="mx-auto mt-12 max-w-sm text-center">
              <h2 className="text-lg font-semibold text-ink">Start the conversation</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Share next steps, timing, materials, and anything needed before work begins.</p>
            </div>
          ) : null}
          {!loading ? (
            <div className="space-y-3">
              {messages.map((message) => {
                const mine = message.sender_id === profile?.id;
                return (
                  <div className={`flex ${mine ? "justify-end" : "justify-start"}`} key={message.id}>
                    <div className={`max-w-[82%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm ${mine ? "bg-brand text-white" : "border border-line bg-white text-ink"}`}>
                      <p>{message.body}</p>
                      <p className={`mt-2 text-[11px] ${mine ? "text-white/75" : "text-muted"}`}>
                        {new Date(message.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <footer className="border-t border-line bg-white p-4">
          <TextAreaField
            label="Message"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Write a message..."
            rows={3}
            value={draft}
          />
          <Button className="mt-3 w-full" disabled={sending || draft.trim().length === 0} onClick={sendMessage} type="button">
            {sending ? <span className="inline-flex items-center gap-2"><Spinner className="h-6 w-6 border-[3px]" /> Sending</span> : <span className="inline-flex items-center gap-2"><Send size={18} /> Send message</span>}
          </Button>
        </footer>
      </section>
    </div>
  );
}
