"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowRight, Sparkles, Shield, Clock, Zap, Lock, Loader2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

const COMPLIANCE_TEXT = "Try it free for a full 7 days! If you love it, do nothing—you will automatically be charged $297 per seat on that date and every month thereafter until you cancel. Cancel auto-renewing charges by logging into your account under \"billing settings\" before your billing date. Cancel for any reason without having to talk to a human.";

function PaywallForm() {
  const [isAgreed, setIsAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingIntent, setIsLoadingIntent] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [cardNumberComplete, setCardNumberComplete] = useState(false);
  const [cardExpiryComplete, setCardExpiryComplete] = useState(false);
  const [cardCvcComplete, setCardCvcComplete] = useState(false);
  const [zipCode, setZipCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();

  const cardComplete = cardNumberComplete && cardExpiryComplete && cardCvcComplete && zipCode.length >= 5;

  // Fetch SetupIntent on mount
  useEffect(() => {
    async function createSetupIntent() {
      try {
        const response = await fetch("/api/billing/setup-intent", {
          method: "POST",
        });
        const data = await response.json();
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setError("Failed to initialize payment. Please refresh and try again.");
        }
      } catch {
        setError("Failed to initialize payment. Please refresh and try again.");
      } finally {
        setIsLoadingIntent(false);
      }
    }
    createSetupIntent();
  }, []);

  const handleContinue = async () => {
    if (!isAgreed || !stripe || !elements || !clientSecret || !cardComplete) return;

    setIsLoading(true);
    setError(null);

    const cardNumberElement = elements.getElement(CardNumberElement);
    if (!cardNumberElement) {
      setError("Card element not found");
      setIsLoading(false);
      return;
    }

    try {
      const { error: setupError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardNumberElement,
          billing_details: {
            address: {
              postal_code: zipCode,
            },
          },
        },
      });

      if (setupError) {
        setError(setupError.message || "Failed to save card. Please try again.");
        setIsLoading(false);
        return;
      }

      if (setupIntent?.status === "succeeded") {
        router.push("/paywall/seats");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const elementStyle = {
    base: {
      fontSize: "16px",
      color: "#ffffff",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontWeight: "400",
      "::placeholder": {
        color: "#64748b",
      },
      iconColor: "#a78bfa",
    },
    invalid: {
      color: "#f87171",
      iconColor: "#f87171",
    },
  };

  const getFieldClass = (fieldName: string) => {
    const base = "relative bg-gradient-to-b from-slate-900/80 to-slate-900/60 rounded-xl transition-all duration-200";
    const border = focusedField === fieldName 
      ? "ring-2 ring-primary/50 border-primary/50" 
      : "border border-white/10 hover:border-white/20";
    return `${base} ${border}`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Badge */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 shine-effect">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            Step 1 of 3: Start Your Free Trial
          </span>
        </div>
      </div>

      {/* Main card */}
      <div className="relative backdrop-blur-sm bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

        <div className="relative">
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Start Your <span className="text-primary">7-Day Free Trial</span>
          </h1>
          
          <p className="text-xl text-muted-foreground text-center mb-8">
            Try GreetNow free for 7 days. Cancel anytime during your trial.
          </p>

          {/* Pricing card */}
          <div className="bg-muted/30 border border-border/50 rounded-2xl p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Monthly per seat</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white">$297</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-medium w-fit">
                <Clock className="w-3.5 h-3.5" />
                7 days free
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-2.5 pt-4 border-t border-border/30">
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">Unlimited website traffic</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">Customizable GreetNow widget — your brand, your rules</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">Only shows when agents are available</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">Assign reps to specific pages</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">Record every call — 10 GB free, $0.50/GB after</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">Auto-transcription — $0.01/min (optional)</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">AI call summaries — $0.02/min (optional)</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">Real-time analytics & custom dispositions</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">Block countries & spam protection</span>
              </div>
            </div>
          </div>

          {/* Card on File Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Card on File</h3>
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs text-slate-500">Secured by Stripe</span>
              </div>
            </div>
            
            {isLoadingIntent ? (
              <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-8">
                <div className="flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <span className="ml-3 text-muted-foreground">Initializing secure payment...</span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/30 border border-white/10 rounded-2xl p-5 space-y-4">
                {/* Card Number */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Card Number</label>
                  <div className={getFieldClass("cardNumber")}>
                    <div className="px-4 py-3.5">
                      <CardNumberElement
                        options={{
                          style: elementStyle,
                          placeholder: "4242 4242 4242 4242",
                          showIcon: true,
                        }}
                        onChange={(e) => setCardNumberComplete(e.complete)}
                        onFocus={() => setFocusedField("cardNumber")}
                        onBlur={() => setFocusedField(null)}
                      />
                    </div>
                  </div>
                </div>

                {/* Expiry, CVC, ZIP row */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Expiry</label>
                    <div className={getFieldClass("expiry")}>
                      <div className="px-4 py-3.5">
                        <CardExpiryElement
                          options={{
                            style: elementStyle,
                            placeholder: "12 / 28",
                          }}
                          onChange={(e) => setCardExpiryComplete(e.complete)}
                          onFocus={() => setFocusedField("expiry")}
                          onBlur={() => setFocusedField(null)}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">CVC</label>
                    <div className={getFieldClass("cvc")}>
                      <div className="px-4 py-3.5">
                        <CardCvcElement
                          options={{
                            style: elementStyle,
                            placeholder: "123",
                          }}
                          onChange={(e) => setCardCvcComplete(e.complete)}
                          onFocus={() => setFocusedField("cvc")}
                          onBlur={() => setFocusedField(null)}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">ZIP Code</label>
                    <div className={getFieldClass("zip")}>
                      <input
                        type="text"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        onFocus={() => setFocusedField("zip")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="12345"
                        className="w-full bg-transparent px-4 py-3.5 text-white placeholder:text-slate-500 focus:outline-none text-base"
                      />
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Shield className="w-4 h-4 text-green-400" />
              Cancel anytime before trial ends
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Zap className="w-4 h-4 text-yellow-400" />
              Setup in 60 seconds
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-red-400 text-xs">!</span>
              </div>
              {error}
            </div>
          )}

          {/* Autobilling checkbox */}
          <div className="bg-slate-900/40 border border-white/10 rounded-xl p-5 mb-6">
            <label className="flex items-start gap-4 cursor-pointer group">
              <div className="relative flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={isAgreed}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-6 h-6 rounded-lg border-2 border-slate-600 peer-checked:border-primary peer-checked:bg-primary transition-all flex items-center justify-center group-hover:border-slate-500">
                  {isAgreed && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white mb-1 group-hover:text-primary transition-colors">
                  I understand and agree to the billing terms
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {COMPLIANCE_TEXT}
                </p>
              </div>
            </label>
          </div>

          {/* CTA */}
          <button
            onClick={handleContinue}
            disabled={!isAgreed || !cardComplete || isLoading || isLoadingIntent}
            className="w-full group inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-full font-semibold text-lg hover:bg-primary/90 transition-all hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          {/* No charge today note */}
          <p className="text-center text-sm text-slate-500 mt-4">
            Your card will <span className="text-slate-400 font-medium">not</span> be charged today
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaywallStep1() {
  return (
    <Elements stripe={stripePromise}>
      <PaywallForm />
    </Elements>
  );
}
