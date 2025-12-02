"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CreditCard,
  Users,
  Check,
  TrendingUp,
  Calendar,
  Receipt,
  HardDrive,
  Video,
  ExternalLink,
  AlertTriangle,
  Snowflake,
  PlayCircle,
  FileText,
  Sparkles,
  Minus,
  Plus,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { Organization, BillingFrequency } from "@ghost-greeter/domain/database.types";
import { CancelSubscriptionModal, type CancellationData } from "./cancel-subscription-modal";
import { PauseAccountModal } from "./pause-account-modal";
import { submitCancellationFeedback, pauseAccount, resumeAccount } from "./actions";
import { PRICING, STORAGE_PRICE_PER_GB, FREE_STORAGE_GB } from "@/lib/stripe";

interface AIUsage {
  transcriptionCost: number;
  transcriptionMinutes: number;
  summaryCost: number;
  summaryMinutes: number;
}

interface Props {
  organization: Organization;
  usedSeats: number;       // Active agents + pending agent invites
  purchasedSeats: number;  // What they're paying for (billing floor)
  storageUsedGB: number;
  userId: string;
  subscriptionStartDate: Date;
  aiUsage?: AIUsage;
}

export function BillingSettingsClient({ organization, usedSeats, purchasedSeats: initialPurchasedSeats, storageUsedGB, userId, subscriptionStartDate, aiUsage }: Props) {
  const router = useRouter();
  const [isManaging, setIsManaging] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  
  // Seat management state
  const [seatCount, setSeatCount] = useState(initialPurchasedSeats);
  const [isUpdatingSeats, setIsUpdatingSeats] = useState(false);
  const [seatError, setSeatError] = useState<string | null>(null);
  
  // Billing frequency state
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>(
    organization.billing_frequency ?? 'monthly'
  );
  const [isUpdatingFrequency, setIsUpdatingFrequency] = useState(false);
  const [frequencyError, setFrequencyError] = useState<string | null>(null);
  const [showFrequencyConfirm, setShowFrequencyConfirm] = useState(false);
  const [pendingFrequency, setPendingFrequency] = useState<BillingFrequency | null>(null);
  
  const isPaused = organization.subscription_status === "paused";
  const hasSixMonthOffer = organization.has_six_month_offer ?? false;
  
  // Calculate pricing based on current frequency
  const currentPricing = PRICING[billingFrequency];
  const pricePerSeat = currentPricing.price;
  
  // PRE-PAID SEATS: Cost is based on purchased seats, not used
  const availableSeats = Math.max(0, seatCount - usedSeats);
  const seatCost = seatCount * pricePerSeat;
  
  // Storage usage comes from the database
  const billableStorageGB = Math.max(0, storageUsedGB - FREE_STORAGE_GB);
  const storageCost = billableStorageGB * STORAGE_PRICE_PER_GB;
  
  // AI usage costs
  const aiCost = (aiUsage?.transcriptionCost ?? 0) + (aiUsage?.summaryCost ?? 0);
  
  const monthlyTotal = seatCost + storageCost + aiCost;
  
  // Mock billing data - in production this would come from Stripe
  const billingCycle = {
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  };

  const handleManageBilling = async () => {
    setIsManaging(true);
    // In production, this would redirect to Stripe Customer Portal
    setTimeout(() => {
      setIsManaging(false);
      alert("Stripe billing portal integration coming soon!");
    }, 1000);
  };

  const handleCancelSubscription = async (data: CancellationData) => {
    // Calculate subscription duration
    const subscriptionDurationDays = Math.floor(
      (Date.now() - subscriptionStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    await submitCancellationFeedback({
      organizationId: organization.id,
      userId,
      primaryReason: data.primaryReason,
      additionalReasons: data.additionalReasons,
      detailedFeedback: data.detailedFeedback || null,
      competitorName: data.competitorName || null,
      wouldReturn: data.wouldReturn,
      returnConditions: data.returnConditions || null,
      agentCount: seatCount,
      monthlyCost: monthlyTotal,
      subscriptionDurationDays,
    });
  };

  const handlePauseAccount = async (months: number, reason: string) => {
    await pauseAccount({
      organizationId: organization.id,
      userId,
      pauseMonths: months,
      reason: reason || null,
    });
  };

  const handleContinueToCancel = () => {
    setShowPauseModal(false);
    setShowCancelModal(true);
  };

  const handleResumeAccount = async () => {
    setIsResuming(true);
    try {
      await resumeAccount({
        organizationId: organization.id,
        userId,
      });
    } catch (error) {
      console.error("Failed to resume account:", error);
    } finally {
      setIsResuming(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Handle seat count changes
  const handleSeatChange = async (newCount: number) => {
    if (newCount < usedSeats) {
      setSeatError(`Cannot reduce below ${usedSeats} (current usage)`);
      return;
    }
    if (newCount < 1) {
      setSeatError("Must have at least 1 seat");
      return;
    }

    setSeatError(null);
    setIsUpdatingSeats(true);

    try {
      const response = await fetch("/api/billing/update-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatCount: newCount }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSeatError(data.error || "Failed to update seats");
        return;
      }

      setSeatCount(newCount);
      router.refresh();
    } catch {
      setSeatError("Failed to update seats");
    } finally {
      setIsUpdatingSeats(false);
    }
  };

  // Handle billing frequency change - show confirmation first
  const handleFrequencyChange = (newFrequency: BillingFrequency) => {
    if (newFrequency === billingFrequency) return;
    setPendingFrequency(newFrequency);
    setShowFrequencyConfirm(true);
  };

  const confirmFrequencyChange = async () => {
    if (!pendingFrequency) return;
    
    setFrequencyError(null);
    setIsUpdatingFrequency(true);

    try {
      const response = await fetch("/api/billing/update-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingFrequency: pendingFrequency }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFrequencyError(data.error || "Failed to update billing frequency");
        return;
      }

      setBillingFrequency(pendingFrequency);
      router.refresh();
    } catch {
      setFrequencyError("Failed to update billing frequency");
    } finally {
      setIsUpdatingFrequency(false);
      setShowFrequencyConfirm(false);
      setPendingFrequency(null);
    }
  };

  const cancelFrequencyChange = () => {
    setShowFrequencyConfirm(false);
    setPendingFrequency(null);
  };

  // Get explanation text for frequency change
  // UNIFIED BILLING MODEL: All seats are on the same billing frequency
  // Changes take effect at renewal - until then, current rate applies to everything
  const getFrequencyChangeExplanation = () => {
    if (!pendingFrequency) return null;
    
    const fromFreq = billingFrequency;
    const toFreq = pendingFrequency;
    const isLosingSixMonth = fromFreq === 'six_month' && toFreq !== 'six_month';
    
    // Calculate costs
    const currentCost = seatCount * PRICING[fromFreq].price;
    const newCost = seatCount * PRICING[toFreq].price;
    const termMonths = toFreq === 'annual' ? 12 : toFreq === 'six_month' ? 6 : 1;
    
    // Common disclosure for all changes
    const commonDisclosure = `Until your current billing term ends, all seats (including any you add) remain at your current ${PRICING[fromFreq].label.toLowerCase()} rate of $${PRICING[fromFreq].price}/seat/mo. At renewal, ALL seats will switch to ${PRICING[toFreq].label.toLowerCase()} billing together.`;
    
    if (fromFreq === 'monthly' && (toFreq === 'annual' || toFreq === 'six_month')) {
      // Upgrading from monthly to annual/6-month
      const upfrontCost = newCost * termMonths;
      return {
        title: `Switch to ${PRICING[toFreq].label} Billing`,
        warning: false,
        losingSixMonth: false,
        disclosure: commonDisclosure,
        bullets: [
          `This change takes effect at your next billing date`,
          `At renewal: You will be charged $${upfrontCost.toLocaleString()} upfront for ${termMonths} months`,
          `New rate: $${PRICING[toFreq].price}/seat/mo (${PRICING[toFreq].discount}% savings vs monthly)`,
          `Until renewal: Any seats you add are charged at $${PRICING[fromFreq].price}/seat (current rate)`,
        ],
        summary: `After renewal: ${seatCount} seats × $${PRICING[toFreq].price} × ${termMonths} months = $${upfrontCost.toLocaleString()}`,
      };
    } else if ((fromFreq === 'annual' || fromFreq === 'six_month') && toFreq === 'monthly') {
      // Downgrading to monthly
      return {
        title: 'Switch to Monthly Billing',
        warning: true,
        losingSixMonth: isLosingSixMonth,
        disclosure: commonDisclosure,
        bullets: [
          `Your current ${PRICING[fromFreq].label.toLowerCase()} term continues until expiration — no refunds`,
          `At renewal: Billing switches to $${PRICING.monthly.price}/seat/mo (monthly)`,
          `Price increase: From $${currentCost.toLocaleString()}/mo to $${newCost.toLocaleString()}/mo`,
          `Until renewal: Any seats you add are charged at $${PRICING[fromFreq].price}/seat (current rate)`,
        ],
        summary: `After renewal: ${seatCount} seats × $${PRICING.monthly.price}/mo = $${newCost.toLocaleString()}/mo`,
      };
    } else if (fromFreq === 'annual' && toFreq === 'six_month') {
      // Annual to 6-month
      const upfrontCost = newCost * 6;
      return {
        title: 'Switch to 6-Month Billing',
        warning: false,
        losingSixMonth: false,
        disclosure: commonDisclosure,
        bullets: [
          `Your current annual term continues until expiration`,
          `At renewal: You will be charged $${upfrontCost.toLocaleString()} for 6 months`,
          `New rate: $${PRICING.six_month.price}/seat/mo (40% savings, best rate)`,
          `Until renewal: Any seats you add are charged at $${PRICING.annual.price}/seat (current rate)`,
        ],
        summary: `After renewal: ${seatCount} seats × $${PRICING.six_month.price} × 6 months = $${upfrontCost.toLocaleString()}`,
      };
    } else if (fromFreq === 'six_month' && toFreq === 'annual') {
      // 6-month to annual (lose 6-month offer)
      const upfrontCost = newCost * 12;
      return {
        title: 'Switch to Annual Billing',
        warning: true,
        losingSixMonth: true,
        disclosure: commonDisclosure,
        bullets: [
          `Your current 6-month term continues until expiration`,
          `At renewal: You will be charged $${upfrontCost.toLocaleString()} for 12 months`,
          `New rate: $${PRICING.annual.price}/seat/mo (35% savings)`,
          `Until renewal: Any seats you add are charged at $${PRICING.six_month.price}/seat (current rate)`,
        ],
        summary: `After renewal: ${seatCount} seats × $${PRICING.annual.price} × 12 months = $${upfrontCost.toLocaleString()}`,
      };
    }
    
    return null;
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>

        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Billing</h1>
            <p className="text-muted-foreground">
              Manage your subscription and payment settings
            </p>
          </div>
        </div>
      </div>

      {/* Current Subscription */}
      <div className="glass rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold mb-1">Your Subscription</h2>
            <p className="text-muted-foreground">
              {seatCount} seat{seatCount !== 1 ? 's' : ''} • {currentPricing.label} billing
              {currentPricing.discount > 0 && (
                <span className="text-green-600 ml-2">({currentPricing.discount}% off)</span>
              )}
            </p>
          </div>
          <button
            onClick={handleManageBilling}
            disabled={isManaging}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <ExternalLink className="w-4 h-4" />
            {isManaging ? "Loading..." : "Manage Billing"}
          </button>
        </div>

        {/* Seat Management */}
        <div className="p-5 rounded-xl bg-muted/30 border border-border mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="font-semibold">Seats</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{usedSeats} in use</span>
              {availableSeats > 0 && (
                <span className="text-green-600">• {availableSeats} available</span>
              )}
            </div>
          </div>

          {/* Seat counter */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  const minSeats = Math.max(1, usedSeats);
                  if (seatCount <= minSeats) {
                    setSeatError(`You have ${usedSeats} seats in use. To reduce below ${usedSeats}, remove agents or revoke invites first.`);
                  } else {
                    handleSeatChange(seatCount - 1);
                  }
                }}
                disabled={isUpdatingSeats}
                className={`w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors ${
                  seatCount <= Math.max(1, usedSeats) ? "opacity-30" : ""
                }`}
              >
                <Minus className="w-5 h-5" />
              </button>
              <div className="w-20 text-center">
                {isUpdatingSeats ? (
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                ) : (
                  <span className="text-4xl font-bold">{seatCount}</span>
                )}
              </div>
              <button
                onClick={() => handleSeatChange(seatCount + 1)}
                disabled={isUpdatingSeats}
                className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">${seatCost.toLocaleString()}<span className="text-base font-normal text-muted-foreground">/mo</span></div>
              <div className="text-sm text-muted-foreground">{seatCount} × ${pricePerSeat}/seat</div>
            </div>
          </div>

          {seatError && (
            <div className="flex items-center gap-2 text-red-500 text-sm mb-4">
              <AlertCircle className="w-4 h-4" />
              {seatError}
            </div>
          )}

          {/* Quick seat buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[1, 2, 3, 5, 10, 20].map((num) => {
              const minSeats = Math.max(1, usedSeats);
              const isBelowMin = num < minSeats;
              const isDisabled = isBelowMin || isUpdatingSeats;
              return (
                <button
                  key={num}
                  onClick={() => {
                    if (isBelowMin) {
                      setSeatError(`You have ${usedSeats} seats in use. To reduce below ${usedSeats}, remove agents or revoke invites first.`);
                    } else {
                      handleSeatChange(num);
                    }
                  }}
                  disabled={isUpdatingSeats}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    seatCount === num
                      ? "bg-primary text-primary-foreground"
                      : isBelowMin
                        ? "bg-muted/50 text-muted-foreground/50"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {num}
                </button>
              );
            })}
          </div>

          {/* Proration note */}
          <p className="text-xs text-muted-foreground">
            <strong>Adding seats:</strong> You&apos;ll be charged a prorated amount for the remainder of this billing period.{" "}
            <strong>Reducing seats:</strong> Takes effect immediately; credit applied to your next invoice.
          </p>
        </div>

        {/* Billing Frequency Toggle */}
        <div className="p-5 rounded-xl bg-muted/30 border border-border mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="font-semibold">Billing Frequency</span>
          </div>

          <div className="space-y-2">
            {/* Monthly option */}
            <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
              billingFrequency === 'monthly' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}>
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="billing"
                  checked={billingFrequency === 'monthly'}
                  onChange={() => handleFrequencyChange('monthly')}
                  disabled={isUpdatingFrequency}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  billingFrequency === 'monthly' ? 'border-primary bg-primary' : 'border-muted-foreground'
                }`}>
                  {billingFrequency === 'monthly' && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <div>
                  <div className="font-medium">Monthly</div>
                  <div className="text-sm text-muted-foreground">Pay month-to-month, cancel anytime</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">${PRICING.monthly.price}/seat</div>
              </div>
            </label>

            {/* Annual option */}
            <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
              billingFrequency === 'annual' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}>
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="billing"
                  checked={billingFrequency === 'annual'}
                  onChange={() => handleFrequencyChange('annual')}
                  disabled={isUpdatingFrequency}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  billingFrequency === 'annual' ? 'border-primary bg-primary' : 'border-muted-foreground'
                }`}>
                  {billingFrequency === 'annual' && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    Annual
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-600">Save 35%</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Billed yearly, best value</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">${PRICING.annual.price}/seat</div>
                <div className="text-xs text-muted-foreground line-through">${PRICING.monthly.price}</div>
              </div>
            </label>

            {/* 6-Month option - only if they have the offer */}
            {(hasSixMonthOffer || billingFrequency === 'six_month') && (
              <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                billingFrequency === 'six_month' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="billing"
                    checked={billingFrequency === 'six_month'}
                    onChange={() => handleFrequencyChange('six_month')}
                    disabled={isUpdatingFrequency}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    billingFrequency === 'six_month' ? 'border-primary bg-primary' : 'border-muted-foreground'
                  }`}>
                    {billingFrequency === 'six_month' && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      6-Month
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600">Save 40%</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600">Special Offer</span>
                    </div>
                    <div className="text-sm text-muted-foreground">Billed every 6 months</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">${PRICING.six_month.price}/seat</div>
                  <div className="text-xs text-muted-foreground line-through">${PRICING.monthly.price}</div>
                </div>
              </label>
            )}
          </div>

          {frequencyError && (
            <div className="flex items-center gap-2 text-red-500 text-sm mt-4">
              <AlertCircle className="w-4 h-4" />
              {frequencyError}
            </div>
          )}

          {isUpdatingFrequency && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm mt-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Updating billing frequency...
            </div>
          )}

          {/* Explanation note */}
          <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm font-medium mb-2">How billing frequency changes work:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <strong>Changes take effect at renewal</strong> — your current term continues as-is</li>
              <li>• <strong>All seats switch together</strong> — no mixing of billing frequencies</li>
              <li>• <strong>Seats added before renewal</strong> are charged at your current rate</li>
              <li>• <strong>No refunds</strong> for unused time on annual or 6-month plans</li>
            </ul>
          </div>
        </div>

        {/* Storage + Other sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          
          {/* Recording Storage */}
          <div className="p-5 rounded-xl bg-muted/30 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <Video className="w-4 h-4" />
              <span className="text-sm font-medium">Recording Storage</span>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-bold">{storageUsedGB.toFixed(1)}</span>
              <span className="text-muted-foreground">GB used</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {FREE_STORAGE_GB} GB free included
              </span>
              <span className="font-semibold">
                {billableStorageGB > 0 
                  ? `$${storageCost.toFixed(2)}/mo`
                  : "Free"
                }
              </span>
            </div>
            {/* Storage bar */}
            <div className="mt-3">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    storageUsedGB > FREE_STORAGE_GB ? "bg-amber-500" : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(100, (storageUsedGB / (FREE_STORAGE_GB * 2)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0 GB</span>
                <span className="text-green-500">{FREE_STORAGE_GB} GB free</span>
                <span>{FREE_STORAGE_GB * 2} GB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Total */}
        <div className="p-5 rounded-xl bg-primary/5 border border-primary/20 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Monthly Total</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Agents + Storage + AI Usage
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">
                ${monthlyTotal.toLocaleString()}
                <span className="text-lg font-normal text-primary/70">/mo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Period */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-border">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1">
            <div className="text-sm font-medium">Current Billing Period</div>
            <div className="text-sm text-muted-foreground">
              {formatDate(billingCycle.start)} – {formatDate(billingCycle.end)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">Next Invoice</div>
            <div className="text-sm text-muted-foreground">
              ~${monthlyTotal.toLocaleString()} on {formatDate(billingCycle.end)}
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Details */}
      <div className="glass rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-amber-500" />
          Pricing Details
        </h2>
        
        <div className="space-y-4">
          {/* Seat pricing */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/20">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium">Team Seats</h3>
                <span className="text-lg font-bold">${pricePerSeat}<span className="text-sm font-normal text-muted-foreground">/seat/mo</span></span>
              </div>
              <p className="text-sm text-muted-foreground">
                You have {seatCount} seats. Add team members using available seats at no extra cost.
              </p>
            </div>
          </div>
          
          {/* Storage pricing */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/20">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <HardDrive className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium">Recording Storage</h3>
                <span className="text-lg font-bold">${STORAGE_PRICE_PER_GB.toFixed(2)}<span className="text-sm font-normal text-muted-foreground">/GB/mo</span></span>
              </div>
              <p className="text-sm text-muted-foreground">
                First {FREE_STORAGE_GB} GB free. Additional storage billed at ${STORAGE_PRICE_PER_GB.toFixed(2)} per GB per month.
              </p>
            </div>
          </div>
          
          {/* AI Transcription pricing */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/20">
            <div className="p-2 rounded-lg bg-green-500/10">
              <FileText className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium">Call Transcription</h3>
                <span className="text-lg font-bold">$0.01<span className="text-sm font-normal text-muted-foreground">/min</span></span>
              </div>
              <p className="text-sm text-muted-foreground">
                Automatic audio-to-text transcription for recorded calls.
              </p>
              {aiUsage && aiUsage.transcriptionMinutes > 0 && (
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">This period: </span>
                  <span className="font-medium">{aiUsage.transcriptionMinutes.toFixed(1)} min</span>
                  <span className="text-muted-foreground"> = </span>
                  <span className="font-medium text-green-500">${aiUsage.transcriptionCost.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* AI Summary pricing */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/20">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Sparkles className="w-5 h-5 text-purple-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium">AI Call Summary</h3>
                <span className="text-lg font-bold">$0.02<span className="text-sm font-normal text-muted-foreground">/min</span></span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-generated summaries from call transcriptions.
              </p>
              {aiUsage && aiUsage.summaryMinutes > 0 && (
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">This period: </span>
                  <span className="font-medium">{aiUsage.summaryMinutes.toFixed(1)} min</span>
                  <span className="text-muted-foreground"> = </span>
                  <span className="font-medium text-purple-500">${aiUsage.summaryCost.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Paused Account Banner */}
      {isPaused && organization.pause_ends_at && (
        <div className="p-6 rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                <Snowflake className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-600 mb-1">Account Paused</h3>
                <p className="text-sm text-muted-foreground max-w-lg">
                  Your account is paused — no charges while you&apos;re away. All your recordings, settings, and 
                  agent configurations are safely preserved. Your subscription will automatically resume on{" "}
                  <span className="font-medium text-foreground">
                    {new Date(organization.pause_ends_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>.
                </p>
              </div>
            </div>
            <button
              onClick={handleResumeAccount}
              disabled={isResuming}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-50 flex-shrink-0"
            >
              <PlayCircle className="w-4 h-4" />
              {isResuming ? "Resuming..." : "Resume Now"}
            </button>
          </div>
        </div>
      )}

      {/* Cancel Subscription */}
      {!isPaused && (
        <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-xl bg-red-500/10">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-red-600 mb-1">Cancel Subscription</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  If you need to cancel, we&apos;d love to understand why so we can improve. 
                  Your feedback helps us build a better product.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPauseModal(true)}
              className="px-4 py-2 rounded-lg border border-red-500/30 text-red-600 hover:bg-red-500/10 text-sm font-medium transition-colors"
            >
              Cancel Subscription
            </button>
          </div>
        </div>
      )}

      {/* Billing Frequency Change Confirmation Modal */}
      {showFrequencyConfirm && pendingFrequency && (() => {
        const explanation = getFrequencyChangeExplanation();
        if (!explanation) return null;
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={cancelFrequencyChange} />
            <div className="relative bg-background rounded-2xl p-6 max-w-lg w-full border border-border shadow-2xl my-8">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-full ${explanation.warning ? 'bg-amber-500/20' : 'bg-green-500/20'}`}>
                  {explanation.warning ? (
                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                  ) : (
                    <Check className="w-6 h-6 text-green-500" />
                  )}
                </div>
                <h3 className="text-lg font-semibold">{explanation.title}</h3>
              </div>
              
              {/* What will happen */}
              <div className="space-y-3 mb-4">
                <p className="text-sm font-medium">What will happen:</p>
                <ul className="space-y-2">
                  {explanation.bullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Summary box */}
              {'summary' in explanation && explanation.summary && (
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mb-4">
                  <p className="text-sm font-medium text-primary">{explanation.summary}</p>
                </div>
              )}

              {/* 6-month warning */}
              {explanation.losingSixMonth && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-4">
                  <p className="text-sm text-amber-600">
                    <strong>⚠️ Permanent Change:</strong> The 6-month rate (40% off) was a one-time signup offer. 
                    If you switch away, you cannot get this discount back.
                  </p>
                </div>
              )}

              {/* Unified billing disclosure */}
              {'disclosure' in explanation && explanation.disclosure && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border mb-6">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>Billing Terms:</strong> {explanation.disclosure}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={cancelFrequencyChange}
                  disabled={isUpdatingFrequency}
                  className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmFrequencyChange}
                  disabled={isUpdatingFrequency}
                  className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                    explanation.warning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-primary hover:bg-primary/90'
                  }`}
                >
                  {isUpdatingFrequency ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    `Confirm Change`
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Pause Account Modal (shown first as downsell) */}
      <PauseAccountModal
        isOpen={showPauseModal}
        onClose={() => setShowPauseModal(false)}
        onPause={handlePauseAccount}
        onContinueToCancel={handleContinueToCancel}
        organizationName={organization.name}
        agentCount={seatCount}
        monthlyTotal={monthlyTotal}
      />

      {/* Cancel Subscription Modal */}
      <CancelSubscriptionModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onSubmit={handleCancelSubscription}
        organizationName={organization.name}
        agentCount={seatCount}
        monthlyTotal={monthlyTotal}
      />
    </div>
  );
}

