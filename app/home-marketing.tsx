"use client";

import Link from "next/link";
import { startTransition, useEffect, useEffectEvent, useState } from "react";

type LeadAction = (formData: FormData) => void | Promise<void>;

type HomeMarketingProps = {
  submitted: boolean;
  leadError: boolean;
  captureLeadAction: LeadAction;
};

type TemplateCategory = "All" | "Education" | "Medical" | "Household" | "Intake" | "Import";
type BillingCycle = "monthly" | "annual";
type AccentTone = "amber" | "blue" | "emerald" | "indigo" | "rose" | "teal" | "violet";
type IconName =
  | "arrow-right"
  | "chart"
  | "check"
  | "database"
  | "form"
  | "household"
  | "layers"
  | "lock"
  | "scan"
  | "send"
  | "shield"
  | "spark"
  | "user";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "Templates", href: "#templates" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const heroStats = [
  { value: "Built-in OCR", label: "Read scans, photos, and PDFs without another app" },
  { value: "Household-aware", label: "Choose the right saved profile before autofill runs" },
  { value: "Reusable templates", label: "Start from real packet layouts and keep refining them" },
];

const featureCards: ReadonlyArray<{
  icon: IconName;
  accent: Extract<AccentTone, "blue" | "emerald" | "violet">;
  title: string;
  copy: string;
}> = [
  {
    icon: "lock",
    accent: "blue",
    title: "A calmer home for repeated paperwork",
    copy:
      "Keep forms, vault records, templates, and submissions in one product instead of scattering them across email threads and file folders.",
  },
  {
    icon: "scan",
    accent: "emerald",
    title: "Native OCR for uploads and scanned PDFs",
    copy:
      "Import files directly into the mapper, extract text from scans, and turn what arrived today into something reusable tomorrow.",
  },
  {
    icon: "layers",
    accent: "violet",
    title: "Reusable sections instead of throwaway forms",
    copy:
      "Start from the indexed library, then add custom sections when a school packet, clinic intake, or camp form needs something new.",
  },
  {
    icon: "household",
    accent: "blue",
    title: "Family vault profiles that keep paying off",
    copy:
      "Save household, school, medical, insurance, and emergency details once so the next workflow is faster and cleaner to publish.",
  },
  {
    icon: "spark",
    accent: "emerald",
    title: "Public forms shaped around real autofill",
    copy:
      "The public experience now follows the practical order families need: select a household, pick the right person, then review what fills in.",
  },
  {
    icon: "chart",
    accent: "violet",
    title: "One operating surface for review and follow-up",
    copy:
      "Move from imported source to live form to collected response without leaving the same dashboard rhythm.",
  },
];

const templateFilters: TemplateCategory[] = ["All", "Education", "Medical", "Household", "Intake", "Import"];

const templateCards: ReadonlyArray<{
  category: TemplateCategory;
  label: string;
  title: string;
  details: string;
  href: string;
  cta: string;
  tone: AccentTone;
}> = [
  {
    category: "Education" as TemplateCategory,
    label: "School packet",
    title: "School Enrollment Packet",
    details: "Student basics, pickup permissions, medical details, and emergency contacts grouped into one reusable enrollment flow.",
    href: "/dashboard/forms/new?template=school-enrollment-packet",
    cta: "Use school template",
    tone: "blue",
  },
  {
    category: "Medical" as TemplateCategory,
    label: "Clinic intake",
    title: "Pediatric Medical Intake",
    details: "Care teams can start with a clean medical, insurance, and emergency bundle instead of rebuilding those sections every time.",
    href: "/dashboard/forms/new?template=pediatric-medical-intake",
    cta: "Open medical template",
    tone: "rose",
  },
  {
    category: "Household" as TemplateCategory,
    label: "Family profile",
    title: "Family Care Binder",
    details: "Bundle school, medical, insurance, and household preference sections into a shareable family snapshot.",
    href: "/dashboard/forms/new?template=family-care-binder",
    cta: "Start family binder",
    tone: "violet",
  },
  {
    category: "Intake" as TemplateCategory,
    label: "Lead capture",
    title: "Partnership Pipeline",
    details: "Use the existing intake model for demos, service requests, or any first-touch workflow that needs structured triage.",
    href: "/dashboard/forms/new?template=partnership-pipeline",
    cta: "Launch intake template",
    tone: "amber",
  },
  {
    category: "Import" as TemplateCategory,
    label: "Outside form",
    title: "Import Studio",
    details: "Use copied text, webpages, uploads, and scans to build a draft from the form that showed up outside your system.",
    href: "/dashboard/import?method=file",
    cta: "Open import studio",
    tone: "teal",
  },
  {
    category: "Household" as TemplateCategory,
    label: "Saved records",
    title: "Household Vault",
    details: "Keep reusable details ready for each person before you send another public form or start another import.",
    href: "/dashboard/vault",
    cta: "Go to family vault",
    tone: "indigo",
  },
];

