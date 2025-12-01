"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const COMPLIANCE_TEXT = "Try it free for a full 7 days! If you love it, do nothing—you will automatically be charged $297 per seat on that date and every month thereafter until you cancel. Cancel auto-renewing charges by logging into your account under \"billing settings\" before your billing date. Cancel for any reason without having to talk to a human.";

export function CostCalculator() {
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
              min="1"
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
              max="80"
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
          <div className="flex flex-col items-center">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 bg-primary text-primary-foreground px-10 py-5 rounded-full font-semibold text-xl hover:bg-primary/90 transition-colors hover:shadow-2xl hover:shadow-primary/30"
            >
              Start Free 7-Day Trial
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Link>
            <p className="text-xs text-muted-foreground mt-3 max-w-md text-center leading-relaxed">
              {COMPLIANCE_TEXT}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

