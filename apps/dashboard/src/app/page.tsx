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
  AlertTriangle,
  MessageSquare,
  BarChart3,
  Shield,
  Globe,
  ChevronDown,
  ChevronUp,
  Phone,
  PlayCircle,
  Sparkles,
  Timer,
  Award,
  CheckCircle2,
} from "lucide-react";
import { Logo } from "@/lib/components/logo";

const stats = [
  {
    value: "21x",
    label: "More Effective",
    description: "Companies calling within 5 minutes",
    source: "MIT Study",
  },
  {
    value: "391%",
    label: "More Conversions",
    description: "When responding in under 1 minute",
    source: "Zillow Research",
  },
  {
    value: "7%",
    label: "Of Companies",
    description: "Actually respond within 5 minutes",
    source: "Industry Average",
  },
  {
    value: "80%",
    label: "Drop in Qualification",
    description: "When waiting over 5 minutes",
    source: "Lead Response Study",
  },
];

const features = [
  { icon: Video, label: "Simulated live video presence" },
  { icon: Zap, label: "Instant WebRTC connections" },
  { icon: Users, label: "Multi-agent pooling" },
  { icon: Clock, label: "Sub-second response times" },
  { icon: MessageSquare, label: "Real-time visitor engagement" },
  { icon: BarChart3, label: "Conversion analytics" },
  { icon: Shield, label: "Enterprise-grade security" },
  { icon: Globe, label: "Global CDN delivery" },
];

const whyChoose = [
  {
    title: "Create an always-on presence",
    description:
      "Your pre-recorded video loops seamlessly, creating the illusion that a real person is always available. Visitors feel welcomed the moment they land on your site.",
    icon: Video,
  },
  {
    title: "Connect in milliseconds",
    description:
      "When a visitor clicks to engage, the pre-recorded video instantly cuts to your live WebRTC stream. No waiting, no loading—just instant human connection.",
    icon: Zap,
  },
  {
    title: "Scale without limits",
    description:
      "One agent can broadcast to hundreds of visitors simultaneously. When they're busy, visitors seamlessly route to available team members.",
    icon: Users,
  },
];

