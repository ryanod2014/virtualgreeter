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
  ChevronUp,
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
      className="border border-orange-500/20 rounded-xl overflow-hidden bg-zinc-900/50 hover:border-orange-500/40 transition-colors cursor-pointer"
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="flex items-center justify-between p-5">
        <p className="text-white font-medium pr-4">&ldquo;{objection}&rdquo;</p>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-orange-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-orange-500 flex-shrink-0" />
        )}
      </div>
      {isOpen && (
        <div className="px-5 pb-5 pt-0">
          <div className="pt-4 border-t border-zinc-800">
            <p className="text-zinc-400">→ {answer}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== MAIN PAGE =====
export default function ChallengePlaybookPage() {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute w-[600px] h-[600px] -top-[300px] left-1/2 -translate-x-1/2 bg-orange-500/10 rounded-full blur-[100px]" />
        <div className="absolute w-[400px] h-[400px] top-[60%] -left-[150px] bg-orange-600/5 rounded-full blur-[80px]" />
        <div className="absolute w-[350px] h-[350px] top-[40%] -right-[100px] bg-amber-500/5 rounded-full blur-[80px]" />
      </div>

      {/* Grid pattern */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(249, 115, 22, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249, 115, 22, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="relative z-10">
        {/* ===== HERO / HEADLINE ===== */}
        <section className="container mx-auto px-6 pt-20 pb-10">
          <div className="max-w-3xl mx-auto text-center">
            {/* Pre-header quote */}
            <p className="text-lg md:text-xl text-zinc-400 mb-4">
              Dean Graziosi: &ldquo;<span className="text-zinc-300">XX% of our annual revenue comes from our 3 day challenges... we just haven&apos;t found anything else that out converts it.</span>&rdquo;
            </p>

            {/* Main headline - The Offer */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.15] mb-8">
              Get Tony Robbins &amp; Dean Graziosi&apos;s Internal Playbook For Running Virtual Events For{" "}
              <span className="text-orange-500 font-bold">$27</span>
            </h1>

            {/* Guarantee */}
            <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-2 border-orange-500/40 rounded-2xl px-6 py-6 md:px-10 md:py-8 mb-10">
              <p className="text-lg md:text-xl text-white leading-relaxed">
                Use our playbook to run your first (or next) virtual event in the next <span className="text-orange-500 font-bold">60 days</span> and if it doesn&apos;t get you{" "}
                <span className="text-orange-500 font-bold">AT LEAST 500 people</span> there live... <span className="text-orange-500 font-bold">it&apos;s FREE!</span>
              </p>
            </div>

            {/* CTA */}
            <CTAButton size="large" />
          </div>
        </section>

        {/* ===== MAIN CONTENT - Flows like an article ===== */}
        <article className="container mx-auto px-6 py-16">
          <div className="max-w-3xl mx-auto">
            
            {/* Lead */}
            <p className="text-lg text-orange-500 font-medium mb-6">
              Coaches, Consultants, Agency Owners:
            </p>
            
            <p className="text-2xl md:text-3xl text-white font-bold leading-snug mb-4">
              We guarantee you&apos;ll have at least 500 people at your next challenge—or your money back.
            </p>
            
            <p className="text-xl text-zinc-300 leading-relaxed mb-8">
              Even if no one&apos;s ever heard of you.
            </p>
            
            <p className="text-lg text-zinc-400 leading-relaxed mb-6">
              How? By giving you the exact playbook we use to fill rooms of 500,000+ people. The same system. Every step.
            </p>
            
            <p className="text-lg text-zinc-400 leading-relaxed mb-6">
              Because here&apos;s the thing: <span className="text-white font-medium">nothing out-converts a well-run challenge.</span> It compresses a year of trust &amp; goodwill into 3 days.
            </p>
            
            <p className="text-lg text-zinc-400 leading-relaxed mb-8">
              And for the first time, we&apos;re showing you exactly how to do it.
            </p>

            <div className="border-t border-zinc-800 my-12"></div>

            {/* The Disclaimer / Advantage */}
            <p className="text-lg text-zinc-400 leading-relaxed mb-6">
              Quick disclaimer before we go any further:
            </p>
            
            <p className="text-2xl md:text-3xl text-white font-bold leading-tight mb-8">
              Your events won&apos;t be as big as mine and Tony&apos;s.
            </p>
            
            <p className="text-lg text-zinc-400 leading-relaxed mb-8">
              You&apos;re not going to get 100,000+ registrants. You&apos;re not going to fill a stadium. You&apos;re probably not going to trend on social media.
            </p>
            
            <p className="text-2xl text-orange-500 font-bold mb-8">
              And honestly? That&apos;s your unfair advantage.
            </p>
            
            <p className="text-lg text-zinc-300 leading-relaxed mb-6">
              Here&apos;s something nobody talks about: <span className="text-white font-semibold">For every disadvantage, there&apos;s an equal and opposite advantage.</span>
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                <p className="text-zinc-500 text-sm mb-1">Big events =</p>
                <p className="text-white">Big reach, but shallow connection</p>
              </div>
              <div className="bg-zinc-900/50 border border-orange-500/30 rounded-xl p-5">
                <p className="text-zinc-500 text-sm mb-1">Small events =</p>
                <p className="text-orange-400 font-semibold">Smaller reach, but DEEP connection</p>
              </div>
            </div>

            <p className="text-lg text-zinc-300 leading-relaxed mb-6">
              When you have 20-30 people in a room instead of 20,000:
            </p>
            
            <ul className="space-y-3 mb-8">
              {[
                "You can actually TALK to individuals",
                "You can answer THEIR specific questions",
                "You can say their NAME",
                "You can build REAL relationships"
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-lg">
                  <Check className="w-5 h-5 text-orange-500 flex-shrink-0" />
                  <span className="text-zinc-300">{item}</span>
                </li>
              ))}
            </ul>

            <p className="text-lg text-zinc-300 leading-relaxed mb-4">
              That intimacy creates trust. Trust creates buyers.
            </p>
            
            <p className="text-xl text-white font-semibold mb-12">
              That&apos;s why small rooms often <span className="text-orange-500">OUTCONVERT</span> big ones.
            </p>

            <p className="text-2xl text-white font-bold text-center mb-4">
              You don&apos;t need Tony&apos;s audience to get Tony&apos;s results.
            </p>
            <p className="text-2xl text-orange-500 font-bold text-center mb-12">
              You need Tony&apos;s PROCESS.
            </p>

            <div className="border-t border-zinc-800 my-12"></div>

            {/* Tony's Origin Story */}
            <p className="text-orange-500 text-sm font-medium uppercase tracking-wider mb-4">
              Here&apos;s something most people don&apos;t know
            </p>
            
            <p className="text-2xl md:text-3xl text-white font-bold leading-tight mb-8">
              Tony didn&apos;t start with stadiums.
            </p>
            
            <p className="text-lg text-zinc-400 leading-relaxed mb-6">
              He started with small rooms. Thirty people. Fifty people. A hotel ballroom with folding chairs and a rented microphone.
            </p>
            
            <p className="text-lg text-zinc-400 leading-relaxed mb-6">
              No fame. No platform. No million-dollar ad budget.
            </p>
            
            <p className="text-lg text-zinc-400 leading-relaxed mb-8">
              Just a room, a message, and people who needed help.
            </p>
            
            <p className="text-xl text-white font-semibold mb-4">
              Those small rooms BECAME the big rooms.
            </p>
            <p className="text-lg text-zinc-400 mb-12">
              Not the other way around.
            </p>

            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-6 mb-12">
              <p className="text-xl text-white font-semibold mb-2">
                The events built the audience.
              </p>
              <p className="text-xl text-orange-400 font-semibold">
                The audience didn&apos;t build the events.
              </p>
            </div>

            <div className="border-t border-zinc-800 my-12"></div>

            {/* Chicken & Egg */}
            <p className="text-2xl md:text-3xl text-white font-bold leading-tight mb-8">
              The Chicken &amp; The Egg
            </p>
            
            <p className="text-lg text-zinc-400 leading-relaxed mb-6">
              Most people think they need an audience before they can run events.
            </p>
            
            <p className="text-lg text-zinc-500 italic mb-2">&ldquo;I&apos;ll run a challenge once I have more followers.&rdquo;</p>
            <p className="text-lg text-zinc-500 italic mb-2">&ldquo;I&apos;ll do a live event once people know who I am.&rdquo;</p>
            <p className="text-lg text-zinc-500 italic mb-8">&ldquo;I need to build trust first.&rdquo;</p>
            
            <p className="text-2xl text-orange-500 font-bold mb-8">
              That&apos;s backwards.
            </p>
            
            <p className="text-lg text-zinc-300 leading-relaxed mb-8">
              Tony and I have as much goodwill as we have BECAUSE of how much free value we&apos;ve delivered at live events over the years. Not the other way around.
            </p>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-8">
              <p className="text-zinc-500 text-sm mb-2">The wrong way:</p>
              <p className="text-zinc-500 line-through mb-4">audience → events → sales</p>
              
              <p className="text-orange-500 text-sm mb-2">The right way:</p>
              <p className="text-xl font-bold text-white">
                events → trust → audience → <span className="text-orange-500">everything</span>
              </p>
            </div>

            <p className="text-lg text-zinc-300 leading-relaxed mb-3">
              If you don&apos;t have an audience, events are how you <span className="text-white font-semibold">BUILD</span> one.
            </p>
            <p className="text-lg text-zinc-300 leading-relaxed mb-3">
              If you don&apos;t have trust, events are how you <span className="text-white font-semibold">EARN</span> it.
            </p>
            <p className="text-lg text-zinc-300 leading-relaxed mb-12">
              If you don&apos;t have credibility, events are how you <span className="text-white font-semibold">CREATE</span> it.
            </p>

            <p className="text-xl text-white font-bold text-center mb-2">
              This isn&apos;t a strategy for people who already made it.
            </p>
            <p className="text-xl text-orange-500 font-bold text-center mb-12">
              This is the strategy that MAKES you.
            </p>

            <div className="border-t border-zinc-800 my-12"></div>

            {/* The Old Way */}
            <p className="text-2xl md:text-3xl text-white font-bold leading-tight mb-4">
              The Old Way Is <span className="text-red-500">Broken</span>
            </p>
            
            <p className="text-lg text-zinc-400 leading-relaxed mb-8">
              Right now, most people are doing it the hard way: <span className="text-white font-semibold">1-on-1 sales calls.</span>
            </p>
            
            <p className="text-lg text-zinc-400 leading-relaxed mb-4">
              You know the drill:
            </p>

            <ul className="space-y-3 mb-8">
              {[
                "Block 45 minutes on your calendar",
                "Half of them no-show",
                "Spend 30 minutes building rapport before you can pitch",
                "No social proof. No herd effect. No momentum.",
                "Close one (maybe). Repeat tomorrow. Forever.",
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-lg">
                  <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                  <span className="text-zinc-400">{item}</span>
                </li>
              ))}
            </ul>

            <p className="text-lg text-zinc-300 leading-relaxed mb-12">
              It&apos;s exhausting. It doesn&apos;t scale. And every sale requires YOU to show up.
            </p>

            <p className="text-xl text-white font-bold mb-4">
              Events flip the entire model:
            </p>

            <ul className="space-y-3 mb-8">
              {[
                "Build trust with 50-100 people at once",
                "Answer objections publicly (everyone hears)",
                "Create social proof in real-time",
                "Sell to many instead of one",
                "Do the work ONCE, get paid repeatedly",
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-lg">
                  <Check className="w-5 h-5 text-orange-500 flex-shrink-0 mt-1" />
                  <span className="text-zinc-300">{item}</span>
                </li>
              ))}
            </ul>

            <p className="text-xl text-white font-bold mb-12">
              One good challenge can replace a month of sales calls. That&apos;s not theory. <span className="text-orange-500">That&apos;s math.</span>
            </p>

            <div className="text-center mb-12">
              <CTAButton />
            </div>

            <div className="border-t border-zinc-800 my-12"></div>

            {/* What You Get */}
            <p id="buy" className="text-orange-500 text-sm font-medium uppercase tracking-wider mb-4 scroll-mt-24">
              What You&apos;re Getting
            </p>
            
            <p className="text-2xl md:text-3xl text-white font-bold leading-tight mb-4">
              Our Actual Internal Playbook
            </p>
            
            <p className="text-lg text-zinc-400 leading-relaxed mb-10">
              Not a course ABOUT challenges. The actual document we print out and tape to the wall before every event. Here&apos;s what&apos;s inside:
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-12">
              {/* Item 1 */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-orange-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center mb-4">
                  <Target className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="font-bold text-white text-lg mb-2">The Challenge Topic Framework</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Most people pick a topic that sounds good to THEM. We&apos;ll show you how to pick a topic your ideal client is already searching for—so registration feels like a no-brainer, even if nobody knows who you are yet.
                </p>
              </div>

              {/* Item 2 */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-orange-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center mb-4">
                  <Users className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="font-bold text-white text-lg mb-2">Our Registration System</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  The exact process we use to fill seats. You won&apos;t hit our numbers (we&apos;ve been doing this for years), but you&apos;ll hit yours. Includes the ads, the copy, the targeting, and the psychology behind why people sign up.
                </p>
              </div>

              {/* Item 3 */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-orange-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center mb-4">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="font-bold text-white text-lg mb-2">The Break-Even Funnel Template</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Our funnel is designed to break even on ad spend BEFORE the challenge even starts. That means we&apos;re playing with house money by the time we make our offer. Copy the template. Plug in your content. Launch.
                </p>
              </div>

              {/* Item 4 */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-orange-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center mb-4">
                  <Mail className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="font-bold text-white text-lg mb-2">The Show-Up Sequences</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Getting people to register is one thing. Getting them to actually SHOW UP is another. These are the exact email and text sequences we send—word for word. Copy them, or hand them to AI and let it rewrite for your voice.
                </p>
              </div>

              {/* Item 5 */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-orange-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center mb-4">
                  <Presentation className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="font-bold text-white text-lg mb-2">My Actual Presentation Slides</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  See exactly how we structure the 3 days. How we build value. How we transition to the offer. How we handle the close. Steal the structure, swap in your content, and you&apos;ve got a presentation that converts.
                </p>
              </div>

              {/* Item 6 */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-orange-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center mb-4">
                  <Zap className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="font-bold text-white text-lg mb-2">The Offer Framework</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  When to pitch. How to pitch. What to say. What NOT to say. This is the part most people screw up—they either sell too hard or don&apos;t sell at all. We&apos;ll show you the sweet spot that feels natural and converts.
                </p>
              </div>
            </div>

            {/* Benefits */}
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-orange-500" />
                  <h3 className="font-bold text-white">Short-Term</h3>
                </div>
                <ul className="space-y-2 text-zinc-400 text-sm">
                  <li>→ Generate customers in the next 30-60 days</li>
                  <li>→ Stop doing exhausting 1-on-1 sales calls</li>
                  <li>→ Revenue that doesn&apos;t require you on every sale</li>
                </ul>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  <h3 className="font-bold text-white">Long-Term</h3>
                </div>
                <ul className="space-y-2 text-zinc-400 text-sm">
                  <li>→ Authority that compounds over time</li>
                  <li>→ An audience that knows, likes, and trusts you</li>
                  <li>→ A business built on events, not exhaustion</li>
                </ul>
              </div>
            </div>

            {/* Price & CTA */}
            <div className="text-center mb-12">
              <div className="inline-block bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 rounded-2xl px-12 py-6 mb-8">
                <p className="text-zinc-400 text-sm mb-2">One-time payment</p>
                <span className="text-5xl font-bold text-white">$27</span>
              </div>
              <div className="mb-4">
                <CTAButton size="large" />
              </div>
              <p className="text-zinc-500 text-sm">
                Instant access. No subscriptions. No upsells on checkout.
              </p>
            </div>

            <div className="border-t border-zinc-800 my-12"></div>

            {/* Objections */}
            <p className="text-2xl md:text-3xl text-white font-bold leading-tight mb-4">
              &ldquo;But what about...&rdquo;
            </p>
            
            <p className="text-lg text-zinc-400 leading-relaxed mb-8">
              We&apos;ve heard them all. Here are the answers.
            </p>

            <div className="space-y-4 mb-12">
              <ObjectionItem
                objection="I don't have an audience..."
                answer="Good. Challenges are how you BUILD an audience. You're not supposed to have one yet. That's the whole point."
              />
              <ObjectionItem
                objection="I've tried challenges before and they didn't work."
                answer="So did we. Our first one: 217 registrants. 23 showed up. Zero sales. This playbook is everything we fixed after that disaster."
              />
              <ObjectionItem
                objection="This only works because you're Tony and Dean."
                answer="Tony started in rooms of 30 people. I wasn't anybody when I ran my first challenge. The playbook works because the PRINCIPLES work—not because of who's using them."
              />
              <ObjectionItem
                objection="$27 seems too cheap. What's the catch?"
                answer="The catch is we want you to run a successful challenge, realize we know what we're talking about, and come back for something bigger later. That's it. We're not hiding it. This is the front door."
              />
              <ObjectionItem
                objection="What if I buy it and never use it?"
                answer="Then you're out $27. The cost of a lunch you won't remember. But if you use it once, you're up five figures minimum. That math works for us."
              />
            </div>

            <div className="border-t border-zinc-800 my-12"></div>

            {/* Final CTA */}
            <p className="text-2xl md:text-3xl text-white font-bold leading-tight mb-8 text-center">
              The Decision
            </p>

            <p className="text-lg text-zinc-400 leading-relaxed mb-2 text-center">You can keep doing what you&apos;re doing.</p>
            <p className="text-lg text-zinc-400 leading-relaxed mb-2 text-center">Keep posting content that gets likes but not sales.</p>
            <p className="text-lg text-zinc-400 leading-relaxed mb-2 text-center">Keep running webinars that 12 people attend.</p>
            <p className="text-lg text-zinc-400 leading-relaxed mb-2 text-center">Keep doing sales calls until you burn out.</p>
            <p className="text-lg text-zinc-400 leading-relaxed mb-8 text-center">Keep waiting until you &ldquo;have an audience&rdquo; to run events.</p>

            <p className="text-xl text-white font-semibold mb-4 text-center">
              Or...
            </p>

            <p className="text-xl md:text-2xl text-white font-bold mb-10 text-center leading-relaxed">
              You can take the playbook that generates{" "}
              <span className="text-orange-500">93% of our annual revenue</span>{" "}
              and run your first challenge in the next 60 days.
            </p>

            <p className="text-lg text-zinc-400 mb-10 text-center">
              The funnel. The emails. The slides. The system.
            </p>

            <div className="text-center mb-8">
              <CTAButton size="large" />
            </div>

            <p className="text-zinc-600 text-sm text-center">
              This is the strategy that built the business. Now it&apos;s yours.
            </p>

          </div>
        </article>

        {/* ===== FOOTER ===== */}
        <footer className="py-12 border-t border-zinc-800">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-zinc-600 text-sm">
                © {new Date().getFullYear()} All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
