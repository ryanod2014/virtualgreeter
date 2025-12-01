"use client";

import { useState } from "react";
import {
  Settings,
  Layers,
  Users,
  Video,
  FileText,
  Sparkles,
  BarChart3,
  Target,
  Zap,
  Globe,
  Shield,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

// Feature carousel data
const FEATURES = [
  {
    icon: Settings,
    title: "Customize Everything",
    description: "Control the look, pages it shows on, and which leads it blocks. Your brand, your rules.",
  },
  {
    icon: Layers,
    title: "Only Shows When Available",
    description: "Widget only shows when agents are active. No disappointed visitors, no missed opportunities.",
  },
  {
    icon: Users,
    title: "Assign Reps to Pages",
    description: "Your closer on pricing, your SDR on the blog. Right rep, right page, right conversation.",
  },
  {
    icon: Video,
    title: "Record Every Call",
    description: "Never miss a word. Review calls for training, quality control, or settling disputes.",
  },
  {
    icon: FileText,
    title: "Auto-Transcribe Conversations",
    description: "Every call transcribed automatically. Searchable, shareable, ready for your CRM.",
  },
  {
    icon: Sparkles,
    title: "AI Call Summaries",
    description: "AI reads the transcript and writes the summary. Know what happened in 10 seconds flat.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description: "See who's calling, when they're calling, and what's converting. Data that drives decisions.",
  },
  {
    icon: Target,
    title: "Custom Dispositions",
    description: "Tag calls your way—qualified, booked, nurture, junk. Your pipeline, organized instantly.",
  },
  {
    icon: Zap,
    title: "Facebook Pixel Integration",
    description: "Fire your pixel on call outcomes. Feed the algorithm the signals it craves.",
  },
  {
    icon: Globe,
    title: "Block Countries",
    description: "Only serve the markets you want. No more wasting time on leads you can't help.",
  },
  {
    icon: Shield,
    title: "Spam Protection",
    description: "Built-in filters keep the trolls out. Your team talks to real prospects, not bots.",
  },
];

export function FeatureCarousel() {
  const [startIndex, setStartIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const visibleCount = 4;
  const canScrollUp = startIndex > 0;
  const canScrollDown = startIndex < FEATURES.length - visibleCount;

  const visibleFeatures = FEATURES.slice(startIndex, startIndex + visibleCount);

  const handleScroll = (dir: 'up' | 'down') => {
    if (isAnimating) return;
    setDirection(dir);
    setIsAnimating(true);
    
    setTimeout(() => {
      if (dir === 'up') {
        setStartIndex((prev) => Math.max(0, prev - visibleCount));
      } else {
        setStartIndex((prev) => Math.min(FEATURES.length - visibleCount, prev + visibleCount));
      }
      setTimeout(() => {
        setIsAnimating(false);
        setDirection(null);
      }, 50);
    }, 150);
  };

  return (
    <div className="space-y-3">
      {/* Features list */}
      <div className={`space-y-3 transition-transform duration-300 ${
        isAnimating && direction === 'down' ? 'translate-y-[-8px] opacity-80' : 
        isAnimating && direction === 'up' ? 'translate-y-[8px] opacity-80' : 
        'translate-y-0 opacity-100'
      }`}
      style={{ 
        transition: isAnimating 
          ? 'transform 0.15s ease-out, opacity 0.15s ease-out' 
          : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out'
      }}>
        {visibleFeatures.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <div 
              key={`${feature.title}-${startIndex}`}
              className="bg-muted/30 border border-border/50 rounded-xl p-5 hover:border-primary/30 hover:bg-muted/50 transition-colors group"
              style={{
                animationDelay: `${idx * 50}ms`
              }}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-base text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mt-1">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-muted-foreground">
          {startIndex + 1}-{Math.min(startIndex + visibleCount, FEATURES.length)} of {FEATURES.length}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">See more features.</span>
          <button
            onClick={() => canScrollUp && handleScroll('up')}
            disabled={!canScrollUp}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              canScrollUp 
                ? 'bg-muted/50 hover:bg-primary/20 hover:scale-110 text-foreground cursor-pointer active:scale-95' 
                : 'text-muted-foreground/30 cursor-not-allowed'
            }`}
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => canScrollDown && handleScroll('down')}
            disabled={!canScrollDown}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              canScrollDown 
                ? 'bg-muted/50 hover:bg-primary/20 hover:scale-110 text-foreground cursor-pointer active:scale-95' 
                : 'text-muted-foreground/30 cursor-not-allowed'
            }`}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

