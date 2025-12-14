/**
 * @vitest-environment jsdom
 *
 * StatsCard Component Tests
 *
 * Behaviors Tested:
 * 1. Display - Shows title, value, and icon
 * 2. Styling - Applies correct color class based on color prop
 * 3. Edge Cases - Handles zero and large values
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Phone: () => <div data-testid="phone-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
}));

import { StatsCard } from "./stats-card";
import { Phone, Users, Clock, AlertTriangle } from "lucide-react";

describe("StatsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // DISPLAY BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Display", () => {
    it("shows title text", () => {
      render(
        <StatsCard
          title="Active Calls"
          value={5}
          icon={Phone}
          color="primary"
        />
      );

      expect(screen.getByText("Active Calls")).toBeInTheDocument();
    });

    it("shows value as number", () => {
      render(
        <StatsCard
          title="Active Calls"
          value={42}
          icon={Phone}
          color="primary"
        />
      );

      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("shows icon component", () => {
      render(
        <StatsCard
          title="Active Calls"
          value={5}
          icon={Phone}
          color="primary"
        />
      );

      expect(screen.getByTestId("phone-icon")).toBeInTheDocument();
    });

    it("displays title with muted foreground styling", () => {
      render(
        <StatsCard
          title="Active Calls"
          value={5}
          icon={Phone}
          color="primary"
        />
      );

      const title = screen.getByText("Active Calls");
      expect(title).toHaveClass("text-sm", "text-muted-foreground");
    });

    it("displays value with bold styling", () => {
      render(
        <StatsCard
          title="Active Calls"
          value={5}
          icon={Phone}
          color="primary"
        />
      );

      const value = screen.getByText("5");
      expect(value).toHaveClass("text-3xl", "font-bold");
    });
  });

  // ---------------------------------------------------------------------------
  // COLOR STYLING BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Color Styling", () => {
    it("applies primary color class for primary color prop", () => {
      const { container } = render(
        <StatsCard
          title="Primary Card"
          value={10}
          icon={Phone}
          color="primary"
        />
      );

      const iconContainer = container.querySelector(".bg-primary\\/10");
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer).toHaveClass("text-primary");
    });

    it("applies success color class for success color prop", () => {
      const { container } = render(
        <StatsCard
          title="Success Card"
          value={10}
          icon={Users}
          color="success"
        />
      );

      const iconContainer = container.querySelector(".bg-success\\/10");
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer).toHaveClass("text-success");
    });

    it("applies accent color class for accent color prop", () => {
      const { container } = render(
        <StatsCard
          title="Accent Card"
          value={10}
          icon={Clock}
          color="accent"
        />
      );

      const iconContainer = container.querySelector(".bg-purple-500\\/10");
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer).toHaveClass("text-purple-500");
    });

    it("applies destructive color class for destructive color prop", () => {
      const { container } = render(
        <StatsCard
          title="Destructive Card"
          value={10}
          icon={AlertTriangle}
          color="destructive"
        />
      );

      const iconContainer = container.querySelector(".bg-destructive\\/10");
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer).toHaveClass("text-destructive");
    });
  });

  // ---------------------------------------------------------------------------
  // LAYOUT BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Layout", () => {
    it("has glass card styling with rounded corners", () => {
      const { container } = render(
        <StatsCard
          title="Card Layout"
          value={5}
          icon={Phone}
          color="primary"
        />
      );

      const card = container.firstChild;
      expect(card).toHaveClass("glass", "rounded-xl", "p-6");
    });

    it("has hover state styling for primary border", () => {
      const { container } = render(
        <StatsCard
          title="Card Layout"
          value={5}
          icon={Phone}
          color="primary"
        />
      );

      const card = container.firstChild;
      expect(card).toHaveClass("hover:border-primary/30");
    });

    it("icon container has correct size and flex centering", () => {
      const { container } = render(
        <StatsCard
          title="Card Layout"
          value={5}
          icon={Phone}
          color="primary"
        />
      );

      const iconContainer = container.querySelector(".w-12.h-12");
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer).toHaveClass("rounded-xl", "flex", "items-center", "justify-center");
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------

  describe("Edge Cases", () => {
    it("handles zero value", () => {
      render(
        <StatsCard
          title="Zero Count"
          value={0}
          icon={Phone}
          color="primary"
        />
      );

      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("handles large numbers", () => {
      render(
        <StatsCard
          title="Large Count"
          value={99999}
          icon={Phone}
          color="primary"
        />
      );

      expect(screen.getByText("99999")).toBeInTheDocument();
    });

    it("handles negative numbers", () => {
      render(
        <StatsCard
          title="Negative Count"
          value={-5}
          icon={Phone}
          color="primary"
        />
      );

      expect(screen.getByText("-5")).toBeInTheDocument();
    });

    it("handles long title text", () => {
      const longTitle = "This is a very long title that should still be displayed";
      render(
        <StatsCard
          title={longTitle}
          value={5}
          icon={Phone}
          color="primary"
        />
      );

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });
  });
});




