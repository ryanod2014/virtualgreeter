"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Zap,
  Users,
  Video,
  ArrowRight,
  Clock,
  TrendingUp,
  Target,
  Shield,
  Globe,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  Sparkles,
  Award,
  CheckCircle2,
  XCircle,
  PhoneOff,
  PhoneIncoming,
  Flame,
  DollarSign,
  Calendar,
  UserX,
  MousePointerClick,
  Eye,
} from "lucide-react";
import { Logo } from "@/lib/components/logo";
import { WidgetDemo } from "@/lib/components/WidgetDemo";

const oldWayProblems = [
  {
    icon: UserX,
    problem: "Pray for opt-ins",
    reality: "97% of visitors leave without filling out your form. You're fighting for scraps.",
  },
  {
    icon: PhoneOff,
    problem: "Cold outbound hell",
    reality: "Dial 100 numbers, reach 8 people. The rest? Voicemail purgatory.",
  },
  {
    icon: Clock,
    problem: "The timing trap",
    reality: "By the time you call back, they've already talked to 3 competitors. You're dead on arrival.",
  },
  {
    icon: Calendar,
    problem: "Calendar chaos",
    reality: "Scheduled calls = no-shows. People book when they're hot, cancel when they're cold.",
  },
];

const newWayBenefits = [
  {
    icon: Eye,
    problem: "They see a live greeter",
    reality: "The moment they land, someone's already 'there.' Feels like walking into a store with great service.",
  },
  {
    icon: PhoneIncoming,
    problem: "THEY call YOU",
    reality: "No more chasing. They click, you answer. Inbound psychology = no resistance.",
  },
  {
    icon: Flame,
    problem: "Peak buying temperature",
    reality: "You're talking while they're researching. While the problem is top of mind. While the credit card is warm.",
  },
  {
    icon: MousePointerClick,
    problem: "Zero opt-in required",
    reality: "Turn pageviews into sales calls. Even the 97% who never would've filled out your form.",
  },
];

const stats = [
  {
    value: "86%",
    label: "Prefer Humans",
    description: "of consumers prefer humans to chatbots",
    source: "Forbes",
    sourceUrl: "https://www.forbes.com",
  },
  {
    value: "32%",
    label: "Higher Conversion",
    description: "increase in conversion rates with video vs phone calls",
    source: "Industry Research",
    sourceUrl: null,
  },
  {
    value: "34x",
    label: "More Successful",
    description: "face-to-face requests outperform email",
    source: "Harvard Business Review",
    sourceUrl: "https://hbr.org",
  },
  {
    value: "72%",
    label: "Trust on Video",
    description: "of consumers trust brands more when they see the rep on video",
    source: "Consumer Study",
    sourceUrl: null,
  },
];

const perfectFor = [
  { icon: DollarSign, label: "High-Ticket Services ($1K+)" },
  { icon: Users, label: "Coaches & Consultants" },
  { icon: Shield, label: "Professional Services" },
  { icon: Globe, label: "Home Services" },
  { icon: Target, label: "B2B Sales Teams" },
  { icon: TrendingUp, label: "Agencies" },
];

const howItWorks = [
  {
    step: "01",
    title: "Start instant video calls",
    description:
      "Start instant video calls with website visitors while they're on your site.",
    icon: Video,
  },
  {
    step: "02",
    title: "They click to unmute",
    description:
      "No forms. No scheduling. No friction. They click to unmute, and suddenly they're face-to-face with you or your team.",
    icon: Zap,
  },
  {
    step: "03",
    title: "Book the appointment / close while they're hot",
    description:
      "They called YOU. They're on your site right now. The problem they need solved is top-of-mind. This is the highest-converting sales conversation possible.",
    icon: Flame,
  },
];