const faqs = [
  {
    question: "What exactly is GreetNow?",
    answer:
      "GreetNow is a video engagement platform that simulates a live presence on your website. Pre-recorded videos create the appearance of always-available staff, and when visitors engage, you connect instantly via WebRTC for real-time video conversations.",
  },
  {
    question: "How does the 'live illusion' work?",
    answer:
      "You record short intro videos that loop seamlessly on your site. Visitors see what appears to be a live person ready to help. When they click to engage, the recording instantly switches to your actual live video feed.",
  },
  {
    question: "What's the response time improvement?",
    answer:
      "Traditional lead forms can take hours or days. With GreetNow, you're connecting in under 1 minute—that's the 391% conversion increase window that most companies miss.",
  },
  {
    question: "Can I use this with my existing team?",
    answer:
      "Absolutely. GreetNow includes elastic agent pooling, so your entire team can share the workload. When one agent is busy, calls automatically route to available team members.",
  },
  {
    question: "Is my video data secure?",
    answer:
      "Yes. All video streams use end-to-end encryption via WebRTC. No video data is stored on our servers—it's peer-to-peer between you and your visitors.",
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
                href="#features"
                className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
              >
                Features
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
                Why Speed Matters
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
        <section className="container mx-auto px-6 pt-20 pb-32">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-8 animate-fade-in">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  Response time is everything
                </span>
              </div>

              {/* Main headline */}
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 animate-fade-in-up">
                Turn every visitor into a
                <span className="gradient-text block mt-2">
                  live conversation
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in-up opacity-0 [animation-delay:0.2s]">
                GreetNow creates the illusion of a live video presence for every
                visitor. When they engage, you connect instantly via WebRTC.
                Respond in seconds, not hours.
              </p>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up opacity-0 [animation-delay:0.4s]">
                <Link
                  href="/signup"
                  className="group bg-primary text-primary-foreground px-8 py-4 rounded-full font-semibold text-lg hover:bg-primary/90 transition-all flex items-center gap-2 hover:shadow-xl hover:shadow-primary/30"
                >
                  Get started for free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="group glass px-8 py-4 rounded-full font-semibold text-lg hover:bg-muted/50 transition-all flex items-center gap-2"
                >
                  <PlayCircle className="w-5 h-5 text-primary" />
                  See how it works
                </Link>
              </div>
            </div>

            {/* Product mockup */}
            <div className="relative animate-fade-in-up opacity-0 [animation-delay:0.6s]">
              <div className="mockup-glow rounded-2xl overflow-hidden border border-border/50 bg-muted/50 backdrop-blur-sm">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-muted/80 border-b border-border/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex-1 ml-4">
                    <div className="bg-background/50 rounded-lg px-4 py-1.5 text-sm text-muted-foreground max-w-md mx-auto text-center">
                      yourwebsite.com
                    </div>
                  </div>
                </div>

                {/* Mock content */}
                <div className="p-8 min-h-[400px] flex items-center justify-center relative">
                  {/* Simulated page content */}
                  <div className="absolute inset-8 flex">
                    {/* Left side - page content skeleton */}
                    <div className="flex-1 pr-8">
                      <div className="h-8 w-48 bg-muted/60 rounded mb-4" />
                      <div className="h-4 w-full bg-muted/40 rounded mb-2" />
                      <div className="h-4 w-4/5 bg-muted/40 rounded mb-2" />
                      <div className="h-4 w-3/4 bg-muted/40 rounded mb-6" />
                      <div className="h-10 w-32 bg-primary/20 rounded-lg" />
                    </div>

                    {/* Right side - video widget */}
                    <div className="w-80">
                      <div className="bg-gradient-to-br from-muted to-muted/50 rounded-2xl p-1 shadow-2xl shadow-primary/20">
                        <div className="bg-muted/80 rounded-xl overflow-hidden">
                          {/* Video area */}
                          <div className="aspect-video bg-gradient-to-br from-purple-900/40 to-muted relative flex items-center justify-center">
                            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                              <Video className="w-8 h-8 text-primary" />
                            </div>
                            {/* Live indicator */}
                            <div className="absolute top-3 left-3 flex items-center gap-2 bg-success/90 px-2 py-1 rounded-full">
                              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                              <span className="text-xs font-medium text-white">
                                LIVE
                              </span>
                            </div>
                          </div>
                          {/* CTA area */}
                          <div className="p-4 space-y-3">
                            <p className="text-sm text-foreground font-medium">
                              Hi! I'm Sarah, ready to help.
                            </p>
                            <button className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                              <Phone className="w-4 h-4" />
                              Start Video Call
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust logos */}
            <div className="mt-16 text-center animate-fade-in opacity-0 [animation-delay:0.8s]">
              <p className="text-sm text-muted-foreground mb-6">
                Trusted by fast-growing teams
              </p>
              <div className="flex items-center justify-center gap-8 flex-wrap opacity-50">
                {["TechCorp", "StartupX", "GrowthCo", "ScaleUp", "VelocityHQ"].map(
                  (name) => (
                    <div
                      key={name}
                      className="text-lg font-semibold text-muted-foreground/60"
                    >
                      {name}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ===== FEATURES LIST SECTION ===== */}
        <section id="features" className="py-24 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-start gap-16">
              {/* Left side - heading */}
              <div className="lg:w-1/3 lg:sticky lg:top-24">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Your instant engagement
                  <span className="gradient-text block">platform for...</span>
                </h2>
              </div>

              {/* Right side - feature list */}
              <div className="lg:w-2/3 grid sm:grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <div
                    key={feature.label}
                    className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all group"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-medium">{feature.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== STATS SECTION ===== */}
        <section id="stats" className="py-24 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold mb-4">
                  Why speed matters
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  The data is clear: responding faster means more conversions.
                  Here's what the research shows.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                  <div
                    key={stat.label}
                    className="feature-card relative bg-muted/30 border border-border/50 rounded-2xl p-6 text-center overflow-hidden"
                  >
                    {/* Accent glow */}
                    <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />

                    <div className="relative">
                      <div className="text-5xl font-bold gradient-text mb-2">
                        {stat.value}
                      </div>
                      <div className="text-lg font-semibold mb-2">
                        {stat.label}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {stat.description}
                      </p>
                      <div className="text-xs text-primary font-medium">
                        {stat.source}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Urgency callout */}
              <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-muted/50 to-fuchsia-500/10 border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">
                      Only 7% of companies respond within 5 minutes
                    </p>
                    <p className="text-muted-foreground">
                      Be in the top 7%. Get the competitive advantage.
                    </p>
                  </div>
                </div>
                <Link
                  href="/signup"
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium hover:bg-primary/90 transition-all whitespace-nowrap"
                >
                  Start responding faster
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ===== WHY CHOOSE SECTION ===== */}
        <section id="how-it-works" className="py-24 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold mb-4">
                  Why teams choose GreetNow
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Turn passive visitors into active conversations with
                  technology that feels like magic.
                </p>
              </div>

              <div className="grid gap-8">
                {whyChoose.map((item, index) => (
                  <div
                    key={item.title}
                    className={`flex flex-col ${
                      index % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"
                    } items-center gap-8 lg:gap-16`}
                  >
                    {/* Content */}
                    <div className="flex-1">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                        <item.icon className="w-6 h-6 text-primary" />
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

        {/* ===== ADDITIONAL FEATURES ===== */}
        <section className="py-24 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
              {/* Feature card 1 */}
              <div className="feature-card relative bg-muted/30 border border-border/50 rounded-2xl p-8 overflow-hidden">
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/20 rounded-full blur-3xl" />
                <div className="relative">
                  <Timer className="w-8 h-8 text-primary mb-4" />
                  <h3 className="text-2xl font-bold mb-3">
                    Catch leads before they bounce
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    The average visitor leaves in under 60 seconds. GreetNow
                    engages them instantly with a video presence that feels
                    personal—before they click away to a competitor.
                  </p>
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Increase engagement by 3x</span>
                  </div>
                </div>
              </div>

              {/* Feature card 2 */}
              <div className="feature-card relative bg-muted/30 border border-border/50 rounded-2xl p-8 overflow-hidden">
                <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-fuchsia-500/20 rounded-full blur-3xl" />
                <div className="relative">
                  <Award className="w-8 h-8 text-primary mb-4" />
                  <h3 className="text-2xl font-bold mb-3">
                    Stand out from the crowd
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    While 93% of companies take over 5 minutes to respond,
                    you'll be connecting in seconds. That's not just faster—it's
                    a completely different experience.
                  </p>
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Join the top 7%</span>
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

              <div className="mt-12 text-center">
                <p className="text-muted-foreground mb-4">
                  Have more questions?
                </p>
                <Link
                  href="mailto:hello@greetnow.io"
                  className="inline-flex items-center gap-2 border border-border/50 px-6 py-3 rounded-full font-medium hover:bg-muted/50 transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  Contact Us
                </Link>
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
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-4xl md:text-6xl font-bold mb-6">
                Start converting
                <span className="gradient-text block mt-2">visitors today</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-10 max-w-xl mx-auto">
                Join the companies that respond in seconds, not hours. Start
                your free trial and see the difference speed makes.
              </p>
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 bg-primary text-primary-foreground px-10 py-5 rounded-full font-semibold text-xl hover:bg-primary/90 transition-all hover:shadow-2xl hover:shadow-primary/30"
              >
                Get started for free
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
                    GreetNow works alongside you, creating live video presence,
                    connecting visitors, and accelerating your workflow from
                    landing to close.
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
