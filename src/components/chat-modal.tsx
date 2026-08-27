"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, Send, X } from "lucide-react";
import { Button, IconButton, ProfileAvatar, Spinner, SurfaceModal } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useAuth, useRequireAuth } from "@/hooks/use-auth";
import { requestAppointmentReschedule, respondAppointmentReschedule } from "@/services/appointment-service";
import { getConversationMessages, hireConversationProfessional, markConversationRead, sendConversationMessage } from "@/services/conversation-service";
import { getInquiryMessages, markInquiryRead, sendInquiryMessage } from "@/services/inquiry-service";
import type { Appointment, AppointmentRescheduleRequest, ChatMessage, JobConversation, ProfessionalInquiry, Profile } from "@/types";

function participantName(profile?: Pick<Profile, "first_name" | "last_name"> | null) {
  return `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "Accordia user";
}

const IN_PERSON_CONTACT_LOCKED_MESSAGE = "This message was blocked! Make upfront payment and sharing of personal details will be activated to help coordinate meeting.";
const REMOTE_CONTACT_LOCKED_MESSAGE = "This message was blocked for violating platform rules of sharing link and phone number.";
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_PATTERN = /\+?\d[\d\s().-]{7,}\d/g;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/i;

function containsContactInfo(value: string) {
  if (EMAIL_PATTERN.test(value) || URL_PATTERN.test(value)) return true;
  const candidates = value.match(PHONE_PATTERN) ?? [];
  return candidates.some((candidate) => candidate.replace(/\D/g, "").length >= 9);
}

export function ChatModal({
  conversation,
  appointment,
  kind = "job",
  onHired,
  onAppointmentUpdated,
  onClose
}: {
  conversation: JobConversation | ProfessionalInquiry;
  appointment?: Appointment | null;
  kind?: "job" | "inquiry";
  onHired?: (conversation: JobConversation) => void;
  onAppointmentUpdated?: (appointment: Appointment) => void;
  onClose: () => void;
}) {
  const token = useRequireAuth();
  const { profile } = useAuth();
  const showToast = useToast();
  const [currentConversation, setCurrentConversation] = useState(conversation);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [contactWarning, setContactWarning] = useState("");
  const [hireStep, setHireStep] = useState<"ready" | "payment" | "paid">("ready");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hiring, setHiring] = useState(false);
  const [paymentNoticeOpen, setPaymentNoticeOpen] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(appointment ?? null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleStartsAt, setRescheduleStartsAt] = useState("");
  const [rescheduleEndsAt, setRescheduleEndsAt] = useState("");
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [rescheduleBusy, setRescheduleBusy] = useState(false);

  useEffect(() => {
    setCurrentConversation(conversation);
    setHireStep("ready");
    setContactWarning("");
    setPaymentNoticeOpen(false);
  }, [conversation]);

  useEffect(() => {
    setCurrentAppointment(appointment ?? null);
  }, [appointment]);

  useEffect(() => {
    if (!paymentNoticeOpen) return;

    const timer = window.setTimeout(() => {
      setPaymentNoticeOpen(false);
    }, 6500);

    return () => window.clearTimeout(timer);
  }, [paymentNoticeOpen]);

  const otherParticipant = useMemo(() => {
    if (!profile) return currentConversation.professional ?? currentConversation.client;
    return profile.id === currentConversation.client_id ? currentConversation.professional : currentConversation.client;
  }, [currentConversation, profile]);
  const contextLabel = kind === "job"
    ? (currentConversation as JobConversation).job?.title ?? "Job chat"
    : (currentConversation as ProfessionalInquiry).service?.title ?? "Professional inquiry";
  const jobConversation = kind === "job" ? currentConversation as JobConversation : null;
  const isClient = Boolean(jobConversation && profile?.id === jobConversation.client_id);
  const isRemoteJob = jobConversation?.job?.is_remote === true;
  const isInPersonJob = jobConversation?.job?.is_remote === false;
  const hasUpfrontPayment = Boolean(jobConversation?.upfront_payment_made_at);
  const isHired = ["selected", "awarded", "hired", "in_progress", "inprogress"].includes(jobConversation?.application?.status?.toLowerCase() ?? "");
  const canExchangeContactInfo = Boolean(jobConversation && isInPersonJob && hasUpfrontPayment);
  const latestPendingReschedule = useMemo(() => {
    const requests = currentAppointment?.reschedule_requests ?? [];
    return [...requests]
      .filter((request) => request.status === "pending")
      .sort((first, second) => new Date(second.created_at).getTime() - new Date(first.created_at).getTime())[0] ?? null;
  }, [currentAppointment?.reschedule_requests]);
  const canRescheduleAppointment = kind === "inquiry" && currentAppointment?.status === "accepted";
  const canRespondToReschedule = Boolean(latestPendingReschedule && profile?.id === latestPendingReschedule.requested_for);
  const chatDisclaimer = isInPersonJob
    ? hasUpfrontPayment
      ? "For in-person jobs, contact details can now be exchanged because an upfront payment has been secured to help you coordinate the meeting."
      : "For in-person jobs, contact details can be exchanged after an upfront payment is secured to help you coordinate the meeting."
    : "For remote jobs, communication is managed through Accordia's messaging system. Phone numbers, addresses and external links are restricted to help keep projects secure.";
  const hireName = participantName(otherParticipant);

  const loadMessages = useCallback(async (showLoading = false) => {
    if (!token) return;
    if (showLoading) setLoading(true);

    const data = kind === "job"
      ? await getConversationMessages(token, currentConversation.id)
      : await getInquiryMessages(token, currentConversation.id);
    setMessages((current) => {
      if (
        current.length === data.messages.length
        && current[current.length - 1]?.id === data.messages[data.messages.length - 1]?.id
      ) {
        return current;
      }

      return data.messages;
    });
    await (kind === "job" ? markConversationRead(token, currentConversation.id) : markInquiryRead(token, currentConversation.id)).catch(() => undefined);
  }, [currentConversation.id, kind, token]);

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
    if (containsContactInfo(body) && !canExchangeContactInfo) {
      setContactWarning(jobConversation && isInPersonJob ? IN_PERSON_CONTACT_LOCKED_MESSAGE : REMOTE_CONTACT_LOCKED_MESSAGE);
      return;
    }

    setSending(true);
    try {
      const data = kind === "job"
        ? await sendConversationMessage(token, currentConversation.id, body)
        : await sendInquiryMessage(token, currentConversation.id, body);
      setMessages((current) => [...current, data.message]);
      await (kind === "job" ? markConversationRead(token, currentConversation.id) : markInquiryRead(token, currentConversation.id)).catch(() => undefined);
      setDraft("");
      setContactWarning("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not send message";
      showToast({ tone: "error", title: "Message failed", body: message });
    } finally {
      setSending(false);
    }
  }

  async function confirmUpfrontPayment() {
    if (!token || !jobConversation) return;
    setHiring(true);

    try {
      const data = await hireConversationProfessional(token, jobConversation.id);
      setCurrentConversation(data.conversation);
      setHireStep("paid");
      setPaymentNoticeOpen(true);
      onHired?.(data.conversation);
      showToast({
        tone: "success",
        title: "Upfront payment has been made",
        body: "The professional has been moved to hired."
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not complete upfront payment";
      showToast({ tone: "error", title: "Payment failed", body: message });
    } finally {
      setHiring(false);
    }
  }

  function formatRescheduleRange(request: Pick<AppointmentRescheduleRequest, "proposed_starts_at" | "proposed_ends_at">) {
    return `${new Date(request.proposed_starts_at).toLocaleString()} - ${new Date(request.proposed_ends_at).toLocaleString()}`;
  }

  async function proposeReschedule() {
    if (!token || !currentAppointment) return;
    if (!rescheduleStartsAt || !rescheduleEndsAt) {
      showToast({ tone: "error", title: "Choose a new time", body: "Add both the new start and end time." });
      return;
    }

    setRescheduleBusy(true);
    try {
      const data = await requestAppointmentReschedule(token, currentAppointment.id, {
        starts_at: new Date(rescheduleStartsAt).toISOString(),
        ends_at: new Date(rescheduleEndsAt).toISOString(),
        note: rescheduleNote.trim() || null
      });
      setCurrentAppointment(data.appointment);
      onAppointmentUpdated?.(data.appointment);
      setMessages((current) => [...current, data.message]);
      setRescheduleOpen(false);
      setRescheduleStartsAt("");
      setRescheduleEndsAt("");
      setRescheduleNote("");
      showToast({ tone: "success", title: "Reschedule requested", body: "The other party has been notified." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not request reschedule";
      showToast({ tone: "error", title: "Reschedule failed", body: message });
    } finally {
      setRescheduleBusy(false);
    }
  }

  async function respondToReschedule(status: "accepted" | "declined") {
    if (!token || !currentAppointment || !latestPendingReschedule) return;

    setRescheduleBusy(true);
    try {
      const data = await respondAppointmentReschedule(token, currentAppointment.id, latestPendingReschedule.id, status);
      setCurrentAppointment(data.appointment);
      onAppointmentUpdated?.(data.appointment);
      if (data.message) setMessages((current) => [...current, data.message as ChatMessage]);
      showToast({
        tone: "success",
        title: status === "accepted" ? "Reschedule accepted" : "Reschedule declined",
        body: status === "accepted" ? "The appointment schedule has been updated." : "The current appointment time remains unchanged."
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not respond to reschedule";
      showToast({ tone: "error", title: "Reschedule not updated", body: message });
    } finally {
      setRescheduleBusy(false);
    }
  }

  return (
    <SurfaceModal onClose={onClose} panelClassName="flex h-[calc(100dvh-24px)] max-h-[900px] min-h-0 flex-col overflow-hidden sm:h-[calc(100vh-48px)] sm:min-h-[680px]" size="chat">
        {isClient && jobConversation && !isHired && !hasUpfrontPayment && hireStep === "ready" ? (
          <div className="m-4 mb-0 rounded-[8px] border-b-[3px] border-[#f4a422] bg-[#fffbe6] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <CheckCircle2 className="mt-0.5 shrink-0 text-[#f4a422]" size={28} strokeWidth={1.7} />
                <div>
                  <p className="text-[16px] font-semibold text-[#5e5e5e]">Ready to hire {hireName}?</p>
                  <p className="mt-1 text-sm leading-5 text-[#757575]">If you are satisfied with your conversation, hire this professional to continue.</p>
                </div>
              </div>
              <Button className="shrink-0 rounded-[5px] px-5" onClick={() => setHireStep("payment")} type="button">
                Hire Professional
              </Button>
            </div>
          </div>
        ) : null}
        {isClient && jobConversation && !isHired && !hasUpfrontPayment && hireStep === "payment" ? (
          <div className="m-4 mb-0 rounded-[8px] border-b-[3px] border-[#f4a422] bg-[#fffbe6] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <CheckCircle2 className="mt-0.5 shrink-0 text-[#f4a422]" size={28} strokeWidth={1.7} />
                <div>
                  <p className="text-[16px] font-semibold text-[#5e5e5e]">Make Upfront Payment</p>
                  <p className="mt-1 text-sm leading-5 text-[#757575]">Accordia securely holds your payment until you confirm satisfactory completion of job.</p>
                </div>
              </div>
              <Button className="shrink-0 rounded-[5px] px-7" disabled={hiring} onClick={confirmUpfrontPayment} type="button">
                {hiring ? <span className="inline-flex items-center gap-2"><Spinner className="h-5 w-5 border-[3px]" /> Processing</span> : "Proceed"}
              </Button>
            </div>
          </div>
        ) : null}
        {jobConversation && hireStep === "paid" && paymentNoticeOpen ? (
          <div className="relative m-3 mb-0 rounded-[8px] border-b-[3px] border-[#0fa269] bg-[#f3fef3] p-3 pr-10 sm:m-4 sm:mb-0 sm:p-4 sm:pr-12">
            <button aria-label="Dismiss payment notice" className="absolute right-3 top-3 text-black transition hover:text-[#0fa269]" onClick={() => setPaymentNoticeOpen(false)} type="button">
              <X size={17} />
            </button>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <CheckCircle2 className="mt-0.5 shrink-0 text-[#0fa269]" size={24} strokeWidth={1.7} />
                <div>
                  <p className="text-[15px] font-semibold text-[#5e5e5e] sm:text-[16px]">Upfront payment successfully made</p>
                  <p className="mt-1 text-xs leading-5 text-[#757575] sm:text-sm">{isInPersonJob ? "Contacts can now be exchanged to help meeting coordination." : "Monitor active jobs from the active jobs page."}</p>
                </div>
              </div>
              <Button className="shrink-0 rounded-[5px] px-4" size="sm" type="button" variant="secondary">
                View details
              </Button>
            </div>
          </div>
        ) : null}
        <header className="flex items-start justify-between gap-4 border-b border-line p-4">
          <div className="flex min-w-0 items-center gap-3">
            <ProfileAvatar avatarUrl={otherParticipant?.avatar_url} className="h-9 w-9" iconSize={17} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{participantName(otherParticipant)}</p>
              <p className="truncate text-sm text-muted">{contextLabel}</p>
            </div>
          </div>
          <IconButton aria-label="Close chat" onClick={onClose} type="button" variant="ghost">
            <X size={18} />
          </IconButton>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-5 sm:px-6 lg:px-7">
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
            <div className="space-y-4">
              {messages.map((message) => {
                const mine = message.sender_id === profile?.id;
                return (
                  <div className={`flex ${mine ? "justify-end" : "justify-start"}`} key={message.id}>
                    <div className={`max-w-[82%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[52%] ${mine ? "bg-brand text-white" : "border border-line bg-white text-ink"}`}>
                      <p>{message.body}</p>
                      <p className={`mt-2 text-[11px] ${mine ? "text-white/75" : "text-muted"}`}>
                        {new Date(message.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
              {contactWarning ? (
                <div className="flex justify-center sm:justify-end sm:pr-12">
                  <div className="relative w-full max-w-[560px] rounded-[10px] border border-red-100 border-b-[3px] border-b-red-700 bg-red-50 px-4 py-5 pr-11 text-[15px] font-medium leading-7 text-[#5e5e5e] shadow-sm sm:px-7 sm:py-6 sm:text-[18px]">
                    <button aria-label="Dismiss blocked message" className="absolute right-4 top-4 text-black transition hover:text-red-700" onClick={() => setContactWarning("")} type="button">
                      <X size={18} />
                    </button>
                    <div className="flex items-center gap-4">
                      <AlertCircle className="shrink-0 text-red-700" size={36} strokeWidth={2.1} />
                      <p>{contactWarning}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <footer className="border-t border-line bg-white p-4 sm:px-6 lg:px-7">
          {latestPendingReschedule ? (
            <div className="mb-3 rounded-[6px] border border-[#f9d999] bg-[#fffbe6] p-3 text-sm text-[#5e5e5e]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-[#196c88]">Appointment reschedule requested</p>
                  <p className="mt-1 leading-5">{formatRescheduleRange(latestPendingReschedule)}</p>
                  {latestPendingReschedule.note ? <p className="mt-1 leading-5 text-[#757575]">{latestPendingReschedule.note}</p> : null}
                </div>
                {canRespondToReschedule ? (
                  <div className="flex shrink-0 gap-2">
                    <Button className="h-10 rounded-[5px] px-4 py-0" disabled={rescheduleBusy} onClick={() => respondToReschedule("accepted")} type="button">
                      {rescheduleBusy ? <Spinner className="h-4 w-4" /> : "Accept"}
                    </Button>
                    <Button className="h-10 rounded-[5px] px-4 py-0" disabled={rescheduleBusy} onClick={() => respondToReschedule("declined")} type="button" variant="secondary">
                      Decline
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-[#f4a422]">Awaiting response</p>
                )}
              </div>
            </div>
          ) : null}
          {canRescheduleAppointment && !latestPendingReschedule && rescheduleOpen ? (
            <div className="mb-3 rounded-[6px] border border-[#d5e4e9] bg-white p-3">
              <p className="text-sm font-semibold text-[#196c88]">Choose a new appointment time</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-[#5e5e5e]">
                  Starts
                  <input
                    className="mt-1 w-full rounded-[5px] border border-line px-3 py-2 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-teal-100"
                    onChange={(event) => setRescheduleStartsAt(event.target.value)}
                    type="datetime-local"
                    value={rescheduleStartsAt}
                  />
                </label>
                <label className="block text-xs font-semibold text-[#5e5e5e]">
                  Ends
                  <input
                    className="mt-1 w-full rounded-[5px] border border-line px-3 py-2 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-teal-100"
                    onChange={(event) => setRescheduleEndsAt(event.target.value)}
                    type="datetime-local"
                    value={rescheduleEndsAt}
                  />
                </label>
              </div>
              <textarea
                className="mt-3 min-h-20 w-full resize-none rounded-[5px] border border-line px-3 py-2 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-teal-100"
                onChange={(event) => setRescheduleNote(event.target.value)}
                placeholder="Add a note, if needed"
                value={rescheduleNote}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button className="h-10 rounded-[5px] px-4 py-0" disabled={rescheduleBusy} onClick={proposeReschedule} type="button">
                  {rescheduleBusy ? <Spinner className="h-4 w-4" /> : "Send request"}
                </Button>
                <Button className="h-10 rounded-[5px] px-4 py-0" disabled={rescheduleBusy} onClick={() => setRescheduleOpen(false)} type="button" variant="secondary">
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
          <div className="relative">
            <label className="sr-only" htmlFor="chat-message-input">Message</label>
            <textarea
              className="min-h-[120px] w-full resize-none rounded-[6px] border border-line bg-white px-4 py-4 pr-20 text-sm outline-none transition duration-200 hover:border-slate-300 focus:border-brand focus:ring-4 focus:ring-teal-100 sm:min-h-[132px] lg:min-h-[144px]"
              id="chat-message-input"
              onChange={(event) => {
                setDraft(event.target.value);
                if (contactWarning && (!containsContactInfo(event.target.value) || canExchangeContactInfo)) setContactWarning("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type message..."
              rows={3}
              value={draft}
            />
            <Button
              aria-label={sending ? "Sending message" : "Send message"}
              className="absolute bottom-4 right-4 h-12 w-12 rounded-[5px] p-0 sm:h-12 sm:w-12"
              disabled={sending || draft.trim().length === 0}
              onClick={sendMessage}
              type="button"
            >
              {sending ? <Spinner className="h-5 w-5 border-2" /> : <Send size={22} />}
            </Button>
          </div>
          {canRescheduleAppointment && !latestPendingReschedule && !rescheduleOpen ? (
            <button
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-[5px] border border-[#196c88] px-4 text-sm font-semibold text-[#196c88] transition hover:bg-[#f2f6f8]"
              onClick={() => setRescheduleOpen(true)}
              type="button"
            >
              <CalendarDays size={17} />
              Re-schedule appointment
            </button>
          ) : null}
          {jobConversation ? (
            <div className="mt-4 flex items-start gap-3 text-sm font-medium leading-6 text-[#5e5e5e]">
              <AlertCircle className="mt-0.5 shrink-0 text-[#f4a422]" size={22} />
              <p>
                {chatDisclaimer}
              </p>
            </div>
          ) : null}
        </footer>
    </SurfaceModal>
  );
}
