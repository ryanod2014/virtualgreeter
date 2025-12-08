"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  X,
  Users,
  Mail,
  Presentation,
  TrendingUp,
  Zap,
  Target,
  ChevronDown,
  Play,
  Star,
  Calendar,
  Award,
} from "lucide-react";

// ===== CTA BUTTON =====
function CTAButton({ size = "default", className = "" }: { size?: "default" | "large"; className?: string }) {
  if (size === "large") {
    return (
      <Link
        href="#buy"
        className={`group inline-flex items-center gap-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-12 py-5 rounded-full font-bold text-xl hover:from-orange-600 hover:to-orange-700 transition-all hover:shadow-2xl hover:shadow-orange-500/30 hover:scale-105 ${className}`}
      >
        Get The Playbook — $27
        <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
      </Link>
    );
  }

  return (
    <Link
      href="#buy"
      className={`group inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:from-orange-600 hover:to-orange-700 transition-all hover:shadow-xl hover:shadow-orange-500/30 hover:scale-105 ${className}`}
    >
      Get The Playbook — $27
      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
    </Link>
  );
}

// ===== OBJECTION ITEM =====
function ObjectionItem({ objection, answer }: { objection: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className="border border-zinc-700/50 rounded-2xl overflow-hidden bg-zinc-900/80 backdrop-blur-sm hover:border-orange-500/40 transition-all cursor-pointer group"
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="flex items-center justify-between p-6">
        <p className="text-white font-semibold text-lg pr-4">&ldquo;{objection}&rdquo;</p>
        <div className={`w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <ChevronDown className="w-5 h-5 text-orange-500" />
        </div>
      </div>
      {isOpen && (
        <div className="px-6 pb-6 pt-0">
          <div className="pt-4 border-t border-zinc-800">
            <p className="text-zinc-300 leading-relaxed">{answer}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== FEATURE CARD =====
function FeatureCard({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="group relative bg-gradient-to-b from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-2xl p-8 hover:border-orange-500/50 transition-all duration-300">
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/20 flex items-center justify-center mb-6">
          <Icon className="w-7 h-7 text-orange-500" />
        </div>
        <h3 className="font-bold text-white text-xl mb-3">{title}</h3>
        <p className="text-zinc-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====
export default function ChallengePlaybookPage() {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute w-[800px] h-[800px] -top-[400px] left-1/2 -translate-x-1/2 bg-orange-500/15 rounded-full blur-[120px]" />
        <div className="absolute w-[600px] h-[600px] top-[30%] -left-[200px] bg-orange-600/8 rounded-full blur-[100px]" />
        <div className="absolute w-[500px] h-[500px] top-[60%] -right-[150px] bg-amber-500/8 rounded-full blur-[100px]" />
      </div>

      {/* Grid pattern */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(249, 115, 22, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249, 115, 22, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px'
        }}
      />

      <div className="relative z-10">
        {/* ===== HERO SECTION ===== */}
        <section className="container mx-auto px-6 pt-16 pb-20">
          <div className="max-w-5xl mx-auto">
            {/* Badge */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-4 py-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-orange-400 text-sm font-medium">From Tony Robbins &amp; Dean Graziosi</span>
              </div>
            </div>

            {/* Pre-header quote */}
            <p className="text-lg md:text-xl text-zinc-400 mb-6 text-center max-w-3xl mx-auto">
              Dean Graziosi: &ldquo;<span className="text-zinc-300">93% of our annual revenue comes from our 3-day challenges... we simply haven&apos;t found anything else that out-converts it.</span>&rdquo;
            </p>

            {/* Main headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-8 text-center">
              Get Tony Robbins &amp; Dean Graziosi&apos;s Internal Playbook For Running Virtual Events For{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">$27</span>
            </h1>

            {/* Hero content with image */}
            <div className="grid lg:grid-cols-2 gap-12 items-stretch mt-16">
              {/* Left - Video placeholder */}
              <div className="relative flex">
                {/* Video placeholder - stretches to match right column */}
                <div className="relative w-full rounded-3xl overflow-hidden bg-zinc-900 border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center min-h-[400px]">
                  {/* Play button */}
                  <div className="w-20 h-20 rounded-full bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center cursor-pointer hover:bg-orange-500/30 transition-colors mb-4">
                    <Play className="w-8 h-8 text-orange-500 ml-1" fill="currentColor" />
                  </div>
                  <p className="text-zinc-500 text-sm">Video placeholder</p>
                </div>

                {/* Floating badges */}
                <div className="absolute -bottom-4 -left-4 bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 shadow-2xl z-10">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-orange-500" />
                    <span className="text-white font-semibold">20+ Years Refined</span>
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 shadow-2xl z-10">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-orange-500" />
                    <span className="text-white font-semibold">500,000+ Attendees</span>
                  </div>
                </div>
              </div>

              {/* Right - Guarantee & CTA */}
              <div>
                {/* Guarantee box */}
                <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/30 rounded-3xl p-8 mb-8">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                      <Award className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-lg mb-2">500 Registrants — Guaranteed</p>
                      <p className="text-zinc-300 leading-relaxed">
                        Follow the playbook for your first live virtual event or challenge. If you don&apos;t get at least <span className="text-orange-400 font-semibold">500 registrants</span>, we&apos;ll refund every penny. <span className="text-orange-400 font-semibold">No questions asked.</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="text-center lg:text-left">
                  <CTAButton size="large" />
                </div>

                {/* Trust indicators */}
                <div className="flex items-center gap-6 mt-8 pt-8 border-t border-zinc-800">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="w-10 h-10 rounded-full bg-zinc-700 border-2 border-black" />
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className="w-4 h-4 text-orange-500 fill-orange-500" />
                      ))}
                    </div>
                    <p className="text-zinc-400 text-sm">Trusted by thousands of entrepreneurs</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== WHO IT'S FOR SECTION ===== */}
        <section className="relative py-24 overflow-hidden">
          {/* Section background */}
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 to-black" />
          
          <div className="container mx-auto px-6 relative">
            <div className="max-w-4xl mx-auto">
              {/* Lead copy */}
              <div className="text-center mb-16">
                <p className="inline-block text-orange-500 text-sm font-semibold uppercase tracking-wider mb-4 px-4 py-2 bg-orange-500/10 rounded-full">
                  Coaches, Consultants, Agency Owners
                </p>
                
                <h2 className="text-3xl md:text-4xl lg:text-5xl text-white font-bold leading-snug mb-6">
                  What if you had the exact system Tony and I use to fill our challenges?
                </h2>
                
                <p className="text-xl text-zinc-300 leading-relaxed max-w-2xl mx-auto">
                  The same one we&apos;ve refined over 20+ years — now yours for $27.
                </p>
              </div>

              {/* Content cards */}
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
                    <Target className="w-6 h-6 text-orange-500" />
                  </div>
                  <p className="text-zinc-300">The <span className="text-white font-semibold">exact playbook</span> to fill rooms of 500,000+ people</p>
                </div>
                <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-6 h-6 text-orange-500" />
                  </div>
                  <p className="text-zinc-300">The same system. <span className="text-white font-semibold">Every step.</span> Nothing held back.</p>
                </div>
                <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-6 h-6 text-orange-500" />
                  </div>
                  <p className="text-zinc-300"><span className="text-white font-semibold">Nothing out-converts</span> a well-run challenge</p>
                </div>
              </div>

              <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto mb-6">
                Here&apos;s something I&apos;ve learned over nearly three decades: <span className="text-white font-medium">nothing out-converts a well-run challenge.</span> It compresses a year of trust and goodwill into just 3 days.
              </p>
              
              <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
                And for the first time ever, I&apos;m showing you exactly how we do it.
              </p>
            </div>
          </div>
        </section>

        {/* ===== CHICKEN & EGG SECTION ===== */}
        <section className="py-24">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              {/* Main message */}
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl lg:text-5xl text-white font-bold leading-tight mb-4">
                  Most people think they need an audience before they can run events.
                </h2>
                <p className="text-3xl md:text-4xl lg:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400 font-bold">
                  That&apos;s completely backwards.
                </p>
              </div>

              {/* Quotes */}
              <div className="space-y-3 mb-12 max-w-3xl mx-auto">
                <p className="text-lg text-zinc-500 italic">&ldquo;I&apos;ll run a challenge once I have more followers.&rdquo;</p>
                <p className="text-lg text-zinc-500 italic">&ldquo;I&apos;ll do a live event once people know who I am.&rdquo;</p>
                <p className="text-lg text-zinc-500 italic">&ldquo;I need to build trust first.&rdquo;</p>
              </div>

              <p className="text-lg text-zinc-300 leading-relaxed mb-12 max-w-3xl mx-auto">
                I hear this all the time. And here&apos;s what I always tell people: Tony and I have as much goodwill as we have <span className="text-white font-semibold">because</span> of how much free value we&apos;ve delivered at live events over the years. The events came first. Not the other way around.
              </p>

              {/* The Wrong Way vs Right Way - Visual comparison */}
              <div className="grid md:grid-cols-2 gap-6 mb-12">
                <div className="bg-zinc-900/80 border border-red-500/20 rounded-3xl p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                      <X className="w-5 h-5 text-red-400" />
                    </div>
                    <p className="text-red-400 font-semibold uppercase text-sm tracking-wider">The Wrong Way</p>
                  </div>
                  <p className="text-zinc-500 line-through text-xl">audience → events → sales</p>
                </div>
                
                <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/30 rounded-3xl p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-orange-500" />
                    </div>
                    <p className="text-orange-400 font-semibold uppercase text-sm tracking-wider">The Right Way</p>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    events → trust → audience → <span className="text-orange-400">everything</span>
                  </p>
                </div>
              </div>

              {/* Build, earn, create */}
              <div className="space-y-4 mb-16 max-w-3xl mx-auto">
                <p className="text-lg text-zinc-300 leading-relaxed">
                  If you don&apos;t have an audience, events are how you <span className="text-white font-semibold">build</span> one.
                </p>
                <p className="text-lg text-zinc-300 leading-relaxed">
                  If you don&apos;t have trust, events are how you <span className="text-white font-semibold">earn</span> it.
                </p>
                <p className="text-lg text-zinc-300 leading-relaxed">
                  If you don&apos;t have credibility, events are how you <span className="text-white font-semibold">create</span> it.
                </p>
              </div>

              {/* Bottom statement */}
              <div className="text-center bg-zinc-900/50 border border-zinc-800 rounded-3xl p-10">
                <p className="text-2xl text-white font-bold mb-2">
                  This isn&apos;t a strategy for people who already made it.
                </p>
                <p className="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400 font-bold">
                  This is the strategy that makes you.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== OLD WAY IS BROKEN SECTION ===== */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 via-transparent to-transparent" />
          
          <div className="container mx-auto px-6 relative">
            <div className="max-w-4xl mx-auto">
              {/* Header */}
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl lg:text-5xl text-white font-bold leading-tight">
                  The Old Way Is <span className="text-red-500">Broken</span>
                </h2>
              </div>

              <p className="text-xl text-zinc-300 leading-relaxed mb-8">
                Right now, most people are doing it the hard way: <span className="text-white font-semibold">one-on-one sales calls.</span>
              </p>
              
              <p className="text-lg text-zinc-400 leading-relaxed mb-8">
                Here&apos;s what that looks like:
              </p>

              {/* Bad way list - Visual cards */}
              <div className="bg-zinc-900/80 border border-red-500/20 rounded-3xl p-8 mb-12">
                <div className="space-y-4">
                  {[
                    "Block 45 minutes on your calendar",
                    "Half of them don't even show up",
                    "Spend 30 minutes building rapport before you can present",
                    "No social proof. No momentum. No leverage.",
                    "Close one (maybe). Repeat tomorrow. And the next day. Forever.",
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 bg-black/30 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <X className="w-4 h-4 text-red-400" />
                      </div>
                      <span className="text-zinc-300 text-lg">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xl text-zinc-300 leading-relaxed mb-16">
                It&apos;s exhausting. It doesn&apos;t scale. And every single sale requires you to show up.
              </p>

              {/* Good way */}
              <div className="mb-8">
                <p className="text-2xl text-white font-bold">
                  Events flip the entire model:
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/30 rounded-3xl p-8 mb-12">
                <div className="space-y-4">
                  {[
                    "Build trust with hundreds of people at once",
                    "Answer objections publicly — everyone hears the answer",
                    "Create social proof in real-time",
                    "Serve many instead of one",
                    "Do the work once, get rewarded repeatedly",
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 bg-black/30 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-orange-500" />
                      </div>
                      <span className="text-zinc-100 text-lg">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-2xl text-white font-bold">
                One well-run challenge can replace a month of sales calls. <span className="text-orange-400">Run the numbers yourself.</span>
              </p>

              <div className="mt-12">
                <CTAButton />
              </div>
            </div>
          </div>
        </section>

        {/* ===== WHAT YOU GET SECTION ===== */}
        <section id="buy" className="py-24 scroll-mt-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/5 to-transparent" />
          
          <div className="container mx-auto px-6 relative">
            <div className="max-w-5xl mx-auto">
              {/* Header */}
              <div className="text-center mb-16">
                <p className="inline-block text-orange-500 text-sm font-semibold uppercase tracking-wider mb-4 px-4 py-2 bg-orange-500/10 rounded-full">
                  What You&apos;re Getting
                </p>
                <h2 className="text-3xl md:text-4xl lg:text-5xl text-white font-bold leading-tight mb-6">
                  Our Actual Internal Playbook
                </h2>
                <p className="text-xl text-zinc-400 leading-relaxed max-w-3xl mx-auto">
                  This isn&apos;t a course <span className="text-white">about</span> challenges. This is the actual document my team and I print out and tape to the wall before every single event. I&apos;m giving you what took us years to build. Here&apos;s what&apos;s inside:
                </p>
              </div>

              {/* Playbook mockup */}
              <div className="relative mb-16">
                <div className="aspect-video w-full max-w-3xl mx-auto rounded-3xl overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 p-8 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-32 h-40 bg-zinc-700/50 rounded-lg mx-auto mb-4 border border-zinc-600 flex items-center justify-center">
                      <Presentation className="w-12 h-12 text-zinc-500" />
                    </div>
                    <p className="text-zinc-400 text-sm">Image: The Challenge Playbook Document</p>
                    <p className="text-zinc-500 text-xs mt-1">Actual playbook preview</p>
                  </div>
                </div>
              </div>

              {/* Feature cards - 2 column grid */}
              <div className="grid md:grid-cols-2 gap-8 mb-16">
                <FeatureCard
                  icon={Target}
                  title="How We Name It So the Right People Show Up"
                  description="The wrong name attracts freebie-seekers. The right name attracts buyers. I'll show you the exact naming framework Tony and I use to make your ideal prospects feel like this event was made specifically for them — so registration becomes a no-brainer."
                />
                <FeatureCard
                  icon={Users}
                  title="How We Fill It (It's Not Just Paid Ads)"
                  description="Most people think you need a massive ad budget to fill an event. That's only one piece. I'll show you the entire marketing flywheel — organic posts, strategic partnerships, social proof loops, referral triggers, AND paid campaigns. This is the complete system, not a single tactic."
                />
                <FeatureCard
                  icon={TrendingUp}
                  title="How We Recoup Our Ad Spend BEFORE the Event Even Starts"
                  description="This changed everything for us. A simple pre-event offer that helps cover your ad costs before you even go live. You get the exact funnel template and the offer framework we use. Just plug in your content and launch."
                />
                <FeatureCard
                  icon={Mail}
                  title="How We Get People to Actually Show Up (And Bring Friends)"
                  description="Registration means nothing if they don't show up. These are the exact email and text sequences we send — word for word — that get people excited to attend, remind them why they signed up, and even get them to invite others. Copy them. Use them. They work."
                />
                <FeatureCard
                  icon={Presentation}
                  title="My Actual Presentation Slides (Use AI to Customize for Your Event)"
                  description="I've spent years refining these slides. Every word, every transition, every story placement. You get them all. Feed them into ChatGPT or Claude, tell it about your business, and in minutes you'll have a presentation customized to your audience that would have taken you weeks to build from scratch."
                />
                <FeatureCard
                  icon={Zap}
                  title="When, How & What We Pitch (Turn Selling Into Serving)"
                  description="Here's the truth: if you've genuinely helped people during your event, making an offer isn't selling — it's serving. I'll show you exactly when to make your offer, what to say, how to say it, and how to do it in a way where people thank you for the opportunity instead of feeling pushed."
                />
              </div>

              {/* Price & CTA */}
              <div className="text-center">
                <div className="inline-block bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-700 rounded-3xl px-16 py-10 mb-8">
                  <p className="text-zinc-400 text-sm mb-2">One-time payment</p>
                  <span className="text-6xl font-bold text-white">$27</span>
                </div>
                <div className="mb-6">
                  <CTAButton size="large" />
                </div>
                <p className="text-zinc-500 text-sm">
                  Instant access. No subscriptions. No upsells on checkout.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== DISCLAIMER / ADVANTAGE SECTION ===== */}
        <section className="py-24 relative overflow-hidden">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <p className="text-xl text-zinc-400 leading-relaxed mb-8">
                Now let me be real with you for a moment:
              </p>
              
              <h2 className="text-3xl md:text-4xl lg:text-5xl text-white font-bold leading-tight mb-8">
                Your events won&apos;t be as big as mine and Tony&apos;s.
              </h2>
              
              <p className="text-xl text-zinc-400 leading-relaxed mb-8">
                At least not right away. You&apos;re not going to get 100,000+ registrants. You&apos;re not going to fill a stadium. You&apos;re probably not going to trend on social media.
              </p>
              
              <p className="text-3xl text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400 font-bold mb-12">
                And here&apos;s the truth: that&apos;s actually your advantage.
              </p>
              
              <p className="text-lg text-zinc-300 leading-relaxed mb-12">
                Something Tony taught me years ago that changed how I see everything: <span className="text-white font-semibold">for every disadvantage, there&apos;s an equal and opposite advantage.</span>
              </p>

              {/* Comparison cards */}
              <div className="grid md:grid-cols-2 gap-6 mb-12">
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-8 text-center">
                  <p className="text-zinc-500 text-sm mb-2 uppercase tracking-wider">Big events =</p>
                  <p className="text-xl text-white">Big reach, but less personal connection</p>
                </div>
                <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/30 rounded-3xl p-8 text-center">
                  <p className="text-orange-400 text-sm mb-2 uppercase tracking-wider">Your events =</p>
                  <p className="text-xl text-orange-300 font-semibold">Smaller room, deeper relationships</p>
                </div>
              </div>

              <p className="text-xl text-zinc-300 leading-relaxed mb-8">
                When you have 500 people in a room instead of 100,000:
              </p>
              
              <div className="space-y-3 mb-12">
                {[
                  "You can actually TALK to individuals",
                  "You can answer THEIR specific questions",
                  "You can say their NAME",
                  "You can build REAL relationships"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    <span className="text-zinc-300 text-lg">{item}</span>
                  </div>
                ))}
              </div>

              <p className="text-xl text-zinc-300 leading-relaxed">
                That intimacy creates trust. Trust creates buyers.
              </p>
            </div>
          </div>
        </section>

        {/* ===== TONY'S ORIGIN SECTION ===== */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 to-black" />
          
          <div className="container mx-auto px-6 relative">
            <div className="max-w-4xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Left - Tony image placeholder */}
                <div className="relative">
                  <div className="aspect-square w-full max-w-md mx-auto rounded-3xl overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700">
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                      <div className="w-32 h-32 rounded-full bg-zinc-700 border-2 border-orange-500/30 flex items-center justify-center mb-4">
                        <span className="text-zinc-500 text-sm">TONY</span>
                      </div>
                      <p className="text-zinc-500 text-sm text-center">Image: Young Tony Robbins</p>
                      <p className="text-zinc-600 text-xs mt-1">Early days - small hotel ballrooms</p>
                    </div>
                  </div>
                  
                  {/* Floating card */}
                  <div className="absolute -bottom-6 -right-6 bg-zinc-900 border border-zinc-700 rounded-2xl px-6 py-4 shadow-2xl max-w-xs">
                    <p className="text-orange-400 font-semibold mb-1">Started with 30 people</p>
                    <p className="text-zinc-400 text-sm">Folding chairs. Rented microphone.</p>
                  </div>
                </div>

                {/* Right - Content */}
                <div>
                  <p className="inline-block text-orange-500 text-sm font-semibold uppercase tracking-wider mb-4 px-4 py-2 bg-orange-500/10 rounded-full">
                    Here&apos;s something most people don&apos;t know
                  </p>
                  
                  <h2 className="text-3xl md:text-4xl text-white font-bold leading-tight mb-8">
                    Tony didn&apos;t start with stadiums.
                  </h2>
                  
                  <p className="text-lg text-zinc-400 leading-relaxed mb-6">
                    When I first met Tony, he told me about his early days. Small rooms. Thirty people. Fifty people. A hotel ballroom with folding chairs and a rented microphone.
                  </p>
                  
                  <p className="text-lg text-zinc-400 leading-relaxed mb-6">
                    No fame. No platform. No million-dollar ad budget.
                  </p>
                  
                  <p className="text-lg text-zinc-400 leading-relaxed mb-8">
                    Just a room, a message, and people who needed help.
                  </p>
                  
                  <p className="text-xl text-white font-semibold mb-2">
                    Those small rooms became the big rooms.
                  </p>
                  <p className="text-lg text-zinc-400 mb-8">
                    Not the other way around.
                  </p>
                  
                  <p className="text-lg text-zinc-300 leading-relaxed">
                    The difference? Tony had to figure it out from scratch over decades. <span className="text-white font-semibold">You&apos;re getting the playbook we&apos;ve refined together over 20+ years.</span> You don&apos;t have to start where we started.
                  </p>
                </div>
              </div>

              {/* Bottom statement */}
              <div className="mt-16 bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/30 rounded-3xl p-10 text-center">
                <p className="text-2xl text-white font-semibold mb-2">
                  The events built the audience.
                </p>
                <p className="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400 font-semibold">
                  The audience didn&apos;t build the events.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FAQ / OBJECTIONS SECTION ===== */}
        <section className="py-24">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              {/* Header */}
              <div className="mb-12">
                <h2 className="text-3xl md:text-4xl text-white font-bold leading-tight mb-4">
                  &ldquo;But Dean, what about...&rdquo;
                </h2>
                <p className="text-xl text-zinc-400 leading-relaxed">
                  Look, I get it. You&apos;ve probably been burned before. You&apos;ve bought things that didn&apos;t deliver. So let me just be straight with you on a few things:
                </p>
              </div>

              <div className="space-y-4 mb-12">
                <ObjectionItem
                  objection="I don't have an audience yet..."
                  answer="Good. That's exactly why I created this. When I started, nobody knew who I was either. I grew up in a small town in upstate New York with a single mom — no connections, no capital, no college degree. Events are how you build an audience, not the other way around. That's one of the biggest mindset shifts in here."
                />
                <ObjectionItem
                  objection="I've tried running events before and they flopped."
                  answer="So did ours. Honestly, our early challenges were rough. That's exactly why Tony and I spent years refining this system — figuring out what actually works and what doesn't. This playbook exists because we made every mistake first so you don't have to."
                />
                <ObjectionItem
                  objection="This only works because you're Tony and Dean."
                  answer="I hear this one a lot. But here's the thing — Tony started in small hotel ballrooms with folding chairs. I started with nothing. The principles in this playbook are the same ones we used before anyone knew our names. The strategies work because they're based on human psychology and proven frameworks — not celebrity."
                />
                <ObjectionItem
                  objection="What if I buy this and never actually use it?"
                  answer="That's a real concern and I appreciate you being honest about it. Look, I can't make you take action — only you can do that. What I can tell you is we designed this to be simple and actionable, not some 47-hour course you'll never finish. But at the end of the day, it only works if you do the work."
                />
              </div>
            </div>
          </div>
        </section>

        {/* ===== FINAL CTA SECTION ===== */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-orange-500/10 via-transparent to-transparent" />
          
          <div className="container mx-auto px-6 relative">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl lg:text-5xl text-white font-bold leading-tight mb-12">
                The Decision
              </h2>

              <div className="space-y-3 mb-12 text-lg text-zinc-400">
                <p>You can keep doing what you&apos;re doing.</p>
                <p>Keep creating content that doesn&apos;t convert.</p>
                <p>Keep running events that don&apos;t fill up.</p>
                <p>Keep trading your time for money, one call at a time.</p>
                <p>Keep waiting until you &ldquo;have an audience&rdquo; to run events.</p>
              </div>

              <p className="text-2xl text-white font-semibold mb-6">
                Or...
              </p>

              <p className="text-2xl md:text-3xl text-white font-bold mb-12 leading-relaxed">
                You can take the same playbook Tony and I use for our biggest events and run your first challenge in the next 60 days.
              </p>

              <p className="text-xl text-zinc-400 mb-12">
                The funnel. The emails. The slides. The system. Everything we&apos;ve learned.
              </p>

              {/* Final CTA box */}
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-700 rounded-3xl p-10 mb-8">
                <div className="flex flex-col items-center">
                  <p className="text-zinc-400 text-sm mb-2">Get instant access for just</p>
                  <span className="text-6xl font-bold text-white mb-6">$27</span>
                  <CTAButton size="large" />
                  <p className="text-zinc-500 text-sm mt-4">
                    500 registrants guaranteed • No subscriptions • No upsells
                  </p>
                </div>
              </div>

              <p className="text-zinc-600 text-sm">
                This is the strategy that built our business. Now I&apos;m sharing it with you.
              </p>
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="py-12 border-t border-zinc-800">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <p className="text-zinc-600 text-sm">
                © {new Date().getFullYear()} All rights reserved.
              </p>
              <p className="text-zinc-700 text-xs leading-relaxed max-w-2xl mx-auto">
                <span className="font-semibold">Earnings Disclaimer:</span> Results vary. The examples and stories shared are not guarantees of income or success. Your results depend on many factors including your effort, skills, market conditions, and more. We make no claims that you will achieve the same results. This playbook provides education and strategies — success requires your implementation and dedication.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