const workflowSteps: ReadonlyArray<{
  step: string;
  icon: Extract<IconName, "check" | "form" | "send" | "user">;
  title: string;
  copy: string;
}> = [
  {
    step: "01",
    icon: "user",
    title: "Save the details you repeat most often",
    copy:
      "Start in the family vault so the next school packet, camp registration, or clinic form already has a reusable base.",
  },
  {
    step: "02",
    icon: "form",
    title: "Import a form or start from the library",
    copy:
      "Use the template library when it fits, or map an outside form into the same reusable section system.",
  },
  {
    step: "03",
    icon: "send",
    title: "Refine the layout into something shareable",
    copy:
      "Keep the matched sections, add custom ones, and shape the public form around how people will actually complete it.",
  },
  {
    step: "04",
    icon: "check",
    title: "Publish, collect, and improve the next pass",
    copy:
      "Track submissions from the dashboard, learn what was missing, and make the next imported workflow stronger.",
  },
];

const useCases = [
  {
    tone: "blue",
    title: "For school offices and programs",
    summary:
      "Use one system for enrollment packets, after-school registrations, pickup permissions, and annual family updates.",
    stats: ["Reusable student profiles", "Cleaner yearly refreshes"],
  },
  {
    tone: "emerald",
    title: "For clinics and care teams",
    summary:
      "Bring outside intake forms into a reusable medical workflow and keep insurance, physician, and emergency data ready to reuse.",
    stats: ["OCR-ready intake imports", "Shared emergency sections"],
  },
  {
    tone: "violet",
    title: "For camps, events, and caregivers",
    summary:
      "Collect health needs, pickup instructions, and household preferences without asking families to rewrite the same answers every season.",
    stats: ["Household-aware autofill", "Public links for quick collection"],
  },
  {
    tone: "amber",
    title: "For service teams and onboarding",
    summary:
      "Keep lead intake, kickoff collection, and family-style profile data inside one evolving workflow instead of scattered forms.",
    stats: ["Template-first starting points", "Dashboard review loop"],
  },
];

const stories = [
  {
    quote:
      "I need one place where a family can reuse school, medical, and pickup details instead of retyping them every time a new packet lands.",
    role: "Household workflow goal",
    name: "Family coordinators",
    badge: "Vault + autofill",
    stats: ["Less repeated entry", "Cleaner annual forms"],
    cta: { href: "/dashboard/vault", label: "See the family vault" },
  },
  {
    quote:
      "The biggest win is turning a scanned PDF into a reusable form draft without bouncing through another app just to get OCR text first.",
    role: "Import workflow goal",
    name: "Operations teams",
    badge: "OCR import",
    stats: ["Built-in scan handling", "Faster draft creation"],
    cta: { href: "/dashboard/import?method=file", label: "Preview import studio" },
  },
  {
    quote:
      "Templates matter, but the real product value is what happens after the import when we can keep shaping sections around our actual workflow.",
    role: "Template workflow goal",
    name: "Program managers",
    badge: "Reusable sections",
    stats: ["Template + custom blend", "Less rebuilding from zero"],
    cta: { href: "/dashboard/templates", label: "Browse templates" },
  },
  {
    quote:
      "We need public forms that feel simple for families while still respecting that one household might submit for several different people.",
    role: "Public form goal",
    name: "Community teams",
    badge: "Household-aware",
    stats: ["Better person selection", "Cleaner autofill flow"],
    cta: { href: "/f/partnership-pipeline", label: "View a public form" },
  },
];

