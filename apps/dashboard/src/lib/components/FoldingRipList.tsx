"use client";

import { useEffect, useRef, useState } from "react";
import { PhoneOff, X, MessageSquareX, Clock, Ghost } from "lucide-react";

const ripItems = [
  { icon: PhoneOff, text: "Unknown number ignored" },
  { icon: X, text: '"Scam Likely"' },
  { icon: MessageSquareX, text: "Voicemail deleted" },
  { icon: Clock, text: "Interest cooled off" },
  { icon: Ghost, text: "Do Not Disturb mode" },
];

export function FoldingRipList() {
  const [animationState, setAnimationState] = useState<'pending' | 'ready' | 'animated'>('pending');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    // Check for reduced motion preference or slow connection - show immediately
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = (navigator as any).connection;
    const isSlowConnection = connection && (connection.saveData || connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g');
    
    if (prefersReducedMotion || isSlowConnection) {
      setAnimationState('animated');
      return;
    }

    // Mark as ready for animation (items will be hidden)
    setAnimationState('ready');

    // Check if already in viewport - animate immediately
    const rect = element.getBoundingClientRect();
    if (rect.top < window.innerHeight + 100 && rect.bottom > 0) {
      // Small delay to ensure CSS transition is ready
      requestAnimationFrame(() => {
        setAnimationState('animated');
      });
      return;
    }

    // Set up scroll observer
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimationState('animated');
          observer.disconnect();
        }
      },
      { 
        threshold: 0,
        rootMargin: "50px 0px"
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // pending = SSR/initial (show visible for no-JS fallback)
  // ready = JS loaded, waiting for scroll (hide items)
  // animated = trigger animation (show with swing)
  const showVisible = animationState !== 'ready';

  return (
    <div ref={containerRef} className="fold-container space-y-2 text-left">
      {ripItems.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className={`fold-item fold-delay-${idx + 1} flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 ${
              showVisible ? "visible" : ""
            }`}
          >
            <Icon className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-xs text-red-400">{item.text}</span>
          </div>
        );
      })}
    </div>
  );
}

