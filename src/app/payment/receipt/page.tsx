"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PaymentSummaryModal } from "@/components/payment-summary-modal";
import { Spinner } from "@/components/ui";

function ReceiptContent() {
  const reference = useSearchParams().get("reference") ?? "";
  return <PaymentSummaryModal mode="page" reference={reference} />;
}

export default function PaymentReceiptPage() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#f8fbfc]"><Spinner className="h-10 w-10 border-[4px] border-[#196c88] border-t-transparent" /></main>}><ReceiptContent /></Suspense>;
}
