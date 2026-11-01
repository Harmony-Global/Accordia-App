"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "./landing.module.css";

const documents = {
  terms: { title: "Terms of Service", url: "/accordia-terms-of-service.pdf" },
  privacy: { title: "Privacy Policy", url: "/accordia-privacy-policy.pdf" },
} as const;

type DocumentKey = keyof typeof documents;

export default function LandingLegalLinks() {
  const [activeDocument, setActiveDocument] = useState<DocumentKey | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (activeDocument && !dialog.open) dialog.showModal();
    if (!activeDocument && dialog.open) dialog.close();
  }, [activeDocument]);

  const document = activeDocument ? documents[activeDocument] : null;

  return <>
    <div className={styles.footerBottom}>
      <span>© 2026 Accordia — </span>
      <button onClick={() => setActiveDocument("terms")} type="button">Terms of Service</button>
      <span> · </span>
      <button onClick={() => setActiveDocument("privacy")} type="button">Privacy Policy</button>
    </div>
    <dialog
      aria-labelledby="landing-document-title"
      className={styles.documentModal}
      onCancel={() => setActiveDocument(null)}
      onClick={(event) => {
        if (event.target === event.currentTarget) setActiveDocument(null);
      }}
      onClose={() => setActiveDocument(null)}
      ref={dialogRef}
    >
      <div className={styles.documentPanel}>
        <header className={styles.documentHeader}>
          <h2 id="landing-document-title">{document?.title}</h2>
          <button aria-label={`Close ${document?.title ?? "document"}`} onClick={() => setActiveDocument(null)} title="Close document" type="button"><X aria-hidden="true" size={22} /></button>
        </header>
        {document && <iframe className={styles.documentViewer} src={document.url} title={document.title} />}
        {document && <p className={styles.documentFallback}>If the document does not display, <a href={document.url} rel="noopener noreferrer" target="_blank">open the PDF directly</a>.</p>}
      </div>
    </dialog>
  </>;
}
