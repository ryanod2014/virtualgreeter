"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
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
  Sparkles,
  CheckCircle2,
  Flame,
  DollarSign,
  Eye,
  Settings,
  Filter,
  Layers,
  AlertTriangle,
  Heart,
  VideoOff,
  XCircle,
  FileText,
  BarChart3,
} from "lucide-react";
import { Logo } from "@/lib/components/logo";
import { WidgetDemo } from "@/lib/components/WidgetDemo";

// ===== FAQ DATA =====
const faqs = [
  {
    question: "Who is this for?",
    answer: "GreetNow is built for businesses selling high-ticket services—where one conversation can be worth $5K, $10K, or $50K+. Coaches, consultants, professional services, home services, agencies. If your business model depends on getting people on calls, this changes everything.",
  },
  {
    question: "We're not awake 24/7. How do I staff this?",
    answer: "The widget only appears when your agents are marked as available. When no one's online, visitors see your regular site—no one is ever disappointed by an empty widget. You set the hours, assign the team, and it handles the rest.",
  },
  {
    question: "I don't want my closers wasting time on tire-kickers.",
    answer: "Put the widget only on high-intent pages (pricing, services, contact). Block countries you don't serve. Think about it: when a bad lead fills out a form, you still waste time qualifying them. This way, you find out faster—and often the BEST leads are the ones who never wanted to give out their phone number anyway.",
  },
  {
    question: "Won't this scare away introverts? They have to be on camera?",
    answer: "No! Your visitors DON'T have to turn on their camera. They see and hear YOU first (building trust), then simply click 'Unmute' to talk back. Their camera stays off unless THEY choose to turn it on. It's an invitation, not an ambush.",
  },
  {
    question: "We already use a chatbot. Isn't that enough?",
    answer: "Chatbots are for support: 'Where's my order?' Video is for sales: 'Here's my credit card.' Text chat is low-trust, low-conversion. When prospects see an actual human face, you become real, trustworthy, memorable. High-ticket sales require high trust. Video builds it instantly.",
  },
  {
    question: "What if I install this and nobody clicks it?",
    answer: "Even if visitors don't click, seeing a live human on screen proves you're real, open, and not a scam. It acts as a trust signal that increases conversions on your OTHER forms too. But here's the thing: when you put a greeter at the door, people engage. That's just human nature.",
  },
  {
    question: "This sounds technically complicated.",
    answer: "It's easier than installing a Facebook Pixel. Copy one line of code. Paste it. You're live. Works with WordPress, ClickFunnels, GoHighLevel, Webflow, and everything else. Setup time: 60 seconds. No developers needed.",
  },
  {
    question: "What if it doesn't work for my business?",
    answer: "Start your free 7-day trial. If it's not booking more appointments than relying on the old way, cancel with one click in your dashboard—no phone calls, no guilt trips, no hostage situations. If it doesn't pay for itself, we don't want your money.",
  },
];

