"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./faq.module.css";

type FAQItem = { question: string; answer: string };

export default function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className={styles.accordion}>
      {items.map((item, index) => {
        const open = openIndex === index;
        const answerId = `faq-answer-${index}`;
        const questionId = `faq-question-${index}`;

        return (
          <section className={styles.item} data-open={open} key={item.question}>
            <h2>
              <button
                aria-controls={answerId}
                aria-expanded={open}
                className={styles.trigger}
                id={questionId}
                onClick={() => setOpenIndex(open ? null : index)}
                type="button"
              >
                <span>{item.question}</span>
                <ChevronDown aria-hidden="true" className={styles.chevron} size={20} />
              </button>
            </h2>
            <div aria-hidden={!open} aria-labelledby={questionId} className={styles.answerOuter} id={answerId} role="region">
              <div className={styles.answerClip}><p>{item.answer}</p></div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
