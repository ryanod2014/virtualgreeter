"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Monitor, Smartphone, ArrowRight, Sparkles, Mail, Copy, Check } from "lucide-react";
import { Logo } from "@/lib/components/logo";

export default function MobileGatePage() {
  const [copied, setCopied] = useState(false);
  const [dashboardUrl, setDashboardUrl] = useState("");
  const [canShare, setCanShare] = useState(false);

  const handleCopyLink = () => {
    if (!dashboardUrl) return;
    navigator.clipboard.writeText(dashboardUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLink = async () => {
    if (!dashboardUrl) return;
    
    const shareData = {
      title: "Your GreetNow Dashboard Link",
      text: "Here's your link to access GreetNow on desktop:",
      url: dashboardUrl,
    };

    // Try Web Share API first (works great on mobile)
    if (navigator.share && canShare) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // User cancelled or share failed, fall through to mailto
        if ((err as Error).name === "AbortError") return;
      }
    }

    // Fallback to mailto
    const subject = encodeURIComponent("Your GreetNow Dashboard Link");
    const body = encodeURIComponent(`Here's your link to access GreetNow on desktop:\n\n${dashboardUrl}\n\nOpen this link on your computer to start using GreetNow.`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Set dashboard URL on client side and check share capability
  useEffect(() => {
    const url = `${window.location.origin}/dashboard`;
    setDashboardUrl(url);
    
    // Check if Web Share API is available
    setCanShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  // Prevent accidental navigation back
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <div className="min-h-screen bg-background dark relative overflow-hidden flex items-center justify-center p-6">
      {/* Background effects - matching landing page */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="glow-orb w-[500px] h-[500px] -top-[200px] left-1/2 -translate-x-1/2 bg-primary/20" />
        <div className="glow-orb w-[300px] h-[300px] top-[60%] -left-[100px] bg-purple-600/15" />
        <div className="glow-orb w-[250px] h-[250px] top-[30%] -right-[80px] bg-fuchsia-600/10" />
      </div>

      {/* Grid pattern */}
      <div className="fixed inset-0 grid-pattern pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8 animate-initial animate-entrance-fade-down delay-100">
          <Logo size="lg" />
        </div>

        {/* Main card */}
        <div className="relative backdrop-blur-sm bg-white/[0.03] border border-white/10 rounded-3xl p-8 shadow-2xl animate-initial animate-entrance-fade-up delay-200">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <Monitor className="w-10 h-10 text-primary" />
                </div>
                {/* Phone with X */}
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            </div>

            {/* Badge */}
            <div className="flex justify-center mb-4">
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 shine-effect">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  Desktop Required
                </span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-center mb-3">
              Switch to Desktop
            </h1>

            {/* Description */}
            <p className="text-muted-foreground text-center mb-6 leading-relaxed">
              GreetNow is designed for <span className="text-white font-medium">desktop browsers</span> to give you the best experience for live video sales.
            </p>

            {/* Instructions */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 mb-6">
              <p className="text-sm text-slate-400 mb-4 text-center">
                Open this app on your computer to:
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm text-slate-300">Greet visitors with live video</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm text-slate-300">View and manage your dashboard</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm text-slate-300">Configure your widget settings</span>
                </li>
              </ul>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              {/* Copy link button */}
              <button
                onClick={handleCopyLink}
                className="w-full group flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3.5 rounded-full font-semibold hover:bg-primary/90 transition-all hover:shadow-xl hover:shadow-primary/30"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5" />
                    Link Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copy Link to Open on Desktop
                  </>
                )}
              </button>

              {/* Share/Email link button */}
              <button
                onClick={handleShareLink}
                disabled={!dashboardUrl}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white px-6 py-3.5 rounded-full font-medium hover:bg-slate-700 transition-colors border border-slate-700 disabled:bg-slate-800/50 disabled:text-white/50 disabled:cursor-not-allowed"
              >
                <Mail className="w-5 h-5" />
                {canShare ? "Share Link" : "Email Link to Myself"}
              </button>
            </div>

            {/* URL display */}
            <div className="mt-6 p-3 bg-slate-900/70 border border-slate-800 rounded-lg">
              <p className="text-xs text-slate-500 mb-1 text-center">Your dashboard URL:</p>
              <p className="text-sm text-primary font-mono text-center break-all">
                {dashboardUrl || "Loading..."}
              </p>
            </div>
          </div>
        </div>

        {/* Back to homepage link */}
        <div className="mt-6 text-center animate-initial animate-entrance-fade-up delay-300">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Back to homepage
          </Link>
        </div>

        {/* Footer note */}
        <p className="mt-8 text-xs text-center text-slate-600 animate-initial animate-entrance-fade-up delay-400">
          GreetNow works best on Chrome, Firefox, Safari, or Edge on a desktop or laptop computer.
        </p>
      </div>
    </div>
  );
}