const faqs = [
  {
    question: "Who is this for?",
    answer:
      "GreetNow is built for businesses selling high-ticket services—where one conversation can be worth $5K, $10K, or $50K+. Coaches, consultants, professional services, home services, agencies. If your business model depends on getting people on calls, this changes everything.",
  },
  {
    question: "How is this different from chatbots or live chat?",
    answer:
      "Chat is text. Text is low-trust, low-conversion. GreetNow puts your actual face in front of prospects—creating the feeling of walking into a business and being greeted by a real human. The psychological difference is massive. Face-to-face builds trust instantly.",
  },
  {
    question: "What if I'm not available when someone clicks?",
    answer:
      "GreetNow includes team routing. When you're on a call, visitors automatically connect to the next available team member. No missed opportunities. No voicemail. Always someone there.",
  },
  {
    question: "Do visitors need to download anything?",
    answer:
      "No. Zero friction. It works in any modern browser using WebRTC—the same technology that powers Google Meet and Zoom. They click, you connect. That's it.",
  },
  {
    question: "How hard is this to set up?",
    answer:
      "Record a short welcome video, paste one line of code on your site. That's it. Most teams are live in under 15 minutes. No developers required.",
  },
  {
    question: "What about my existing lead flow?",
    answer:
      "Keep your forms. Keep your calendar. GreetNow doesn't replace anything—it captures the 97% of visitors who would NEVER fill out your form anyway. It's pure upside.",
  },
];

