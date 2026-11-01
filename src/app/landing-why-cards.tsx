"use client";

import { BriefcaseBusiness, Lightbulb, ShieldCheck, UsersRound } from "lucide-react";
import styles from "./landing.module.css";

const cards = [
  { title: "Integrity First", icon: ShieldCheck, body: "Trust should never be a question. Connect with verified professionals, build credible relationships and access opportunities in an ecosystem designed to keep every interaction more secure, transparent and trustworthy." },
  { title: "Community Driven", icon: UsersRound, body: "Your network should be more than a list of contacts. Connect, collaborate, share knowledge, support one another and grow alongside professionals who believe that when we grow together, we go farther." },
  { title: "Opportunity For All", icon: BriefcaseBusiness, body: "Your skills deserve a chance to create something bigger. Discover projects, build partnerships, showcase your expertise and turn meaningful connections into opportunities to earn, grow and move forward." },
  { title: "Innovation With Purpose", icon: Lightbulb, body: "Networking should work for you, not the other way around. Discover smarter ways to connect, collaborate, showcase your expertise and turn the right connections into meaningful opportunities, all with less friction." }
];

function animateCard(card: HTMLButtonElement) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  card.getAnimations().forEach((animation) => animation.cancel());
  card.animate(
    [{ translate: "0 0" }, { translate: "0 -15px", offset: 0.48 }, { translate: "0 0" }],
    { duration: 560, easing: "cubic-bezier(.25,.8,.25,1)" }
  );
}

export default function LandingWhyCards() {
  return (
    <div className={styles.whyGrid}>
      {cards.map(({ title, icon: Icon, body }, index) => (
        <button
          className={`${styles.whyCard} ${styles[`whyCard${index}`]}`}
          key={title}
          onClick={(event) => animateCard(event.currentTarget)}
          type="button"
        >
          <Icon aria-hidden="true" size={31} strokeWidth={1.6} />
          <span className={styles.whyCardTitle}>{title}</span>
          <span className={styles.whyCardBody}>{body}</span>
        </button>
      ))}
    </div>
  );
}
