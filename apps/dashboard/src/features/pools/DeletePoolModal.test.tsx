import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  X: () => <div data-testid="x-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Route: () => <div data-testid="route-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
}));

import { DeletePoolModal } from "./DeletePoolModal";

/**
 * DeletePoolModal Component Tests
 *
 * Tests capture the current behavior of the DeletePoolModal component:
 * - Display: Shows pool name, agent count, routing rules count, warning message
 * - Confirmation: Requires typing pool name to enable delete button
 * - Actions: Delete button calls onConfirm, Cancel/Close calls onClose
 * - Loading: Shows loading state during deletion
 */

describe("DeletePoolModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn().mockResolvedValue(undefined),
    poolName: "Sales Team",
    agentCount: 3,
    routingRulesCount: 2,
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

  describe("Display - Modal Visibility", () => {
    it("returns null when isOpen is false", () => {
      const { container } = render(
        <DeletePoolModal {...defaultProps} isOpen={false} />
      );

      expect(container.firstChild).toBeNull();
    });

    it("renders modal when isOpen is true", () => {
      render(<DeletePoolModal {...defaultProps} />);

      expect(screen.getByText("Delete Pool")).toBeInTheDocument();
    });

    it("shows 'This action cannot be undone' subtitle", () => {
      render(<DeletePoolModal {...defaultProps} />);

      expect(screen.getByText("This action cannot be undone")).toBeInTheDocument();
    });
  });

  describe("Display - Pool Name", () => {
    it("shows pool name in warning message", () => {
      render(<DeletePoolModal {...defaultProps} poolName="Enterprise" />);

      expect(screen.getByText(/Enterprise/)).toBeInTheDocument();
    });

    it("shows pool name in confirmation label", () => {
      render(<DeletePoolModal {...defaultProps} poolName="Support Team" />);

      // The label should say "Type Support Team to confirm"
      expect(screen.getByText(/Type/)).toBeInTheDocument();
      expect(screen.getByText(/Support Team/)).toBeInTheDocument();
      expect(screen.getByText(/to confirm/)).toBeInTheDocument();
    });
  });

  describe("Display - Agent Count", () => {
    it("shows agent count in warning list", () => {
      render(<DeletePoolModal {...defaultProps} agentCount={5} />);

      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("agents will be unassigned")).toBeInTheDocument();
    });

    it("shows singular 'agent' when count is 1", () => {
      render(<DeletePoolModal {...defaultProps} agentCount={1} />);

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("agent will be unassigned")).toBeInTheDocument();
    });

    it("shows plural 'agents' when count is 0", () => {
      render(<DeletePoolModal {...defaultProps} agentCount={0} />);

      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("agents will be unassigned")).toBeInTheDocument();
    });
  });

  describe("Display - Routing Rules Count", () => {
    it("shows routing rules count in warning list", () => {
      render(<DeletePoolModal {...defaultProps} routingRulesCount={4} />);

      expect(screen.getByText("4")).toBeInTheDocument();
      expect(screen.getByText("routing rules will be deleted")).toBeInTheDocument();
    });

    it("shows singular 'rule' when count is 1", () => {
      render(<DeletePoolModal {...defaultProps} routingRulesCount={1} />);

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("routing rule will be deleted")).toBeInTheDocument();
    });

    it("shows plural 'rules' when count is 0", () => {
      render(<DeletePoolModal {...defaultProps} routingRulesCount={0} />);

      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("routing rules will be deleted")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // CONFIRMATION INPUT BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Confirmation Input", () => {
    it("shows confirmation input with placeholder", () => {
      render(<DeletePoolModal {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter pool name");
      expect(input).toBeInTheDocument();
    });

    it("Delete button is disabled when input is empty", () => {
      render(<DeletePoolModal {...defaultProps} />);

      const deleteButton = screen.getByRole("button", { name: /delete pool/i });
      expect(deleteButton).toBeDisabled();
    });

    it("Delete button is disabled when input does not match pool name", () => {
      render(<DeletePoolModal {...defaultProps} poolName="Sales Team" />);

      const input = screen.getByPlaceholderText("Enter pool name");
      fireEvent.change(input, { target: { value: "Wrong Name" } });

      const deleteButton = screen.getByRole("button", { name: /delete pool/i });
      expect(deleteButton).toBeDisabled();
    });

    it("Delete button is enabled when input exactly matches pool name", () => {
      render(<DeletePoolModal {...defaultProps} poolName="Sales Team" />);

      const input = screen.getByPlaceholderText("Enter pool name");
      fireEvent.change(input, { target: { value: "Sales Team" } });

      const deleteButton = screen.getByRole("button", { name: /delete pool/i });
      expect(deleteButton).not.toBeDisabled();
    });

    it("confirmation is case-sensitive", () => {
      render(<DeletePoolModal {...defaultProps} poolName="Sales Team" />);

      const input = screen.getByPlaceholderText("Enter pool name");
      fireEvent.change(input, { target: { value: "sales team" } });

      const deleteButton = screen.getByRole("button", { name: /delete pool/i });
      expect(deleteButton).toBeDisabled();
    });

    it("input has autoFocus enabled", () => {
      render(<DeletePoolModal {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter pool name");
      // autoFocus attribute should be present
      expect(input).toHaveFocus();
    });
  });

  // ---------------------------------------------------------------------------
  // ACTION BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Actions - Delete Button", () => {
    it("calls onConfirm when Delete button is clicked with valid confirmation", async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      render(<DeletePoolModal {...defaultProps} onConfirm={onConfirm} poolName="Sales Team" />);

      const input = screen.getByPlaceholderText("Enter pool name");
      fireEvent.change(input, { target: { value: "Sales Team" } });

      const deleteButton = screen.getByRole("button", { name: /delete pool/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it("does not call onConfirm when confirmation is invalid", () => {
      const onConfirm = vi.fn();
      render(<DeletePoolModal {...defaultProps} onConfirm={onConfirm} poolName="Sales Team" />);

      const input = screen.getByPlaceholderText("Enter pool name");
      fireEvent.change(input, { target: { value: "Wrong" } });

      const deleteButton = screen.getByRole("button", { name: /delete pool/i });
      fireEvent.click(deleteButton);

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it("shows loading state during deletion", async () => {
      // Create a promise that won't resolve immediately
      let resolveConfirm: () => void;
      const onConfirm = vi.fn().mockImplementation(() => new Promise<void>((resolve) => {
        resolveConfirm = resolve;
      }));

      render(<DeletePoolModal {...defaultProps} onConfirm={onConfirm} poolName="Sales Team" />);

      const input = screen.getByPlaceholderText("Enter pool name");
      fireEvent.change(input, { target: { value: "Sales Team" } });

      const deleteButton = screen.getByRole("button", { name: /delete pool/i });
      fireEvent.click(deleteButton);

      // Should show "Deleting..." text
      await waitFor(() => {
        expect(screen.getByText("Deleting...")).toBeInTheDocument();
      });

      // Should show loader icon
      expect(screen.getByTestId("loader-icon")).toBeInTheDocument();

      // Resolve the promise
      resolveConfirm!();
    });

    it("Delete button is disabled during deletion", async () => {
      let resolveConfirm: () => void;
      const onConfirm = vi.fn().mockImplementation(() => new Promise<void>((resolve) => {
        resolveConfirm = resolve;
      }));

      render(<DeletePoolModal {...defaultProps} onConfirm={onConfirm} poolName="Sales Team" />);

      const input = screen.getByPlaceholderText("Enter pool name");
      fireEvent.change(input, { target: { value: "Sales Team" } });

      const deleteButton = screen.getByRole("button", { name: /delete pool/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        const deletingButton = screen.getByRole("button", { name: /deleting/i });
        expect(deletingButton).toBeDisabled();
      });

      resolveConfirm!();
    });

    it("calls onClose after successful deletion", async () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn().mockResolvedValue(undefined);

      render(<DeletePoolModal {...defaultProps} onClose={onClose} onConfirm={onConfirm} poolName="Test" />);

      const input = screen.getByPlaceholderText("Enter pool name");
      fireEvent.change(input, { target: { value: "Test" } });

      const deleteButton = screen.getByRole("button", { name: /delete pool/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("clears confirmation text after successful deletion", async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined);

      render(<DeletePoolModal {...defaultProps} onConfirm={onConfirm} poolName="Test" />);

      const input = screen.getByPlaceholderText("Enter pool name");
      fireEvent.change(input, { target: { value: "Test" } });

      const deleteButton = screen.getByRole("button", { name: /delete pool/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(input).toHaveValue("");
      });
    });

    it("does not close modal when deletion fails", async () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn().mockRejectedValue(new Error("Delete failed"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      render(<DeletePoolModal {...defaultProps} onClose={onClose} onConfirm={onConfirm} poolName="Test" />);

      const input = screen.getByPlaceholderText("Enter pool name");
      fireEvent.change(input, { target: { value: "Test" } });

      const deleteButton = screen.getByRole("button", { name: /delete pool/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalled();
      });

      // Modal should still be open (onClose not called)
      expect(onClose).not.toHaveBeenCalled();

      // Error should be logged
      expect(consoleSpy).toHaveBeenCalledWith("Failed to delete pool:", expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe("Actions - Cancel Button", () => {
    it("calls onClose when Cancel button is clicked", () => {
      const onClose = vi.fn();
      render(<DeletePoolModal {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("clears confirmation text when Cancel is clicked", () => {
      render(<DeletePoolModal {...defaultProps} poolName="Test" />);

      const input = screen.getByPlaceholderText("Enter pool name");
      fireEvent.change(input, { target: { value: "Test" } });

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(input).toHaveValue("");
    });
  });

  describe("Actions - Close Button (X)", () => {
    it("calls onClose when X button is clicked", () => {
      const onClose = vi.fn();
      render(<DeletePoolModal {...defaultProps} onClose={onClose} />);

      // Find the close button (contains X icon)
      const closeButton = screen.getByTestId("x-icon").closest("button");
      expect(closeButton).toBeInTheDocument();
      
      fireEvent.click(closeButton!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Actions - Backdrop Click", () => {
    it("calls onClose when backdrop is clicked", () => {
      const onClose = vi.fn();
      const { container } = render(<DeletePoolModal {...defaultProps} onClose={onClose} />);

      // Find the backdrop element (has bg-black/60 class)
      const backdrop = container.querySelector(".bg-black\\/60");
      expect(backdrop).toBeInTheDocument();
      
      fireEvent.click(backdrop!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // VISUAL ELEMENTS
  // ---------------------------------------------------------------------------

  describe("Visual Elements", () => {
    it("shows AlertTriangle icon in header", () => {
      render(<DeletePoolModal {...defaultProps} />);

      expect(screen.getByTestId("alert-triangle-icon")).toBeInTheDocument();
    });

    it("shows Users icon for agent count", () => {
      render(<DeletePoolModal {...defaultProps} />);

      expect(screen.getByTestId("users-icon")).toBeInTheDocument();
    });

    it("shows Route icon for routing rules count", () => {
      render(<DeletePoolModal {...defaultProps} />);

      expect(screen.getByTestId("route-icon")).toBeInTheDocument();
    });

    it("shows Trash2 icon in Delete button when not loading", () => {
      render(<DeletePoolModal {...defaultProps} />);

      // The trash icon should be visible in the delete button area
      const trashIcons = screen.getAllByTestId("trash-icon");
      expect(trashIcons.length).toBeGreaterThan(0);
    });

    it("modal has fixed positioning with full screen backdrop", () => {
      const { container } = render(<DeletePoolModal {...defaultProps} />);

      const modalContainer = container.querySelector(".fixed.inset-0");
      expect(modalContainer).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------

  describe("Edge Cases", () => {
    it("handles pool name with special characters", () => {
      render(<DeletePoolModal {...defaultProps} poolName="Team (Sales & Support)" />);

      const input = screen.getByPlaceholderText("Enter pool name");
      fireEvent.change(input, { target: { value: "Team (Sales & Support)" } });

      const deleteButton = screen.getByRole("button", { name: /delete pool/i });
      expect(deleteButton).not.toBeDisabled();
    });

    it("handles empty pool name", () => {
      render(<DeletePoolModal {...defaultProps} poolName="" />);

      const input = screen.getByPlaceholderText("Enter pool name");
      fireEvent.change(input, { target: { value: "" } });

      const deleteButton = screen.getByRole("button", { name: /delete pool/i });
      // Empty string === empty string, so should be enabled
      expect(deleteButton).not.toBeDisabled();
    });

    it("handles pool name with leading/trailing spaces - requires exact match", () => {
      render(<DeletePoolModal {...defaultProps} poolName=" Spaced Name " />);

      const input = screen.getByPlaceholderText("Enter pool name");
      
      // Without spaces - should not match
      fireEvent.change(input, { target: { value: "Spaced Name" } });
      let deleteButton = screen.getByRole("button", { name: /delete pool/i });
      expect(deleteButton).toBeDisabled();

      // With exact spaces - should match
      fireEvent.change(input, { target: { value: " Spaced Name " } });
      deleteButton = screen.getByRole("button", { name: /delete pool/i });
      expect(deleteButton).not.toBeDisabled();
    });

    it("handles very long pool name", () => {
      const longName = "A".repeat(100);
      render(<DeletePoolModal {...defaultProps} poolName={longName} />);

      const input = screen.getByPlaceholderText("Enter pool name");
      fireEvent.change(input, { target: { value: longName } });

      const deleteButton = screen.getByRole("button", { name: /delete pool/i });
      expect(deleteButton).not.toBeDisabled();
    });

    it("resets isDeleting state after failed deletion", async () => {
      const onConfirm = vi.fn().mockRejectedValue(new Error("Failed"));
      vi.spyOn(console, "error").mockImplementation(() => {});

      render(<DeletePoolModal {...defaultProps} onConfirm={onConfirm} poolName="Test" />);

      const input = screen.getByPlaceholderText("Enter pool name");
      fireEvent.change(input, { target: { value: "Test" } });

      const deleteButton = screen.getByRole("button", { name: /delete pool/i });
      fireEvent.click(deleteButton);

      // Wait for the deletion to fail
      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalled();
      });

      // Button should return to normal state (not "Deleting...")
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /delete pool/i })).not.toBeDisabled();
      });
    });
  });
});


