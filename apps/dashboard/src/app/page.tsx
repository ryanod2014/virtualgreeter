import Link from "next/link";
import {
  Zap,
  Users,
  VideoOff,
  Volume2,
  ArrowRight,
  Clock,
  TrendingUp,
  Target,
  Shield,
  Globe,
  Sparkles,
  Flame,
  DollarSign,
  Heart,
  CheckCircle2,
  Eye,
  PhoneOff,
  X,
  Check,
  Ghost,
  Skull,
  MessageSquareX,
  Smile,
  Frown,
  UserX,
  Info,
} from "lucide-react";
import { Logo } from "@/lib/components/logo";
import { WidgetDemo } from "@/lib/components/WidgetDemo";
import { FAQAccordion } from "@/lib/components/FAQAccordion";
import { FeatureCarousel } from "@/lib/components/FeatureCarousel";
import { CostCalculator } from "@/lib/components/CostCalculator";
import { SocraticQuestions } from "@/lib/components/SocraticQuestions";
import { AnimateOnScroll, StaggerContainer } from "@/lib/components/AnimateOnScroll";
import { FoldingRipList } from "@/lib/components/FoldingRipList";

// ===== COMPONENTS =====

function SourceTooltip({ sourceUrl }: { sourceUrl: string; sourceName?: string }) {
  // Extract domain for cleaner display
  const displayUrl = sourceUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  
  return (
    <span className="relative inline-flex items-center group ml-1">
      <span
        className="w-4 h-4 rounded-full bg-muted-foreground/20 flex items-center justify-center cursor-default"
        aria-label="Source information"
      >
        <Info className="w-2.5 h-2.5 text-muted-foreground/60" />
      </span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-[11px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-150 z-50 whitespace-nowrap pointer-events-none">
        <span className="block text-slate-500 text-[10px] uppercase tracking-wide mb-0.5">Source</span>
        <span className="block text-slate-400">{displayUrl}</span>
      </span>
    </span>
  );
}

const COMPLIANCE_TEXT = "Try it free for a full 7 days! If you love it, do nothing—you will automatically be charged $297 per seat on that date and every month thereafter until you cancel. Cancel auto-renewing charges by logging into your account under \"billing settings\" before your billing date. Cancel for any reason without having to talk to a human.";

function TrialCTA({ size = "default", className = "", hideCompliance = false }: { size?: "default" | "large" | "small"; className?: string; hideCompliance?: boolean }) {
  if (size === "large") {
    return (
      <div className="flex flex-col items-center">
        <Link
          href="/signup"
          className={`group inline-flex items-center gap-2 bg-primary text-primary-foreground px-10 py-5 rounded-full font-semibold text-xl hover:bg-primary/90 transition-colors hover:shadow-2xl hover:shadow-primary/30 ${className}`}
        >
          Start Free 7-Day Trial
          <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </Link>
        {!hideCompliance && (
          <p className="text-xs text-muted-foreground mt-3 max-w-md text-center leading-relaxed">
            {COMPLIANCE_TEXT}
          </p>
        )}
      </div>
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
    <div className="flex flex-col items-center">
      <Link
        href="/signup"
        className={`group inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-full font-semibold text-lg hover:bg-primary/90 transition-colors hover:shadow-xl hover:shadow-primary/30 ${className}`}
      >
        Start Free 7-Day Trial
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </Link>
      {!hideCompliance && (
        <p className="text-xs text-muted-foreground mt-3 max-w-md text-center leading-relaxed">
          {COMPLIANCE_TEXT}
        </p>
      )}
    </div>
  );
}

// ===== MAIN PAGE =====

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background dark relative overflow-hidden">
      {/* Background effects - simplified for performance */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="glow-orb w-[600px] h-[600px] -top-[300px] left-1/2 -translate-x-1/2 bg-primary/15" />
        <div className="glow-orb w-[400px] h-[400px] top-[60%] -left-[150px] bg-purple-600/10" />
        <div className="glow-orb w-[350px] h-[350px] top-[40%] -right-[100px] bg-fuchsia-600/8" />
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
                <Link href="#how-it-works" className="px-4 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                  How It Works
                </Link>
                <Link href="#industries" className="px-4 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                  Industries
                </Link>
                <Link href="#benefits" className="px-4 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                  Benefits
                </Link>
                <Link href="#faq" className="px-4 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                  FAQ
                </Link>
                <div className="w-px h-5 bg-white/10 mx-2" />
                <Link href="/login" className="px-4 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors ml-1"
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
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-8 animate-initial animate-entrance-fade-down delay-100 shine-effect">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                A new way to convert website traffic
              </span>
            </div>

            {/* Main headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 animate-initial animate-entrance-fade-up delay-200 leading-[1.1]">
              Turn Pageviews Into Live Sales Calls...
            </h1>
            
            <p className="text-2xl md:text-3xl lg:text-4xl font-bold gradient-text animate-gradient-text mb-8 animate-initial animate-entrance-scale delay-300">
              Without Them Ever Opting In Or Booking An Appointment
            </p>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-4 leading-relaxed animate-initial animate-entrance-blur delay-400">
              Leads are never &quot;hotter&quot; than the moment they land on your page. <span className="text-foreground font-semibold">GreetNow</span> lets your setters treat website traffic like walk-in customers.
            </p>
            {/* CTA */}
            <div className="mb-6 animate-initial animate-entrance-fade-up delay-500">
              <TrialCTA />
            </div>
          </div>
        </section>

        {/* ===== SECTION 2: HERE'S WHAT I GOT (Demo + Features) ===== */}
        <section id="how-it-works" className="py-20 relative scroll-mt-20">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              {/* No animation wrapper - WidgetDemo has its own animations */}
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
                Here&apos;s What It Looks Like On Your Site
              </h2>
              <p className="text-xl text-muted-foreground text-center mb-6 max-w-2xl mx-auto">
                A live video greeter that appears to every visitor—right on your website—to help you:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 text-primary font-medium text-sm hover-lift">
                  <Zap className="w-4 h-4" />
                  Get more leads from existing traffic
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 text-primary font-medium text-sm hover-lift">
                  <Clock className="w-4 h-4" />
                  Instant speed to lead
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 text-primary font-medium text-sm hover-lift">
                  <Flame className="w-4 h-4" />
                  Talk to leads at their hottest
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 text-primary font-medium text-sm hover-lift">
                  <Shield className="w-4 h-4" />
                  Build trust with cold traffic
                </span>
              </div>

              <div className="grid lg:grid-cols-5 gap-8 items-start">
                {/* Demo - Left Side (3 columns) - no wrapper, WidgetDemo animates itself */}
                <div className="lg:col-span-3">
                  <WidgetDemo />
                </div>

                {/* Features - Right Side (2 columns) - slide in from right */}
                <AnimateOnScroll animation="slide-in-right" delay={100} className="lg:col-span-2">
                  <FeatureCarousel />
                </AnimateOnScroll>
              </div>

              {/* Easy Setup Section */}
              <AnimateOnScroll animation="slide-in-up" delay={100}>
              <div id="features" className="mt-16 bg-muted/20 border border-border/50 rounded-3xl p-8 md:p-10 scroll-mt-24 hover-lift">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">Setup in 60 Seconds</h3>
                  <p className="text-muted-foreground">
                    Easier than installing a Facebook Pixel. No developers needed.
                  </p>
                </div>
                
                {/* Steps */}
                <div className="flex justify-center mb-10">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
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
                </div>

                {/* Platform logos */}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-4">Works with all your favorite website builders</p>
                  <div 
                    className="relative overflow-hidden"
                    style={{
                      maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
                      WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
                    }}
                  >
                    <div className="flex items-center gap-10 md:gap-14 animate-marquee w-max">
                      {/* First set */}
                      {/* WordPress */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <svg className="w-6 h-6" viewBox="0 0 122.52 122.523" fill="#21759b">
                          <path d="m8.708 61.26c0 20.802 12.089 38.779 29.619 47.298l-25.069-68.686c-2.916 6.536-4.55 13.769-4.55 21.388zm88.344-2.652c0-6.495-2.333-10.993-4.334-14.494-2.664-4.329-5.161-7.995-5.161-12.324 0-4.831 3.664-9.328 8.825-9.328.233 0 .454.029.681.042-9.35-8.566-21.807-13.796-35.489-13.796-18.36 0-34.513 9.42-43.91 23.688 1.233.037 2.395.063 3.382.063 5.497 0 14.006-.667 14.006-.667 2.833-.167 3.167 3.994.337 4.329 0 0-2.847.335-6.015.501l19.138 56.925 11.501-34.493-8.188-22.432c-2.83-.166-5.511-.501-5.511-.501-2.832-.166-2.5-4.496.332-4.329 0 0 8.679.667 13.843.667 5.496 0 14.006-.667 14.006-.667 2.835-.167 3.168 3.994.337 4.329 0 0-2.853.335-6.015.501l18.992 56.494 5.242-17.517c2.272-7.269 4.001-12.49 4.001-16.989z"/>
                          <path d="m62.184 65.857-15.768 45.819c4.708 1.384 9.687 2.141 14.846 2.141 6.12 0 11.989-1.058 17.452-2.979-.14-.225-.269-.464-.374-.724z"/>
                          <path d="m107.376 36.046c.226 1.674.354 3.471.354 5.404 0 5.333-.996 11.328-3.996 18.824l-16.053 46.449c15.624-9.111 26.133-26.038 26.133-45.462.001-9.137-2.333-17.729-6.438-25.215z"/>
                          <path d="m61.262 0c-33.779 0-61.262 27.481-61.262 61.26 0 33.783 27.483 61.263 61.262 61.263 33.778 0 61.265-27.48 61.265-61.263-.001-33.779-27.487-61.26-61.265-61.26zm0 119.715c-32.23 0-58.453-26.223-58.453-58.455 0-32.23 26.222-58.451 58.453-58.451 32.229 0 58.45 26.221 58.45 58.451 0 32.232-26.221 58.455-58.45 58.455z"/>
                        </svg>
                        <span className="text-white/60 text-sm" style={{ fontFamily: "var(--font-source-serif), Georgia, serif" }}>WordPress</span>
                      </div>
                      {/* ClickFunnels */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <img src="/logos/clickfunnels.png" alt="ClickFunnels" className="h-6 w-auto" />
                        <span className="text-white/60 text-sm font-semibold" style={{ fontFamily: "var(--font-montserrat), sans-serif" }}>ClickFunnels</span>
                      </div>
                      {/* HighLevel */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <img src="/logos/highlevel.png" alt="HighLevel" className="h-6 w-auto" />
                        <span className="text-white/60 font-bold text-sm" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>HighLevel</span>
                      </div>
                      {/* Webflow */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <svg className="w-6 h-6" viewBox="0 0 290 180" fill="#4353ff">
                          <path fillRule="evenodd" clipRule="evenodd" d="M288.606 0.684082L196.515 180.711H110.016L148.556 106.1H146.827C115.032 147.374 67.5931 174.545 0 180.711V107.133C0 107.133 43.2409 104.579 68.661 77.8531H0V0.685504H77.1676V64.1547L78.8996 64.1476L110.433 0.685504H168.793V63.7523L170.525 63.7495L203.241 0.684082H288.606Z"/>
                        </svg>
                        <span className="text-white/60 text-sm font-medium" style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>Webflow</span>
                      </div>
                      {/* Shopify */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <svg className="w-6 h-6" viewBox="0 0 109.5 124.5" fill="#95BF47">
                          <path d="M74.7,14.8c0,0-1.4,0.4-3.7,1.1c-0.4-1.3-1-2.8-1.8-4.4c-2.6-5-6.5-7.7-11.1-7.7c0,0,0,0,0,0 c-0.3,0-0.6,0-1,0.1c-0.1-0.2-0.3-0.3-0.4-0.5c-2-2.2-4.6-3.2-7.7-3.2c-6,0.2-12,4.5-16.8,12.2c-3.4,5.4-6,12.2-6.7,17.5 c-6.9,2.1-11.7,3.6-11.8,3.7c-3.5,1.1-3.6,1.2-4,4.5C9.4,40.7,0,111.6,0,111.6l75.6,13V14.6C75.2,14.7,74.9,14.7,74.7,14.8z M57.2,20.2c-4,1.2-8.4,2.6-12.7,3.9c1.2-4.7,3.6-9.4,6.4-12.5c1.1-1.1,2.6-2.4,4.3-3.2C56.9,12,57.3,16.9,57.2,20.2z M49.1,4.3 c1.4,0,2.6,0.3,3.6,0.9c-1.6,0.8-3.2,2.1-4.7,3.6c-3.8,4.1-6.7,10.5-7.9,16.6c-3.6,1.1-7.2,2.2-10.5,3.2 C31.7,18.8,39.8,4.6,49.1,4.3z M39.5,60c0.4,6.4,17.3,7.8,18.3,22.9c0.7,11.9-6.3,20-16.4,20.6c-12.2,0.8-18.9-6.4-18.9-6.4 l2.6-11c0,0,6.7,5.1,12.1,4.7c3.5-0.2,4.8-3.1,4.7-5.1c-0.5-8.4-14.3-7.9-15.2-21.7C25.8,52.2,34.5,40.1,54,38.9 c7.5-0.5,11.4,1.4,11.4,1.4l-4.3,16c0,0-5-2.3-10.9-1.9C42.5,55,39.5,57.5,39.5,60z M61.3,19c0-2.9-0.4-7-1.8-10.5 c4.5,0.9,6.7,5.9,7.7,9C64.9,18.2,62.9,18.7,61.3,19z"/>
                          <path d="M78.1,123.4l31.4-7.8c0,0-13.5-91.3-13.6-91.9c-0.1-0.6-0.6-1-1.1-1c-0.5,0-9.3-0.2-9.3-0.2s-5.4-5.2-7.4-7.2 V123.4z"/>
                        </svg>
                        <span className="text-white/60 text-sm font-semibold" style={{ fontFamily: "var(--font-plus-jakarta), sans-serif" }}>Shopify</span>
                      </div>
                      {/* SamCart */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <img src="/logos/samcart.webp" alt="SamCart" className="h-6 w-auto" />
                        <span className="text-white/60 text-sm font-semibold" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>SamCart</span>
                      </div>
                      {/* Wix */}
                      <div className="flex items-center flex-shrink-0">
                        <img src="/logos/wix.png" alt="Wix" className="h-5 w-auto" />
                      </div>
                      {/* Duplicate set for seamless loop */}
                      {/* WordPress */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <svg className="w-6 h-6" viewBox="0 0 122.52 122.523" fill="#21759b">
                          <path d="m8.708 61.26c0 20.802 12.089 38.779 29.619 47.298l-25.069-68.686c-2.916 6.536-4.55 13.769-4.55 21.388zm88.344-2.652c0-6.495-2.333-10.993-4.334-14.494-2.664-4.329-5.161-7.995-5.161-12.324 0-4.831 3.664-9.328 8.825-9.328.233 0 .454.029.681.042-9.35-8.566-21.807-13.796-35.489-13.796-18.36 0-34.513 9.42-43.91 23.688 1.233.037 2.395.063 3.382.063 5.497 0 14.006-.667 14.006-.667 2.833-.167 3.167 3.994.337 4.329 0 0-2.847.335-6.015.501l19.138 56.925 11.501-34.493-8.188-22.432c-2.83-.166-5.511-.501-5.511-.501-2.832-.166-2.5-4.496.332-4.329 0 0 8.679.667 13.843.667 5.496 0 14.006-.667 14.006-.667 2.835-.167 3.168 3.994.337 4.329 0 0-2.853.335-6.015.501l18.992 56.494 5.242-17.517c2.272-7.269 4.001-12.49 4.001-16.989z"/>
                          <path d="m62.184 65.857-15.768 45.819c4.708 1.384 9.687 2.141 14.846 2.141 6.12 0 11.989-1.058 17.452-2.979-.14-.225-.269-.464-.374-.724z"/>
                          <path d="m107.376 36.046c.226 1.674.354 3.471.354 5.404 0 5.333-.996 11.328-3.996 18.824l-16.053 46.449c15.624-9.111 26.133-26.038 26.133-45.462.001-9.137-2.333-17.729-6.438-25.215z"/>
                          <path d="m61.262 0c-33.779 0-61.262 27.481-61.262 61.26 0 33.783 27.483 61.263 61.262 61.263 33.778 0 61.265-27.48 61.265-61.263-.001-33.779-27.487-61.26-61.265-61.26zm0 119.715c-32.23 0-58.453-26.223-58.453-58.455 0-32.23 26.222-58.451 58.453-58.451 32.229 0 58.45 26.221 58.45 58.451 0 32.232-26.221 58.455-58.45 58.455z"/>
                        </svg>
                        <span className="text-white/60 text-sm" style={{ fontFamily: "var(--font-source-serif), Georgia, serif" }}>WordPress</span>
                      </div>
                      {/* ClickFunnels */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <img src="/logos/clickfunnels.png" alt="ClickFunnels" className="h-6 w-auto" />
                        <span className="text-white/60 text-sm font-semibold" style={{ fontFamily: "var(--font-montserrat), sans-serif" }}>ClickFunnels</span>
                      </div>
                      {/* HighLevel */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <img src="/logos/highlevel.png" alt="HighLevel" className="h-6 w-auto" />
                        <span className="text-white/60 font-bold text-sm" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>HighLevel</span>
                      </div>
                      {/* Webflow */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <svg className="w-6 h-6" viewBox="0 0 290 180" fill="#4353ff">
                          <path fillRule="evenodd" clipRule="evenodd" d="M288.606 0.684082L196.515 180.711H110.016L148.556 106.1H146.827C115.032 147.374 67.5931 174.545 0 180.711V107.133C0 107.133 43.2409 104.579 68.661 77.8531H0V0.685504H77.1676V64.1547L78.8996 64.1476L110.433 0.685504H168.793V63.7523L170.525 63.7495L203.241 0.684082H288.606Z"/>
                        </svg>
                        <span className="text-white/60 text-sm font-medium" style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>Webflow</span>
                      </div>
                      {/* Shopify */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <svg className="w-6 h-6" viewBox="0 0 109.5 124.5" fill="#95BF47">
                          <path d="M74.7,14.8c0,0-1.4,0.4-3.7,1.1c-0.4-1.3-1-2.8-1.8-4.4c-2.6-5-6.5-7.7-11.1-7.7c0,0,0,0,0,0 c-0.3,0-0.6,0-1,0.1c-0.1-0.2-0.3-0.3-0.4-0.5c-2-2.2-4.6-3.2-7.7-3.2c-6,0.2-12,4.5-16.8,12.2c-3.4,5.4-6,12.2-6.7,17.5 c-6.9,2.1-11.7,3.6-11.8,3.7c-3.5,1.1-3.6,1.2-4,4.5C9.4,40.7,0,111.6,0,111.6l75.6,13V14.6C75.2,14.7,74.9,14.7,74.7,14.8z M57.2,20.2c-4,1.2-8.4,2.6-12.7,3.9c1.2-4.7,3.6-9.4,6.4-12.5c1.1-1.1,2.6-2.4,4.3-3.2C56.9,12,57.3,16.9,57.2,20.2z M49.1,4.3 c1.4,0,2.6,0.3,3.6,0.9c-1.6,0.8-3.2,2.1-4.7,3.6c-3.8,4.1-6.7,10.5-7.9,16.6c-3.6,1.1-7.2,2.2-10.5,3.2 C31.7,18.8,39.8,4.6,49.1,4.3z M39.5,60c0.4,6.4,17.3,7.8,18.3,22.9c0.7,11.9-6.3,20-16.4,20.6c-12.2,0.8-18.9-6.4-18.9-6.4 l2.6-11c0,0,6.7,5.1,12.1,4.7c3.5-0.2,4.8-3.1,4.7-5.1c-0.5-8.4-14.3-7.9-15.2-21.7C25.8,52.2,34.5,40.1,54,38.9 c7.5-0.5,11.4,1.4,11.4,1.4l-4.3,16c0,0-5-2.3-10.9-1.9C42.5,55,39.5,57.5,39.5,60z M61.3,19c0-2.9-0.4-7-1.8-10.5 c4.5,0.9,6.7,5.9,7.7,9C64.9,18.2,62.9,18.7,61.3,19z"/>
                          <path d="M78.1,123.4l31.4-7.8c0,0-13.5-91.3-13.6-91.9c-0.1-0.6-0.6-1-1.1-1c-0.5,0-9.3-0.2-9.3-0.2s-5.4-5.2-7.4-7.2 V123.4z"/>
                        </svg>
                        <span className="text-white/60 text-sm font-semibold" style={{ fontFamily: "var(--font-plus-jakarta), sans-serif" }}>Shopify</span>
                      </div>
                      {/* SamCart */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <img src="/logos/samcart.webp" alt="SamCart" className="h-6 w-auto" />
                        <span className="text-white/60 text-sm font-semibold" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>SamCart</span>
                      </div>
                      {/* Wix */}
                      <div className="flex items-center flex-shrink-0">
                        <img src="/logos/wix.png" alt="Wix" className="h-5 w-auto" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </AnimateOnScroll>

            </div>
          </div>
        </section>

        {/* ===== SECTION 3: HERE'S WHO IT'S FOR ===== */}
        <section id="industries" className="py-20 relative scroll-mt-20">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto">
              <AnimateOnScroll animation="slide-in-down">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">
                  Here&apos;s Who It&apos;s For
                </h2>
              </AnimateOnScroll>
              <AnimateOnScroll animation="zoom-in" delay={100}>
                <p className="text-xl text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
                  If leads are worth a lot to your business, can you afford to <span className="text-foreground font-semibold">NOT</span> greet them at the door?
                </p>
              </AnimateOnScroll>

              {/* Business Types - 2 Column Grid */}
              <StaggerContainer animation="slide-in-up" staggerDelay={80} className="grid md:grid-cols-2 gap-4">
                {[
                  { 
                    icon: Users, 
                    label: "Coaches & Consultants", 
                    description: "Lead costs are up. Trust is down. A real face changes both." 
                  },
                  { 
                    icon: Shield, 
                    label: "Professional Services", 
                    description: "Lawyers, accountants, advisors—trust is everything. Build it instantly." 
                  },
                  { 
                    icon: Globe, 
                    label: "Home Services", 
                    description: "78% of homeowners choose the first contractor to respond—so speed to lead is VITAL.",
                    sourceUrl: "https://pushleads.com/the-60-second-home-services-contractors/",
                    sourceName: "PushLeads Study"
                  },
                  { 
                    icon: Target, 
                    label: "B2B Sales Teams", 
                    description: "Enterprise deals start with conversations. Start more of them." 
                  },
                  { 
                    icon: TrendingUp, 
                    label: "Agencies", 
                    description: "Prospects never shop just one agency. Be the one they actually talk to." 
                  },
                  { 
                    icon: DollarSign, 
                    label: "Any High-Ticket Business", 
                    description: "If a single lead is worth a lot to you, you need GreetNow." 
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col gap-2 px-6 py-5 rounded-xl border transition-colors bg-muted/40 border-border/50 hover:border-primary/30 hover:bg-muted/60 hover-lift hover-bounce h-full"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/10">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-lg font-medium">{item.label}</span>
                    </div>
                    <p className="text-sm ml-14 text-muted-foreground">
                      {item.description}
                      {item.sourceUrl && <SourceTooltip sourceUrl={item.sourceUrl} sourceName={item.sourceName || 'Source'} />}
                    </p>
                  </div>
                ))}
              </StaggerContainer>
            </div>
          </div>
        </section>

        {/* ===== SECTION 4: HERE'S WHAT IT WILL DO FOR YOU ===== */}
        <section id="benefits" className="py-20 relative scroll-mt-20">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto">
              <AnimateOnScroll animation="slide-in-down">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
                  Here&apos;s What It Will Do For You
                </h2>
              </AnimateOnScroll>
              <AnimateOnScroll animation="zoom-in" delay={100}>
                <p className="text-xl text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
                  All in-person businesses have greeters. Why doesn&apos;t your website? <span className="text-primary font-semibold">One click. Face-to-face. While they&apos;re still on your site.</span>
                </p>
              </AnimateOnScroll>

              <div className="grid md:grid-cols-2 gap-8">
                <AnimateOnScroll animation="slide-in-left" delay={0} className="h-full">
                  <div className="bg-muted/30 border border-border/50 rounded-2xl p-8 hover-lift h-full">
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
                </AnimateOnScroll>

                <AnimateOnScroll animation="slide-in-right" delay={100} className="h-full">
                  <div className="bg-muted/30 border border-border/50 rounded-2xl p-8 hover-lift h-full">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                      <Zap className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4">Speed To Lead That Actually Works</h3>
                    <p className="text-muted-foreground mb-4">
                      Rather than chasing them after they already left...
                    </p>
                    <p className="text-lg font-medium text-foreground">
                      Talk to them <span className="text-primary">while they&apos;re still on your site</span>.
                    </p>
                  </div>
                </AnimateOnScroll>

                <AnimateOnScroll animation="slide-in-left" delay={200} className="h-full">
                  <div className="bg-muted/30 border border-border/50 rounded-2xl p-8 hover-lift h-full">
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
                </AnimateOnScroll>

                <AnimateOnScroll animation="slide-in-right" delay={300} className="h-full">
                  <div className="bg-muted/30 border border-border/50 rounded-2xl p-8 hover-lift h-full">
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
                </AnimateOnScroll>
              </div>


              {/* Trial CTA below stats */}
              <AnimateOnScroll animation="zoom-in" delay={400}>
                <div className="mt-10 text-center">
                  <TrialCTA />
                </div>
              </AnimateOnScroll>
            </div>
          </div>
        </section>

        {/* ===== SECTION: WON'T SCARE VISITORS ===== */}
        <section className="py-20 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <AnimateOnScroll animation="fade-up">
                <div className="text-center mb-12">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium mb-6 shine-effect">
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
              </AnimateOnScroll>

              <AnimateOnScroll animation="slide-in-up" delay={100}>
              <div className="bg-muted/30 border border-border/50 rounded-3xl p-8 md:p-12 hover-lift">
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
                    <div className="grid md:grid-cols-3 gap-4 md:gap-6">
                      <div className="flex items-center gap-3 md:flex-col md:text-center">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 md:mx-auto md:mb-3">
                          <Eye className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                        </div>
                        <div className="flex items-center gap-2 md:flex-col md:gap-0">
                          <span className="text-lg md:text-2xl font-bold text-primary md:mb-1">1</span>
                          <p className="text-sm text-muted-foreground">They see & hear you first</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 md:flex-col md:text-center">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 md:mx-auto md:mb-3">
                          <Volume2 className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                        </div>
                        <div className="flex items-center gap-2 md:flex-col md:gap-0">
                          <span className="text-lg md:text-2xl font-bold text-primary md:mb-1">2</span>
                          <p className="text-sm text-muted-foreground">They click unmute to talk back</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 md:flex-col md:text-center">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 md:mx-auto md:mb-3">
                          <VideoOff className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                        </div>
                        <div className="flex items-center gap-2 md:flex-col md:gap-0">
                          <span className="text-lg md:text-2xl font-bold text-primary md:mb-1">3</span>
                          <p className="text-sm text-muted-foreground">Their camera stays <span className="text-white font-semibold">off</span> until they enable video</p>
                        </div>
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
              </AnimateOnScroll>

              <AnimateOnScroll animation="zoom-in" delay={200}>
                <div className="mt-8 text-center">
                  <TrialCTA />
                </div>
              </AnimateOnScroll>
            </div>
          </div>
        </section>

        {/* ===== SECTION: THE OLD WAY (Hiding Behind Counter + Calculator) ===== */}
        <section className="py-20 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto">
              <AnimateOnScroll animation="slide-in-down">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
                  The Old Way Is Broken
                </h2>
              </AnimateOnScroll>
              <AnimateOnScroll animation="zoom-in" delay={100}>
                <p className="text-xl text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
                  This is what your website is doing right now.
                </p>
              </AnimateOnScroll>

              {/* Hiding Behind Counter Story */}
              <AnimateOnScroll animation="slide-in-up" delay={200}>
              <div className="bg-muted/20 border border-border/50 rounded-3xl p-8 md:p-12 mb-12">
                <p className="text-xl text-muted-foreground text-left mb-8">
                  Imagine you ran a physical store like this...
                </p>

                {/* The Story */}
                <div className="space-y-6 text-lg text-muted-foreground">
                  <p>
                    A customer walks into your showroom. They&apos;re looking at your products. They have their <span className="text-white font-semibold">wallet in their hand</span>.
                  </p>
                  <p>
                    Now, imagine your salesperson <span className="text-white font-semibold">ducks behind the counter</span> and refuses to speak.
                  </p>
                  <p>
                    Instead, they slide a clipboard across the floor that says: 
                  </p>
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
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
              </AnimateOnScroll>

              {/* Visual Funnel Calculator */}
              <CostCalculator />
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
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[80px]" />
          </div>
          
          <div className="container mx-auto px-6 relative">
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                {/* Ice cream visual */}
                <div className="flex items-center justify-center md:order-1">
                  <div className="relative">
                    <svg className="w-48 h-48 md:w-72 md:h-72 lg:w-80 lg:h-80" viewBox="0 0 512 512" fill="#8B5CF6" xmlns="http://www.w3.org/2000/svg">
                      <g transform="translate(0,512) scale(0.1,-0.1)">
                        <path d="M2815 4403 c-45 -23 -113 -92 -142 -144 l-26 -46 -121 1 c-95 1 -132 -3 -171 -18 -114 -42 -206 -130 -240 -227 -36 -104 -55 -128 -132 -166 -160 -78 -255 -244 -241 -419 l5 -56 -50 -46 c-27 -26 -61 -69 -75 -97 -23 -43 -27 -64 -30 -155 -1 -58 -5 -137 -8 -176 -8 -86 7 -156 45 -216 25 -39 26 -46 15 -73 -51 -119 34 -289 155 -311 66 -12 69 -16 63 -92 -5 -81 9 -116 66 -162 37 -30 39 -35 51 -118 20 -144 21 -149 42 -176 15 -19 28 -67 45 -169 77 -445 126 -702 139 -728 31 -59 54 -64 325 -64 261 0 278 3 323 53 19 21 44 128 101 437 94 509 96 517 126 545 18 17 31 42 35 66 3 21 12 70 20 109 7 38 11 73 9 77 -7 11 4 10 27 -3 30 -16 131 -13 175 6 74 31 114 85 114 155 0 56 -21 101 -74 158 l-45 48 41 38 c44 42 72 97 83 165 4 25 20 62 35 83 44 60 64 150 58 260 -9 151 -62 275 -168 392 -48 52 -49 54 -44 102 12 100 -49 260 -134 355 -53 59 -146 123 -203 141 -32 9 -45 22 -78 77 -42 71 -117 148 -170 175 -26 14 -30 20 -21 35 13 25 75 73 128 100 31 16 42 27 42 45 0 43 -49 63 -95 39z m-246 -264 c26 -9 31 -15 25 -33 -10 -35 -58 -90 -100 -113 -34 -19 -48 -21 -120 -16 -50 4 -101 1 -129 -6 -26 -7 -49 -10 -52 -8 -9 10 65 92 111 124 82 56 191 78 265 52z m89 -97 c-4 -50 -13 -83 -34 -122 -16 -30 -33 -55 -39 -57 -5 -1 -18 9 -27 25 -10 15 -23 34 -29 43 -10 14 -4 25 38 67 27 27 55 64 62 81 22 52 34 37 29 -37z m78 31 c23 -56 44 -175 44 -251 0 -128 -44 -244 -113 -296 -36 -28 -110 -49 -153 -44 -29 3 -29 4 -28 66 1 56 5 68 40 118 66 93 146 227 160 266 7 20 16 69 20 107 3 39 8 71 10 71 2 0 11 -17 20 -37z m170 -178 c61 -125 78 -197 72 -317 -4 -84 -9 -106 -37 -163 -39 -79 -87 -116 -161 -123 l-49 -4 9 33 c14 47 12 113 -2 127 -16 16 -31 15 -25 0 6 -21 -19 -105 -46 -151 -33 -56 -112 -129 -173 -160 -27 -13 -85 -37 -129 -52 -94 -32 -161 -65 -201 -98 -49 -41 -68 -46 -165 -45 -105 2 -138 -10 -183 -62 -32 -38 -34 -82 -6 -127 17 -29 25 -33 62 -33 l43 1 -27 22 c-16 13 -28 32 -28 43 0 28 48 70 95 83 22 6 67 11 100 11 53 0 68 5 115 36 78 51 114 68 212 102 133 47 206 89 265 149 29 31 53 59 53 63 0 4 20 5 44 3 61 -7 153 21 195 60 18 18 46 58 61 90 l28 59 8 -47 c30 -204 -76 -368 -319 -491 -61 -30 -122 -64 -136 -75 -39 -31 -77 -90 -96 -149 -28 -86 -42 -107 -90 -136 -117 -68 -294 -87 -425 -45 -78 25 -128 27 -158 6 -17 -13 -26 -13 -43 -5 -21 12 -21 21 -3 82 3 10 -9 31 -31 55 -59 62 -70 89 -67 173 3 130 3 153 1 220 -2 76 14 120 62 175 39 44 119 85 169 85 33 1 34 1 16 15 -11 8 -35 15 -52 15 -30 0 -34 3 -40 36 -12 63 2 157 30 215 47 93 117 153 217 185 30 10 62 23 72 30 17 11 17 13 2 22 -25 14 -2 45 59 78 88 48 244 43 311 -10 43 -34 40 -81 -8 -140 -50 -60 -77 -121 -77 -174 0 -89 -34 -124 -170 -175 -122 -46 -193 -88 -256 -152 -34 -35 -74 -65 -90 -69 -31 -8 -94 -46 -94 -58 0 -4 19 4 43 17 52 30 77 32 70 6 -5 -21 12 -61 27 -61 6 0 10 6 10 13 0 8 14 34 30 60 40 60 139 126 263 176 106 43 153 69 180 99 15 16 28 18 92 14 56 -3 87 0 119 12 51 20 110 80 137 140 39 89 52 302 24 406 -8 30 -15 57 -14 60 1 19 68 -81 105 -155z m170 -93 c155 -113 232 -312 166 -425 -15 -25 -101 -77 -128 -77 -6 0 -15 21 -19 47 -4 27 -16 70 -26 98 -14 38 -19 76 -19 160 0 65 -6 132 -15 165 -8 30 -15 56 -15 58 0 9 23 -2 56 -26z m267 -540 c122 -143 168 -360 106 -502 -23 -52 -41 -67 -51 -42 -4 9 -7 -14 -7 -51 -1 -114 -40 -175 -143 -228 -32 -16 -89 -34 -130 -40 -40 -6 -79 -13 -86 -15 -18 -5 -38 -53 -26 -64 11 -11 148 5 202 24 46 17 52 11 52 -50 0 -119 -135 -190 -256 -135 -44 20 -77 57 -67 75 4 6 -10 -4 -30 -22 -83 -72 -171 -97 -256 -72 -33 9 -33 9 -16 -10 17 -19 17 -20 -1 -26 -58 -20 -104 -44 -135 -71 -73 -64 -120 -69 -207 -22 l-57 31 57 -56 c50 -50 61 -56 98 -56 49 0 69 9 135 65 74 63 89 68 195 69 83 1 101 4 142 27 46 26 46 26 75 8 15 -11 53 -27 83 -37 52 -16 53 -17 25 -23 -17 -4 -50 -7 -75 -8 -71 -2 -115 -18 -128 -46 -6 -14 -9 -32 -6 -40 11 -29 -118 -224 -170 -256 -75 -46 -134 -17 -213 103 -39 60 -54 73 -101 94 -35 15 -75 45 -107 78 -49 52 -52 54 -120 60 -83 8 -147 35 -171 71 -14 22 -15 33 -6 73 6 28 7 53 1 63 -7 14 -2 19 29 26 33 8 41 6 79 -23 50 -38 135 -59 208 -51 34 4 95 28 190 76 77 38 165 75 195 81 226 50 412 164 490 303 24 43 37 57 55 57 44 0 118 61 149 123 26 52 29 69 29 145 0 99 -27 191 -81 277 -22 36 -28 53 -20 62 15 19 19 17 71 -45z m-113 -21 c72 -102 97 -281 52 -373 -22 -45 -72 -98 -93 -98 -5 0 -9 10 -9 23 0 13 -6 32 -14 42 -12 17 -15 14 -31 -36 -29 -89 -64 -150 -116 -200 -88 -86 -222 -152 -380 -188 -73 -17 -119 -35 -185 -73 -106 -61 -158 -78 -233 -78 -69 0 -129 26 -163 70 -22 28 -28 31 -46 21 -41 -22 -120 -31 -172 -20 -78 17 -118 57 -135 139 l-8 35 27 -32 c36 -42 72 -50 108 -23 l29 22 67 -29 c61 -25 78 -28 192 -28 144 0 230 21 314 77 39 25 55 45 77 94 28 61 29 62 81 74 83 20 166 57 256 117 159 105 262 236 277 351 13 105 15 112 43 127 37 19 38 19 62 -14z m-124 -65 c-22 -145 -186 -335 -368 -427 -56 -28 -185 -65 -195 -55 -8 8 27 60 53 79 14 10 68 37 122 61 54 23 123 59 155 80 107 71 194 189 212 289 11 56 29 31 21 -27z m-1119 -272 c-3 -3 -12 -4 -19 -1 -8 3 -5 6 6 6 11 1 17 -2 13 -5z m-89 -24 c-20 -11 -42 -28 -48 -37 -8 -12 -10 -13 -7 -3 4 17 64 60 81 60 6 -1 -6 -10 -26 -20z m1479 -674 c5 -42 3 -48 -27 -76 -26 -24 -41 -30 -78 -30 l-47 0 38 31 c41 34 77 95 77 131 0 42 32 -5 37 -56z m-337 -273 c0 -21 -5 -55 -10 -75 -12 -41 -29 -49 -135 -63 -27 -3 -58 -8 -67 -11 -12 -4 -5 17 28 77 24 45 46 85 49 88 3 3 27 8 53 12 85 12 82 13 82 -28z m-909 18 c14 -3 49 -26 76 -51 49 -44 50 -47 61 -125 6 -44 9 -81 7 -84 -6 -6 -169 50 -182 62 -9 10 -43 165 -43 200 0 8 43 8 81 -2z m206 -107 c15 -4 34 -29 59 -79 19 -41 56 -95 80 -120 l44 -47 0 -147 c0 -80 3 -244 7 -363 5 -179 9 -218 21 -223 8 -3 16 -4 18 -3 1 2 6 96 9 209 6 150 5 208 -4 213 -12 8 -14 67 -4 209 6 95 7 98 32 103 76 15 100 27 144 71 46 45 50 47 132 58 67 9 85 9 85 -1 0 -14 -39 -206 -43 -210 -3 -3 -161 -33 -163 -31 -1 1 1 29 4 61 l7 59 78 16 c79 16 101 37 37 35 -68 -1 -148 -9 -145 -14 2 -3 -8 -120 -21 -260 -26 -278 -40 -518 -31 -509 4 3 14 68 23 145 l17 141 68 20 c38 11 69 19 69 17 0 -16 -53 -287 -61 -312 -17 -52 -36 -56 -240 -60 -200 -4 -261 5 -280 39 -9 17 -89 432 -89 463 0 4 8 5 18 1 9 -5 40 -16 67 -26 49 -17 50 -19 57 -66 3 -26 7 -65 7 -86 l1 -37 -40 6 c-55 9 -52 -10 5 -35 29 -13 45 -26 45 -38 2 -100 40 -229 40 -135 0 54 -38 452 -53 562 l-12 85 -78 16 c-72 15 -96 12 -83 -10 3 -5 18 -12 33 -15 16 -4 44 -11 64 -17 l36 -9 13 -91 c6 -50 9 -93 6 -96 -6 -7 -136 27 -136 36 0 3 -11 71 -25 151 -14 80 -25 145 -25 146 0 0 25 -4 55 -9 31 -6 52 -14 48 -20 -4 -6 2 -8 15 -5 12 4 20 2 16 -3 -3 -5 -2 -9 3 -9 4 0 17 -3 28 -6 18 -5 20 -1 20 38 -1 24 -5 78 -9 121 -5 43 -5 77 0 77 5 0 19 -3 31 -6z m573 -377 c0 -21 -42 -223 -48 -228 -7 -8 -109 -39 -125 -39 -9 0 -2 170 9 216 4 17 19 24 72 36 72 17 92 20 92 15z"/>
                        <path d="M2621 3758 c-7 -24 -24 -63 -38 -86 -23 -41 -24 -43 -4 -33 35 19 71 82 71 123 0 50 -14 48 -29 -4z"/>
                        <path d="M2995 3323 c-18 -77 -102 -166 -234 -250 -70 -45 -70 -55 1 -24 51 22 136 84 170 126 32 38 63 100 73 143 8 39 0 43 -10 5z"/>
                        <path d="M2418 3309 c-14 -11 -52 -35 -84 -54 -32 -19 -51 -35 -43 -35 28 0 138 59 149 80 16 30 10 32 -22 9z"/>
                        <path d="M2952 2669 c-34 -16 -124 -48 -200 -70 -75 -23 -139 -44 -142 -46 -10 -10 96 8 190 33 92 24 150 51 200 93 32 26 28 25 -48 -10z"/>
                      </g>
                    </svg>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/50">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-medium whitespace-nowrap">Melting by the second...</span>
                    </div>
                  </div>
                </div>
                
                {/* Copy */}
                <div className="md:order-2">
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
                    
                    {/* The killers - folding accordion animation on scroll */}
                    <FoldingRipList />
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
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-rose-500/10 rounded-full blur-[60px]" />
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
                      "Dialing endlessly just to get someone on the phone",
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
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/15 rounded-full blur-[80px]" />
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
                      Takes 60 seconds to set up.
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
                      Cancel anytime in your dashboard under billing settings. No phone calls, no guilt trips.
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
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[250px] bg-primary/15 rounded-full blur-[60px]" />
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

              <SocraticQuestions />
            </div>
          </div>
        </section>

        {/* ===== SECTION 7: FAQ ===== */}
        <section id="faq" className="py-20 relative">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              <AnimateOnScroll animation="slide-in-down">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
                  Questions? We&apos;ve Got Answers.
                </h2>
              </AnimateOnScroll>
              <AnimateOnScroll animation="zoom-in" delay={100}>
                <p className="text-muted-foreground text-center mb-12">
                  Everything you need to know before getting started.
                </p>
              </AnimateOnScroll>

              <AnimateOnScroll animation="slide-in-up" delay={200}>
                <FAQAccordion />
              </AnimateOnScroll>

              <AnimateOnScroll animation="zoom-in" delay={300}>
                <div className="mt-12 text-center">
                  <p className="text-lg text-muted-foreground mb-6">
                    Ready to stop losing leads?
                  </p>
                  <TrialCTA />
                </div>
              </AnimateOnScroll>
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
