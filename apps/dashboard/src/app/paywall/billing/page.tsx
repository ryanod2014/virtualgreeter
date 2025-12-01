"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, Check, X, Percent, Calendar, CreditCard, Zap } from "lucide-react";

export default function PaywallStep3() {
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("monthly");
  const [seatCount, setSeatCount] = useState(1);
  const [showExitPopup, setShowExitPopup] = useState(false);
  const exitPopupShown = useRef(false);
  const router = useRouter();

  useEffect(() => {
    // Get seat count from previous step
    const storedSeats = localStorage.getItem("trial_seats");
    if (storedSeats) {
      setSeatCount(parseInt(storedSeats, 10));
    }
  }, []);

  // Lock body scroll when popup is open
  useEffect(() => {
    if (showExitPopup) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showExitPopup]);

  const monthlyPrice = 297;
  const annualPrice = 193; // ~35% off
  const sixMonthPrice = 178; // 40% off
  const monthlySavings = monthlyPrice - annualPrice;
  const sixMonthSavings = monthlyPrice - sixMonthPrice;
  const yearlyTotal = annualPrice * 12 * seatCount;
  const sixMonthTotal = sixMonthPrice * 6 * seatCount;
  const monthlyCostMonthly = monthlyPrice * seatCount;
  const monthlyCostAnnual = annualPrice * seatCount;
  const monthlyCostSixMonth = sixMonthPrice * seatCount;

  const handleContinue = () => {
    // Show exit popup for monthly users (one time only)
    if (selectedPlan === "monthly" && !exitPopupShown.current) {
      exitPopupShown.current = true;
      setShowExitPopup(true);
      return;
    }
    // Store billing preference
    localStorage.setItem("billing_preference", selectedPlan);
    // Continue to admin dashboard
    router.push("/admin");
  };

  const handleSixMonthOffer = () => {
    localStorage.setItem("billing_preference", "six_month");
    router.push("/admin");
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Badge */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 shine-effect">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            Step 3 of 3: Choose Your Billing Preference
          </span>
        </div>
      </div>

      {/* Main card */}
      <div className="relative backdrop-blur-sm bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl">
        {/* Subtle inner glow */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

        <div className="relative">
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Save <span className="text-primary">35%</span> With Annual Billing
          </h1>
          
          <p className="text-xl text-muted-foreground text-center mb-4">
            Lock in your rate and save big
          </p>

          {/* Still free trial reminder */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-green-400">
                Your 7-day free trial still applies — cancel anytime!
              </span>
            </div>
          </div>

          {/* Plan comparison */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {/* Monthly Plan */}
            <button
              onClick={() => setSelectedPlan("monthly")}
              className={`relative p-6 rounded-2xl border-2 text-left transition-all ${
                selectedPlan === "monthly"
                  ? "border-white/30 bg-white/5"
                  : "border-border/50 bg-muted/20 hover:border-border"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <span className="font-semibold text-lg">Monthly</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Pay month-to-month</div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedPlan === "monthly" ? "border-white bg-white" : "border-slate-600"
                }`}>
                  {selectedPlan === "monthly" && <Check className="w-4 h-4 text-slate-900" />}
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">${monthlyPrice}</span>
                  <span className="text-muted-foreground">/seat/mo</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {seatCount} {seatCount === 1 ? "seat" : "seats"} = <span className="text-white font-medium">${monthlyCostMonthly.toLocaleString()}/mo</span>
                </div>
              </div>

              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  Flexible, cancel anytime
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  No long-term commitment
                </li>
              </ul>
            </button>

            {/* Annual Plan */}
            <button
              onClick={() => setSelectedPlan("annual")}
              className={`relative p-6 rounded-2xl border-2 text-left transition-all ${
                selectedPlan === "annual"
                  ? "border-primary bg-primary/10"
                  : "border-primary/30 bg-primary/5 hover:border-primary/50"
              }`}
            >
              {/* Best value badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  <Percent className="w-3 h-3" />
                  BEST VALUE
                </div>
              </div>

              <div className="flex items-start justify-between mb-4 pt-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-lg">Annual</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Billed yearly</div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedPlan === "annual" ? "border-primary bg-primary" : "border-primary/50"
                }`}>
                  {selectedPlan === "annual" && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">${annualPrice}</span>
                  <span className="text-muted-foreground">/seat/mo</span>
                  <span className="text-sm font-medium text-green-400 line-through opacity-60">${monthlyPrice}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {seatCount} {seatCount === 1 ? "seat" : "seats"} = <span className="text-white font-medium">${monthlyCostAnnual.toLocaleString()}/mo</span>
                  <span className="text-green-400 ml-2">(${yearlyTotal.toLocaleString()}/year)</span>
                </div>
              </div>

              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-green-400 font-medium">Save ${monthlySavings}/seat/mo (35% off)</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  Lock in your rate
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  Priority support
                </li>
              </ul>
            </button>
          </div>

          {/* Savings callout for annual */}
          {selectedPlan === "annual" && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 text-center">
              <div className="text-lg font-semibold text-green-400">
                You'll save ${(monthlySavings * 12 * seatCount).toLocaleString()}/year with annual billing!
              </div>
              <div className="text-sm text-green-400/70 mt-1">
                That's ${(monthlySavings * seatCount).toLocaleString()} back in your pocket every month
              </div>
            </div>
          )}

          {/* Overpaying callout for monthly */}
          {selectedPlan === "monthly" && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-center">
              <div className="text-sm text-red-400/70 mb-1">By choosing monthly:</div>
              <div className="text-lg font-semibold text-red-400">
                You'll be overpaying by ${(monthlySavings * 12 * seatCount).toLocaleString()} a year
              </div>
            </div>
          )}

          {/* Trust indicator */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-8">
            <CreditCard className="w-4 h-4" />
            <span>You won't be charged until your free trial ends</span>
          </div>

          {/* CTA */}
          <button
            onClick={handleContinue}
            className="w-full group inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-full font-semibold text-lg hover:bg-primary/90 transition-all hover:shadow-xl hover:shadow-primary/30"
          >
            {selectedPlan === "annual" ? "Start Trial with Annual Billing" : "Start Trial with Monthly Billing"}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

        </div>
      </div>

      {/* 6-Month Downsell Popup */}
      {showExitPopup && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowExitPopup(false)}
          />
          
          {/* Modal - Glass panel style matching landing page */}
          <div className="relative w-full max-w-lg backdrop-blur-sm bg-white/[0.02] border border-white/10 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-300 mb-8">
            {/* Subtle inner glow */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
            
            {/* Close button */}
            <button 
              onClick={() => setShowExitPopup(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="relative">
              {/* Badge */}
              <div className="flex justify-center mb-6">
                <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 shine-effect">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    One-Time Offer
                  </span>
                </div>
              </div>

              <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
                Wait — Save More With Our <span className="text-primary">6-Month Plan</span>
              </h2>
              
              <p className="text-lg text-muted-foreground text-center mb-6">
                Get 40% off with a shorter commitment than annual
              </p>

              {/* Offer card - matching muted card style */}
              <div className="bg-muted/30 border border-border/50 rounded-2xl p-6 mb-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <span className="text-4xl font-bold text-white">${sixMonthPrice}</span>
                    <span className="text-muted-foreground">/seat/mo</span>
                    <span className="text-lg font-medium text-muted-foreground line-through">${monthlyPrice}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-4">
                    {seatCount} {seatCount === 1 ? "seat" : "seats"} = <span className="text-white font-medium">${monthlyCostSixMonth.toLocaleString()}/mo</span>
                    <span className="text-primary ml-2">(${sixMonthTotal.toLocaleString()} billed after trial)</span>
                  </div>

                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30 mb-5">
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-semibold text-green-400">
                      Save ${sixMonthSavings}/seat/mo (40% off)
                    </span>
                  </div>

                  <ul className="space-y-2 text-left max-w-xs mx-auto">
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      6-month commitment (not 12)
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      7-day free trial still applies
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      All features included
                    </li>
                  </ul>
                </div>
              </div>

              {/* FTC Compliant Billing Terms */}
              <div className="bg-slate-900/40 border border-white/10 rounded-xl p-4 mb-6">
                <p className="text-xs text-slate-400 leading-relaxed">
                  <span className="text-white font-medium">Billing Terms:</span> By clicking below, you agree to start your 7-day free trial. If you do not cancel before your trial ends, you will be automatically charged <span className="text-white">${sixMonthTotal.toLocaleString()}</span> (${sixMonthPrice}/seat × {seatCount} {seatCount === 1 ? "seat" : "seats"} × 6 months) as a single payment. After 6 months, your plan will convert to month-to-month billing at $297/seat/month until you cancel. Cancel anytime in your account settings—no calls required.
                </p>
              </div>

              {/* CTA buttons */}
              <button
                onClick={handleSixMonthOffer}
                className="w-full group inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-full font-semibold text-lg hover:bg-primary/90 transition-all hover:shadow-xl hover:shadow-primary/30 mb-3"
              >
                Start Trial with 6-Month Plan
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => {
                  setShowExitPopup(false);
                  // Proceed with monthly
                  localStorage.setItem("billing_preference", "monthly");
                  router.push("/admin");
                }}
                className="w-full text-sm text-muted-foreground hover:text-white transition-colors py-2"
              >
                No thanks, continue with monthly at $297/mo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

