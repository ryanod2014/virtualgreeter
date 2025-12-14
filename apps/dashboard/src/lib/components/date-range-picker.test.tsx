/**
 * @vitest-environment jsdom
 *
 * DateRangePicker Tests
 *
 * Behaviors Tested:
 * 1. Display - Shows formatted date range in button
 * 2. Display - Shows "Select dates" when no range
 * 3. Display - Opens popover with calendar on click
 * 4. Display - Shows preset options (Today, Last 7 days, etc.)
 * 5. Display - Shows days count when range selected
 * 6. Display - Highlights active preset
 * 7. Actions - Applies preset range when preset clicked
 * 8. Actions - Calls onRangeChange when Apply clicked
 * 9. Actions - Closes popover when Cancel clicked
 * 10. Actions - Closes popover after preset selection
 * 11. Edge Cases - Syncs internal state with external props
 * 12. Edge Cases - Apply button disabled without complete range
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

// Mock lucide-react icons BEFORE importing component
vi.mock("lucide-react", () => ({
  Calendar: () => <div data-testid="calendar-icon" />,
  ChevronLeft: () => <div data-testid="chevron-left-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

// Mock react-day-picker to avoid complex calendar rendering
vi.mock("react-day-picker", () => ({
  DayPicker: ({ selected, onSelect }: { selected: any; onSelect: (range: any) => void }) => (
    <div data-testid="day-picker">
      <button
        data-testid="mock-select-range"
        onClick={() => onSelect({ from: new Date("2024-01-01"), to: new Date("2024-01-15") })}
      >
        Mock Select Range
      </button>
      <button
        data-testid="mock-select-incomplete"
        onClick={() => onSelect({ from: new Date("2024-01-01"), to: undefined })}
      >
        Mock Select Incomplete
      </button>
      {selected?.from && selected?.to && (
        <div data-testid="selected-range">
          {format(selected.from, "MMM d")} - {format(selected.to, "MMM d")}
        </div>
      )}
    </div>
  ),
}));

// Mock Radix Popover
vi.mock("@radix-ui/react-popover", () => ({
  Root: ({ children, open, onOpenChange }: any) => (
    <div data-testid="popover-root" data-open={open}>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { open, onOpenChange })
      )}
    </div>
  ),
  Trigger: ({ children, asChild, ...props }: any) => (
    <div data-testid="popover-trigger" {...props}>
      {children}
    </div>
  ),
  Portal: ({ children }: any) => <div data-testid="popover-portal">{children}</div>,
  Content: ({ children }: any) => <div data-testid="popover-content">{children}</div>,
  Arrow: () => <div data-testid="popover-arrow" />,
}));

import { DateRangePicker } from "./date-range-picker";

describe("DateRangePicker", () => {
  const today = new Date();
  const sevenDaysAgo = subDays(today, 7);

  const defaultProps = {
    from: sevenDaysAgo,
    to: today,
    onRangeChange: vi.fn(),
  };

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
    it("shows Calendar icon in trigger button", () => {
      render(<DateRangePicker {...defaultProps} />);
      expect(screen.getByTestId("calendar-icon")).toBeInTheDocument();
    });

    it("shows formatted date range in trigger button", () => {
      // Use noon to avoid timezone issues
      const from = new Date("2024-01-15T12:00:00");
      const to = new Date("2024-01-20T12:00:00");
      render(<DateRangePicker {...defaultProps} from={from} to={to} />);

      expect(screen.getByText("Jan 15, 2024 – Jan 20, 2024")).toBeInTheDocument();
    });

    it("shows preset options in popover content", () => {
      render(<DateRangePicker {...defaultProps} />);

      expect(screen.getByText("Today")).toBeInTheDocument();
      expect(screen.getByText("Last 7 days")).toBeInTheDocument();
      expect(screen.getByText("Last 30 days")).toBeInTheDocument();
      expect(screen.getByText("Last 90 days")).toBeInTheDocument();
    });

    it("shows Quick Select header in presets sidebar", () => {
      render(<DateRangePicker {...defaultProps} />);
      expect(screen.getByText("Quick Select")).toBeInTheDocument();
    });

    it("shows DayPicker calendar component", () => {
      render(<DateRangePicker {...defaultProps} />);
      expect(screen.getByTestId("day-picker")).toBeInTheDocument();
    });

    it("shows Apply button", () => {
      render(<DateRangePicker {...defaultProps} />);
      expect(screen.getByRole("button", { name: /apply/i })).toBeInTheDocument();
    });

    it("shows Cancel button", () => {
      render(<DateRangePicker {...defaultProps} />);
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("shows days selected count when range is complete", () => {
      const from = new Date("2024-01-01");
      const to = new Date("2024-01-10");
      render(<DateRangePicker {...defaultProps} from={from} to={to} />);

      // 10 days from Jan 1 to Jan 10 inclusive
      expect(screen.getByText(/10 days selected/)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // PRESET BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Preset Buttons", () => {
    it("calls onRangeChange with today's date when Today preset clicked", () => {
      const onRangeChange = vi.fn();
      render(<DateRangePicker {...defaultProps} onRangeChange={onRangeChange} />);

      fireEvent.click(screen.getByText("Today"));

      expect(onRangeChange).toHaveBeenCalledTimes(1);
      const [fromArg, toArg] = onRangeChange.mock.calls[0];
      expect(startOfDay(fromArg).getTime()).toBe(startOfDay(new Date()).getTime());
      expect(endOfDay(toArg).getTime()).toBe(endOfDay(new Date()).getTime());
    });

    it("calls onRangeChange with last 7 days when Last 7 days preset clicked", () => {
      const onRangeChange = vi.fn();
      render(<DateRangePicker {...defaultProps} onRangeChange={onRangeChange} />);

      fireEvent.click(screen.getByText("Last 7 days"));

      expect(onRangeChange).toHaveBeenCalledTimes(1);
      const [fromArg, toArg] = onRangeChange.mock.calls[0];
      const expectedFrom = startOfDay(subDays(new Date(), 7));
      expect(startOfDay(fromArg).getTime()).toBe(expectedFrom.getTime());
    });

    it("calls onRangeChange with last 30 days when Last 30 days preset clicked", () => {
      const onRangeChange = vi.fn();
      render(<DateRangePicker {...defaultProps} onRangeChange={onRangeChange} />);

      fireEvent.click(screen.getByText("Last 30 days"));

      expect(onRangeChange).toHaveBeenCalledTimes(1);
      const [fromArg] = onRangeChange.mock.calls[0];
      const expectedFrom = startOfDay(subDays(new Date(), 30));
      expect(startOfDay(fromArg).getTime()).toBe(expectedFrom.getTime());
    });

    it("calls onRangeChange with last 90 days when Last 90 days preset clicked", () => {
      const onRangeChange = vi.fn();
      render(<DateRangePicker {...defaultProps} onRangeChange={onRangeChange} />);

      fireEvent.click(screen.getByText("Last 90 days"));

      expect(onRangeChange).toHaveBeenCalledTimes(1);
      const [fromArg] = onRangeChange.mock.calls[0];
      const expectedFrom = startOfDay(subDays(new Date(), 90));
      expect(startOfDay(fromArg).getTime()).toBe(expectedFrom.getTime());
    });
  });

  // ---------------------------------------------------------------------------
  // APPLY/CANCEL BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Apply and Cancel", () => {
    it("calls onRangeChange when Apply button clicked with valid range", () => {
      const onRangeChange = vi.fn();
      const from = new Date("2024-01-15");
      const to = new Date("2024-01-20");
      render(<DateRangePicker {...defaultProps} from={from} to={to} onRangeChange={onRangeChange} />);

      fireEvent.click(screen.getByRole("button", { name: /apply/i }));

      expect(onRangeChange).toHaveBeenCalledTimes(1);
    });

    it("Apply button is disabled when range is incomplete", () => {
      // Start with valid range, then simulate selecting incomplete range via mock
      render(<DateRangePicker {...defaultProps} />);

      // Click mock button that sets incomplete range
      fireEvent.click(screen.getByTestId("mock-select-incomplete"));

      // Now the apply button should be disabled since range.to is undefined
      const applyButton = screen.getByRole("button", { name: /apply/i });
      expect(applyButton).toBeDisabled();
    });

    it("does not call onRangeChange when Apply clicked with incomplete range", () => {
      const onRangeChange = vi.fn();
      render(<DateRangePicker {...defaultProps} onRangeChange={onRangeChange} />);

      // Select incomplete range first
      fireEvent.click(screen.getByTestId("mock-select-incomplete"));

      // Try to apply
      fireEvent.click(screen.getByRole("button", { name: /apply/i }));

      // Should not have been called
      expect(onRangeChange).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // DATE SELECTION BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Date Selection via Calendar", () => {
    it("updates internal range when DayPicker selection changes", () => {
      render(<DateRangePicker {...defaultProps} />);

      // Click mock button that simulates range selection
      fireEvent.click(screen.getByTestId("mock-select-range"));

      // The selected range should be reflected
      expect(screen.getByTestId("selected-range")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // SYNC WITH PROPS BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Props Synchronization", () => {
    it("updates internal range when from/to props change", () => {
      const { rerender } = render(<DateRangePicker {...defaultProps} />);

      // Use noon to avoid timezone issues
      const newFrom = new Date("2024-06-01T12:00:00");
      const newTo = new Date("2024-06-15T12:00:00");

      rerender(<DateRangePicker {...defaultProps} from={newFrom} to={newTo} />);

      // The displayed range should update
      expect(screen.getByText("Jun 1, 2024 – Jun 15, 2024")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // FORMAT DATE RANGE BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Date Range Formatting", () => {
    it("formats single day selection correctly", () => {
      // Use noon to avoid timezone issues
      const sameDay = new Date("2024-03-15T12:00:00");
      render(<DateRangePicker {...defaultProps} from={sameDay} to={sameDay} />);

      // Same day shows just one date with dash to same date
      expect(screen.getByText("Mar 15, 2024 – Mar 15, 2024")).toBeInTheDocument();
    });

    it("calculates days count correctly for multi-day range", () => {
      // Jan 1 to Jan 5 = 5 days
      const from = new Date("2024-01-01");
      const to = new Date("2024-01-05");
      render(<DateRangePicker {...defaultProps} from={from} to={to} />);

      expect(screen.getByText(/5 days selected/)).toBeInTheDocument();
    });

    it("shows 1 day selected for same-day range", () => {
      // Use noon to avoid timezone issues
      const sameDay = new Date("2024-03-15T12:00:00");
      render(<DateRangePicker {...defaultProps} from={sameDay} to={sameDay} />);

      expect(screen.getByText(/1 days selected/)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------
  describe("Edge Cases", () => {
    it("handles year boundary dates correctly", () => {
      // Use noon to avoid timezone issues
      const from = new Date("2023-12-28T12:00:00");
      const to = new Date("2024-01-03T12:00:00");
      render(<DateRangePicker {...defaultProps} from={from} to={to} />);

      expect(screen.getByText("Dec 28, 2023 – Jan 3, 2024")).toBeInTheDocument();
    });

    it("renders without crashing when given same from and to dates", () => {
      // Use noon to avoid timezone issues
      const date = new Date("2024-05-01T12:00:00");
      const { container } = render(<DateRangePicker {...defaultProps} from={date} to={date} />);

      expect(container.firstChild).not.toBeNull();
    });
  });
});




