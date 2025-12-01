"use client";

import { useEffect, useRef, useState, ReactNode } from "react";

type AnimationType = 
  | "fade-up"
  | "fade-down" 
  | "fade-left"
  | "fade-right"
  | "scale-up"
  | "scale-down"
  | "blur-in"
  | "slide-up"
  | "bounce-in";

interface AnimateOnScrollProps {
  children: ReactNode;
  animation?: AnimationType;
  delay?: number; // in ms
  duration?: number; // in ms
  threshold?: number;
  className?: string;
  once?: boolean; // only animate once
  stagger?: number; // stagger delay for children (in ms)
}

const animationClasses: Record<AnimationType, { initial: string; animated: string }> = {
  "fade-up": {
    initial: "opacity-0 translate-y-8",
    animated: "opacity-100 translate-y-0",
  },
  "fade-down": {
    initial: "opacity-0 -translate-y-8",
    animated: "opacity-100 translate-y-0",
  },
  "fade-left": {
    initial: "opacity-0 translate-x-8",
    animated: "opacity-100 translate-x-0",
  },
  "fade-right": {
    initial: "opacity-0 -translate-x-8",
    animated: "opacity-100 translate-x-0",
  },
  "scale-up": {
    initial: "opacity-0 scale-95",
    animated: "opacity-100 scale-100",
  },
  "scale-down": {
    initial: "opacity-0 scale-105",
    animated: "opacity-100 scale-100",
  },
  "blur-in": {
    initial: "opacity-0 blur-sm",
    animated: "opacity-100 blur-0",
  },
  "slide-up": {
    initial: "opacity-0 translate-y-12",
    animated: "opacity-100 translate-y-0",
  },
  "bounce-in": {
    initial: "opacity-0 scale-90",
    animated: "opacity-100 scale-100",
  },
};

export function AnimateOnScroll({
  children,
  animation = "fade-up",
  delay = 0,
  duration = 600,
  threshold = 0.1,
  className = "",
  once = true,
}: AnimateOnScrollProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            observer.disconnect();
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [once, threshold]);

  const { initial, animated } = animationClasses[animation];

  return (
    <div
      ref={ref}
      className={`transition-all ease-out ${className} ${isVisible ? animated : initial}`}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// Stagger wrapper for animating multiple children
interface StaggerContainerProps {
  children: ReactNode;
  animation?: AnimationType;
  staggerDelay?: number;
  baseDelay?: number;
  duration?: number;
  className?: string;
}

export function StaggerContainer({
  children,
  animation = "fade-up",
  staggerDelay = 100,
  baseDelay = 0,
  duration = 500,
  className = "",
}: StaggerContainerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { initial, animated } = animationClasses[animation];

  return (
    <div ref={ref} className={className}>
      {Array.isArray(children)
        ? children.map((child, index) => (
            <div
              key={index}
              className={`transition-all ease-out ${isVisible ? animated : initial}`}
              style={{
                transitionDuration: `${duration}ms`,
                transitionDelay: `${baseDelay + index * staggerDelay}ms`,
              }}
            >
              {child}
            </div>
          ))
        : children}
    </div>
  );
}

// Hero text animation with character/word reveal
interface TextRevealProps {
  text: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  delay?: number;
  staggerDelay?: number;
}

export function TextReveal({
  text,
  as: Component = "span",
  className = "",
  delay = 0,
  staggerDelay = 30,
}: TextRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const words = text.split(" ");

  return (
    <Component ref={ref as any} className={`inline ${className}`}>
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-block overflow-hidden">
          <span
            className={`inline-block transition-transform duration-500 ease-out ${
              isVisible ? "translate-y-0" : "translate-y-full"
            }`}
            style={{
              transitionDelay: `${delay + wordIndex * staggerDelay}ms`,
            }}
          >
            {word}
            {wordIndex < words.length - 1 ? "\u00A0" : ""}
          </span>
        </span>
      ))}
    </Component>
  );
}

// Counter animation for stats
interface CountUpProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function CountUp({
  end,
  duration = 2000,
  prefix = "",
  suffix = "",
  className = "",
}: CountUpProps) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setCount(end);
      return;
    }

    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [isVisible, end, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

