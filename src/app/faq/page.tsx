import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import FAQAccordion from "./faq-accordion";
import styles from "./faq.module.css";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | Accordia",
  description: "Answers to common questions about using Accordia."
};

const faqs = [
  { question: "What can I do on Accordia?", answer: "Clients can find professionals and create service requests. Professionals can build a profile, show their work, and respond to service opportunities." },
  { question: "How do I find a professional?", answer: "Create a client account to browse professionals or post a service request. You can review profiles and discuss the work before hiring." },
  { question: "How do payments work?", answer: "Payments for eligible services are made through Paystack Checkout in Accordia. The amount due is shown before you confirm a payment." },
  { question: "Does Accordia store my card details?", answer: "No. Accordia does not collect or store your card number or security code. Available payment methods are shown in Paystack Checkout when you pay." },
  { question: "Where can I see my payment history?", answer: "Clients can review charges and recorded refunds in Payment History. Professionals can track earnings and confirmed payouts in Earnings & Payout." },
  { question: "How can I get help with a payment or refund?", answer: "Contact Accordia support using the button below. Your Payment History shows original charges and any recorded Paystack refunds separately." }
];

export default function FAQPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link aria-label="Back to Accordia home" className={styles.backLink} href="/">
            <ArrowLeft aria-hidden="true" size={18} /><span>Take a step back</span>
          </Link>
          <Link aria-label="Accordia home" className={styles.logo} href="/">
            <Image alt="Accordia" fill priority sizes="(max-width: 600px) 150px, 180px" src="/images/auth/figma/accordia-logo.png" />
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.intro}>
          <h1>Frequently Asked Questions</h1>
          <p>Find answers to common questions about Accordia.</p>
        </div>
        <FAQAccordion items={faqs} />
        <section className={styles.contact}>
          <h2>Still have questions?</h2>
          <p>Contact our support team for help with your account, services, or payments.</p>
          <a className={styles.contactButton} href="https://wa.me/2347063286167" rel="noopener noreferrer" target="_blank">Contact Support</a>
        </section>
      </main>
    </div>
  );
}