// ===== COMPONENTS =====

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
          isOpen ? "max-h-96 pb-5 px-6" : "max-h-0"
        }`}
      >
        <p className="text-muted-foreground leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

function TrialCTA({ size = "default", className = "" }: { size?: "default" | "large" | "small"; className?: string }) {
  if (size === "large") {
    return (
      <Link
        href="/signup"
        className={`group inline-flex items-center gap-2 bg-primary text-primary-foreground px-10 py-5 rounded-full font-semibold text-xl hover:bg-primary/90 transition-all hover:shadow-2xl hover:shadow-primary/30 ${className}`}
      >
        Start Free 7-Day Trial
        <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
      </Link>
    );
  }

  if (size === "small") {
    return (
      <Link
        href="/signup"
        className={`group inline-flex items-center gap-2 text-primary font-semibold hover:underline ${className}`}
      >
        Start your free trial
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </Link>
    );
  }
  
  return (
    <Link
      href="/signup"
      className={`group inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-full font-semibold text-lg hover:bg-primary/90 transition-all hover:shadow-xl hover:shadow-primary/30 ${className}`}
    >
      Start Free 7-Day Trial
      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
    </Link>
  );
}

// Feature carousel data
const FEATURES = [
  {
    icon: Settings,
    title: "Customize Everything",
    description: "Control the look, pages it shows on, and which leads it blocks. Your brand, your rules.",
  },
  {
    icon: Layers,
    title: "Only Shows When Live",
    description: "Appears only when agents are available. No disappointed visitors, no missed opportunities.",
  },
  {
    icon: Users,
    title: "Assign Reps to Pages",
    description: "Your closer on pricing, your SDR on the blog. Right rep, right page, right conversation.",
  },
  {
    icon: Video,
    title: "Record Every Call",
    description: "Never miss a word. Review calls for training, quality control, or settling disputes.",
  },
  {
    icon: FileText,
    title: "Auto-Transcribe Conversations",
    description: "Every call transcribed automatically. Searchable, shareable, ready for your CRM.",
  },
  {
    icon: Sparkles,
    title: "AI Call Summaries",
    description: "AI reads the transcript and writes the summary. Know what happened in 10 seconds flat.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description: "See who's calling, when they're calling, and what's converting. Data that drives decisions.",
  },
  {
    icon: Target,
    title: "Custom Dispositions",
    description: "Tag calls your way—qualified, booked, nurture, junk. Your pipeline, organized instantly.",
  },
  {
    icon: Zap,
    title: "Facebook Pixel Integration",
    description: "Fire your pixel on call outcomes. Feed the algorithm the signals it craves.",
  },
  {
    icon: Globe,
    title: "Block Countries",
    description: "Only serve the markets you want. No more wasting time on leads you can't help.",
  },
  {
    icon: Shield,
    title: "Spam Protection",
    description: "Built-in filters keep the trolls out. Your team talks to real prospects, not bots.",
  },
  {
    icon: Clock,
    title: "Availability Scheduling",
    description: "Set your hours. Widget appears when you're ready, hides when you're not.",
  },
];

function FeatureCarousel() {
  const [startIndex, setStartIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const visibleCount = 4;
  const canScrollUp = startIndex > 0;
  const canScrollDown = startIndex < FEATURES.length - visibleCount;

  const visibleFeatures = FEATURES.slice(startIndex, startIndex + visibleCount);

  const handleScroll = (dir: 'up' | 'down') => {
    if (isAnimating) return;
    setDirection(dir);
    setIsAnimating(true);
    
    setTimeout(() => {
      if (dir === 'up') {
        setStartIndex((prev) => Math.max(0, prev - 1));
      } else {
        setStartIndex((prev) => Math.min(FEATURES.length - visibleCount, prev + 1));
      }
      setTimeout(() => {
        setIsAnimating(false);
        setDirection(null);
      }, 50);
    }, 150);
  };

  return (
    <div className="space-y-3">
      {/* Features list */}
      <div className={`space-y-2 transition-all duration-300 ${
        isAnimating && direction === 'down' ? 'translate-y-[-8px] opacity-80' : 
        isAnimating && direction === 'up' ? 'translate-y-[8px] opacity-80' : 
        'translate-y-0 opacity-100'
      }`}
      style={{ 
        transition: isAnimating 
          ? 'transform 0.15s ease-out, opacity 0.15s ease-out' 
          : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out'
      }}>
        {visibleFeatures.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <div 
              key={`${feature.title}-${startIndex}`}
              className="bg-muted/30 border border-border/50 rounded-xl p-4 hover:border-primary/30 hover:bg-muted/50 transition-all group"
              style={{
                animationDelay: `${idx * 50}ms`
              }}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed mt-0.5">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-muted-foreground">
          {startIndex + 1}-{Math.min(startIndex + visibleCount, FEATURES.length)} of {FEATURES.length}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => canScrollUp && handleScroll('up')}
            disabled={!canScrollUp}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              canScrollUp 
                ? 'bg-muted/50 hover:bg-primary/20 hover:scale-110 text-foreground cursor-pointer active:scale-95' 
                : 'text-muted-foreground/30 cursor-not-allowed'
            }`}
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => canScrollDown && handleScroll('down')}
            disabled={!canScrollDown}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              canScrollDown 
                ? 'bg-muted/50 hover:bg-primary/20 hover:scale-110 text-foreground cursor-pointer active:scale-95' 
                : 'text-muted-foreground/30 cursor-not-allowed'
            }`}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TrialBanner() {
  return (
    <div className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10 border border-primary/20 rounded-2xl p-6 text-center">
      <p className="text-lg mb-3">
        <span className="font-semibold text-foreground">Ready to stop losing leads?</span>
      </p>
      <TrialCTA size="small" />
      <p className="text-sm text-muted-foreground mt-3">
        7-day free trial • Cancel anytime • No credit card required
      </p>
    </div>
  );
}

// Store illustration component
function StoreIllustration({ variant }: { variant: "old" | "new" }) {
  const isOld = variant === "old";
  
  return (
    <div className={`relative w-full h-48 rounded-xl overflow-hidden ${
      isOld ? "bg-slate-900" : "bg-gradient-to-br from-slate-900 to-slate-800"
    }`}>
      {/* Store interior */}
      <div className="absolute inset-0 p-4">
        {/* Counter */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-slate-800 border-t-2 border-slate-700" />
        
        {isOld ? (
          <>
            {/* Sales rep HIDING behind counter */}
            <div className="absolute bottom-8 left-1/4 transform -translate-x-1/2">
              <div className="relative">
                {/* Just eyes peeking over */}
                <div className="w-10 h-2 bg-slate-700 rounded-full flex justify-center gap-1.5 pt-0.5">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
                {/* Clipboard being held up */}
                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-12 h-14 bg-amber-100 rounded border-2 border-amber-200 flex flex-col items-center justify-center shadow-lg rotate-[-5deg]">
                  <div className="text-[6px] font-bold text-slate-800 mb-0.5">OPT-IN</div>
                  <div className="space-y-0.5">
                    <div className="w-8 h-1 bg-slate-300 rounded" />
                    <div className="w-8 h-1 bg-slate-300 rounded" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Customer walking away */}
            <div className="absolute bottom-16 right-6">
              <div className="relative">
                <div className="w-6 h-6 bg-slate-500 rounded-full" />
                <div className="w-7 h-10 bg-slate-500 rounded-lg mt-0.5" />
                <div className="absolute -top-2 right-0 text-sm">❓</div>
                <ArrowRight className="absolute -right-5 top-4 w-4 h-4 text-red-400" />
              </div>
            </div>
            
            <XCircle className="absolute top-4 right-4 w-8 h-8 text-red-500/40" />
          </>
        ) : (
          <>
            {/* Sales rep GREETING */}
            <div className="absolute bottom-8 left-1/4 transform -translate-x-1/2">
              <div className="relative">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm">
                  👋
                </div>
                <div className="w-9 h-12 bg-primary/80 rounded-lg mt-0.5" />
                <div className="absolute -top-6 -right-12 bg-white text-slate-800 px-2 py-1 rounded-lg text-[8px] font-medium shadow-lg">
                  Hi! Can I help?
                </div>
              </div>
            </div>
            
            {/* Customer engaging */}
            <div className="absolute bottom-16 right-8">
              <div className="relative">
                <div className="w-6 h-6 bg-green-400 rounded-full" />
                <div className="w-7 h-10 bg-green-400/80 rounded-lg mt-0.5" />
                <div className="absolute -top-2 right-0 text-sm">😊</div>
              </div>
            </div>
            
            <CheckCircle2 className="absolute top-4 right-4 w-8 h-8 text-green-500/40" />
          </>
        )}
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  // Old Way Calculator state - realistic defaults
  const [costPerClick, setCostPerClick] = useState(15);
  const [monthlyVisitors, setMonthlyVisitors] = useState(2000);
  const [optinRate, setOptinRate] = useState(3);
  const [contactRate, setContactRate] = useState(35);

  // Calculate the math
  const monthlySpend = costPerClick * monthlyVisitors;
  const formFills = Math.round(monthlyVisitors * (optinRate / 100));
  const actualCalls = Math.round(formFills * (contactRate / 100));
  const costPerConversation = actualCalls > 0 ? Math.round(monthlySpend / actualCalls) : 0;
  const missedVisitors = monthlyVisitors - formFills;

  return (
    <div className="min-h-screen bg-background dark relative overflow-hidden">
      {/* Noise overlay for texture */}
      <div className="noise-overlay" />

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="glow-orb w-[800px] h-[800px] -top-[400px] left-1/2 -translate-x-1/2 bg-primary/20 animate-glow-pulse" />
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
              <Link href="#demo" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
                Demo
              </Link>
              <Link href="#benefits" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
                Benefits
              </Link>
              <Link href="#faq" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
                FAQ
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                Sign in
              </Link>
              <Link
                href="/signup"
                className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25"
              >
                Start Free Trial
              </Link>
            </div>
          </nav>
        </header>

        {/* ===== SECTION 1: HEADLINE ===== */}
        <section className="container mx-auto px-6 pt-16 pb-12">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                A new way to convert website traffic
              </span>
            </div>

            {/* Main headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 animate-fade-in-up leading-[1.1]">
              Turn Pageviews Into Live Sales Calls...
            </h1>
            
            <p className="text-2xl md:text-3xl lg:text-4xl font-bold gradient-text mb-8">
              Without Them Ever Opting In Or Booking An Appointment
            </p>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
              Leads are never &quot;hotter&quot; than the moment they land on your page. <span className="text-foreground font-semibold">GreetNow</span> lets your setters treat website traffic like walk-in customers.
            </p>

            {/* CTA */}
            <div className="mb-6">
              <TrialCTA />
            </div>
            
            <p className="text-sm text-muted-foreground">
              7-day free trial • Cancel anytime • No credit card required
            </p>
          </div>
        </section>

        {/* ===== SECTION 2: HERE'S WHAT I GOT (Demo + Features) ===== */}
        <section id="demo" className="py-20 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
                Here&apos;s What It Looks Like On Your Site
              </h2>
              <p className="text-xl text-muted-foreground text-center mb-6 max-w-2xl mx-auto">
                A live video greeter that appears to every visitor—right on your website—to help you:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 text-primary font-medium text-sm">
                  <Zap className="w-4 h-4" />
                  Get more leads from existing traffic
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 text-primary font-medium text-sm">
                  <Clock className="w-4 h-4" />
                  Instant speed to lead
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 text-primary font-medium text-sm">
                  <Flame className="w-4 h-4" />
                  Talk to leads at their hottest
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 text-primary font-medium text-sm">
                  <Shield className="w-4 h-4" />
                  Build trust with cold traffic
                </span>
              </div>

              <div className="grid lg:grid-cols-5 gap-8 items-start">
                {/* Demo - Left Side (3 columns) */}
                <div className="lg:col-span-3">
                  <WidgetDemo />
                </div>

                {/* Features - Right Side (2 columns) - Animated Carousel */}
                <div className="lg:col-span-2">
                  <FeatureCarousel />
                  <div className="mt-6">
                    <TrialCTA size="small" />
                  </div>
                </div>
              </div>

              {/* Integration logos */}
              <div className="mt-16 text-center">
                <p className="text-sm text-muted-foreground mb-6">
                  Embed on any website with 1 line of code
                </p>
                <div className="flex items-center justify-center gap-8 md:gap-14 flex-wrap opacity-50">
                  <img src="/logos/wordpress.png" alt="WordPress" className="h-10 w-auto brightness-0 invert hover:opacity-80 transition-opacity" />
                  <img src="/logos/clickfunnels.png" alt="ClickFunnels" className="h-9 w-auto brightness-0 invert hover:opacity-80 transition-opacity" />
                  <div className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <img src="/logos/highlevel.png" alt="HighLevel" className="h-7 w-auto" />
                    <span className="text-white font-bold text-lg tracking-tight">HighLevel</span>
                  </div>
                  <img src="/logos/webflow.svg" alt="Webflow" className="h-5 w-auto brightness-0 invert hover:opacity-80 transition-opacity" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== TRIAL CLOSE ===== */}
        <section className="py-8">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl mx-auto">
              <TrialBanner />
            </div>
          </div>
        </section>

        {/* ===== SECTION 3: HERE'S WHO IT'S FOR ===== */}
        <section className="py-20 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">
                Here&apos;s Who It&apos;s For
              </h2>
              <p className="text-xl text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
                If leads are worth a lot to your business, can you afford to <span className="text-foreground font-semibold">NOT</span> greet them at the door?
              </p>

              {/* Business Types - Prominent List */}
              <div className="max-w-md mx-auto">
                <div className="space-y-3">
                  {[
                    { icon: DollarSign, label: "High-Ticket Services ($1K+)" },
                    { icon: Users, label: "Coaches & Consultants" },
                    { icon: Shield, label: "Professional Services" },
                    { icon: Globe, label: "Home Services" },
                    { icon: Target, label: "B2B Sales Teams" },
                    { icon: TrendingUp, label: "Agencies" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-4 px-6 py-4 rounded-xl bg-muted/40 border border-border/50 hover:border-primary/30 hover:bg-muted/60 transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-lg font-medium">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SECTION 4: HERE'S WHAT IT WILL DO FOR YOU ===== */}
        <section id="benefits" className="py-20 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
                Here&apos;s What It Will Do For You
              </h2>
              <p className="text-xl text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
                All in-person businesses have greeters. Why doesn&apos;t your website?
              </p>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-muted/30 border border-border/50 rounded-2xl p-8">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                    <TrendingUp className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Get More Leads From Your Existing Traffic</h3>
                  <p className="text-muted-foreground mb-4">
                    Rather than a small percentage of your leads opting in...
                  </p>
                  <p className="text-lg font-medium text-foreground">
                    Talk to visitors who would <span className="text-primary">never</span> fill out a form.
                  </p>
                </div>

                <div className="bg-muted/30 border border-border/50 rounded-2xl p-8">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                    <Zap className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Speed To Lead That Actually Works</h3>
                  <p className="text-muted-foreground mb-4">
                    Rather than chasing them after they already left...
                  </p>
                  <p className="text-lg font-medium text-foreground mb-4">
                    Talk to them <span className="text-primary">while they&apos;re still on your site</span>.
                  </p>
                  <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
                    <span className="text-2xl font-black text-primary">78%</span>
                    <span className="text-sm text-muted-foreground ml-2">of buyers choose the first person they talk to</span>
                  </div>
                </div>

                <div className="bg-muted/30 border border-border/50 rounded-2xl p-8">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                    <Flame className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Leads At Their Warmest</h3>
                  <p className="text-muted-foreground mb-4">
                    Leads are never warmer than when they&apos;re on your site.
                  </p>
                  <p className="text-lg font-medium text-foreground">
                    The moment they leave, Facebook starts showing them <span className="text-primary">your competitors&apos; ads</span>.
                  </p>
                </div>

                <div className="bg-muted/30 border border-border/50 rounded-2xl p-8">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                    <Heart className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Build Trust Instantly</h3>
                  <p className="text-muted-foreground mb-4">
                    We&apos;re in a trust recession. People are skeptical of faceless websites.
                  </p>
                  <p className="text-lg font-medium text-foreground">
                    A <span className="text-primary">real human face</span> builds trust faster than any landing page.
                  </p>
                </div>
              </div>

              {/* Trial CTA */}
              <div className="mt-12 text-center">
                <TrialCTA />
              </div>
            </div>
          </div>
        </section>

        {/* ===== SECTION: THE OLD WAY (Hiding Behind Counter + Calculator) ===== */}
        <section className="py-20 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
                The Old Way Is Broken
              </h2>
              <p className="text-xl text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
                This is what your website is doing right now.
              </p>

              {/* Hiding Behind Counter Analogy */}
              <div className="grid md:grid-cols-2 gap-8 mb-16">
                {/* Old Way */}
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-br from-red-500/20 to-transparent rounded-3xl blur-xl" />
                  <div className="relative bg-muted/30 border border-red-500/20 rounded-2xl overflow-hidden">
                    <StoreIllustration variant="old" />
                    <div className="p-6">
                      <h3 className="text-lg font-bold mb-2 text-red-400">Your Website Now</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                        A customer walks in. Instead of greeting them, your sales rep <span className="text-foreground font-semibold">ducks behind the counter</span> and slides a clipboard across the floor:
                      </p>
                      <p className="italic text-muted-foreground text-sm mb-3">
                        &quot;Write down your phone number, leave the store, and I&apos;ll call you in 3 hours.&quot;
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-medium">Leaves confused</span>
                        <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-medium">Goes to competitor</span>
                        <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-medium">Ignores your call</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* New Way */}
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-br from-green-500/20 to-transparent rounded-3xl blur-xl" />
                  <div className="relative bg-muted/30 border border-green-500/20 rounded-2xl overflow-hidden">
                    <StoreIllustration variant="new" />
                    <div className="p-6">
                      <h3 className="text-lg font-bold mb-2 text-green-400">With GreetNow</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                        A customer walks in. Your greeter is <span className="text-foreground font-semibold">standing at the door, smiling</span>:
                      </p>
                      <p className="italic text-muted-foreground text-sm mb-3">
                        &quot;Hi, I&apos;m here if you need me!&quot;
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-medium">Customer engages</span>
                        <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-medium">Questions answered</span>
                        <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-medium">Deal closed</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Funnel Calculator */}
              <div className="bg-muted/30 border border-border/50 rounded-3xl p-8 md:p-12">
                <h3 className="text-2xl md:text-3xl font-bold text-center mb-2">
                  Where Your Money Goes
                </h3>
                <p className="text-muted-foreground text-center mb-8">
                  Adjust the sliders to see your funnel.
                </p>

                {/* Sliders */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12 max-w-4xl mx-auto">
                  <div className="bg-slate-800/50 rounded-xl p-4">
                    <label className="block text-xs text-muted-foreground mb-2">Cost per click</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="5"
                        max="100"
                        value={costPerClick}
                        onChange={(e) => setCostPerClick(Number(e.target.value))}
                        className="flex-1 accent-primary h-2"
                      />
                      <span className="text-lg font-bold text-primary w-14">${costPerClick}</span>
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4">
                    <label className="block text-xs text-muted-foreground mb-2">Monthly visitors</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="500"
                        max="20000"
                        step="100"
                        value={monthlyVisitors}
                        onChange={(e) => setMonthlyVisitors(Number(e.target.value))}
                        className="flex-1 accent-primary h-2"
                      />
                      <span className="text-lg font-bold text-primary w-16">{monthlyVisitors.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4">
                    <label className="block text-xs text-muted-foreground mb-2">Optin rate</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="1"
                        max="15"
                        value={optinRate}
                        onChange={(e) => setOptinRate(Number(e.target.value))}
                        className="flex-1 accent-primary h-2"
                      />
                      <span className="text-lg font-bold text-primary w-12">{optinRate}%</span>
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4">
                    <label className="block text-xs text-muted-foreground mb-2">Answer rate</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="10"
                        max="80"
                        value={contactRate}
                        onChange={(e) => setContactRate(Number(e.target.value))}
                        className="flex-1 accent-primary h-2"
                      />
                      <span className="text-lg font-bold text-primary w-12">{contactRate}%</span>
                    </div>
                  </div>
                </div>

                {/* Visual Funnel - True Tapered Shape */}
                <div className="max-w-lg mx-auto relative">
                  <svg viewBox="0 0 400 320" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <linearGradient id="topGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgb(100, 116, 139)" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="rgb(71, 85, 105)" stopOpacity="0.4" />
                      </linearGradient>
                      <linearGradient id="midGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgb(71, 85, 105)" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="rgb(51, 65, 85)" stopOpacity="0.35" />
                      </linearGradient>
                      <linearGradient id="botGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgb(51, 65, 85)" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="rgb(30, 41, 59)" stopOpacity="0.5" />
                      </linearGradient>
                    </defs>
                    
                    {/* Top section - full width */}
                    <path d="M 10 0 L 390 0 L 330 90 L 70 90 Z" fill="url(#topGrad)" stroke="rgb(100, 116, 139)" strokeOpacity="0.5" strokeWidth="1.5" />
                    
                    {/* Middle section - narrower */}
                    <path d="M 70 95 L 330 95 L 260 185 L 140 185 Z" fill="url(#midGrad)" stroke="rgb(71, 85, 105)" strokeOpacity="0.4" strokeWidth="1.5" />
                    
                    {/* Bottom section - narrowest */}
                    <path d="M 140 190 L 260 190 L 220 280 L 180 280 Z" fill="url(#botGrad)" stroke="rgb(51, 65, 85)" strokeOpacity="0.5" strokeWidth="1.5" />
                  </svg>

                  {/* Content overlays */}
                  <div className="absolute inset-0 flex flex-col pointer-events-none">
                    {/* Top content - visitors */}
                    <div className="flex items-center justify-center" style={{ height: '28%', paddingTop: '8px' }}>
                      <div className="text-center">
                        <p className="text-[10px] md:text-xs text-slate-400 mb-0.5">You spend <span className="text-white font-semibold">${monthlySpend.toLocaleString()}/mo</span> to get</p>
                        <p className="text-2xl md:text-3xl font-black text-white leading-none">{monthlyVisitors.toLocaleString()}</p>
                        <p className="text-[10px] md:text-xs text-slate-400">visitors</p>
                      </div>
                    </div>

                    {/* Middle content - optins */}
                    <div className="flex items-center justify-center" style={{ height: '28%', paddingTop: '8px' }}>
                      <div className="text-center">
                        <p className="text-[10px] md:text-xs text-slate-400 mb-0.5">Only <span className="text-white font-semibold">{optinRate}%</span> optin</p>
                        <p className="text-2xl md:text-3xl font-black text-white leading-none">{formFills}</p>
                        <p className="text-[10px] md:text-xs text-slate-400">leads</p>
                      </div>
                    </div>

                    {/* Bottom content - conversations */}
                    <div className="flex items-center justify-center" style={{ height: '28%', paddingTop: '8px' }}>
                      <div className="text-center">
                        <p className="text-[10px] md:text-xs text-slate-400 mb-0.5">You talk to</p>
                        <p className="text-2xl md:text-3xl font-black text-white leading-none">{actualCalls}</p>
                        <p className="text-[10px] md:text-xs text-slate-400">people</p>
                      </div>
                    </div>
                  </div>

                  {/* Dropoff badges - positioned to the right */}
                  <div className="absolute right-0 md:-right-4 flex flex-col items-start" style={{ top: '22%' }}>
                    <div className="bg-red-500/20 border border-red-500/30 rounded-lg px-2 py-1 text-[10px] md:text-xs">
                      <span className="text-red-400 font-semibold">↓ {100 - optinRate}% leave</span>
                    </div>
                  </div>
                  <div className="absolute right-0 md:-right-4 flex flex-col items-start" style={{ top: '52%' }}>
                    <div className="bg-red-500/20 border border-red-500/30 rounded-lg px-2 py-1 text-[10px] md:text-xs">
                      <span className="text-red-400 font-semibold">↓ {100 - contactRate}% never answer</span>
                    </div>
                  </div>
                </div>

                {/* The Bottom Line */}
                <div className="mt-10 max-w-xl mx-auto">
                  <div className="bg-gradient-to-br from-red-500/20 to-red-900/20 border-2 border-red-500/30 rounded-2xl p-6 text-center">
                    <p className="text-muted-foreground mb-1">You spend <span className="text-white font-bold">${monthlySpend.toLocaleString()}</span> to talk to <span className="text-white font-bold">{actualCalls}</span> people</p>
                    <p className="text-4xl md:text-5xl font-black text-red-400 my-3">
                      ${costPerConversation.toLocaleString()}<span className="text-lg font-normal text-red-400/70"> per conversation</span>
                    </p>
                  </div>

                  {/* The Big Question - Made Prominent */}
                  <div className="text-center mt-10 mb-8">
                    <p className="text-2xl md:text-3xl font-bold text-white mb-3">
                      What if you could talk to the <span className="text-primary">{missedVisitors.toLocaleString()}</span> who left?
                    </p>
                    <p className="text-lg md:text-xl text-muted-foreground">
                      That&apos;s <span className="text-white font-semibold">{Math.round((missedVisitors / monthlyVisitors) * 100)}%</span> of your traffic you&apos;re paying for but never speaking to.
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <TrialCTA size="large" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SECTION 5: HERE'S WHAT TO DO NOW ===== */}
        <section className="py-24 relative">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/20 rounded-full blur-[120px]" />
          </div>

          <div className="container mx-auto px-6 relative">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-8">
                Here&apos;s What To Do Now
              </h2>

              <div className="space-y-6 mb-12 text-left max-w-xl mx-auto">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-primary-foreground font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">Start your free 7-day trial</h3>
                    <p className="text-muted-foreground">
                      Takes 60 seconds. No credit card required to start.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-primary-foreground font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">Cancel anytime during your trial</h3>
                    <p className="text-muted-foreground">
                      If it&apos;s not booking you more appointments than the old way, just cancel.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-primary-foreground font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">Cancel without talking to a human</h3>
                    <p className="text-muted-foreground">
                      One-click cancel in your dashboard under billing settings. No phone calls, no guilt trips.
                    </p>
                  </div>
                </div>
              </div>

              <TrialCTA size="large" />
            </div>
          </div>
        </section>

        {/* ===== SECTION 6: URGENCY ===== */}
        <section className="py-16 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/20 rounded-2xl p-8 md:p-10 text-center">
                <div className="inline-flex items-center gap-2 bg-amber-500/20 rounded-full px-4 py-1.5 mb-6">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-amber-400">
                    Don&apos;t miss this
                  </span>
                </div>
                
                <h3 className="text-2xl md:text-3xl font-bold mb-4">
                  There Are Visitors On Your Website Right Now
                </h3>
                
                <p className="text-lg text-muted-foreground mb-6">
                  Every day you don&apos;t have this, you&apos;re losing people you already paid to get. 
                  They land, they look, they leave—without ever talking to you.
                </p>
                
                <p className="text-xl font-semibold text-foreground mb-8">
                  How many more will you lose before you greet them at the door?
                </p>

                <TrialCTA />
              </div>
            </div>
          </div>
        </section>

        {/* ===== SECTION 7: FAQ ===== */}
        <section id="faq" className="py-20 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
                Questions? We&apos;ve Got Answers.
              </h2>
              <p className="text-muted-foreground text-center mb-12">
                Everything you need to know before getting started.
              </p>

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
                <p className="text-lg text-muted-foreground mb-6">
                  Ready to stop losing leads?
                </p>
                <TrialCTA />
              </div>
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="py-16 border-t border-border/50">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-4 gap-12 mb-16">
                <div className="md:col-span-1">
                  <Logo size="lg" />
                  <p className="mt-4 text-muted-foreground text-sm leading-relaxed">
                    Turn website visitors into live sales calls—without them ever filling out a form. The live greeter platform for high-ticket businesses.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-4">Product</h4>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li><Link href="#demo" className="hover:text-foreground transition-colors">Demo</Link></li>
                    <li><Link href="#benefits" className="hover:text-foreground transition-colors">Benefits</Link></li>
                    <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-4">Resources</h4>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li><Link href="#faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
                    <li><Link href="/docs" className="hover:text-foreground transition-colors">Help Center</Link></li>
                    <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-4">Company</h4>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                    <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border/50 gap-4">
                <p className="text-sm text-muted-foreground">
                  © 2025 GreetNow. All rights reserved.
                </p>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
                  <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
                </div>
              </div>
            </div>
          </div>

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
