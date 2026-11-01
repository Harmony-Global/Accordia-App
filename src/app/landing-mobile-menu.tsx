"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "./landing.module.css";

export default function LandingMobileMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className={styles.mobileMenu} ref={rootRef}>
      <button
        aria-controls="landing-mobile-nav"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className={styles.mobileMenuButton}
        onClick={() => setOpen((current) => !current)}
        title={open ? "Close menu" : "Open menu"}
        type="button"
      >
        {open ? <X aria-hidden="true" size={24} /> : <Menu aria-hidden="true" size={24} />}
      </button>
      {open ? (
        <nav aria-label="Mobile navigation" className={styles.mobileNav} id="landing-mobile-nav">
          <a href="#about" onClick={() => setOpen(false)}>About Us</a>
          <a href="#how-it-works" onClick={() => setOpen(false)}>How it works</a>
          <a href="#values" onClick={() => setOpen(false)}>Values</a>
          <Link href="/faq" onClick={() => setOpen(false)}>FAQ</Link>
          <Link href="/onboarding" onClick={() => setOpen(false)}>Get Started</Link>
          <Link href="/login" onClick={() => setOpen(false)}>Sign-in</Link>
        </nav>
      ) : null}
    </div>
  );
}
