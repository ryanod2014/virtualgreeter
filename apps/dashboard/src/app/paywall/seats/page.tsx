"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, Users, Minus, Plus, Gift, Info } from "lucide-react";
import { trackFunnelEvent, FUNNEL_STEPS } from "@/lib/funnel-tracking";
import { PRICING } from "@/lib/stripe";

export default function PaywallStep2() {
  const [seatCount, setSeatCount] = useState(1);
  const router = useRouter();

  // Track seats page view
  useEffect(() => {
    trackFunnelEvent(FUNNEL_STEPS.SEATS);
  }, []);

  const handleContinue = async () => {
    // Store seat count in localStorage for later use
    localStorage.setItem("trial_seats", seatCount.toString());
    
    // Track seats selection conversion
    await trackFunnelEvent(FUNNEL_STEPS.SEATS_COMPLETE, { 
      is_conversion: true,
      seats: seatCount 
    });
    
    router.push("/paywall/billing");
  };

  const incrementSeats = () => setSeatCount((prev) => Math.min(prev + 1, 50));
  const decrementSeats = () => setSeatCount((prev) => Math.max(prev - 1, 1));

  const monthlyPrice = seatCount * PRICING.monthly.price;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Badge */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 shine-effect">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            Step 2 of 3: Select Your Team Size
          </span>
        </div>
      </div>

      {/* Main card */}
      <div className="relative backdrop-blur-sm bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl">
        {/* Subtle inner glow */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

        <div className="relative">
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-4">
            How Many <span className="text-primary">Seats</span> Do You Need?
          </h1>
          
          <p className="text-xl text-muted-foreground text-center mb-4">
            Add as many greeters as you want during your trial
          </p>

          {/* Free during trial banner */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30">
              <Gift className="w-4 h-4 text-green-400" />
              <span className="text-sm font-semibold text-green-400">
                Unlimited free seats during your 7-day trial!
              </span>
            </div>
          </div>

          {/* Seat selector */}
          <div className="bg-muted/30 border border-border/50 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-white">Team Seats</div>
                  <div className="text-sm text-muted-foreground">One seat per greeter</div>
                </div>
              </div>
              
              {/* Counter */}
              <div className="flex items-center gap-3">
                <button
                  onClick={decrementSeats}
                  disabled={seatCount <= 1}
                  className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <div className="w-16 text-center">
                  <span className="text-3xl font-bold text-white">{seatCount}</span>
                </div>
                <button
                  onClick={incrementSeats}
                  disabled={seatCount >= 50}
                  className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick select buttons */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[1, 2, 5, 10, 20].map((num) => (
                <button
                  key={num}
                  onClick={() => setSeatCount(num)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    seatCount === num
                      ? "bg-primary text-primary-foreground"
                      : "bg-slate-700 text-white hover:bg-slate-600"
                  }`}
                >
                  {num} {num === 1 ? "seat" : "seats"}
                </button>
              ))}
            </div>

            {/* Pricing breakdown */}
            <div className="pt-4 border-t border-border/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground">During your 7-day trial</span>
                <span className="text-xl font-bold text-green-400">$0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">After trial ends ({seatCount} {seatCount === 1 ? "seat" : "seats"} × $297)</span>
                <span className="text-xl font-bold text-white">${monthlyPrice.toLocaleString()}/mo</span>
              </div>
            </div>
          </div>

          {/* Info box */}
          <div className="flex items-start gap-3 bg-slate-800/40 border border-slate-700/30 rounded-xl p-4 mb-6">
            <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Each seat allows one team member to greet visitors via live video. You can adjust your seat count anytime from your billing settings.
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={handleContinue}
            className="w-full group inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-full font-semibold text-lg hover:bg-primary/90 transition-all hover:shadow-xl hover:shadow-primary/30"
          >
            Continue with {seatCount} {seatCount === 1 ? "Seat" : "Seats"}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