function FAQItem({
  question,
  answer,
  isOpen,
  onClick,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`border border-border/50 rounded-xl overflow-hidden transition-all duration-300 ${
        isOpen ? "bg-primary/5" : "bg-muted/30 hover:bg-muted/50"
      }`}
    >
      <button
        onClick={onClick}
        className="w-full px-6 py-5 flex items-center justify-between text-left"
      >
        <span className="font-medium text-lg">{question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-primary flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-48 pb-5 px-6" : "max-h-0"
        }`}
      >
        <p className="text-muted-foreground leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background dark relative overflow-hidden">
      {/* Noise overlay for texture */}
      <div className="noise-overlay" />

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Primary glow orb */}
        <div className="glow-orb w-[800px] h-[800px] -top-[400px] left-1/2 -translate-x-1/2 bg-primary/20 animate-glow-pulse" />
        {/* Secondary orbs */}
        <div className="glow-orb w-[600px] h-[600px] top-[60%] -left-[200px] bg-purple-600/15" />
        <div className="glow-orb w-[500px] h-[500px] top-[40%] -right-[150px] bg-fuchsia-600/10" />
      </div>

      {/* Grid pattern */}
      <div className="fixed inset-0 grid-pattern pointer-events-none" />

      <div className="relative z-10">
        {/* ===== HEADER ===== */}
        <header className="container mx-auto px-6 py-6">
          <nav className="flex items-center justify-between">
            <Logo size="md" />
            <div className="hidden md:flex items-center gap-8">
              <Link
                href="#old-vs-new"
                className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
              >
                Why It Works
              </Link>
              <Link
                href="#how-it-works"
                className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
              >
                How It Works
              </Link>
              <Link
                href="#stats"
                className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
              >
                The Math
              </Link>
              <Link
                href="#faq"
                className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
              >
                FAQ
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25"
              >
                Try it free
              </Link>
            </div>
          </nav>
        </header>

        {/* ===== HERO SECTION ===== */}
        <section className="container mx-auto px-6 pt-16 pb-24">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              {/* Badge - Pattern interrupt */}
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-8 animate-fade-in">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  Opt-in forms are dead. Here&apos;s what&apos;s replacing them.
                </span>
              </div>

              {/* Main headline - Big promise */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-fade-in-up leading-[1.15]">
                Turn Pageviews Into Live Sales Calls...
                <span className="gradient-text block mt-2">
                  Without Them Ever Opting In Or Booking An Appointment
                </span>
              </h1>

              {/* Subheadline - The mechanism */}
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
                Leads are never &quot;hotter&quot; than the moment they land on your page. <span className="text-foreground font-semibold">GreetNow</span> lets your setters treat website traffic like walk-in customers.
              </p>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <Link
                  href="/signup"
                  className="group bg-primary text-primary-foreground px-8 py-4 rounded-full font-semibold text-lg hover:bg-primary/90 transition-all flex items-center gap-2 hover:shadow-xl hover:shadow-primary/30"
                >
                  See It In Action
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="#old-vs-new"
                  className="group glass px-8 py-4 rounded-full font-semibold text-lg hover:bg-muted/50 transition-all flex items-center gap-2"
                >
                  <PlayCircle className="w-5 h-5 text-primary" />
                  Why This Works
                </Link>
              </div>

              {/* Target audience callout */}
              <p className="text-sm text-muted-foreground">
                Built for <span className="text-primary font-medium">high-ticket businesses</span>: Coaches, Consultants, Professional Services, Home Services, Agencies
              </p>
            </div>

            {/* Animated Widget Demo */}
            <div className="relative mt-16">
              <WidgetDemo />
            </div>

            {/* Integration logos */}
            <div className="mt-16 text-center animate-fade-in opacity-0 [animation-delay:0.8s]">
              <p className="text-sm text-muted-foreground mb-6">
                Embed on any website with 1 line of code
              </p>
              <div className="flex items-center justify-center gap-10 flex-wrap opacity-70">
                {/* ClickFunnels */}
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                  <span className="text-sm font-semibold text-muted-foreground">ClickFunnels</span>
                </div>
                {/* GoHighLevel */}
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
                    <path d="M12 2v20M2 12h20M4 4l16 16M20 4L4 20" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                  <span className="text-sm font-semibold text-muted-foreground">GoHighLevel</span>
                </div>
                {/* WordPress */}
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <path d="M3 12h18M12 3v18" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  </svg>
                  <span className="text-sm font-semibold text-muted-foreground">WordPress</span>
                </div>
                {/* Webflow */}
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
                    <path d="M17.5 7c-1.5 0-2.5 1-3 2.5-.5-1.5-2-2.5-4-2.5v7c0 1.5-1.5 3-3.5 3v-7l-4 7h4c2 0 3.5-1.5 4-3 .5 1.5 2 3 4 3l3-7v7h-3.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  </svg>
                  <span className="text-sm font-semibold text-muted-foreground">Webflow</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== PERFECT FOR SECTION ===== */}
        <section id="features" className="py-16 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  Built For High-Ticket Businesses
                </h2>
                <p className="text-muted-foreground">
                  Where one conversation can be worth $5K, $10K, or $50K+
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4">
                {perfectFor.map((item, index) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 px-5 py-3 rounded-full bg-muted/30 border border-border/50 hover:border-primary/30 hover:bg-muted/50 transition-all"
                  >
                    <item.icon className="w-5 h-5 text-primary" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== OLD WAY VS NEW WAY SECTION ===== */}
        <section id="old-vs-new" className="py-24 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              {/* Section header */}
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold mb-4">
                  The Old Way Is Broken.
                  <span className="gradient-text block mt-2">Here&apos;s What&apos;s Next.</span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  You&apos;ve been playing a losing game. Let us show you a better one.
                </p>
              </div>

              {/* Two column comparison */}
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
                {/* OLD WAY */}
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-br from-muted/50 to-transparent rounded-3xl blur-xl" />
                  <div className="relative bg-muted/30 border border-border/50 rounded-2xl p-8">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                        <XCircle className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">The Old Way</h3>
                        <p className="text-muted-foreground text-sm">What everyone else is still doing</p>
                      </div>
                    </div>
                    <div className="space-y-6">
                      {oldWayProblems.map((item, index) => (
                        <div key={index} className="flex gap-4">
                          <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0 mt-1">
                            <item.icon className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <h4 className="font-semibold mb-1">{item.problem}</h4>
                            <p className="text-muted-foreground text-sm leading-relaxed">{item.reality}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* NEW WAY */}
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 to-fuchsia-500/10 rounded-3xl blur-xl" />
                  <div className="relative bg-muted/30 border border-primary/20 rounded-2xl p-8">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold gradient-text">The GreetNow Way</h3>
                        <p className="text-muted-foreground text-sm">The unfair advantage</p>
                      </div>
                    </div>
                    <div className="space-y-6">
                      {newWayBenefits.map((item, index) => (
                        <div key={index} className="flex gap-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                            <item.icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold mb-1">{item.problem}</h4>
                            <p className="text-muted-foreground text-sm leading-relaxed">{item.reality}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bridge statement */}
              <div className="mt-16 text-center">
                <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                  This isn&apos;t an &quot;improvement&quot; to lead generation. 
                  <span className="text-foreground font-semibold block mt-2">It&apos;s a completely different game.</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== STATS SECTION - THE HARSH REALITY ===== */}
        <section id="stats" className="py-24 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold mb-4">
                  The Brutal Math You Can&apos;t Ignore
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  This is why your current approach is leaving money on the table. Every. Single. Day.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                  <div
                    key={stat.label}
                    className="feature-card relative bg-muted/30 border border-border/50 rounded-2xl p-6 text-center overflow-hidden flex flex-col"
                  >
                    {/* Accent glow */}
                    <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />

                    <div className="relative flex-1">
                      <div className="text-5xl font-bold gradient-text mb-2">
                        {stat.value}
                      </div>
                      <div className="text-lg font-semibold mb-2">
                        {stat.label}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {stat.description}
                      </p>
                    </div>
                    
                    {/* Source info card */}
                    <div className="relative mt-auto pt-4 border-t border-border/30">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                        <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-medium text-primary">
                          {stat.source}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* ===== HOW IT WORKS SECTION ===== */}
        <section id="how-it-works" className="py-24 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold mb-4">
                  How It Works
                  <span className="gradient-text block mt-2">(It&apos;s Almost Unfair)</span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Three steps to turn your website into a live sales floor.
                </p>
              </div>

              <div className="grid gap-8">
                {howItWorks.map((item, index) => (
                  <div
                    key={item.title}
                    className={`flex flex-col ${
                      index % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"
                    } items-center gap-8 lg:gap-16`}
                  >
                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-6xl font-black text-primary/20">{item.step}</span>
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <item.icon className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold mb-4">
                        {item.title}
                      </h3>
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {/* Visual */}
                    <div className="flex-1 w-full">
                      <div className="aspect-video rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 border border-border/50 flex items-center justify-center relative overflow-hidden">
                        {/* Decorative elements */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />

                        <div className="relative flex items-center justify-center">
                          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <item.icon className="w-10 h-10 text-primary" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== THE PSYCHOLOGY SECTION ===== */}
        <section className="py-24 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Why This Works So Well
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  It&apos;s not magic. It&apos;s psychology.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                {/* Psychology card 1 */}
                <div className="feature-card relative bg-muted/30 border border-border/50 rounded-2xl p-8 overflow-hidden">
                  <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/20 rounded-full blur-3xl" />
                  <div className="relative">
                    <PhoneIncoming className="w-8 h-8 text-primary mb-4" />
                    <h3 className="text-2xl font-bold mb-3">
                      No More Chasing Leads
                    </h3>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      Your setters are done with cold calls that hit spam, prospects who ghost, and the burnout that comes with endless rejection.
                      <span className="text-foreground font-semibold"> Let warm leads come to them instead.</span>
                    </p>
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Happier team, better conversations</span>
                    </div>
                  </div>
                </div>

                {/* Psychology card 2 */}
                <div className="feature-card relative bg-muted/30 border border-border/50 rounded-2xl p-8 overflow-hidden">
                  <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-fuchsia-500/20 rounded-full blur-3xl" />
                  <div className="relative">
                    <Flame className="w-8 h-8 text-primary mb-4" />
                    <h3 className="text-2xl font-bold mb-3">
                      Strike While The Iron Is Hot
                    </h3>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      When someone&apos;s on your website, they&apos;re actively researching. The problem is fresh. The pain is real. The credit card is within reach.
                      <span className="text-foreground font-semibold"> Wait 5 minutes and they&apos;re already on a competitor&apos;s site.</span>
                    </p>
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Talk when they&apos;re ready to buy</span>
                    </div>
                  </div>
                </div>

                {/* Psychology card 3 */}
                <div className="feature-card relative bg-muted/30 border border-border/50 rounded-2xl p-8 overflow-hidden">
                  <div className="absolute -top-20 -left-20 w-60 h-60 bg-primary/20 rounded-full blur-3xl" />
                  <div className="relative">
                    <Eye className="w-8 h-8 text-primary mb-4" />
                    <h3 className="text-2xl font-bold mb-3">
                      The &quot;Someone&apos;s Here&quot; Effect
                    </h3>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      Walk into an empty store? You browse and leave. Walk into a store where someone greets you?
                      <span className="text-foreground font-semibold"> You engage. You ask questions. You buy.</span> 
                      Your website finally gets that same energy.
                    </p>
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>From website to sales floor</span>
                    </div>
                  </div>
                </div>

                {/* Psychology card 4 */}
                <div className="feature-card relative bg-muted/30 border border-border/50 rounded-2xl p-8 overflow-hidden">
                  <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-fuchsia-500/20 rounded-full blur-3xl" />
                  <div className="relative">
                    <Award className="w-8 h-8 text-primary mb-4" />
                    <h3 className="text-2xl font-bold mb-3">
                      Face-to-Face Trust
                    </h3>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      Text chat is anonymous. Email is forgettable. But when they see your face?
                      <span className="text-foreground font-semibold"> You become real. Trustworthy. Human.</span> 
                      High-ticket sales require high trust. Video builds it instantly.
                    </p>
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Build trust in seconds, not weeks</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FAQ SECTION ===== */}
        <section id="faq" className="py-24 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Frequently Asked Questions
                </h2>
              </div>

              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <FAQItem
                    key={index}
                    question={faq.question}
                    answer={faq.answer}
                    isOpen={openFaq === index}
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  />
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* ===== FINAL CTA SECTION ===== */}
        <section className="py-32 relative">
          {/* Glow effect */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/30 rounded-full blur-[120px]" />
          </div>

          <div className="container mx-auto px-6 relative">
            <div className="max-w-4xl mx-auto text-center">
              {/* Urgency/Scarcity frame */}
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-8">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  Most businesses won&apos;t do this. That&apos;s your advantage.
                </span>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Your Competitors Are Still
                <span className="gradient-text block mt-2">Chasing Cold Leads</span>
              </h2>
              
              <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                While they&apos;re spending a fortune on opt-ins, cold calling leads who never pick up, and fighting spam filters—<span className="text-foreground font-semibold">you&apos;re talking to warm prospects who called you.</span>
              </p>
              
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 bg-primary text-primary-foreground px-10 py-5 rounded-full font-semibold text-xl hover:bg-primary/90 transition-all hover:shadow-2xl hover:shadow-primary/30"
              >
                Start Getting Inbound Calls
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="py-16 border-t border-border/50">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-4 gap-12 mb-16">
                {/* Brand */}
                <div className="md:col-span-1">
                  <Logo size="lg" />
                  <p className="mt-4 text-muted-foreground text-sm leading-relaxed">
                    Turn website visitors into inbound sales calls—even when they 
                    never fill out a form. The live greeter platform for high-ticket 
                    businesses.
                  </p>
                  <div className="flex items-center gap-4 mt-6">
                    {/* Social icons placeholder */}
                    {["twitter", "linkedin", "github"].map((social) => (
                      <div
                        key={social}
                        className="w-8 h-8 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                      />
                    ))}
                  </div>
                </div>

                {/* Links */}
                <div>
                  <h4 className="font-semibold mb-4">Product</h4>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li>
                      <Link href="#features" className="hover:text-foreground transition-colors">
                        Features
                      </Link>
                    </li>
                    <li>
                      <Link href="#stats" className="hover:text-foreground transition-colors">
                        Integrations
                      </Link>
                    </li>
                    <li>
                      <Link href="/pricing" className="hover:text-foreground transition-colors">
                        Pricing
                      </Link>
                    </li>
                    <li>
                      <Link href="/demo" className="hover:text-foreground transition-colors">
                        Demo
                      </Link>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-4">Resources</h4>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li>
                      <Link href="#faq" className="hover:text-foreground transition-colors">
                        FAQ
                      </Link>
                    </li>
                    <li>
                      <Link href="/blog" className="hover:text-foreground transition-colors">
                        Blog
                      </Link>
                    </li>
                    <li>
                      <Link href="/docs" className="hover:text-foreground transition-colors">
                        Help Center
                      </Link>
                    </li>
                    <li>
                      <Link href="/contact" className="hover:text-foreground transition-colors">
                        Contact
                      </Link>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-4">Company</h4>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li>
                      <Link href="/about" className="hover:text-foreground transition-colors">
                        About Us
                      </Link>
                    </li>
                    <li>
                      <Link href="/careers" className="hover:text-foreground transition-colors">
                        Careers
                      </Link>
                    </li>
                    <li>
                      <Link href="/privacy" className="hover:text-foreground transition-colors">
                        Privacy Policy
                      </Link>
                    </li>
                    <li>
                      <Link href="/terms" className="hover:text-foreground transition-colors">
                        Terms of Service
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Bottom bar */}
              <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border/50 gap-4">
                <p className="text-sm text-muted-foreground">
                  © 2025 GreetNow. All rights reserved.
                </p>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <Link href="/terms" className="hover:text-foreground transition-colors">
                    Terms of Service
                  </Link>
                  <Link href="/privacy" className="hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Large brand text */}
          <div className="mt-16 text-center overflow-hidden">
            <div className="text-[12vw] font-black leading-none tracking-tighter brand-fade select-none">
              GREETNOW
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