const pricingTiers = [
  {
    name: "Starter",
    description: "For a small workflow or early launch testing.",
    monthly: "Free",
    annual: "Free",
    accent: "slate",
    cta: "Open dashboard",
    href: "/dashboard",
    features: [
      "Template starting points",
      "Lead capture and public forms",
      "Basic form editing",
      "Single-workflow experimentation",
    ],
  },
  {
    name: "Household",
    description: "For teams centered on recurring family and care paperwork.",
    monthly: "$19",
    annual: "$15",
    accent: "blue",
    featured: true,
    cta: "Request preview access",
    href: "#launch-request",
    features: [
      "Family vault profiles",
      "OCR-backed import studio",
      "Reusable section editing",
      "Household-aware autofill flow",
      "Submission review from one dashboard",
    ],
  },
  {
    name: "Organization",
    description: "For larger rollouts that need guided setup and deeper workflow shaping.",
    monthly: "Custom",
    annual: "Custom",
    accent: "slate",
    cta: "Book a walkthrough",
    href: "#launch-request",
    features: [
      "Workflow planning support",
      "Template and import mapping help",
      "Team rollout guidance",
      "Priority launch feedback loop",
    ],
  },
];

const foundationItems: ReadonlyArray<{
  icon: Extract<IconName, "database" | "scan" | "shield" | "spark">;
  title: string;
  copy: string;
}> = [
  {
    icon: "database",
    title: "One shared datastore",
    copy: "Templates, imports, family records, forms, and leads already sit on the same live data foundation.",
  },
  {
    icon: "scan",
    title: "Native import pipeline",
    copy: "Uploads, images, and scanned PDFs can now enter the system directly instead of depending on another OCR app first.",
  },
  {
    icon: "shield",
    title: "A reusable-section model",
    copy: "The app keeps moving toward a world where repeated answers become better structured every time another form shows up.",
  },
  {
    icon: "spark",
    title: "Shaped around real household and team workflows",
    copy: "Every feature connects to a real paperwork problem families and teams face — not a hypothetical use case.",
  },
];

const faqs = [
  {
    question: "Can I import scanned PDFs directly now?",
    answer:
      "Yes. The importer now handles scanned PDFs, images, and text-based PDFs in-app, so the common import path no longer depends on another OCR tool.",
  },
  {
    question: "What is the family vault for?",
    answer:
      "It stores reusable details for a household or person profile, such as school, medical, insurance, and emergency information, so future forms can reuse that data.",
  },
  {
    question: "Do I have to start from a template?",
    answer:
      "No. Templates are one starting point, but you can also import an outside form or begin from a blank workflow and add custom sections as needed.",
  },
  {
    question: "How does the public autofill flow work?",
    answer:
      "The public form experience now asks people to choose a household first, then the right member profile, so autofill stays accurate for families with more than one person record.",
  },
  {
    question: "Is MyFormsVault available to use right now?",
    answer:
      "Yes. The dashboard, templates, vault, and import studio are all live. You can create an account and start building workflows today.",
  },
];

function MarketingIcon({
  icon,
  className,
}: {
  icon: IconName;
  className?: string;
}) {
  switch (icon) {
    case "arrow-right":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      );
    case "chart":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <path d="M4 20V6" />
          <path d="M10 20v-8" />
          <path d="M16 20v-5" />
          <path d="M22 20V4" />
        </svg>
      );
    case "check":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "database":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <ellipse cx="12" cy="5" rx="7" ry="3" />
          <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
          <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
        </svg>
      );
    case "form":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" />
          <path d="M14 3v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h5" />
        </svg>
      );
    case "household":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5 10.5V20h14v-9.5" />
          <path d="M9 20v-5h6v5" />
        </svg>
      );
    case "layers":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <path d="m12 3 9 4.5-9 4.5L3 7.5 12 3Z" />
          <path d="m3 12.5 9 4.5 9-4.5" />
          <path d="m3 17.5 9 4.5 9-4.5" />
        </svg>
      );
    case "lock":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <rect x="4" y="11" width="16" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      );
    case "scan":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <path d="M4 7V5a1 1 0 0 1 1-1h2" />
          <path d="M17 4h2a1 1 0 0 1 1 1v2" />
          <path d="M20 17v2a1 1 0 0 1-1 1h-2" />
          <path d="M7 20H5a1 1 0 0 1-1-1v-2" />
          <path d="M7 12h10" />
          <path d="M7 16h6" />
        </svg>
      );
    case "send":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <path d="M12 3c2.8 2.2 5.2 3 8 3v6c0 5-3.4 7.6-8 9-4.6-1.4-8-4-8-9V6c2.8 0 5.2-.8 8-3Z" />
        </svg>
      );
    case "spark":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
          <path d="M20 4v4" />
          <path d="M22 6h-4" />
          <path d="M4 16v3" />
          <path d="M5.5 17.5h-3" />
        </svg>
      );
    case "user":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
  }
}

