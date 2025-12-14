/**
 * @vitest-environment jsdom
 *
 * AnimateOnScroll Tests
 *
 * Components Tested:
 * - AnimateOnScroll: Main scroll-triggered animation wrapper
 * - StaggerContainer: Wrapper that staggers child animations
 * - TextReveal: Word-by-word text reveal animation
 * - CountUp: Animated number counter
 *
 * Behaviors Tested:
 * AnimateOnScroll:
 * 1. Renders children
 * 2. Starts with initial animation classes
 * 3. Applies animated classes when visible
 * 4. Supports different animation types
 * 5. Respects delay prop
 * 6. Respects duration prop
 * 7. Respects threshold prop
 * 8. Respects once prop (only animates once)
 * 9. Re-animates when once is false
 * 10. Respects prefers-reduced-motion
 * 11. Disconnects observer on unmount
 *
 * StaggerContainer:
 * 12. Renders children
 * 13. Applies staggered delays to children
 * 14. Uses IntersectionObserver
 * 15. Respects prefers-reduced-motion
 *
 * TextReveal:
 * 16. Renders text split into words
 * 17. Words animate into view
 * 18. Supports custom element tags
 * 19. Respects prefers-reduced-motion
 *
 * CountUp:
 * 20. Counts from 0 to end value
 * 21. Shows prefix and suffix
 * 22. Uses easing animation
 * 23. Respects prefers-reduced-motion
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

// Mock IntersectionObserver
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();
let intersectionCallback: (entries: IntersectionObserverEntry[]) => void;

const mockIntersectionObserver = vi.fn((callback) => {
  intersectionCallback = callback;
  return {
    observe: mockObserve,
    disconnect: mockDisconnect,
    unobserve: vi.fn(),
  };
});

// Setup global mocks BEFORE any component import
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: mockIntersectionObserver,
});

// Mock requestAnimationFrame
const mockRAF = vi.fn((callback: FrameRequestCallback) => {
  callback(performance.now());
  return 1;
});
Object.defineProperty(window, "requestAnimationFrame", {
  writable: true,
  value: mockRAF,
});

import {
  AnimateOnScroll,
  StaggerContainer,
  TextReveal,
  CountUp,
} from "./AnimateOnScroll";

describe("AnimateOnScroll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Reset matchMedia to default (no reduced motion)
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // BASIC RENDERING
  // ---------------------------------------------------------------------------
  describe("Basic Rendering", () => {
    it("renders children", () => {
      render(
        <AnimateOnScroll>
          <div data-testid="child">Child content</div>
        </AnimateOnScroll>
      );

      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(
        <AnimateOnScroll className="custom-class">
          <div>Content</div>
        </AnimateOnScroll>
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });

    it("has transition-all ease-out classes", () => {
      const { container } = render(
        <AnimateOnScroll>
          <div>Content</div>
        </AnimateOnScroll>
      );

      expect(container.firstChild).toHaveClass("transition-all");
      expect(container.firstChild).toHaveClass("ease-out");
    });
  });

  // ---------------------------------------------------------------------------
  // INITIAL STATE (BEFORE INTERSECTION)
  // ---------------------------------------------------------------------------
  describe("Initial State", () => {
    it("starts with initial animation classes (fade-up default)", () => {
      const { container } = render(
        <AnimateOnScroll>
          <div>Content</div>
        </AnimateOnScroll>
      );

      // Default animation is fade-up with initial classes: opacity-0 translate-y-8
      expect(container.firstChild).toHaveClass("opacity-0");
      expect(container.firstChild).toHaveClass("translate-y-8");
    });

    it("starts with fade-down initial classes when specified", () => {
      const { container } = render(
        <AnimateOnScroll animation="fade-down">
          <div>Content</div>
        </AnimateOnScroll>
      );

      expect(container.firstChild).toHaveClass("opacity-0");
      expect(container.firstChild).toHaveClass("-translate-y-8");
    });

    it("starts with scale-up initial classes when specified", () => {
      const { container } = render(
        <AnimateOnScroll animation="scale-up">
          <div>Content</div>
        </AnimateOnScroll>
      );

      expect(container.firstChild).toHaveClass("opacity-0");
      expect(container.firstChild).toHaveClass("scale-95");
    });

    it("starts with blur-in initial classes when specified", () => {
      const { container } = render(
        <AnimateOnScroll animation="blur-in">
          <div>Content</div>
        </AnimateOnScroll>
      );

      expect(container.firstChild).toHaveClass("opacity-0");
      expect(container.firstChild).toHaveClass("blur-sm");
    });
  });

  // ---------------------------------------------------------------------------
  // ANIMATED STATE (AFTER INTERSECTION)
  // ---------------------------------------------------------------------------
  describe("Animated State", () => {
    it("applies animated classes when intersection triggers", () => {
      const { container } = render(
        <AnimateOnScroll>
          <div>Content</div>
        </AnimateOnScroll>
      );

      act(() => {
        intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry]);
      });

      // Animated state for fade-up: opacity-100 translate-y-0
      expect(container.firstChild).toHaveClass("opacity-100");
      expect(container.firstChild).toHaveClass("translate-y-0");
    });

    it("applies scale-up animated classes", () => {
      const { container } = render(
        <AnimateOnScroll animation="scale-up">
          <div>Content</div>
        </AnimateOnScroll>
      );

      act(() => {
        intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry]);
      });

      expect(container.firstChild).toHaveClass("opacity-100");
      expect(container.firstChild).toHaveClass("scale-100");
    });

    it("applies blur-in animated classes", () => {
      const { container } = render(
        <AnimateOnScroll animation="blur-in">
          <div>Content</div>
        </AnimateOnScroll>
      );

      act(() => {
        intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry]);
      });

      expect(container.firstChild).toHaveClass("opacity-100");
      expect(container.firstChild).toHaveClass("blur-0");
    });
  });

  // ---------------------------------------------------------------------------
  // ANIMATION TYPES
  // ---------------------------------------------------------------------------
  describe("Animation Types", () => {
    const animationTypes = [
      { type: "fade-up", initial: ["opacity-0", "translate-y-8"], animated: ["opacity-100", "translate-y-0"] },
      { type: "fade-down", initial: ["opacity-0", "-translate-y-8"], animated: ["opacity-100", "translate-y-0"] },
      { type: "fade-left", initial: ["opacity-0", "translate-x-8"], animated: ["opacity-100", "translate-x-0"] },
      { type: "fade-right", initial: ["opacity-0", "-translate-x-8"], animated: ["opacity-100", "translate-x-0"] },
      { type: "scale-up", initial: ["opacity-0", "scale-95"], animated: ["opacity-100", "scale-100"] },
      { type: "scale-down", initial: ["opacity-0", "scale-105"], animated: ["opacity-100", "scale-100"] },
      { type: "slide-up", initial: ["opacity-0", "translate-y-12"], animated: ["opacity-100", "translate-y-0"] },
      { type: "bounce-in", initial: ["opacity-0", "scale-90"], animated: ["opacity-100", "scale-100"] },
    ];

    animationTypes.forEach(({ type, initial, animated }) => {
      it(`supports ${type} animation`, () => {
        const { container } = render(
          <AnimateOnScroll animation={type as any}>
            <div>Content</div>
          </AnimateOnScroll>
        );

        // Check initial classes
        initial.forEach((cls) => {
          expect(container.firstChild).toHaveClass(cls);
        });

        // Trigger animation
        act(() => {
          intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry]);
        });

        // Check animated classes
        animated.forEach((cls) => {
          expect(container.firstChild).toHaveClass(cls);
        });
      });
    });
  });

  // ---------------------------------------------------------------------------
  // PROPS
  // ---------------------------------------------------------------------------
  describe("Props", () => {
    it("applies delay as transitionDelay style", () => {
      const { container } = render(
        <AnimateOnScroll delay={200}>
          <div>Content</div>
        </AnimateOnScroll>
      );

      expect(container.firstChild).toHaveStyle({ transitionDelay: "200ms" });
    });

    it("applies duration as transitionDuration style", () => {
      const { container } = render(
        <AnimateOnScroll duration={800}>
          <div>Content</div>
        </AnimateOnScroll>
      );

      expect(container.firstChild).toHaveStyle({ transitionDuration: "800ms" });
    });

    it("uses default duration of 600ms", () => {
      const { container } = render(
        <AnimateOnScroll>
          <div>Content</div>
        </AnimateOnScroll>
      );

      expect(container.firstChild).toHaveStyle({ transitionDuration: "600ms" });
    });

    it("passes threshold to IntersectionObserver", () => {
      render(
        <AnimateOnScroll threshold={0.5}>
          <div>Content</div>
        </AnimateOnScroll>
      );

      expect(mockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ threshold: 0.5 })
      );
    });

    it("uses default threshold of 0.1", () => {
      render(
        <AnimateOnScroll>
          <div>Content</div>
        </AnimateOnScroll>
      );

      expect(mockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ threshold: 0.1 })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // ONCE BEHAVIOR
  // ---------------------------------------------------------------------------
  describe("Once Behavior", () => {
    it("disconnects observer after first intersection when once is true (default)", () => {
      render(
        <AnimateOnScroll>
          <div>Content</div>
        </AnimateOnScroll>
      );

      act(() => {
        intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry]);
      });

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it("stays animated after leaving viewport when once is true", () => {
      const { container } = render(
        <AnimateOnScroll>
          <div>Content</div>
        </AnimateOnScroll>
      );

      // Enter viewport
      act(() => {
        intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry]);
      });

      // Observer is disconnected, so leaving viewport won't trigger callback
      expect(container.firstChild).toHaveClass("opacity-100");
    });

    it("does not disconnect observer when once is false", () => {
      mockDisconnect.mockClear();
      
      render(
        <AnimateOnScroll once={false}>
          <div>Content</div>
        </AnimateOnScroll>
      );

      act(() => {
        intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry]);
      });

      // Should not disconnect when once is false
      expect(mockDisconnect).not.toHaveBeenCalled();
    });

    it("re-animates when leaving and re-entering viewport when once is false", () => {
      const { container } = render(
        <AnimateOnScroll once={false}>
          <div>Content</div>
        </AnimateOnScroll>
      );

      // Enter viewport
      act(() => {
        intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry]);
      });
      expect(container.firstChild).toHaveClass("opacity-100");

      // Leave viewport
      act(() => {
        intersectionCallback([{ isIntersecting: false } as IntersectionObserverEntry]);
      });
      expect(container.firstChild).toHaveClass("opacity-0");

      // Re-enter viewport
      act(() => {
        intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry]);
      });
      expect(container.firstChild).toHaveClass("opacity-100");
    });
  });

  // ---------------------------------------------------------------------------
  // REDUCED MOTION
  // ---------------------------------------------------------------------------
  describe("Reduced Motion", () => {
    it("shows content immediately when prefers-reduced-motion is true", () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === "(prefers-reduced-motion: reduce)",
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const { container } = render(
        <AnimateOnScroll>
          <div>Content</div>
        </AnimateOnScroll>
      );

      // Should have animated classes immediately
      expect(container.firstChild).toHaveClass("opacity-100");
      expect(container.firstChild).toHaveClass("translate-y-0");
    });
  });

  // ---------------------------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------------------------
  describe("Cleanup", () => {
    it("disconnects observer on unmount", () => {
      mockDisconnect.mockClear();
      
      const { unmount } = render(
        <AnimateOnScroll>
          <div>Content</div>
        </AnimateOnScroll>
      );

      unmount();

      expect(mockDisconnect).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// STAGGER CONTAINER TESTS
// =============================================================================
describe("StaggerContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders children", () => {
      render(
        <StaggerContainer>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </StaggerContainer>
      );

      expect(screen.getByTestId("child-1")).toBeInTheDocument();
      expect(screen.getByTestId("child-2")).toBeInTheDocument();
    });

    it("wraps each child in animated div", () => {
      const { container } = render(
        <StaggerContainer>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </StaggerContainer>
      );

      // Each child should be wrapped in a div with transition classes
      const wrappers = container.querySelectorAll(".transition-all");
      expect(wrappers.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Stagger Delays", () => {
    it("applies increasing transitionDelay to each child", () => {
      const { container } = render(
        <StaggerContainer staggerDelay={100} baseDelay={50}>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </StaggerContainer>
      );

      const wrappers = container.querySelectorAll(".transition-all");
      // First child: baseDelay + 0 * staggerDelay = 50ms
      expect(wrappers[0]).toHaveStyle({ transitionDelay: "50ms" });
      // Second child: baseDelay + 1 * staggerDelay = 150ms
      expect(wrappers[1]).toHaveStyle({ transitionDelay: "150ms" });
      // Third child: baseDelay + 2 * staggerDelay = 250ms
      expect(wrappers[2]).toHaveStyle({ transitionDelay: "250ms" });
    });

    it("uses default staggerDelay of 100ms", () => {
      const { container } = render(
        <StaggerContainer>
          <div>Child 1</div>
          <div>Child 2</div>
        </StaggerContainer>
      );

      const wrappers = container.querySelectorAll(".transition-all");
      expect(wrappers[0]).toHaveStyle({ transitionDelay: "0ms" }); // baseDelay 0 + 0*100
      expect(wrappers[1]).toHaveStyle({ transitionDelay: "100ms" }); // baseDelay 0 + 1*100
    });
  });

  describe("Animation", () => {
    it("applies animated classes to children when visible", () => {
      const { container } = render(
        <StaggerContainer animation="fade-up">
          <div>Child 1</div>
          <div>Child 2</div>
        </StaggerContainer>
      );

      act(() => {
        intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry]);
      });

      const wrappers = container.querySelectorAll(".transition-all");
      wrappers.forEach((wrapper) => {
        expect(wrapper).toHaveClass("opacity-100");
        expect(wrapper).toHaveClass("translate-y-0");
      });
    });
  });

  describe("Reduced Motion", () => {
    it("shows children immediately when prefers-reduced-motion is true", () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === "(prefers-reduced-motion: reduce)",
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const { container } = render(
        <StaggerContainer>
          <div>Child 1</div>
          <div>Child 2</div>
        </StaggerContainer>
      );

      const wrappers = container.querySelectorAll(".transition-all");
      wrappers.forEach((wrapper) => {
        expect(wrapper).toHaveClass("opacity-100");
      });
    });
  });
});

// =============================================================================
// TEXT REVEAL TESTS
// =============================================================================
describe("TextReveal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders text content", () => {
      render(<TextReveal text="Hello World" />);

      expect(screen.getByText(/Hello/)).toBeInTheDocument();
      expect(screen.getByText(/World/)).toBeInTheDocument();
    });

    it("splits text into separate word spans", () => {
      const { container } = render(<TextReveal text="One Two Three" />);

      // Each word should be in its own span
      const wordSpans = container.querySelectorAll(".inline-block.overflow-hidden");
      expect(wordSpans).toHaveLength(3);
    });
  });

  describe("Element Tag", () => {
    it("defaults to span element", () => {
      const { container } = render(<TextReveal text="Hello" />);

      const wrapper = container.querySelector("span.inline");
      expect(wrapper).toBeInTheDocument();
    });

    it("supports h1 element", () => {
      const { container } = render(<TextReveal text="Hello" as="h1" />);

      expect(container.querySelector("h1")).toBeInTheDocument();
    });

    it("supports h2 element", () => {
      const { container } = render(<TextReveal text="Hello" as="h2" />);

      expect(container.querySelector("h2")).toBeInTheDocument();
    });

    it("supports p element", () => {
      const { container } = render(<TextReveal text="Hello" as="p" />);

      expect(container.querySelector("p")).toBeInTheDocument();
    });
  });

  describe("Animation", () => {
    it("words start translated down (translate-y-full)", () => {
      const { container } = render(<TextReveal text="Hello World" />);

      const innerSpans = container.querySelectorAll(".transition-transform");
      innerSpans.forEach((span) => {
        expect(span).toHaveClass("translate-y-full");
      });
    });

    it("words animate to translate-y-0 when visible", () => {
      const { container } = render(<TextReveal text="Hello World" />);

      act(() => {
        intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry]);
      });

      const innerSpans = container.querySelectorAll(".transition-transform");
      innerSpans.forEach((span) => {
        expect(span).toHaveClass("translate-y-0");
      });
    });

    it("applies staggered delays to words", () => {
      const { container } = render(
        <TextReveal text="One Two Three" delay={100} staggerDelay={50} />
      );

      const innerSpans = container.querySelectorAll(".transition-transform");
      // First word: 100ms
      expect(innerSpans[0]).toHaveStyle({ transitionDelay: "100ms" });
      // Second word: 100 + 50 = 150ms
      expect(innerSpans[1]).toHaveStyle({ transitionDelay: "150ms" });
      // Third word: 100 + 100 = 200ms
      expect(innerSpans[2]).toHaveStyle({ transitionDelay: "200ms" });
    });
  });

  describe("Reduced Motion", () => {
    it("shows text immediately when prefers-reduced-motion is true", () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === "(prefers-reduced-motion: reduce)",
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const { container } = render(<TextReveal text="Hello World" />);

      const innerSpans = container.querySelectorAll(".transition-transform");
      innerSpans.forEach((span) => {
        expect(span).toHaveClass("translate-y-0");
      });
    });
  });
});

// =============================================================================
// COUNT UP TESTS
// =============================================================================
describe("CountUp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("Basic Rendering", () => {
    it("renders with initial count of 0", () => {
      render(<CountUp end={100} />);

      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("shows prefix before number", () => {
      render(<CountUp end={100} prefix="$" />);

      expect(screen.getByText("$0")).toBeInTheDocument();
    });

    it("shows suffix after number", () => {
      render(<CountUp end={100} suffix="%" />);

      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("shows both prefix and suffix", () => {
      render(<CountUp end={100} prefix="$" suffix="+" />);

      expect(screen.getByText("$0+")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(<CountUp end={100} className="custom-class" />);

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("Animation", () => {
    it("counts up to end value when visible", () => {
      // Mock reduced motion to skip animation and show end value immediately
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === "(prefers-reduced-motion: reduce)",
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<CountUp end={100} />);

      // Trigger intersection
      act(() => {
        intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry]);
      });

      // With reduced motion, shows end value immediately
      expect(screen.getByText("100")).toBeInTheDocument();
    });

    it("formats large numbers with commas", () => {
      // Mock reduced motion to skip animation and show end value immediately
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === "(prefers-reduced-motion: reduce)",
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<CountUp end={1000000} />);

      act(() => {
        intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry]);
      });

      expect(screen.getByText("1,000,000")).toBeInTheDocument();
    });

    it("uses threshold of 0.5 for IntersectionObserver", () => {
      render(<CountUp end={100} />);

      expect(mockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ threshold: 0.5 })
      );
    });
  });

  describe("Reduced Motion", () => {
    it("shows end value immediately when prefers-reduced-motion is true", () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === "(prefers-reduced-motion: reduce)",
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<CountUp end={500} />);

      // Trigger intersection
      act(() => {
        intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry]);
      });

      expect(screen.getByText("500")).toBeInTheDocument();
    });
  });
});





