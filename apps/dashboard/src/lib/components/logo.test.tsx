/**
 * @vitest-environment jsdom
 *
 * Logo Tests
 *
 * Behaviors Tested:
 * 1. Renders "GREET" text in font-black
 * 2. Renders "NOW" text in font-light
 * 3. Renders red pulsing dot
 * 4. Applies sm size classes when size="sm"
 * 5. Applies md size classes by default
 * 6. Applies lg size classes when size="lg"
 * 7. Applies custom className prop
 * 8. Uses relative inline-block for container
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { Logo } from "./logo";

describe("Logo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // TEXT DISPLAY BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Text Display", () => {
    it("1. renders GREET text in font-black", () => {
      render(<Logo />);
      
      const greetText = screen.getByText("GREET");
      expect(greetText).toBeInTheDocument();
      expect(greetText).toHaveClass("font-black");
    });

    it("2. renders NOW text in font-light", () => {
      render(<Logo />);
      
      const nowText = screen.getByText("NOW");
      expect(nowText).toBeInTheDocument();
      expect(nowText).toHaveClass("font-light");
    });

    it("renders GREET and NOW as sibling spans", () => {
      render(<Logo />);
      
      const greetText = screen.getByText("GREET");
      const nowText = screen.getByText("NOW");
      
      // Both should be spans
      expect(greetText.tagName).toBe("SPAN");
      expect(nowText.tagName).toBe("SPAN");
      
      // They should share a common parent
      expect(greetText.parentElement).toBe(nowText.parentElement);
    });

    it("applies tracking-tight to the text container", () => {
      render(<Logo />);
      
      const greetText = screen.getByText("GREET");
      const textContainer = greetText.parentElement;
      
      expect(textContainer).toHaveClass("tracking-tight");
    });
  });

  // ---------------------------------------------------------------------------
  // PULSING DOT BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Pulsing Dot", () => {
    it("3. renders red pulsing dot", () => {
      const { container } = render(<Logo />);
      
      // Find the dot element by its classes
      const dot = container.querySelector(".bg-red-500.rounded-full.animate-pulse");
      expect(dot).toBeInTheDocument();
    });

    it("dot is positioned absolutely", () => {
      const { container } = render(<Logo />);
      
      const dot = container.querySelector(".bg-red-500.rounded-full.animate-pulse");
      expect(dot).toHaveClass("absolute");
    });
  });

  // ---------------------------------------------------------------------------
  // SIZE VARIANTS
  // ---------------------------------------------------------------------------
  describe("Size Variants", () => {
    it("4. applies sm size classes when size='sm'", () => {
      const { container } = render(<Logo size="sm" />);
      
      const greetText = screen.getByText("GREET");
      const textContainer = greetText.parentElement;
      
      // sm text size
      expect(textContainer).toHaveClass("text-xl");
      
      // sm dot size
      const dot = container.querySelector(".bg-red-500.rounded-full");
      expect(dot).toHaveClass("w-1.5");
      expect(dot).toHaveClass("h-1.5");
      expect(dot).toHaveClass("-top-0.5");
      expect(dot).toHaveClass("-right-2");
    });

    it("5. applies md size classes by default", () => {
      const { container } = render(<Logo />);
      
      const greetText = screen.getByText("GREET");
      const textContainer = greetText.parentElement;
      
      // md text size (default)
      expect(textContainer).toHaveClass("text-2xl");
      
      // md dot size
      const dot = container.querySelector(".bg-red-500.rounded-full");
      expect(dot).toHaveClass("w-2");
      expect(dot).toHaveClass("h-2");
      expect(dot).toHaveClass("-top-0.5");
      expect(dot).toHaveClass("-right-2.5");
    });

    it("6. applies lg size classes when size='lg'", () => {
      const { container } = render(<Logo size="lg" />);
      
      const greetText = screen.getByText("GREET");
      const textContainer = greetText.parentElement;
      
      // lg text size
      expect(textContainer).toHaveClass("text-3xl");
      
      // lg dot size
      const dot = container.querySelector(".bg-red-500.rounded-full");
      expect(dot).toHaveClass("w-2.5");
      expect(dot).toHaveClass("h-2.5");
      expect(dot).toHaveClass("-top-1");
      expect(dot).toHaveClass("-right-3");
    });

    it("applies correct size classes for explicit md size", () => {
      const { container } = render(<Logo size="md" />);
      
      const greetText = screen.getByText("GREET");
      const textContainer = greetText.parentElement;
      
      // Explicit md should behave same as default
      expect(textContainer).toHaveClass("text-2xl");
      
      const dot = container.querySelector(".bg-red-500.rounded-full");
      expect(dot).toHaveClass("w-2");
      expect(dot).toHaveClass("h-2");
    });
  });

  // ---------------------------------------------------------------------------
  // CLASSNAME PROP
  // ---------------------------------------------------------------------------
  describe("className Prop", () => {
    it("7. applies custom className prop", () => {
      const { container } = render(<Logo className="my-custom-class" />);
      
      const logoContainer = container.firstChild;
      expect(logoContainer).toHaveClass("my-custom-class");
    });

    it("combines custom className with default classes", () => {
      const { container } = render(<Logo className="extra-class another-class" />);
      
      const logoContainer = container.firstChild;
      expect(logoContainer).toHaveClass("relative");
      expect(logoContainer).toHaveClass("inline-block");
      expect(logoContainer).toHaveClass("extra-class");
      expect(logoContainer).toHaveClass("another-class");
    });

    it("defaults to empty className when not provided", () => {
      const { container } = render(<Logo />);
      
      const logoContainer = container.firstChild;
      // Should still have base classes
      expect(logoContainer).toHaveClass("relative");
      expect(logoContainer).toHaveClass("inline-block");
    });
  });

  // ---------------------------------------------------------------------------
  // CONTAINER STYLING
  // ---------------------------------------------------------------------------
  describe("Container", () => {
    it("8. uses relative inline-block for container", () => {
      const { container } = render(<Logo />);
      
      const logoContainer = container.firstChild;
      expect(logoContainer).toHaveClass("relative");
      expect(logoContainer).toHaveClass("inline-block");
    });

    it("renders as a div element", () => {
      const { container } = render(<Logo />);
      
      const logoContainer = container.firstChild as HTMLElement;
      expect(logoContainer.tagName).toBe("DIV");
    });
  });
});



