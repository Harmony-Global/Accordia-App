import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Award, Heart, Instagram, Linkedin, Mail, MapPin, Phone, ShieldCheck, Target, X, Zap } from "lucide-react";
import LandingMobileMenu from "./landing-mobile-menu";
import LandingLegalLinks from "./landing-legal-links";
import LandingStoryCards from "./landing-story-cards";
import LandingWhyCards from "./landing-why-cards";
import styles from "./landing.module.css";

const values = [
  { title: "Integrity First", icon: ShieldCheck, tone: "integrity", body: "We build on honesty, transparency, accountability and trust." },
  { title: "Community", icon: Heart, tone: "community", body: "We build on honesty, transparency, accountability and trust." },
  { title: "Opportunity", icon: Zap, tone: "opportunity", body: "We build on honesty, transparency, accountability and trust." },
  { title: "Innovation", icon: Target, tone: "innovation", body: "We build on honesty, transparency, accountability and trust." },
  { title: "Excellence", icon: Award, tone: "excellence", body: "We build on honesty, transparency, accountability and trust." }
];

export default function HomePage() {
  return <div className={styles.page}>
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link aria-label="Accordia home" className={styles.logo} href="/"><Image alt="Accordia" fill priority sizes="(max-width: 640px) 126px, 170px" src="/images/auth/figma/accordia-logo.png" /></Link>
        <nav aria-label="Main navigation" className={styles.desktopNav}><a href="#about">About Us</a><a href="#how-it-works">How it works</a><a href="#values">Values</a><Link href="/faq">FAQ</Link></nav>
        <div className={styles.headerActions}><Link className={styles.primaryButton} href="/onboarding">Get Started</Link><Link className={styles.outlineButton} href="/login">Sign-in</Link></div>
        <LandingMobileMenu />
      </div>
    </header>

    <main>
      <section aria-labelledby="hero-title" className={styles.hero}>
        <div className={styles.heroInner}><div className={styles.heroCopy}>
          <h1 className={styles.srOnly} id="hero-title">Accordia</h1>
          <p className={styles.heroStatement}>One Platform, Where Connections Unlock <span>Endless Opportunities</span></p>
          <Image alt="" aria-hidden="true" className={styles.heroUnderline} height={33} priority sizes="(max-width: 560px) 90vw, 455px" src="/images/landing/hero-underline.png" width={455} />
          <p className={styles.heroDescription}>Accordia brings professionals, businesses, skills and opportunities together in one trusted community-So you can be discovered, build meaningful connections, find opportunities and grow.</p>
          <Link className={styles.primaryButton} href="/register">Hire professional</Link>
        </div></div>
      </section>

      <section className={styles.whySection} id="about"><div className={styles.container}>
        <div className={styles.sectionIntro}><h2>Why Accordia</h2><p>Your skills should open doors, build your professional presence, connect with the right people, discover opportunities, showcase what you do, and grow alongside a community built on trust.</p></div>
        <LandingWhyCards />
      </div></section>

      <section className={styles.operateSection} id="how-it-works"><div className={styles.container}>
        <div className={styles.sectionIntro}><h2>How We Operate</h2><p>With Accordia, every connection can become a conversation, every conversation can become an opportunity, and every opportunity can become growth.</p></div>
        <LandingStoryCards />
      </div></section>

      <section className={styles.joinSection}><div className={styles.container}><h2>Ready to join a trusted community for professionals?</h2><p>Be part of Accordia’s early adopters — network, find gigs, and grow together.</p><Link className={styles.primaryButton} href="/register">Hire professional</Link></div></section>

      <section className={styles.valuesSection} id="values"><div className={styles.container}><div className={styles.sectionIntro}><h2>Our Core Values</h2><p>These values shape our culture and drive our mission to create a better professional networking experience.</p></div><div className={styles.valueGrid}>{values.map(({ title, icon: Icon, tone, body }) => <article className={`${styles.valueCard} ${styles[tone]}`} key={title}><span className={styles.valueIcon}><Icon aria-hidden="true" size={21} strokeWidth={1.8} /></span><h3>{title}</h3><p>{body}</p></article>)}</div></div></section>
    </main>

    <aside aria-label="Contact Accordia support">
      <a aria-label="Chat with Accordia support on WhatsApp" className={styles.whatsappBadge} href="https://wa.me/2347063286167" rel="noopener noreferrer" target="_blank">
        <span className={styles.whatsappBadgeHeader}><span aria-hidden="true" className={styles.whatsappIcon} /><span>Community Support</span></span>
        <span className={styles.whatsappBadgeDescription}>Questions about joining or hiring? Chat with Accordia support.</span>
        <span className={styles.whatsappBadgeCta}>Chat on WhatsApp <ArrowRight aria-hidden="true" size={15} /></span>
      </a>
      <a aria-label="Chat with Accordia support on WhatsApp" className={styles.whatsappFab} href="https://wa.me/2347063286167" rel="noopener noreferrer" target="_blank" title="Chat on WhatsApp"><span aria-hidden="true" className={styles.whatsappIcon} /></a>
    </aside>

    <footer className={styles.footer}><div className={styles.container}><div className={styles.footerGrid}>
      <Link aria-label="Accordia home" className={styles.footerLogo} href="/"><Image alt="" aria-hidden="true" height={46} src="/brand/accordia-logomark.png" width={52} /><span>ccordia</span></Link>
      <div className={styles.footerColumn}><h2>Quick Links</h2><a href="#about">About Us</a><a href="#how-it-works">How it Works</a><a href="#values">Values</a><Link href="/faq">FAQ</Link><Link href="/onboarding">Join Community</Link></div>
      <div className={styles.footerColumn}><h2>Contact Info</h2><a href="tel:+2347063286167"><Phone size={15} aria-hidden="true" />+234 (706) 328-6167</a><a href="mailto:teamaccordiaconnect@gmail.com"><Mail size={15} aria-hidden="true" />teamaccordiaconnect@gmail.com</a><span><MapPin size={15} aria-hidden="true" />Lagos, Nigeria</span></div>
      <div className={styles.footerColumn}><h2>Follow Us</h2><div className={styles.socialIcons}><a aria-label="Accordia on LinkedIn" className={styles.socialIcon} href="https://www.linkedin.com/company/accordia-technologies-limited/?viewAsMember=true" rel="noopener noreferrer" target="_blank" title="LinkedIn"><Linkedin aria-hidden="true" size={20} strokeWidth={1.9} /></a><a aria-label="Accordia on X" className={styles.socialIcon} href="https://x.com/accordia_app" rel="noopener noreferrer" target="_blank" title="X"><X aria-hidden="true" size={20} strokeWidth={1.9} /></a><span aria-label="Instagram" className={styles.socialIcon} role="img" title="Instagram"><Instagram aria-hidden="true" size={20} strokeWidth={1.9} /></span></div></div>
    </div><LandingLegalLinks /></div></footer>
  </div>;
}

