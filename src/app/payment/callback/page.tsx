"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";

import { Button, Spinner } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { verifyPaystackPayment } from "@/services/conversation-service";

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, role } = useAuth();
  const reference = searchParams.get("reference") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your payment...");

  const destination = useMemo(() => {
    if (role === "professional") return "/professional/jobs";
    return "/client/my-requests";
  }, [role]);

  useEffect(() => {
    if (!reference) {
      setStatus("error");
      setMessage("Payment reference is missing. Please return to your dashboard and try again.");
      return;
    }
    if (!token) return;

    let cancelled = false;
    verifyPaystackPayment(token, reference)
      .then((data) => {
        if (cancelled) return;
        if (data.payment.status !== "success") {
          setStatus("error");
          setMessage("Payment was not completed. Please return to Accordia and try again.");
          return;
        }
        setStatus("success");
        setMessage("Payment verified successfully. Your job details have been updated.");
        window.setTimeout(() => {
          router.replace(destination);
        }, 1600);
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Could not verify payment. Please try again.");
      });

    return () => {
      cancelled = true;
    };
  }, [destination, reference, router, token]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#f8fbfc] px-4 py-10">
      <section className="w-full max-w-lg rounded-[8px] border border-line bg-white p-8 text-center shadow-sm">
        {status === "loading" ? (
          <Spinner className="mx-auto h-12 w-12 border-[4px] border-[#196c88] border-t-transparent" />
        ) : status === "success" ? (
          <CheckCircle2 className="mx-auto text-[#0b8b5a]" size={72} strokeWidth={1.6} />
        ) : (
          <XCircle className="mx-auto text-[#bf1d1d]" size={72} strokeWidth={1.6} />
        )}
        <h1 className="mt-6 text-[24px] font-semibold text-[#5e5e5e]">
          {status === "loading" ? "Verifying payment" : status === "success" ? "Payment confirmed" : "Payment not verified"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#757575]">{message}</p>
        <div className="mt-7">
          <Button className="rounded-[5px] px-6" type="button" onClick={() => router.replace(destination)}>
            Return to dashboard
          </Button>
        </div>
        <Link className="mt-4 inline-block text-sm font-semibold text-[#196c88]" href={destination}>
          Go now
        </Link>
      </section>
    </main>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-[#f8fbfc] px-4 py-10">
          <section className="w-full max-w-lg rounded-[8px] border border-line bg-white p-8 text-center shadow-sm">
            <Spinner className="mx-auto h-12 w-12 border-[4px] border-[#196c88] border-t-transparent" />
            <h1 className="mt-6 text-[24px] font-semibold text-[#5e5e5e]">Preparing verification</h1>
          </section>
        </main>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
