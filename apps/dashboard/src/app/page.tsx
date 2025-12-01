"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Zap,
  Users,
  Video,
  VideoOff,
  Volume2,
  ArrowRight,
  Clock,
  TrendingUp,
  Target,
  Shield,
  Globe,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Flame,
  DollarSign,
  Settings,
  Layers,
  AlertTriangle,
  Heart,
  FileText,
  BarChart3,
  CheckCircle2,
  Eye,
  PhoneOff,
  Phone,
  X,
  Check,
  Store,
  Ghost,
  Skull,
  MessageSquareX,
  Smile,
  Frown,
  UserX,
  Headphones,
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
    answer: "Even if visitors don't click, seeing a live human on screen proves you're real, open, and not a scam. It acts as a trust signal—visitors know there's a real person behind the website. But here's the thing: when you put a greeter at the door, people engage. That's just human nature.",
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
    title: "Only Shows When Available",
    description: "Widget only shows when agents are active. No disappointed visitors, no missed opportunities.",
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
        setStartIndex((prev) => Math.max(0, prev - visibleCount));
      } else {
        setStartIndex((prev) => Math.min(FEATURES.length - visibleCount, prev + visibleCount));
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">See more features.</span>
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

// ===== MAIN PAGE =====

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  // Socratic questions state - tracks "yes" | "no" | null for each question
  const [questionAnswers, setQuestionAnswers] = useState<Record<number, "yes" | "no" | null>>({});
  
  const answerQuestion = (idx: number, answer: "yes" | "no") => {
    setQuestionAnswers(prev => ({
      ...prev,
      [idx]: prev[idx] === answer ? null : answer
    }));
  };
  
  const answeredCount = Object.values(questionAnswers).filter(v => v !== null).length;
  const yesCount = Object.values(questionAnswers).filter(v => v === "yes").length;
  
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
        <header className="container mx-auto px-6 py-5">
          <nav className="flex items-center justify-between">
            <Logo size="md" />
            
            {/* Right-aligned nav - glass pill */}
            <div className="hidden md:flex items-center">
              <div className="flex items-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-1.5 py-1.5">
                <Link href="#how-it-works" className="px-4 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all">
                  How It Works
                </Link>
                <Link href="#industries" className="px-4 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all">
                  Industries
                </Link>
                <Link href="#benefits" className="px-4 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all">
                  Benefits
                </Link>
                <Link href="#faq" className="px-4 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all">
                  FAQ
                </Link>
                <div className="w-px h-5 bg-white/10 mx-2" />
                <Link href="/login" className="px-4 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all">
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-medium hover:bg-primary/90 transition-all ml-1"
                >
                  Start Free Trial
                </Link>
              </div>
            </div>
            
            {/* Mobile CTA only */}
            <Link
              href="/signup"
              className="md:hidden bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium"
            >
              Start Free Trial
            </Link>
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
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-4 leading-relaxed">
              Leads are never &quot;hotter&quot; than the moment they land on your page. <span className="text-foreground font-semibold">GreetNow</span> lets your setters treat website traffic like walk-in customers.
            </p>
            <p className="text-lg text-primary font-semibold mb-10">
              One click. Face-to-face. While they&apos;re still on your site.
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
        <section id="how-it-works" className="py-20 relative scroll-mt-20">
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

              {/* Easy Setup Section */}
              <div id="features" className="mt-16 bg-muted/20 border border-border/50 rounded-3xl p-8 md:p-10 scroll-mt-24">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">Setup in 60 Seconds</h3>
                  <p className="text-muted-foreground">
                    Easier than installing a Facebook Pixel. No developers needed.
                  </p>
                </div>
                
                {/* Steps */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 mb-10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">1</div>
                    <span className="text-sm text-muted-foreground">Copy one line of code</span>
                  </div>
                  <div className="hidden md:block text-muted-foreground/30">→</div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">2</div>
                    <span className="text-sm text-muted-foreground">Paste it on your site</span>
                  </div>
                  <div className="hidden md:block text-muted-foreground/30">→</div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">3</div>
                    <span className="text-sm text-muted-foreground">You&apos;re live</span>
                  </div>
                </div>

                {/* Platform logos */}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-4">Works with everything</p>
                  <div className="flex items-center justify-center gap-8 md:gap-12 flex-wrap opacity-60">
                    <img src="/logos/wordpress.png" alt="WordPress" className="h-8 w-auto brightness-0 invert hover:opacity-80 transition-opacity" />
                    <img src="/logos/clickfunnels.png" alt="ClickFunnels" className="h-7 w-auto brightness-0 invert hover:opacity-80 transition-opacity" />
                    <div className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                      <img src="/logos/highlevel.png" alt="HighLevel" className="h-6 w-auto" />
                      <span className="text-white font-bold text-base tracking-tight">HighLevel</span>
                    </div>
                    <img src="/logos/webflow.svg" alt="Webflow" className="h-4 w-auto brightness-0 invert hover:opacity-80 transition-opacity" />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ===== SECTION 3: HERE'S WHO IT'S FOR ===== */}
        <section id="industries" className="py-20 relative scroll-mt-20">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">
                Here&apos;s Who It&apos;s For
              </h2>
              <p className="text-xl text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
                If leads are worth a lot to your business, can you afford to <span className="text-foreground font-semibold">NOT</span> greet them at the door?
              </p>

              {/* Business Types - 2 Column Grid */}
              <div className="grid md:grid-cols-2 gap-4">
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
        </section>

        {/* ===== SECTION 4: HERE'S WHAT IT WILL DO FOR YOU ===== */}
        <section id="benefits" className="py-20 relative scroll-mt-20">
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

              {/* Stats */}
              <div className="mt-16 grid md:grid-cols-3 gap-6">
                <div className="bg-muted/30 border border-border/50 rounded-2xl p-6 text-center">
                  <div className="text-4xl md:text-5xl font-black text-primary mb-2">34x</div>
                  <p className="text-sm text-muted-foreground">
                    Face-to-face requests are <span className="text-white font-medium">34x more successful</span> than email
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-2">Harvard Business Review</p>
                </div>
                <div className="bg-muted/30 border border-border/50 rounded-2xl p-6 text-center">
                  <div className="text-4xl md:text-5xl font-black text-primary mb-2">86%</div>
                  <p className="text-sm text-muted-foreground">
                    of consumers <span className="text-white font-medium">prefer humans</span> to chatbots
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-2">Forbes</p>
                </div>
                <div className="bg-muted/30 border border-border/50 rounded-2xl p-6 text-center">
                  <div className="text-4xl md:text-5xl font-black text-primary mb-2">72%</div>
                  <p className="text-sm text-muted-foreground">
                    trust a brand <span className="text-white font-medium">more</span> when they can see the rep on video
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-2">Consumer Trust Survey</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SECTION: WON'T SCARE VISITORS ===== */}
        <section className="py-20 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium mb-6">
                  <CheckCircle2 className="w-4 h-4" />
                  Addressing the #1 concern
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  &ldquo;Will This Scare Away Visitors?&rdquo;
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  No—and here&apos;s <span className="text-primary font-semibold">why greeters work</span>.
                </p>
              </div>

              <div className="bg-muted/30 border border-border/50 rounded-3xl p-8 md:p-12">
                {/* Why greeters work */}
                <div className="mb-10 text-center max-w-2xl mx-auto">
                  <p className="text-lg text-muted-foreground mb-4">
                    Ever wonder why every successful retail store has a greeter at the door?
                  </p>
                  <p className="text-muted-foreground">
                    It&apos;s not just to say &ldquo;hello.&rdquo; It&apos;s psychology. When a real person <span className="text-white font-semibold">acknowledges you</span>, two things happen:
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-10">
                  {/* Trust */}
                  <div className="bg-muted/30 border border-border/50 rounded-2xl p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                      <Heart className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Instant Trust</h3>
                    <p className="text-muted-foreground text-sm mb-3">
                      A real human face signals legitimacy. You&apos;re not a scam. You&apos;re not a bot. You&apos;re a real business with real people.
                    </p>
                    <p className="text-sm text-white font-medium">
                      People feel safer buying from someone they can see.
                    </p>
                  </div>

                  {/* Social Accountability */}
                  <div className="bg-muted/30 border border-border/50 rounded-2xl p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                      <Eye className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Social Accountability</h3>
                    <p className="text-muted-foreground text-sm mb-3">
                      When someone says &ldquo;Hi, can I help you?&rdquo;—you feel a natural pull to engage. It&apos;s harder to &ldquo;just browse&rdquo; and leave.
                    </p>
                    <p className="text-sm text-white font-medium">
                      This is why every major retailer uses greeters.
                    </p>
                  </div>
                </div>

                {/* How it works for visitors */}
                <div className="border-t border-border/30 pt-8">
                  <p className="text-center text-muted-foreground mb-6">And don&apos;t worry—<span className="text-white font-semibold">visitors don&apos;t need to be on camera</span>:</p>
                  <div className="bg-muted/20 border border-border/30 rounded-2xl p-6">
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-3">
                          <Eye className="w-6 h-6 text-primary" />
                        </div>
                        <div className="text-2xl font-bold text-primary mb-1">1</div>
                        <p className="text-sm text-muted-foreground">They see & hear you first</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-3">
                          <Volume2 className="w-6 h-6 text-primary" />
                        </div>
                        <div className="text-2xl font-bold text-primary mb-1">2</div>
                        <p className="text-sm text-muted-foreground">They click unmute to talk back</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-3">
                          <VideoOff className="w-6 h-6 text-primary" />
                        </div>
                        <div className="text-2xl font-bold text-primary mb-1">3</div>
                        <p className="text-sm text-muted-foreground">Their camera stays <span className="text-white font-semibold">off</span> until they enable video</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-10 text-center">
                  <p className="text-xl font-semibold text-white mb-2">
                    It&apos;s not an ambush. It&apos;s an <span className="text-primary">invitation</span>.
                  </p>
                  <p className="text-muted-foreground">
                    Low pressure for them, a real conversation for you.
                  </p>
                </div>
              </div>

              <div className="mt-8 text-center">
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

              {/* Hiding Behind Counter Story */}
              <div className="bg-muted/20 border border-border/50 rounded-3xl p-8 md:p-12 mb-12">
                <p className="text-xl text-muted-foreground text-center mb-8">
                  Imagine you ran a physical store like this...
                </p>

                {/* The Story */}
                <div className="max-w-3xl mx-auto space-y-6 text-lg text-muted-foreground">
                  <p>
                    A customer walks into your showroom. They&apos;re looking at your products. They have their <span className="text-white font-semibold">wallet in their hand</span>.
                  </p>
                  <p>
                    Now, imagine your salesperson <span className="text-white font-semibold">ducks behind the counter</span> and refuses to speak.
                  </p>
                  <p>
                    Instead, they slide a clipboard across the floor that says: 
                  </p>
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 my-8">
                    <p className="text-xl text-white font-medium italic text-center">
                      &ldquo;Write down your phone number, leave the store, and I&apos;ll call you in 3 hours.&rdquo;
                    </p>
                  </div>
                  <p className="text-xl text-white font-semibold">
                    It sounds insane. But this is exactly what your website is doing right now.
                  </p>
                </div>

                {/* Step-by-step walkthrough */}
                <div className="grid md:grid-cols-2 gap-6 mt-12">
                  {/* The Old Way Story */}
                  <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                        <UserX className="w-5 h-5 text-red-400" />
                      </div>
                      <h3 className="text-xl font-bold text-red-400">The Old Way</h3>
                    </div>
                    <ul className="space-y-3">
                      {[
                        "Customer walks in (visits your site)",
                        "Rep hides behind counter (no live person)",
                        "Customer fills out form (if they even bother)",
                        "Customer leaves",
                        "3 hours later: rep calls from unknown number",
                        "Customer doesn't answer (marked as spam)",
                        "Rep leaves voicemail that gets deleted",
                      ].map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                          <span className="text-red-400 font-bold">{idx + 1}.</span>
                          <span className="text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* The GreetNow Way Story */}
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Smile className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold text-primary">The GreetNow Way</h3>
                    </div>
                    <ul className="space-y-3">
                      {[
                        "Customer walks in (visits your site)",
                        "Rep is standing at the door, smiling",
                        "Rep says: \"Hi, I'm here if you need me\"",
                        "Customer clicks Unmute",
                        "You're in a live sales call instantly",
                        "No forms, no phone tag, no voicemails",
                        "Deal closed while interest is highest",
                      ].map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>


                <div className="mt-10 text-center">
                  <p className="text-lg text-muted-foreground mb-2">
                    Tired of leads &ldquo;ghosting&rdquo; you? <span className="text-white font-semibold">You ghosted them first.</span>
                  </p>
                  <p className="text-2xl font-bold text-white">
                    Don&apos;t chase ghosts. <span className="text-primary">Greet guests.</span>
                  </p>
                </div>
              </div>

              {/* Visual Funnel Calculator */}
              <div className="bg-muted/30 border border-border/50 rounded-3xl p-8 md:p-12">
                <h3 className="text-2xl md:text-3xl font-bold text-center mb-2">
                  How Much Is The Old Way Costing You?
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

        {/* ===== SECTION: THE GUT PUNCH ===== */}
        <section className="py-16 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Main message */}
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-3xl p-8 md:p-12">
                <p className="text-xl md:text-2xl text-muted-foreground mb-6 leading-relaxed">
                  Your appointment setters are dialing leads who <span className="text-white font-semibold">already left your website</span>.
                </p>
                <p className="text-lg text-muted-foreground mb-6">
                  Think about that.
                </p>
                <p className="text-lg text-muted-foreground mb-6">
                  They were on your site. Looking at your offer. <span className="text-white font-semibold">Ready to talk</span>.
                </p>
                <p className="text-lg text-muted-foreground">
                  And instead of talking to them when they&apos;re <span className="text-primary font-semibold">hot</span>—you&apos;re calling them when they&apos;re <span className="text-slate-400 font-semibold">cold</span>.
                </p>
              </div>
              
              {/* The punchline quote */}
              <div className="relative bg-primary/5 border border-primary/20 rounded-2xl p-8 md:p-10">
                <div className="absolute -top-3 left-8 text-5xl text-primary/30 font-serif leading-none">&ldquo;</div>
                <p className="text-xl md:text-2xl font-medium text-white text-center leading-relaxed pt-2">
                  Why force them to break into the prospect&apos;s house later, when the prospect is <span className="text-primary">knocking on your front door</span> right now?
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SECTION: LEADS ARE ICE CREAM ===== */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px]" />
          </div>
          
          <div className="container mx-auto px-6 relative">
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                {/* Ice cream visual */}
                <div className="text-center md:text-left order-2 md:order-1">
                  <div className="inline-block bg-muted/30 border border-border/50 rounded-3xl p-8 md:p-10">
                    <div className="w-24 h-24 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-14 h-14 text-primary" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {/* Waffle cone */}
                        <path d="M14 24L24 46L34 24" />
                        {/* Cone waffle pattern - diagonal lines */}
                        <path d="M16 28L32 28" />
                        <path d="M18 32L30 32" />
                        <path d="M20 36L28 36" />
                        <path d="M22 40L26 40" />
                        {/* Cone waffle pattern - cross lines */}
                        <path d="M17 26L21 34" />
                        <path d="M20 26L24 34" />
                        <path d="M24 26L28 34" />
                        <path d="M27 26L31 34" />
                        {/* Front scoop (larger, bottom) */}
                        <circle cx="24" cy="16" r="9" />
                        {/* Back scoop (smaller, top) */}
                        <path d="M18 10a7 7 0 1 1 12 0" />
                        {/* Drip on right */}
                        <path d="M32 18c1 2 1 4 0 5" />
                      </svg>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Clock className="w-5 h-5" />
                      <span className="text-sm font-medium">Melting by the second...</span>
                    </div>
                  </div>
                </div>
                
                {/* Copy */}
                <div className="order-1 md:order-2">
                  <h2 className="text-3xl md:text-4xl font-bold mb-6">
                    Leads Are <span className="text-primary">Ice Cream</span>, Not Wine
                  </h2>
                  <p className="text-xl text-muted-foreground mb-6">
                    They don&apos;t get better with age. They <span className="text-white font-semibold">melt</span>.
                  </p>
                  <div className="space-y-4 text-muted-foreground">
                    <p>
                      From the moment a visitor lands on your site, their interest is dripping away with every second they spend staring at your form.
                    </p>
                    <p>
                      By the time your appointment setter calls them <span className="text-white font-semibold">3 hours later</span>, they haven&apos;t just cooled off. They&apos;ve <span className="text-primary font-semibold">evaporated</span>.
                    </p>
                    <p className="text-lg text-white font-medium pt-2">
                      You&apos;re paying your sales team to call puddles.
                    </p>
                  </div>
                  <div className="mt-8 p-4 bg-primary/10 border border-primary/30 rounded-xl">
                    <p className="text-primary font-semibold">
                      GreetNow hands your sales team the cone before the ice cream melts. 🍦
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SECTION: CRM GRAVEYARD ===== */}
        <section className="py-20 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                {/* Copy */}
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-6">
                    Your CRM Isn&apos;t a Pipeline. It&apos;s a <span className="text-slate-400">Graveyard</span>.
                  </h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>
                      Look at your database. Thousands of names. Thousands of phone numbers.
                    </p>
                    <p>
                      We call this a &ldquo;pipeline.&rdquo; But let&apos;s be honest. <span className="text-white font-semibold">It&apos;s a graveyard.</span>
                    </p>
                    <p>
                      These are people who were interested, visited your site, and then got caught in your game of <span className="text-white font-semibold">phone tag</span> until they stopped caring.
                    </p>
                    <p className="text-lg text-white font-medium pt-2">
                      You don&apos;t need more leads in the graveyard. You need to resurrect the traffic you already have.
                    </p>
                  </div>
                  <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                    <p className="text-slate-400 text-sm">
                      <span className="text-white font-semibold">But here&apos;s the thing:</span> Most leads never even make it to your graveyard. They bounce off your page before filling out the form—and you never even knew they existed.
                    </p>
                  </div>
                </div>

                {/* Visual */}
                <div className="text-center order-first md:order-last">
                  <div className="inline-block bg-slate-800/50 border border-slate-700/50 rounded-3xl p-6 md:p-8">
                    <div className="w-20 h-20 rounded-2xl bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
                      <Skull className="w-12 h-12 text-slate-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 mb-4">RIP: Leads who never called back</p>
                    
                    {/* The killers */}
                    <div className="space-y-2 text-left">
                      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                        <PhoneOff className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span className="text-xs text-red-400">Unknown number ignored</span>
                      </div>
                      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                        <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span className="text-xs text-red-400">&ldquo;Scam Likely&rdquo;</span>
                      </div>
                      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                        <MessageSquareX className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span className="text-xs text-red-400">Voicemail deleted</span>
                      </div>
                      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                        <Clock className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span className="text-xs text-red-400">Interest cooled off</span>
                      </div>
                      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                        <Ghost className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span className="text-xs text-red-400">Do Not Disturb mode</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SECTION: WARMING UP COMPETITORS ===== */}
        <section className="py-20 relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-rose-500/10 rounded-full blur-[100px]" />
          </div>
          
          <div className="container mx-auto px-6 relative">
            <div className="max-w-4xl mx-auto">
              {/* Glass panel */}
              <div className="relative backdrop-blur-sm bg-white/[0.02] border border-white/10 rounded-3xl p-10 md:p-14 shadow-2xl">
                {/* Subtle inner glow */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
                
                <div className="relative">
                  <p className="text-sm font-medium text-white/40 uppercase tracking-widest mb-6 text-center">
                    The hard truth
                  </p>
                  
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-center leading-tight">
                    When They Leave Your Site,<br />They Don&apos;t Stop Shopping
                  </h2>
                  
                  <p className="text-xl md:text-2xl text-white/60 mb-10 text-center">
                    They just stop shopping with <span className="text-white font-semibold">you</span>.
                  </p>
                  
                  <div className="max-w-2xl mx-auto space-y-6 text-white/50 text-center">
                    <p className="text-lg">
                      When a prospect bounces because they didn&apos;t want to fill out your form, they simply click the next Google result.
                    </p>
                    <p className="text-lg">
                      And the Facebook ad algorithm immediately starts showing them <span className="text-white font-medium">your competitors&apos; ads</span>. That&apos;s how the pixel works.
                    </p>
                    <p className="text-xl text-white font-medium pt-4">
                      If your competitor picks up the phone—or has a live greeter—you didn&apos;t just lose a lead. You <span className="text-primary">paid to warm them up for someone else</span>.
                    </p>
                  </div>

                  <div className="mt-12 pt-10 border-t border-white/10 text-center">
                    <p className="text-xl md:text-2xl font-bold text-white mb-8">
                      Speed to lead isn&apos;t a metric. It&apos;s the difference between you closing the deal or you <span className="text-primary">assisting the competition</span>.
                    </p>
                    <TrialCTA />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SECTION: SALES TEAM HAPPINESS ===== */}
        <section className="py-20 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Your Sales Team Will <span className="text-primary">Love</span> This
                </h2>
                <p className="text-muted-foreground">
                  Stop paying your team to dial. Pay them to speak.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Current State - Red */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                      <Frown className="w-5 h-5 text-red-400" />
                    </div>
                    <h3 className="font-bold text-lg text-red-400">Right now, they&apos;re...</h3>
                  </div>
                  <ul className="space-y-3">
                    {[
                      "Dialing 100 numbers to get 3 answers",
                      "Leaving voicemails all day",
                      "Fighting \"Scam Likely\" labels",
                      "Getting rejected and burnt out",
                      "Chasing cold leads who forgot about you",
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-center gap-3">
                        <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span className="text-muted-foreground text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* With GreetNow - Primary */}
                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Smile className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-bold text-lg text-primary">With GreetNow, they&apos;re...</h3>
                  </div>
                  <ul className="space-y-3">
                    {[
                      "Waiting for the \"ping\" of a hot lead",
                      "Video chatting with people who want to talk",
                      "Treated like a welcome concierge",
                      "Closing deals while interest is highest",
                      "Actually enjoying their job again",
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-muted-foreground text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-10 text-center">
                <p className="text-2xl font-bold text-white">
                  Less dialing. More closing. <span className="text-primary">Happier reps.</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SECTION: STOP THE LEAK ===== */}
        <section className="py-16 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                You Don&apos;t Need More Traffic
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Right now, you have people on your site. They&apos;re interested. They have questions. But they&apos;re <span className="text-white font-semibold">leaving</span> because they don&apos;t want to fill out a form.
              </p>
              <p className="text-2xl font-bold text-white">
                You don&apos;t need more traffic. You need to <span className="text-primary">stop wasting</span> the traffic you already have.
              </p>
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
        <section className="py-20 relative overflow-hidden">
          {/* Animated background pulse */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/20 rounded-full blur-[80px] animate-pulse" />
          </div>
          
          <div className="container mx-auto px-6 relative">
            <div className="max-w-3xl mx-auto">
              {/* Glass panel */}
              <div className="relative backdrop-blur-sm bg-white/[0.03] border border-white/10 rounded-3xl p-10 md:p-12 shadow-2xl">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
                
                <div className="relative text-center">
                  {/* Live indicator */}
                  <div className="inline-flex items-center gap-2 mb-8">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <span className="text-sm font-medium text-white/60 uppercase tracking-wide">Right now</span>
                  </div>
                  
                  <h3 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
                    There Are Visitors On Your Website<br />
                    <span className="text-primary">As You Read This</span>
                  </h3>
                  
                  <p className="text-lg text-white/50 mb-4 max-w-xl mx-auto">
                    They landed. They&apos;re looking. They have questions.
                  </p>
                  
                  <p className="text-xl text-white/70 mb-8 max-w-xl mx-auto">
                    And in a few seconds, they&apos;ll leave—<span className="text-white font-semibold">without ever talking to you or opting in</span>.
                  </p>
                  
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8 max-w-lg mx-auto text-left">
                    <p className="text-white/40 text-sm mb-4 text-center">Every day you wait, you&apos;re paying for:</p>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <span className="text-white/70">Clicks from people who <span className="text-red-400 font-medium">leave without a trace</span></span>
                      </li>
                      <li className="flex items-start gap-3">
                        <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <span className="text-white/70">Deals lost to competitors who <span className="text-red-400 font-medium">answered first</span></span>
                      </li>
                      <li className="flex items-start gap-3">
                        <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <span className="text-white/70">Reps burning hours chasing leads who&apos;ve <span className="text-red-400 font-medium">already gone cold</span></span>
                      </li>
                    </ul>
                  </div>

                  <TrialCTA size="large" />
                  
                  <p className="text-white/30 text-sm mt-6">
                    Takes 60 seconds to set up. No credit card required.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SECTION: SOCRATIC QUESTIONS ===== */}
        <section className="py-20 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
                Ask Yourself...
              </h2>
              <p className="text-muted-foreground text-center mb-12">
                If you can answer &ldquo;yes&rdquo; to these, you already know what to do.
              </p>

              <div className="space-y-4">
                {[
                  "Do you agree that a lead is never \"hotter\" than the moment they're on your website?",
                  "Are people more likely to buy from a human they can see than a faceless webpage?",
                  "Would you rather talk to a hot lead right now than chase a phone number later?",
                  "Don't you agree that nobody likes filling out forms and waiting for callbacks?",
                  "Isn't it crazy to pay for traffic and then hide your salespeople behind a form—when instead they could video chat with prospects even if they don't opt in?",
                ].map((question, idx) => {
                  const answer = questionAnswers[idx];
                  const isAnswered = answer !== null && answer !== undefined;
                  
                  // Find the first unanswered question
                  const firstUnansweredIdx = [0, 1, 2, 3, 4].find(i => 
                    questionAnswers[i] === null || questionAnswers[i] === undefined
                  );
                  const isActiveQuestion = idx === firstUnansweredIdx;
                  const isPastQuestion = firstUnansweredIdx !== undefined && idx > firstUnansweredIdx;
                  
                  return (
                    <div
                      key={idx}
                      className={`relative bg-muted/20 border rounded-xl p-5 transition-all duration-500 ${
                        isAnswered
                          ? 'border-primary/50 bg-primary/5' 
                          : isActiveQuestion
                            ? 'border-primary/70 bg-primary/10 shadow-lg shadow-primary/20'
                            : 'border-border/30 opacity-50'
                      }`}
                      style={{
                        transform: isPastQuestion && !isAnswered ? 'scale(0.98)' : 'scale(1)',
                      }}
                    >
                      {/* Pulse ring for active question */}
                      {isActiveQuestion && !isAnswered && (
                        <div className="absolute -inset-[2px] rounded-xl border-2 border-primary/50 animate-ping opacity-30" />
                      )}
                      
                      <p className={`text-lg leading-relaxed mb-4 transition-colors duration-300 ${
                        isAnswered ? 'text-white' : isActiveQuestion ? 'text-white' : 'text-muted-foreground'
                      }`}>
                        {question}
                      </p>
                      
                      {/* Yes / No checkboxes */}
                      <div className={`flex items-center gap-6 transition-opacity duration-300 ${
                        !isActiveQuestion && !isAnswered ? 'opacity-50' : 'opacity-100'
                      }`}>
                        {/* Yes */}
                        <button
                          onClick={() => answerQuestion(idx, "yes")}
                          className={`flex items-center gap-2 group ${isActiveQuestion && !isAnswered ? 'animate-pulse' : ''}`}
                        >
                          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all duration-300 ${
                            answer === "yes"
                              ? 'bg-primary border-primary scale-110' 
                              : isActiveQuestion
                                ? 'border-primary/70 group-hover:border-primary group-hover:bg-primary/20'
                                : 'border-slate-500 group-hover:border-primary/70'
                          }`}>
                            <Check className={`w-4 h-4 text-white transition-all duration-300 ${
                              answer === "yes"
                                ? 'opacity-100 scale-100' 
                                : 'opacity-0 scale-0'
                            }`} />
                          </div>
                          <span className={`font-medium transition-colors duration-300 ${
                            answer === "yes" 
                              ? 'text-primary' 
                              : isActiveQuestion 
                                ? 'text-primary/80 group-hover:text-primary'
                                : 'text-muted-foreground group-hover:text-white'
                          }`}>Yes</span>
                        </button>
                        
                        {/* No */}
                        <button
                          onClick={() => answerQuestion(idx, "no")}
                          className="flex items-center gap-2 group"
                        >
                          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all duration-300 ${
                            answer === "no"
                              ? 'bg-slate-500 border-slate-500 scale-110' 
                              : 'border-slate-500 group-hover:border-slate-400'
                          }`}>
                            <Check className={`w-4 h-4 text-white transition-all duration-300 ${
                              answer === "no"
                                ? 'opacity-100 scale-100' 
                                : 'opacity-0 scale-0'
                            }`} />
                          </div>
                          <span className={`font-medium transition-colors duration-300 ${
                            answer === "no" ? 'text-slate-400' : 'text-muted-foreground group-hover:text-white'
                          }`}>No</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress indicator */}
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 border border-border/50">
                  <span className="text-sm text-muted-foreground">
                    {answeredCount === 0 ? (
                      "Check yes or no ✓"
                    ) : answeredCount === 5 ? (
                      yesCount >= 4 ? (
                        <span className="text-primary font-semibold">You know what to do 👇</span>
                      ) : (
                        <span className="text-muted-foreground">Interesting... 🤔</span>
                      )
                    ) : (
                      <><span className="text-primary font-semibold">{answeredCount}/5</span> answered</>
                    )}
                  </span>
                </div>
              </div>

              <div className="mt-8 text-center">
                <p className="text-xl font-semibold text-white mb-6">
                  If this widget catches just <span className="text-primary">one client</span> this month who would have otherwise clicked the &ldquo;Back&rdquo; button, has the software paid for itself <span className="text-primary">10 times over</span>?
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
