"use client";

import Image from "next/image";
import { ArrowDown, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import styles from "./landing.module.css";

const stories = [
  { image: "/images/landing/operate-community.svg", alt: "Hands joined together in a professional community", number: "01", title: "Join The Community", points: ["Create a client or professional account", "Verify your phone number", "Connect through direct messaging"] },
  { image: "/images/landing/operate-opportunity.svg", alt: "Professional working on a laptop", number: "02", title: "Create Your Profile", points: ["Add your bio and profile photo", "Choose service categories", "Showcase work in your portfolio"] },
  { image: "/images/landing/operate-collaboration.svg", alt: "Two professionals reviewing a document", number: "03", title: "Discover And Learn", points: ["Find matched service requests", "Browse professional services", "Review quotes in conversation"] },
  { image: "/images/landing/operate-growth.svg", alt: "Professional working at her laptop", number: "04", title: "Work And Grow", points: ["Manage jobs and appointments", "Pay through Paystack checkout", "Track earnings and payout history"] }
];

export default function LandingStoryCards() {
  const [openCards, setOpenCards] = useState<string[]>([]);

  return (
    <div className={styles.photoGrid}>
      {stories.map((story) => {
        const open = openCards.includes(story.number);
        const contentId = `landing-story-${story.number}`;

        return (
          <article className={styles.photoDetails} data-open={open} key={story.number}>
            <div className={styles.photoImage}>
              <Image alt={story.alt} fill sizes="(max-width: 700px) 100vw, 50vw" src={story.image} />
              <button
                aria-controls={contentId}
                aria-expanded={open}
                aria-label={`${open ? "Collapse" : "Expand"} ${story.title}`}
                className={styles.photoArrow}
                onClick={() => setOpenCards((current) => open ? current.filter((number) => number !== story.number) : [...current, story.number])}
                title={`${open ? "Collapse" : "Expand"} ${story.title}`}
                type="button"
              >
                <ArrowDown aria-hidden="true" size={21} strokeWidth={1.8} />
              </button>
            </div>
            <div aria-hidden={!open} className={styles.photoReveal} id={contentId}>
              <div className={styles.photoRevealInner}>
                <div className={styles.photoContent}>
                  <span className={styles.storyNumber}>{story.number}</span>
                  <h3>{story.title}</h3>
                  <ul>{story.points.map((point) => <li key={point}><CheckCircle2 aria-hidden="true" size={17} strokeWidth={1.7} /><span>{point}</span></li>)}</ul>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
