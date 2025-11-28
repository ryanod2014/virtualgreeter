"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  Users,
  Check,
  Zap,
  TrendingUp,
  Calendar,
  Receipt,
  HardDrive,
  Video,
  ExternalLink,
  AlertTriangle,
  Snowflake,
  PlayCircle,
} from "lucide-react";
import type { Organization } from "@ghost-greeter/domain/database.types";
import { CancelSubscriptionModal, type CancellationData } from "./cancel-subscription-modal";
import { PauseAccountModal } from "./pause-account-modal";
import { submitCancellationFeedback, pauseAccount, resumeAccount } from "./actions";

interface Props {
  organization: Organization;
  agentCount: number;
  storageUsedGB: number;
  userId: string;
  subscriptionStartDate: Date;
}

// Flat rate pricing
const BASE_SUBSCRIPTION = 297; // Minimum $297/mo includes 1 seat
const PRICE_PER_SEAT = 297;
const STORAGE_PRICE_PER_GB = 0.50;
const FREE_STORAGE_GB = 10;
const INCLUDED_SEATS = 1;

export function BillingSettingsClient({ organization, agentCount, storageUsedGB, userId, subscriptionStartDate }: Props) {
  const [isManaging, setIsManaging] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  
  const isPaused = organization.subscription_status === "paused";
  
  // Calculate costs - base subscription + additional seats
  const additionalSeats = Math.max(0, agentCount - INCLUDED_SEATS);
  const agentCost = BASE_SUBSCRIPTION + (additionalSeats * PRICE_PER_SEAT);
  
  // Storage usage comes from the database
  const billableStorageGB = Math.max(0, storageUsedGB - FREE_STORAGE_GB);
  const storageCost = billableStorageGB * STORAGE_PRICE_PER_GB;
  
  const monthlyTotal = agentCost + storageCost;
  
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
      agentCount,
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
              Simple flat-rate pricing • Billed monthly
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

        {/* Pricing Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Agent Pricing */}
          <div className="p-5 rounded-xl bg-muted/30 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Team Seats</span>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-bold">{agentCount}</span>
              <span className="text-muted-foreground">agent{agentCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="text-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Base (1 seat included)</span>
                <span className="font-medium">${BASE_SUBSCRIPTION}/mo</span>
              </div>
              {additionalSeats > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {additionalSeats} additional × ${PRICE_PER_SEAT}/mo
                  </span>
                  <span className="font-medium">${(additionalSeats * PRICE_PER_SEAT).toLocaleString()}/mo</span>
                </div>
              )}
              <hr className="border-border my-1" />
              <div className="flex items-center justify-between font-semibold">
                <span>Total</span>
                <span>${agentCost.toLocaleString()}/mo</span>
              </div>
            </div>
          </div>
          
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
                Agents + Recording Storage
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
          {/* Agent pricing */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/20">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium">Agent Seats</h3>
                <span className="text-lg font-bold">${PRICE_PER_SEAT}<span className="text-sm font-normal text-muted-foreground">/agent/mo</span></span>
              </div>
              <p className="text-sm text-muted-foreground">
                Flat rate per agent. Add or remove agents anytime — billing adjusts automatically.
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
        </div>
      </div>

      {/* What's Included */}
      <div className="glass rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Check className="w-5 h-5 text-green-500" />
          What&apos;s Included
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            "Unlimited video calls",
            "Custom branding",
            "Advanced analytics",
            "Agent pools & routing",
            "Call recording",
            "Priority support",
            "API access",
            "Custom dispositions",
            "Real-time notifications",
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* How Billing Works */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 mb-6">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium mb-2">How Billing Works</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>${PRICE_PER_SEAT}/month per agent</strong> — simple, predictable pricing</li>
              <li>• Add or remove agents anytime — billing adjusts automatically</li>
              <li>• Agents added mid-cycle are prorated to your next invoice</li>
              <li>• {FREE_STORAGE_GB} GB recording storage included free, then ${STORAGE_PRICE_PER_GB.toFixed(2)}/GB</li>
              <li>• All features included — no tiers or hidden fees</li>
            </ul>
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

      {/* Pause Account Modal (shown first as downsell) */}
      <PauseAccountModal
        isOpen={showPauseModal}
        onClose={() => setShowPauseModal(false)}
        onPause={handlePauseAccount}
        onContinueToCancel={handleContinueToCancel}
        organizationName={organization.name}
        agentCount={agentCount}
        monthlyTotal={monthlyTotal}
      />

      {/* Cancel Subscription Modal */}
      <CancelSubscriptionModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onSubmit={handleCancelSubscription}
        organizationName={organization.name}
        agentCount={agentCount}
        monthlyTotal={monthlyTotal}
      />
    </div>
  );
}

