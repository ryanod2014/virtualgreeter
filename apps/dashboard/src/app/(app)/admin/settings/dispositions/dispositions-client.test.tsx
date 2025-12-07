/**
 * @vitest-environment jsdom
 *
 * DispositionsClient Tests
 *
 * Behaviors Tested:
 * 1. Display - Shows list of dispositions
 * 2. Display - Shows empty state when no dispositions
 * 3. Display - Shows primary disposition with trophy icon
 * 4. Display - Shows add form when Add Disposition clicked
 * 5. Display - Shows Facebook integration section
 * 6. Actions - Can add new disposition
 * 7. Actions - Can edit existing disposition
 * 8. Actions - Can delete disposition (with confirm)
 * 9. Actions - Can make a disposition primary
 * 10. Facebook - Shows connected status when configured
 * 11. Facebook - Can expand/collapse settings section
 * 12. Facebook - Can save settings
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Plus: () => <div data-testid="plus-icon" />,
  Trash2: () => <div data-testid="trash2-icon" />,
  GripVertical: () => <div data-testid="grip-vertical-icon" />,
  Check: () => <div data-testid="check-icon" />,
  X: () => <div data-testid="x-icon" />,
  Palette: () => <div data-testid="palette-icon" />,
  Trophy: () => <div data-testid="trophy-icon" />,
  DollarSign: () => <div data-testid="dollar-sign-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  Lock: () => <div data-testid="lock-icon" />,
  Facebook: () => <div data-testid="facebook-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  EyeOff: () => <div data-testid="eye-off-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
}));

// Mock dnd-kit - simplify for testing
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
}));

vi.mock("@dnd-kit/sortable", () => ({
  arrayMove: (arr: unknown[], from: number, to: number) => {
    const result = [...arr];
    const [removed] = result.splice(from, 1);
    result.splice(to, 0, removed);
    return result;
  },
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: vi.fn(),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: () => null,
    },
  },
}));

// Mock Supabase client
const mockFrom = vi.fn();
const mockSupabase = {
  from: mockFrom,
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabase,
}));

import { DispositionsClient } from "./dispositions-client";

describe("DispositionsClient", () => {
  const defaultFacebookSettings = {
    pixel_id: null,
    capi_access_token: null,
    test_event_code: null,
    enabled: false,
    pixel_base_code: null,
    dataset_id: null,
  };

  const defaultDispositions = [
    {
      id: "disp-1",
      organization_id: "org-123",
      name: "Qualified Lead",
      color: "#22c55e",
      icon: null,
      is_active: true,
      value: 100,
      display_order: 0,
      fb_event_name: null,
      fb_event_enabled: false,
      fb_event_params: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "disp-2",
      organization_id: "org-123",
      name: "Not Interested",
      color: "#ef4444",
      icon: null,
      is_active: true,
      value: null,
      display_order: 1,
      fb_event_name: null,
      fb_event_enabled: false,
      fb_event_params: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const defaultProps = {
    dispositions: defaultDispositions,
    organizationId: "org-123",
    facebookSettings: defaultFacebookSettings,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "new-disp",
              organization_id: "org-123",
              name: "New Disposition",
              color: "#22c55e",
              is_active: true,
              display_order: 2,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // DISPLAY BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Display - Header", () => {
    it("shows page title 'Call Dispositions'", () => {
      render(<DispositionsClient {...defaultProps} />);

      expect(screen.getByText("Call Dispositions")).toBeInTheDocument();
    });

    it("shows subtitle about Facebook events", () => {
      render(<DispositionsClient {...defaultProps} />);

      expect(screen.getByText(/Define call outcomes and optionally fire Facebook events/)).toBeInTheDocument();
    });

    it("shows 'Dispositions' section heading", () => {
      render(<DispositionsClient {...defaultProps} />);

      expect(screen.getByText("Dispositions")).toBeInTheDocument();
    });
  });

  describe("Display - Dispositions List", () => {
    it("shows list of dispositions", () => {
      render(<DispositionsClient {...defaultProps} />);

      expect(screen.getByText("Qualified Lead")).toBeInTheDocument();
      expect(screen.getByText("Not Interested")).toBeInTheDocument();
    });

    it("shows disposition values as formatted currency", () => {
      render(<DispositionsClient {...defaultProps} />);

      expect(screen.getByText("$100.00")).toBeInTheDocument();
    });

    it("shows dash for dispositions without value", () => {
      render(<DispositionsClient {...defaultProps} />);

      // The "Not Interested" disposition has no value, should show dash
      const dashes = screen.getAllByText("—");
      expect(dashes.length).toBeGreaterThan(0);
    });

    it("shows trophy icon for primary disposition (first in list)", () => {
      render(<DispositionsClient {...defaultProps} />);

      const trophyIcons = screen.getAllByTestId("trophy-icon");
      expect(trophyIcons.length).toBeGreaterThan(0);
    });

    it("shows table headers for Name, Value, FB Event, Actions", () => {
      render(<DispositionsClient {...defaultProps} />);

      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Value")).toBeInTheDocument();
      expect(screen.getByText("FB Event")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });
  });

  describe("Display - Empty State", () => {
    it("shows empty state when no dispositions", () => {
      render(
        <DispositionsClient
          {...defaultProps}
          dispositions={[]}
        />
      );

      expect(screen.getByText("No dispositions yet")).toBeInTheDocument();
      expect(screen.getByText(/Create dispositions for agents to categorize call outcomes/)).toBeInTheDocument();
    });

    it("shows 'Add First Disposition' button in empty state", () => {
      render(
        <DispositionsClient
          {...defaultProps}
          dispositions={[]}
        />
      );

      expect(screen.getByRole("button", { name: /Add First Disposition/i })).toBeInTheDocument();
    });
  });

  describe("Display - Add Disposition Button", () => {
    it("shows 'Add Disposition' button", () => {
      render(<DispositionsClient {...defaultProps} />);

      expect(screen.getByRole("button", { name: /Add Disposition/i })).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // ADD FORM BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Add Disposition Form", () => {
    it("shows add form when Add Disposition clicked", () => {
      render(<DispositionsClient {...defaultProps} />);

      const addButton = screen.getByRole("button", { name: /Add Disposition/i });
      fireEvent.click(addButton);

      expect(screen.getByPlaceholderText("e.g., Qualified Lead")).toBeInTheDocument();
    });

    it("shows name input in add form", () => {
      render(<DispositionsClient {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Add Disposition/i }));

      expect(screen.getByPlaceholderText("e.g., Qualified Lead")).toBeInTheDocument();
    });

    it("shows color selector in add form", () => {
      render(<DispositionsClient {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Add Disposition/i }));

      // Color select should be present - multiple comboboxes exist (color + fb event)
      const selects = screen.getAllByRole("combobox");
      expect(selects.length).toBeGreaterThanOrEqual(1);
    });

    it("shows value input in add form", () => {
      render(<DispositionsClient {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Add Disposition/i }));

      expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
    });

    it("shows 'Make primary' checkbox in add form", () => {
      render(<DispositionsClient {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Add Disposition/i }));

      expect(screen.getByText(/Make primary/)).toBeInTheDocument();
      expect(screen.getByText(/main conversion goal/)).toBeInTheDocument();
    });

    it("shows Cancel button in add form", () => {
      render(<DispositionsClient {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Add Disposition/i }));

      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
    });

    it("hides add form when Cancel clicked", () => {
      render(<DispositionsClient {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Add Disposition/i }));
      expect(screen.getByPlaceholderText("e.g., Qualified Lead")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
      expect(screen.queryByPlaceholderText("e.g., Qualified Lead")).not.toBeInTheDocument();
    });

    it("Add button in form is disabled when name is empty", () => {
      render(<DispositionsClient {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Add Disposition/i }));

      // The add button inside the form
      const addButtons = screen.getAllByRole("button", { name: /Add Disposition/i });
      const formAddButton = addButtons[addButtons.length - 1]; // Get the one in the form
      expect(formAddButton).toBeDisabled();
    });

    it("Add button in form is enabled when name is provided", () => {
      render(<DispositionsClient {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Add Disposition/i }));

      const nameInput = screen.getByPlaceholderText("e.g., Qualified Lead");
      fireEvent.change(nameInput, { target: { value: "New Disposition" } });

      const addButtons = screen.getAllByRole("button", { name: /Add Disposition/i });
      const formAddButton = addButtons[addButtons.length - 1];
      expect(formAddButton).not.toBeDisabled();
    });

    it("adds new disposition when form submitted", async () => {
      render(<DispositionsClient {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Add Disposition/i }));

      const nameInput = screen.getByPlaceholderText("e.g., Qualified Lead");
      fireEvent.change(nameInput, { target: { value: "New Disposition" } });

      const addButtons = screen.getAllByRole("button", { name: /Add Disposition/i });
      const formAddButton = addButtons[addButtons.length - 1];
      fireEvent.click(formAddButton);

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("dispositions");
      });
    });

    it("clears form and hides it after successful add", async () => {
      render(<DispositionsClient {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Add Disposition/i }));

      const nameInput = screen.getByPlaceholderText("e.g., Qualified Lead");
      fireEvent.change(nameInput, { target: { value: "New Disposition" } });

      const addButtons = screen.getAllByRole("button", { name: /Add Disposition/i });
      const formAddButton = addButtons[addButtons.length - 1];
      fireEvent.click(formAddButton);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText("e.g., Qualified Lead")).not.toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // EDIT BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Edit Disposition", () => {
    it("shows Edit button for each disposition", () => {
      render(<DispositionsClient {...defaultProps} />);

      const editButtons = screen.getAllByText("Edit");
      expect(editButtons.length).toBe(2); // Two dispositions
    });

    it("shows edit inputs when Edit clicked", () => {
      render(<DispositionsClient {...defaultProps} />);

      const editButtons = screen.getAllByText("Edit");
      fireEvent.click(editButtons[0]);

      // Should show input with current name
      expect(screen.getByDisplayValue("Qualified Lead")).toBeInTheDocument();
    });

    it("shows check and X buttons in edit mode", () => {
      render(<DispositionsClient {...defaultProps} />);

      const editButtons = screen.getAllByText("Edit");
      fireEvent.click(editButtons[0]);

      expect(screen.getByTestId("check-icon")).toBeInTheDocument();
      expect(screen.getByTestId("x-icon")).toBeInTheDocument();
    });

    it("cancels edit when X button clicked", () => {
      render(<DispositionsClient {...defaultProps} />);

      const editButtons = screen.getAllByText("Edit");
      fireEvent.click(editButtons[0]);

      const cancelButton = screen.getByTestId("x-icon").closest("button");
      fireEvent.click(cancelButton!);

      // Should go back to showing Edit button
      expect(screen.getAllByText("Edit").length).toBe(2);
    });

    it("saves edit when check button clicked", async () => {
      render(<DispositionsClient {...defaultProps} />);

      const editButtons = screen.getAllByText("Edit");
      fireEvent.click(editButtons[0]);

      const nameInput = screen.getByDisplayValue("Qualified Lead");
      fireEvent.change(nameInput, { target: { value: "Updated Name" } });

      const saveButton = screen.getByTestId("check-icon").closest("button");
      fireEvent.click(saveButton!);

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("dispositions");
      });
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Delete Disposition", () => {
    it("shows delete button (trash icon) for each disposition", () => {
      render(<DispositionsClient {...defaultProps} />);

      const trashIcons = screen.getAllByTestId("trash2-icon");
      expect(trashIcons.length).toBe(2);
    });

    it("shows confirm dialog when delete clicked", () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

      render(<DispositionsClient {...defaultProps} />);

      const trashButton = screen.getAllByTestId("trash2-icon")[0].closest("button");
      fireEvent.click(trashButton!);

      expect(confirmSpy).toHaveBeenCalledWith("Are you sure you want to delete this disposition?");

      confirmSpy.mockRestore();
    });

    it("does not delete if user cancels confirm", () => {
      vi.spyOn(window, "confirm").mockReturnValue(false);

      render(<DispositionsClient {...defaultProps} />);

      const trashButton = screen.getAllByTestId("trash2-icon")[0].closest("button");
      fireEvent.click(trashButton!);

      // Both dispositions should still be visible
      expect(screen.getByText("Qualified Lead")).toBeInTheDocument();
      expect(screen.getByText("Not Interested")).toBeInTheDocument();
    });

    it("deletes disposition when user confirms", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);

      render(<DispositionsClient {...defaultProps} />);

      const trashButton = screen.getAllByTestId("trash2-icon")[0].closest("button");
      fireEvent.click(trashButton!);

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("dispositions");
      });
    });
  });

  // ---------------------------------------------------------------------------
  // FACEBOOK INTEGRATION BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Facebook Integration Section", () => {
    it("shows Facebook Pixel / Conversion API section", () => {
      render(<DispositionsClient {...defaultProps} />);

      expect(screen.getByText("Facebook Pixel / Conversion API")).toBeInTheDocument();
    });

    it("shows chevron icon for expand/collapse", () => {
      render(<DispositionsClient {...defaultProps} />);

      expect(screen.getByTestId("chevron-down-icon")).toBeInTheDocument();
    });

    it("does not show Connected badge when not configured", () => {
      render(<DispositionsClient {...defaultProps} />);

      expect(screen.queryByText("Connected")).not.toBeInTheDocument();
    });

    it("shows Connected badge when Facebook is configured", () => {
      const configuredFbSettings = {
        ...defaultFacebookSettings,
        pixel_id: "123456789",
        capi_access_token: "EAAxxxxx",
        enabled: true,
      };

      render(
        <DispositionsClient
          {...defaultProps}
          facebookSettings={configuredFbSettings}
        />
      );

      expect(screen.getByText("Connected")).toBeInTheDocument();
    });

    it("expands Facebook section when clicked", () => {
      render(<DispositionsClient {...defaultProps} />);

      const fbSection = screen.getByText("Facebook Pixel / Conversion API").closest("button");
      fireEvent.click(fbSection!);

      expect(screen.getByText("Facebook Pixel ID")).toBeInTheDocument();
      expect(screen.getByText("Conversion API Access Token")).toBeInTheDocument();
    });

    it("shows Test Event Code field when expanded", () => {
      render(<DispositionsClient {...defaultProps} />);

      const fbSection = screen.getByText("Facebook Pixel / Conversion API").closest("button");
      fireEvent.click(fbSection!);

      expect(screen.getByText(/Test Event Code/)).toBeInTheDocument();
    });

    it("shows Save Facebook Settings button when expanded", () => {
      render(<DispositionsClient {...defaultProps} />);

      const fbSection = screen.getByText("Facebook Pixel / Conversion API").closest("button");
      fireEvent.click(fbSection!);

      expect(screen.getByRole("button", { name: /Save Facebook Settings/i })).toBeInTheDocument();
    });

    it("Save Facebook Settings button is disabled when no changes", () => {
      render(<DispositionsClient {...defaultProps} />);

      const fbSection = screen.getByText("Facebook Pixel / Conversion API").closest("button");
      fireEvent.click(fbSection!);

      expect(screen.getByRole("button", { name: /Save Facebook Settings/i })).toBeDisabled();
    });

    it("Save Facebook Settings button is enabled when changes made", () => {
      render(<DispositionsClient {...defaultProps} />);

      const fbSection = screen.getByText("Facebook Pixel / Conversion API").closest("button");
      fireEvent.click(fbSection!);

      const pixelInput = screen.getByPlaceholderText("123456789012345");
      fireEvent.change(pixelInput, { target: { value: "999888777666555" } });

      expect(screen.getByRole("button", { name: /Save Facebook Settings/i })).not.toBeDisabled();
    });

    it("shows password toggle for access token field", () => {
      render(<DispositionsClient {...defaultProps} />);

      const fbSection = screen.getByText("Facebook Pixel / Conversion API").closest("button");
      fireEvent.click(fbSection!);

      // Should have eye or eye-off icon
      expect(screen.getByTestId("eye-icon") || screen.getByTestId("eye-off-icon")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // FACEBOOK EVENT IN DISPOSITIONS
  // ---------------------------------------------------------------------------

  describe("Facebook Events in Dispositions", () => {
    it("shows FB Event dropdown is disabled when Facebook not configured", () => {
      render(<DispositionsClient {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Add Disposition/i }));

      // Find the FB event select
      const selects = screen.getAllByRole("combobox");
      const fbEventSelect = selects[selects.length - 1]; // Last one should be FB event

      expect(fbEventSelect).toBeDisabled();
    });

    it("shows FB Event dropdown is enabled when Facebook is configured", () => {
      const configuredFbSettings = {
        ...defaultFacebookSettings,
        pixel_id: "123456789",
        capi_access_token: "EAAxxxxx",
        enabled: true,
      };

      render(
        <DispositionsClient
          {...defaultProps}
          facebookSettings={configuredFbSettings}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Add Disposition/i }));

      // Find the FB event select
      const selects = screen.getAllByRole("combobox");
      const fbEventSelect = selects[selects.length - 1];

      expect(fbEventSelect).not.toBeDisabled();
    });

    it("shows 'Set up Facebook above first' hint when not configured", () => {
      render(<DispositionsClient {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Add Disposition/i }));

      expect(screen.getByText("Set up Facebook above first")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // INFO/HELP TEXT
  // ---------------------------------------------------------------------------

  describe("Info Text", () => {
    it("shows tip about primary disposition", () => {
      render(<DispositionsClient {...defaultProps} />);

      expect(screen.getByText(/The first disposition.*with the trophy.*is your primary conversion goal/)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------

  describe("Edge Cases", () => {
    it("handles disposition with very long name", () => {
      const longNameDisposition = {
        ...defaultDispositions[0],
        name: "This is a very long disposition name that might cause layout issues",
      };

      render(
        <DispositionsClient
          {...defaultProps}
          dispositions={[longNameDisposition]}
        />
      );

      expect(screen.getByText("This is a very long disposition name that might cause layout issues")).toBeInTheDocument();
    });

    it("handles disposition with zero value", () => {
      const zeroValueDisposition = {
        ...defaultDispositions[0],
        value: 0,
      };

      render(
        <DispositionsClient
          {...defaultProps}
          dispositions={[zeroValueDisposition]}
        />
      );

      expect(screen.getByText("$0.00")).toBeInTheDocument();
    });

    it("handles disposition with decimal value", () => {
      const decimalValueDisposition = {
        ...defaultDispositions[0],
        value: 99.99,
      };

      render(
        <DispositionsClient
          {...defaultProps}
          dispositions={[decimalValueDisposition]}
        />
      );

      expect(screen.getByText("$99.99")).toBeInTheDocument();
    });

    it("handles single disposition (still shows primary)", () => {
      render(
        <DispositionsClient
          {...defaultProps}
          dispositions={[defaultDispositions[0]]}
        />
      );

      expect(screen.getByText("Qualified Lead")).toBeInTheDocument();
      expect(screen.getAllByTestId("trophy-icon").length).toBeGreaterThan(0);
    });
  });
});