export default function HomeMarketing({
  submitted,
  leadError,
  captureLeadAction,
}: HomeMarketingProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTemplateFilter, setActiveTemplateFilter] = useState<TemplateCategory>("All");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual");
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [activeFaqIndex, setActiveFaqIndex] = useState(0);

  const filteredTemplates =
    activeTemplateFilter === "All"
      ? templateCards
      : templateCards.filter((item) => item.category === activeTemplateFilter);

  const activeStory = stories[activeStoryIndex];

  const autoAdvanceStory = useEffectEvent(() => {
    setActiveStoryIndex((current) => (current + 1) % stories.length);
  });

  const moveStory = (direction: number) => {
    setActiveStoryIndex((current) => (current + direction + stories.length) % stories.length);
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      autoAdvanceStory();
    }, 7000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="marketing-shell">
      <header className="marketing-header">
        <div className="marketing-container marketing-header-inner">
          <Link href="/" className="marketing-brand" onClick={() => setMobileOpen(false)}>
            <span className="marketing-brand-mark">
              <MarketingIcon icon="shield" className="marketing-brand-icon" />
            </span>
            <span className="marketing-brand-copy">
              <strong>MyFormsVault</strong>
              <span>Reusable form workflows</span>
            </span>
          </Link>

          <nav className="marketing-nav" aria-label="Primary">
            {navItems.map((item) => (
              <a key={item.label} href={item.href} className="marketing-nav-link">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="marketing-header-actions">
            <Link href="/dashboard" className="marketing-button marketing-button-ghost">
              Open app
            </Link>
            <a href="#launch-request" className="marketing-button marketing-button-primary">
              Get started
            </a>
            <button
              type="button"
              className="marketing-menu-toggle"
              aria-expanded={mobileOpen}
              aria-controls="marketing-mobile-nav"
              onClick={() => setMobileOpen((open) => !open)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div id="marketing-mobile-nav" className="marketing-mobile-nav">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="marketing-mobile-link"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <Link href="/dashboard/templates" className="marketing-mobile-link" onClick={() => setMobileOpen(false)}>
              Template library
            </Link>
            <Link href="/dashboard/import" className="marketing-mobile-link" onClick={() => setMobileOpen(false)}>
              Import studio
            </Link>
          </div>
        ) : null}
      </header>

      <section className="marketing-hero" id="hero">
        <div className="marketing-hero-backdrop" />
        <div className="marketing-container marketing-hero-grid">
          <div className="marketing-hero-copy">
            <span className="marketing-badge">
              <MarketingIcon icon="spark" className="marketing-inline-icon" />
              Built around the current product direction
            </span>

            <h1>
              Your forms.
              <span> Reused, imported, and organized.</span>
            </h1>

            <p className="marketing-lede">
              Bring school packets, medical intakes, care paperwork, and outside forms into one
              calmer workflow with reusable sections, a household vault, and built-in OCR for the
              files that still arrive as scans.
            </p>

            {submitted ? (
              <div className="marketing-notice marketing-notice-success">
                You're on the list. You can keep exploring or open the dashboard right away.
              </div>
            ) : null}

            {leadError ? (
              <div className="marketing-notice marketing-notice-warning">
                A few required fields were missing. Try the launch form again and we will save it
                correctly.
              </div>
            ) : null}

            <form action={captureLeadAction} className="marketing-hero-form">
              <input type="hidden" name="company" value="" />
              <input type="hidden" name="teamSize" value="1-3" />
              <input type="hidden" name="message" value="Homepage hero — early access request." />
              <label className="marketing-field">
                <span className="marketing-sr-only">Your name</span>
                <input name="name" type="text" placeholder="Your name" required />
              </label>
              <label className="marketing-field">
                <span className="marketing-sr-only">Your email</span>
                <input name="email" type="email" placeholder="Enter your work email" required />
              </label>
              <button type="submit" className="marketing-button marketing-button-emerald">
                Start preview
                <MarketingIcon icon="arrow-right" className="marketing-inline-icon" />
              </button>
            </form>

            <div className="marketing-proof-row">
              <span>
                <MarketingIcon icon="check" className="marketing-proof-icon" />
                No extra OCR app required for common imports
              </span>
              <span>
                <MarketingIcon icon="check" className="marketing-proof-icon" />
                Household-aware autofill
              </span>
              <span>
                <MarketingIcon icon="check" className="marketing-proof-icon" />
                Preview-ready dashboard links
              </span>
            </div>

            <div className="marketing-stat-grid">
              {heroStats.map((item) => (
                <article key={item.value} className="marketing-stat-card">
                  <strong>{item.value}</strong>
                  <p>{item.label}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="marketing-hero-visual" aria-hidden="true">
            <div className="marketing-hero-orb marketing-hero-orb-blue" />
            <div className="marketing-hero-orb marketing-hero-orb-emerald" />

            <article className="marketing-floating-card marketing-floating-card-a">
              <div className="marketing-floating-header">
                <span className="marketing-floating-icon marketing-tone-blue">
                  <MarketingIcon icon="form" className="marketing-card-icon" />
                </span>
                <span>School packet</span>
              </div>
              <div className="marketing-line-stack">
                <span />
                <span />
                <span className="marketing-line-accent marketing-line-blue" />
              </div>
            </article>

            <article className="marketing-floating-card marketing-floating-card-b">
              <div className="marketing-floating-header">
                <span className="marketing-floating-icon marketing-tone-emerald">
                  <MarketingIcon icon="scan" className="marketing-card-icon" />
                </span>
                <span>Scanned PDF OCR</span>
              </div>
              <div className="marketing-line-stack">
                <span />
                <span className="marketing-line-accent marketing-line-emerald" />
                <span />
              </div>
            </article>

            <article className="marketing-floating-card marketing-floating-card-c">
              <div className="marketing-floating-header">
                <span className="marketing-floating-icon marketing-tone-violet">
                  <MarketingIcon icon="household" className="marketing-card-icon" />
                </span>
                <span>Household vault</span>
              </div>
              <div className="marketing-line-stack">
                <span />
                <span className="marketing-line-accent marketing-line-violet" />
                <span />
              </div>
            </article>

            <div className="marketing-hero-core">
              <div className="marketing-hero-core-ring" />
              <div className="marketing-hero-core-shield">
                <MarketingIcon icon="shield" className="marketing-hero-shield" />
                <span className="marketing-hero-lock">
                  <MarketingIcon icon="lock" className="marketing-lock-icon" />
                </span>
              </div>
            </div>

            <svg className="marketing-hero-links" viewBox="0 0 400 400">
              <path d="M84 86Q148 150 200 200" />
              <path d="M320 94Q270 144 200 200" />
              <path d="M72 292Q140 248 200 200" />
            </svg>
          </div>
        </div>
      </section>

      <section className="marketing-strip">
        <div className="marketing-container">
          <p className="marketing-strip-label">Designed for repeated paperwork like</p>
          <div className="marketing-strip-grid">
            <span>School enrollment</span>
            <span>Pediatric intake</span>
            <span>Family care packets</span>
            <span>Camp registration</span>
            <span>Client onboarding</span>
            <span>Community programs</span>
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-section-muted" id="features">
        <div className="marketing-container">
          <div className="marketing-section-heading">
            <span className="marketing-section-label">Features</span>
            <h2>Everything you need for repeated paperwork, in one place.</h2>
            <p>
              Import outside forms, store reusable household records, build templates, and collect
              responses — without bouncing between separate tools to do it.
            </p>
          </div>

          <div className="marketing-feature-grid">
            {featureCards.map((item) => (
              <article key={item.title} className="marketing-feature-card">
                <span className={`marketing-feature-icon marketing-tone-${item.accent}`}>
                  <MarketingIcon icon={item.icon} className="marketing-card-icon" />
                </span>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section" id="templates">
        <div className="marketing-container">
          <div className="marketing-section-heading">
            <span className="marketing-section-label">Templates</span>
            <h2>Start from a real workflow, then keep shaping it.</h2>
            <p>
              Browse by category or start from any workflow — each template routes directly into the
              live app where you can edit, import, and publish.
            </p>
          </div>

          <div className="marketing-filter-row" role="tablist" aria-label="Template filters">
            {templateFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                className={filter === activeTemplateFilter ? "marketing-filter is-active" : "marketing-filter"}
                onClick={() => {
                  startTransition(() => {
                    setActiveTemplateFilter(filter);
                  });
                }}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="marketing-template-grid">
            {filteredTemplates.map((item) => (
              <article key={item.title} className={`marketing-template-card marketing-template-${item.tone}`}>
                <div className="marketing-template-top">
                  <span className="marketing-template-label">{item.label}</span>
                  <span className="marketing-template-category">{item.category}</span>
                </div>
                <div className="marketing-template-body">
                  <h3>{item.title}</h3>
                  <p>{item.details}</p>
                </div>
                <Link href={item.href} className="marketing-template-action">
                  {item.cta}
                  <MarketingIcon icon="arrow-right" className="marketing-inline-icon" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-section-gradient" id="how-it-works">
        <div className="marketing-container">
          <div className="marketing-section-heading">
            <span className="marketing-section-label">How it works</span>
            <h2>From outside form to reusable workflow in four steps.</h2>
            <p>
              Start with what you already have — a scanned form, an outside PDF, or a template from
              the library — and turn it into something reusable in four steps.
            </p>
          </div>

          <div className="marketing-step-grid">
            {workflowSteps.map((item, index) => (
              <article key={item.step} className="marketing-step-card">
                <div className="marketing-step-chip">{item.step}</div>
                <span className="marketing-step-icon">
                  <MarketingIcon icon={item.icon} className="marketing-card-icon" />
                </span>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
                {index < workflowSteps.length - 1 ? <span className="marketing-step-arrow" aria-hidden="true" /> : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section" id="use-cases">
        <div className="marketing-container">
          <div className="marketing-section-heading">
            <span className="marketing-section-label">Use cases</span>
            <h2>Built for teams that repeat the same answers across different forms.</h2>
            <p>
              From school offices to care teams, the workflows are different — but the need to stop
              re-entering the same answers every season is the same.
            </p>
          </div>

          <div className="marketing-use-grid">
            {useCases.map((item) => (
              <article key={item.title} className={`marketing-use-card marketing-use-${item.tone}`}>
                <span className="marketing-use-bar" />
                <div className="marketing-use-body">
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                  <div className="marketing-use-stats">
                    {item.stats.map((stat) => (
                      <span key={stat}>{stat}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-section-stories" id="testimonials">
        <div className="marketing-container">
          <div className="marketing-section-heading marketing-section-heading-center">
            <span className="marketing-section-label">Workflow voices</span>
            <h2>Real goals from the teams who need this most.</h2>
            <p>
              These are the workflow goals we hear most often — organized paperwork, fewer repeated
              answers, and forms that get easier the second time around.
            </p>
          </div>

          <div className="marketing-story-shell">
            <button
              type="button"
              className="marketing-story-nav"
              aria-label="Previous story"
              onClick={() => moveStory(-1)}
            >
              <span aria-hidden="true">‹</span>
            </button>

            <article className="marketing-story-card">
              <span className="marketing-story-quote-mark">&ldquo;</span>
              <p>{activeStory.quote}</p>
              <div className="marketing-story-meta">
                <div>
                  <strong>{activeStory.name}</strong>
                  <span>{activeStory.role}</span>
                </div>
                <span className="marketing-story-badge">{activeStory.badge}</span>
              </div>
              <div className="marketing-story-stats">
                {activeStory.stats.map((stat) => (
                  <span key={stat}>{stat}</span>
                ))}
              </div>
              <Link href={activeStory.cta.href} className="marketing-story-action">
                {activeStory.cta.label}
                <MarketingIcon icon="arrow-right" className="marketing-inline-icon" />
              </Link>
            </article>

            <button
              type="button"
              className="marketing-story-nav"
              aria-label="Next story"
              onClick={() => moveStory(1)}
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>

          <div className="marketing-story-dots" role="tablist" aria-label="Workflow stories">
            {stories.map((story, index) => (
              <button
                key={story.badge}
                type="button"
                className={index === activeStoryIndex ? "marketing-story-dot is-active" : "marketing-story-dot"}
                aria-label={`Go to story ${index + 1}`}
                onClick={() => setActiveStoryIndex(index)}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-section-muted" id="pricing">
        <div className="marketing-container">
          <div className="marketing-section-heading marketing-section-heading-center">
            <span className="marketing-section-label">Pricing</span>
            <h2>Simple pricing for every size of workflow.</h2>
            <p>
              Start free and scale when your team is ready. Household plans include everything
              needed to manage repeating paperwork for families and programs.
            </p>
          </div>

          <div className="marketing-pricing-toggle" role="tablist" aria-label="Billing cycle">
            <button
              type="button"
              className={billingCycle === "monthly" ? "marketing-cycle is-active" : "marketing-cycle"}
              onClick={() => {
                startTransition(() => {
                  setBillingCycle("monthly");
                });
              }}
            >
              Monthly
            </button>
            <button
              type="button"
              className={billingCycle === "annual" ? "marketing-cycle is-active" : "marketing-cycle"}
              onClick={() => {
                startTransition(() => {
                  setBillingCycle("annual");
                });
              }}
            >
              Annual
              <span>Save 20%</span>
            </button>
          </div>

          <div className="marketing-pricing-grid">
            {pricingTiers.map((tier) => (
              <article
                key={tier.name}
                className={tier.featured ? "marketing-price-card is-featured" : "marketing-price-card"}
              >
                {tier.featured ? <span className="marketing-price-ribbon">Best fit right now</span> : null}
                <div className="marketing-price-head">
                  <h3>{tier.name}</h3>
                  <p>{tier.description}</p>
                </div>
                <div className="marketing-price-value">
                  <strong>{billingCycle === "annual" ? tier.annual : tier.monthly}</strong>
                  <span>{tier.monthly === "Free" ? "forever" : tier.monthly === "Custom" ? "" : "/mo"}</span>
                </div>
                <a href={tier.href} className={tier.featured ? "marketing-button marketing-button-emerald" : "marketing-button marketing-button-dark"}>
                  {tier.cta}
                </a>
                <ul className="marketing-price-list">
                  {tier.features.map((feature) => (
                    <li key={feature}>
                      <MarketingIcon icon="check" className="marketing-proof-icon" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-foundation" id="security">
        <div className="marketing-foundation-backdrop" />
        <div className="marketing-container">
          <div className="marketing-section-heading marketing-section-heading-light">
            <span className="marketing-badge marketing-badge-dark">
              <MarketingIcon icon="shield" className="marketing-inline-icon" />
              Product foundation
            </span>
            <h2>Built on a foundation you can actually rely on.</h2>
            <p>
              Every capability on this page is already in the app — backed by live data,
              server-side processing, and a reusable section model built for real workflows.
            </p>
          </div>

          <div className="marketing-foundation-grid">
            {foundationItems.map((item) => (
              <article key={item.title} className="marketing-foundation-card">
                <span className="marketing-foundation-icon">
                  <MarketingIcon icon={item.icon} className="marketing-card-icon" />
                </span>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>

          <div className="marketing-foundation-pill-row">
            <span>Template library</span>
            <span>OCR import</span>
            <span>Household vault</span>
            <span>Public forms</span>
            <span>Supabase-backed data</span>
            <span>Server actions</span>
          </div>
        </div>
      </section>

      <section className="marketing-section" id="faq">
        <div className="marketing-container marketing-faq-wrap">
          <div className="marketing-section-heading marketing-section-heading-center">
            <span className="marketing-section-label">FAQ</span>
            <h2>Frequently asked questions</h2>
            <p>
              Everything here is in the product today. If something isn't answered below, use the
              form at the bottom and we'll follow up directly.
            </p>
          </div>

          <div className="marketing-faq-list">
            {faqs.map((item, index) => {
              const open = index === activeFaqIndex;

              return (
                <article key={item.question} className={open ? "marketing-faq-item is-open" : "marketing-faq-item"}>
                  <button
                    type="button"
                    className="marketing-faq-button"
                    aria-expanded={open}
                    onClick={() => setActiveFaqIndex(open ? -1 : index)}
                  >
                    <span>{item.question}</span>
                    <span className="marketing-faq-symbol">{open ? "−" : "+"}</span>
                  </button>
                  <div className="marketing-faq-panel">
                    <p>{item.answer}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-cta-section" id="launch-request">
        <div className="marketing-container marketing-cta-grid">
          <div className="marketing-cta-copy">
            <span className="marketing-badge marketing-badge-dark">
              <MarketingIcon icon="spark" className="marketing-inline-icon" />
              Launch request
            </span>
            <h2>Ready to simplify your recurring paperwork?</h2>
            <p>
              Tell us what you're organizing and we'll follow up with early access. School packets,
              clinic intake, and household forms are all supported today.
            </p>
            <div className="marketing-proof-row marketing-proof-row-light">
              <span>
                <MarketingIcon icon="check" className="marketing-proof-icon" />
                No credit card required to start
              </span>
              <span>
                <MarketingIcon icon="check" className="marketing-proof-icon" />
                Free plan available for all workflows
              </span>
              <span>
                <MarketingIcon icon="check" className="marketing-proof-icon" />
                Hands-on setup support for teams
              </span>
            </div>
          </div>

          <div className="marketing-form-card">
            <form action={captureLeadAction} className="marketing-detail-form">
              <div className="marketing-form-grid">
                <label className="marketing-field">
                  <span>Name</span>
                  <input name="name" type="text" placeholder="Jordan Lee" required />
                </label>
                <label className="marketing-field">
                  <span>Email</span>
                  <input name="email" type="email" placeholder="jordan@team.com" required />
                </label>
                <label className="marketing-field">
                  <span>Organization</span>
                  <input name="company" type="text" placeholder="Northside Programs" />
                </label>
                <label className="marketing-field">
                  <span>Team size</span>
                  <select name="teamSize" defaultValue="1-3">
                    <option value="1-3">1-3 people</option>
                    <option value="4-10">4-10 people</option>
                    <option value="11-25">11-25 people</option>
                    <option value="26+">26+ people</option>
                  </select>
                </label>
                <label className="marketing-field marketing-field-full">
                  <span>What are you trying to organize?</span>
                  <textarea
                    name="message"
                    rows={5}
                    placeholder="School packets, medical intake, family paperwork, onboarding, or something close to that..."
                    required
                  />
                </label>
              </div>

              <div className="marketing-form-actions">
                <button type="submit" className="marketing-button marketing-button-emerald">
                  Request early access
                </button>
                <Link href="/dashboard" className="marketing-button marketing-button-ghost-light">
                  Open dashboard
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>

      <footer className="marketing-footer">
        <div className="marketing-container marketing-footer-grid">
          <div className="marketing-footer-brand">
            <Link href="/" className="marketing-brand">
              <span className="marketing-brand-mark">
                <MarketingIcon icon="shield" className="marketing-brand-icon" />
              </span>
              <span className="marketing-brand-copy">
                <strong>MyFormsVault</strong>
                <span>Reusable form workflows</span>
              </span>
            </Link>
            <p>
              A clearer way to import outside forms, keep reusable household records, and publish
              the next workflow without starting from zero every time.
            </p>
          </div>

          <div className="marketing-footer-links">
            <div>
              <h3>Product</h3>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/dashboard/templates">Templates</Link>
              <Link href="/dashboard/import">Import studio</Link>
              <Link href="/dashboard/vault">Family vault</Link>
            </div>
            <div>
              <h3>Preview</h3>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#faq">FAQ</a>
              <a href="#launch-request">Launch request</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
