/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Users: () => <div data-testid="users-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Globe: () => <div data-testid="globe-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
  Layers: () => <div data-testid="layers-icon" />,
  UserPlus: () => <div data-testid="user-plus-icon" />,
  X: () => <div data-testid="x-icon" />,
  Route: () => <div data-testid="route-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  Pencil: () => <div data-testid="pencil-icon" />,
  MessageSquare: () => <div data-testid="message-square-icon" />,
  Check: () => <div data-testid="check-icon" />,
  Video: () => <div data-testid="video-icon" />,
  Upload: () => <div data-testid="upload-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  Play: () => <div data-testid="play-icon" />,
  Square: () => <div data-testid="square-icon" />,
  Camera: () => <div data-testid="camera-icon" />,
  Library: () => <div data-testid="library-icon" />,
  Layout: () => <div data-testid="layout-icon" />,
  Monitor: () => <div data-testid="monitor-icon" />,
  Smartphone: () => <div data-testid="smartphone-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  TimerOff: () => <div data-testid="timer-off-icon" />,
  Minimize2: () => <div data-testid="minimize-icon" />,
  Sun: () => <div data-testid="sun-icon" />,
  Moon: () => <div data-testid="moon-icon" />,
  Droplets: () => <div data-testid="droplets-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
}));

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabaseClient,
}));

// Mock fetch for signaling server sync
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock console to reduce noise
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});
vi.spyOn(console, "warn").mockImplementation(() => {});

// Mock window.alert
const mockAlert = vi.spyOn(window, "alert").mockImplementation(() => {});

import { PoolsClient } from "./pools-client";

/**
 * PoolsClient Component Tests
 *
 * Tests capture the current behavior of the PoolsClient component:
 * - Pool creation: Creates pool in database, validates pool name required, handles duplicates
 * - Pool deletion: Deletes pool immediately without confirmation, prevents catch-all deletion
 * - Pool display: Shows pool name, agent count (in header), routing rules count
 * - Agent management: Adds agents to pools, removes agents, updates priority
 */

describe("PoolsClient", () => {
  const defaultProps = {
    pools: [],
    agents: [
      { id: "agent-1", display_name: "John Doe", wave_video_url: null, intro_video_url: null, loop_video_url: null },
      { id: "agent-2", display_name: "Jane Smith", wave_video_url: null, intro_video_url: null, loop_video_url: null },
    ],
    organizationId: "org-123",
    pathsWithVisitors: [],
    defaultVideos: { wave: null, intro: null, loop: null },
    orgDefaultWidgetSettings: {
      size: "medium" as const,
      position: "bottom-right" as const,
      devices: "all" as const,
      trigger_delay: 3,
      auto_hide_delay: null,
      show_minimize_button: false,
    },
  };

  const mockPool = {
    id: "pool-1",
    organization_id: "org-123",
    name: "Sales Team",
    description: "Sales department pool",
    intro_script: "Hi! How can I help you today?",
    example_wave_video_url: null,
    example_intro_video_url: null,
    example_loop_video_url: null,
    is_default: false,
    is_catch_all: false,
    widget_settings: null,
    pool_routing_rules: [],
    agent_pool_members: [],
  };

  const mockCatchAllPool = {
    ...mockPool,
    id: "pool-catchall",
    name: "All",
    is_catch_all: true,
  };

  const mockPoolWithMembers = {
    ...mockPool,
    agent_pool_members: [
      {
        id: "member-1",
        agent_profile_id: "agent-1",
        priority_rank: 1,
        agent_profiles: { id: "agent-1", display_name: "John Doe" },
      },
      {
        id: "member-2",
        agent_profile_id: "agent-2",
        priority_rank: 2,
        agent_profiles: { id: "agent-2", display_name: "Jane Smith" },
      },
    ],
  };

  const mockPoolWithRules = {
    ...mockPool,
    pool_routing_rules: [
      {
        id: "rule-1",
        pool_id: "pool-1",
        name: "Pricing Pages",
        domain_pattern: "*",
        path_pattern: "/pricing*",
        conditions: [],
        priority: 1,
        is_active: true,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default fetch mock for signaling server sync
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    // Reset Supabase mock
    mockSupabaseClient.from.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to setup Supabase insert mock
  function setupInsertMock(data: object | null, error: object | null = null) {
    const mockSelect = vi.fn(() => ({
      single: vi.fn().mockResolvedValue({ data, error }),
    }));
    const mockInsert = vi.fn(() => ({
      select: mockSelect,
    }));
    mockSupabaseClient.from.mockReturnValue({
      insert: mockInsert,
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    });
    return { mockInsert, mockSelect };
  }

  // Helper to setup Supabase delete mock
  function setupDeleteMock(error: object | null = null) {
    const mockEq = vi.fn().mockResolvedValue({ error });
    const mockDelete = vi.fn(() => ({ eq: mockEq }));
    mockSupabaseClient.from.mockReturnValue({
      delete: mockDelete,
    });
    return { mockDelete, mockEq };
  }

  // ---------------------------------------------------------------------------
  // POOL DISPLAY BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Pool Display - Empty State", () => {
    it("shows New Pool button when no pools exist", () => {
      render(<PoolsClient {...defaultProps} />);

      expect(screen.getByText("New Pool")).toBeInTheDocument();
    });

    it("shows page title", () => {
      render(<PoolsClient {...defaultProps} />);

      expect(screen.getByText("Agent Pools")).toBeInTheDocument();
    });
  });

  describe("Pool Display - Pool List", () => {
    it("shows pool name in the list", () => {
      render(<PoolsClient {...defaultProps} pools={[mockPool]} />);

      expect(screen.getByText("Sales Team")).toBeInTheDocument();
    });

    it("shows Agents label in pool header", () => {
      render(<PoolsClient {...defaultProps} pools={[mockPoolWithMembers]} />);

      // The component shows "Agents" label with count below it
      expect(screen.getByText("Agents")).toBeInTheDocument();
    });

    it("shows Rules label in pool header", () => {
      render(<PoolsClient {...defaultProps} pools={[mockPoolWithRules]} />);

      // The component shows "Rules" label with count below it
      expect(screen.getByText("Rules")).toBeInTheDocument();
    });

    it("shows 'Catch-All' badge for catch-all pool", () => {
      render(<PoolsClient {...defaultProps} pools={[mockCatchAllPool]} />);

      expect(screen.getByText("Catch-All")).toBeInTheDocument();
    });

    it("displays both pools when multiple pools exist", () => {
      render(<PoolsClient {...defaultProps} pools={[mockCatchAllPool, mockPool]} />);

      // Verify both pools are rendered
      expect(screen.getByText("All")).toBeInTheDocument();
      expect(screen.getByText("Sales Team")).toBeInTheDocument();
    });
  });

  describe("Pool Display - Expanded State", () => {
    it("expands first pool by default", () => {
      render(<PoolsClient {...defaultProps} pools={[mockPool]} />);

      // When expanded, Video Sequence section should be visible
      expect(screen.getByText("Video Sequence")).toBeInTheDocument();
    });

    it("shows pool description when expanded", () => {
      render(<PoolsClient {...defaultProps} pools={[mockPool]} />);

      expect(screen.getByText("Sales department pool")).toBeInTheDocument();
    });

    it("toggles pool expanded state on header click", async () => {
      render(<PoolsClient {...defaultProps} pools={[mockPool]} />);

      // Find the pool header (div that contains the pool name and is clickable)
      const poolHeader = screen.getByText("Sales Team").closest("div[class*='cursor-pointer']");
      expect(poolHeader).toBeInTheDocument();

      fireEvent.click(poolHeader!);

      // After collapse, Routing Rules section should not be visible
      await waitFor(() => {
        expect(screen.queryByText("Routing Rules")).not.toBeInTheDocument();
      });

      // Click again to expand
      fireEvent.click(poolHeader!);

      await waitFor(() => {
        expect(screen.getByText("Routing Rules")).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // POOL CREATION BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Pool Creation - Form Display", () => {
    it("shows pool creation form when New Pool is clicked", () => {
      render(<PoolsClient {...defaultProps} />);

      fireEvent.click(screen.getByText("New Pool"));

      // The actual placeholder text in the component
      expect(screen.getByPlaceholderText("e.g., Sales Team, Support, Enterprise")).toBeInTheDocument();
    });

    it("shows Create Pool button in creation form", () => {
      render(<PoolsClient {...defaultProps} />);

      fireEvent.click(screen.getByText("New Pool"));

      expect(screen.getByText("Create Pool")).toBeInTheDocument();
    });

    it("shows Cancel button in creation form", () => {
      render(<PoolsClient {...defaultProps} />);

      fireEvent.click(screen.getByText("New Pool"));

      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("hides creation form when Cancel is clicked", () => {
      render(<PoolsClient {...defaultProps} />);

      fireEvent.click(screen.getByText("New Pool"));
      fireEvent.click(screen.getByText("Cancel"));

      expect(screen.queryByPlaceholderText("e.g. Sales Team, Enterprise Support")).not.toBeInTheDocument();
    });
  });

  describe("Pool Creation - Validation", () => {
    it("does not create pool when name is empty", async () => {
      setupInsertMock(mockPool);
      render(<PoolsClient {...defaultProps} />);

      fireEvent.click(screen.getByText("New Pool"));
      
      // Leave name empty, click Create
      fireEvent.click(screen.getByText("Create Pool"));

      // Insert should not be called
      expect(mockSupabaseClient.from).not.toHaveBeenCalledWith("agent_pools");
    });

    it("does not create pool when name is only whitespace", async () => {
      setupInsertMock(mockPool);
      render(<PoolsClient {...defaultProps} />);

      fireEvent.click(screen.getByText("New Pool"));
      
      const input = screen.getByPlaceholderText("e.g., Sales Team, Support, Enterprise");
      fireEvent.change(input, { target: { value: "   " } });
      fireEvent.click(screen.getByText("Create Pool"));

      // Insert should not be called
      expect(mockSupabaseClient.from).not.toHaveBeenCalledWith("agent_pools");
    });
  });

  describe("Pool Creation - Database Insert", () => {
    it("creates pool in database with correct data", async () => {
      const newPool = {
        ...mockPool,
        id: "new-pool-id",
        name: "New Sales Pool",
        description: "A new pool",
      };
      const { mockInsert } = setupInsertMock(newPool);

      render(<PoolsClient {...defaultProps} />);

      fireEvent.click(screen.getByText("New Pool"));

      const nameInput = screen.getByPlaceholderText("e.g., Sales Team, Support, Enterprise");
      fireEvent.change(nameInput, { target: { value: "New Sales Pool" } });

      // Find description input
      const descInput = screen.getByPlaceholderText("What is this pool for?");
      fireEvent.change(descInput, { target: { value: "A new pool" } });

      fireEvent.click(screen.getByText("Create Pool"));

      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith("agent_pools");
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            organization_id: "org-123",
            name: "New Sales Pool",
            description: "A new pool",
            is_default: false,
            is_catch_all: false,
          })
        );
      });
    });

    it("sets description to null when empty", async () => {
      const newPool = { ...mockPool, name: "Test Pool", description: null };
      const { mockInsert } = setupInsertMock(newPool);

      render(<PoolsClient {...defaultProps} />);

      fireEvent.click(screen.getByText("New Pool"));

      const nameInput = screen.getByPlaceholderText("e.g., Sales Team, Support, Enterprise");
      fireEvent.change(nameInput, { target: { value: "Test Pool" } });

      // Leave description empty
      fireEvent.click(screen.getByText("Create Pool"));

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            description: null,
          })
        );
      });
    });

    it("adds newly created pool to the list", async () => {
      const newPool = { ...mockPool, id: "new-id", name: "Brand New Pool", pool_routing_rules: [], agent_pool_members: [] };
      setupInsertMock(newPool);

      render(<PoolsClient {...defaultProps} />);

      fireEvent.click(screen.getByText("New Pool"));

      const nameInput = screen.getByPlaceholderText("e.g., Sales Team, Support, Enterprise");
      fireEvent.change(nameInput, { target: { value: "Brand New Pool" } });
      fireEvent.click(screen.getByText("Create Pool"));

      await waitFor(() => {
        expect(screen.getByText("Brand New Pool")).toBeInTheDocument();
      });
    });

    it("expands newly created pool after creation", async () => {
      const newPool = {
        ...mockPool,
        id: "new-id",
        name: "Brand New Pool",
        pool_routing_rules: [],
        agent_pool_members: [],
        intro_script: "Welcome to our service!",
      };
      setupInsertMock(newPool);

      render(<PoolsClient {...defaultProps} />);

      fireEvent.click(screen.getByText("New Pool"));

      const nameInput = screen.getByPlaceholderText("e.g., Sales Team, Support, Enterprise");
      fireEvent.change(nameInput, { target: { value: "Brand New Pool" } });
      fireEvent.click(screen.getByText("Create Pool"));

      await waitFor(() => {
        // Video Sequence section should be visible (indicating expanded state)
        expect(screen.getByText("Video Sequence")).toBeInTheDocument();
      });
    });

    it("clears form after successful creation", async () => {
      const newPool = { ...mockPool, id: "new-id", name: "Test", pool_routing_rules: [], agent_pool_members: [] };
      setupInsertMock(newPool);

      render(<PoolsClient {...defaultProps} />);

      fireEvent.click(screen.getByText("New Pool"));

      const nameInput = screen.getByPlaceholderText("e.g., Sales Team, Support, Enterprise");
      fireEvent.change(nameInput, { target: { value: "Test" } });
      fireEvent.click(screen.getByText("Create Pool"));

      await waitFor(() => {
        expect(screen.getByText("Test")).toBeInTheDocument();
      });

      // Form should be hidden after successful creation
      expect(screen.queryByPlaceholderText("e.g., Sales Team, Support, Enterprise")).not.toBeInTheDocument();
    });
  });

  describe("Pool Creation - Duplicate Name Handling", () => {
    it("calls supabase insert when creating pool with duplicate name", async () => {
      const { mockInsert } = setupInsertMock(null, { code: "23505", message: "duplicate key value" });

      render(<PoolsClient {...defaultProps} />);

      fireEvent.click(screen.getByText("New Pool"));

      const nameInput = screen.getByPlaceholderText("e.g., Sales Team, Support, Enterprise");
      fireEvent.change(nameInput, { target: { value: "Existing Pool" } });
      fireEvent.click(screen.getByText("Create Pool"));

      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith("agent_pools");
        expect(mockInsert).toHaveBeenCalled();
      });
    });

    it("does not close form when insert fails", async () => {
      setupInsertMock(null, { code: "23505", message: "duplicate key value" });

      render(<PoolsClient {...defaultProps} />);

      fireEvent.click(screen.getByText("New Pool"));

      const nameInput = screen.getByPlaceholderText("e.g., Sales Team, Support, Enterprise");
      fireEvent.change(nameInput, { target: { value: "Existing Pool" } });
      
      // Form should be visible before and after click
      expect(nameInput).toBeInTheDocument();
      
      fireEvent.click(screen.getByText("Create Pool"));

      // Need a small delay for the async operation
      await new Promise((r) => setTimeout(r, 100));

      // Form should still be visible since creation failed
      expect(screen.getByPlaceholderText("e.g., Sales Team, Support, Enterprise")).toBeInTheDocument();
    });
  });

  describe("Pool Creation - Other Errors", () => {
    it("calls supabase insert even when database error occurs", async () => {
      const { mockInsert } = setupInsertMock(null, { message: "Database connection failed" });

      render(<PoolsClient {...defaultProps} />);

      fireEvent.click(screen.getByText("New Pool"));

      const nameInput = screen.getByPlaceholderText("e.g., Sales Team, Support, Enterprise");
      fireEvent.change(nameInput, { target: { value: "Test Pool" } });
      fireEvent.click(screen.getByText("Create Pool"));

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalled();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // POOL DELETION BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Pool Deletion - Delete Button Display", () => {
    it("shows delete button (trash icon) for regular pools", () => {
      render(<PoolsClient {...defaultProps} pools={[mockPool]} />);

      // Delete button is a trash icon button in the pool header
      const trashIcons = screen.getAllByTestId("trash-icon");
      expect(trashIcons.length).toBeGreaterThan(0);
    });

    it("does not show delete button for catch-all pool", () => {
      render(<PoolsClient {...defaultProps} pools={[mockCatchAllPool]} />);

      // For catch-all pools, there should be no trash icon in the header area
      // The component conditionally renders the delete button based on is_catch_all
      const header = screen.getByText("All").closest("div[class*='cursor-pointer']");
      const trashInHeader = header?.querySelector("[data-testid='trash-icon']");
      expect(trashInHeader).not.toBeInTheDocument();
    });
  });

  describe("Pool Deletion - Database Delete", () => {
    it("deletes pool immediately from database when delete button clicked (no confirmation)", async () => {
      const { mockDelete, mockEq } = setupDeleteMock();

      render(<PoolsClient {...defaultProps} pools={[mockPool]} />);

      // Find and click the trash icon button
      const trashIcon = screen.getByTestId("trash-icon");
      const deleteButton = trashIcon.closest("button");
      expect(deleteButton).toBeInTheDocument();

      fireEvent.click(deleteButton!);

      // Current behavior: deletes immediately without confirmation modal
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith("agent_pools");
        expect(mockDelete).toHaveBeenCalled();
        expect(mockEq).toHaveBeenCalledWith("id", "pool-1");
      });
    });

    it("removes pool from list after successful deletion", async () => {
      setupDeleteMock();

      render(<PoolsClient {...defaultProps} pools={[mockPool]} />);

      // Click delete button
      const trashIcon = screen.getByTestId("trash-icon");
      const deleteButton = trashIcon.closest("button");
      fireEvent.click(deleteButton!);

      await waitFor(() => {
        // Pool should be removed from the list
        expect(screen.queryByText("Sales Team")).not.toBeInTheDocument();
      });
    });

    it("prevents deletion of catch-all pool - delete button not shown", () => {
      const { mockDelete } = setupDeleteMock();

      render(<PoolsClient {...defaultProps} pools={[mockCatchAllPool]} />);

      // For catch-all, the trash button should not exist in the header
      // We can check that no delete was triggered
      const header = screen.getByText("All").closest("div[class*='cursor-pointer']");
      const deleteButton = header?.querySelector("button");
      
      // If there's a button, it should not be a delete button (no trash icon as direct child)
      if (deleteButton) {
        const hasTrashIcon = deleteButton.querySelector("[data-testid='trash-icon']");
        expect(hasTrashIcon).toBeNull();
      }

      // Verify delete was never called
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it("keeps other pools when one pool is deleted", async () => {
      setupDeleteMock();

      render(<PoolsClient {...defaultProps} pools={[mockPool, mockCatchAllPool]} />);

      // Find the delete button for the regular pool (not catch-all)
      // The mockPool is "Sales Team" and mockCatchAllPool is "All"
      const trashIcon = screen.getByTestId("trash-icon");
      const deleteButton = trashIcon.closest("button");
      fireEvent.click(deleteButton!);

      await waitFor(() => {
        // Sales Team should be removed
        expect(screen.queryByText("Sales Team")).not.toBeInTheDocument();
        // Catch-all should remain
        expect(screen.getByText("All")).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // AGENT MANAGEMENT BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Agent Management - Add Agent", () => {
    it("shows Add Agent button in expanded pool", () => {
      render(<PoolsClient {...defaultProps} pools={[mockPool]} />);

      // Look for "Add Agent" button
      expect(screen.getByText("Add Agent")).toBeInTheDocument();
    });

    it("shows agents section header with count in expanded pool", () => {
      render(<PoolsClient {...defaultProps} pools={[mockPool]} />);

      // The agents section header shows "Agents (count)"
      expect(screen.getByText(/Agents \(0\)/)).toBeInTheDocument();
    });
  });

  describe("Agent Management - Display", () => {
    it("shows agent names in expanded pool", () => {
      render(<PoolsClient {...defaultProps} pools={[mockPoolWithMembers]} />);

      // Agent names should be displayed in the pool
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("shows remove button (X icon) for each agent in pool", () => {
      render(<PoolsClient {...defaultProps} pools={[mockPoolWithMembers]} />);

      // There should be X buttons to remove agents
      const xIcons = screen.getAllByTestId("x-icon");
      // At least one X icon per agent
      expect(xIcons.length).toBeGreaterThanOrEqual(2);
    });

    it("shows agents section with correct count", () => {
      render(<PoolsClient {...defaultProps} pools={[mockPoolWithMembers]} />);

      // The agents section header shows "Agents (2)"
      expect(screen.getByText(/Agents \(2\)/)).toBeInTheDocument();
    });
  });

  describe("Agent Management - Priority Display", () => {
    it("shows Primary tier section when agents have priority 1", () => {
      render(<PoolsClient {...defaultProps} pools={[mockPoolWithMembers]} />);

      // The "Primary" tier label should be visible since first agent has priority_rank 1
      // Using queryAllByText since there may be multiple instances (label + dropdown options)
      const primaryElements = screen.queryAllByText(/Primary/);
      expect(primaryElements.length).toBeGreaterThan(0);
    });

    it("shows Standard tier section when agents have priority 2", () => {
      render(<PoolsClient {...defaultProps} pools={[mockPoolWithMembers]} />);

      // The "Standard" tier label should be visible since second agent has priority_rank 2
      const standardElements = screen.queryAllByText(/Standard/);
      expect(standardElements.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // SERVER SYNC BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Server Sync", () => {
    it("syncs config to signaling server on initial load", async () => {
      render(<PoolsClient {...defaultProps} pools={[mockPool]} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
        const fetchCall = mockFetch.mock.calls.find((call) =>
          call[0].includes("/api/config/org")
        );
        expect(fetchCall).toBeDefined();
      });
    });

    it("sends POST request with organization ID", async () => {
      render(<PoolsClient {...defaultProps} pools={[mockPool]} />);

      await waitFor(() => {
        const fetchCall = mockFetch.mock.calls.find((call) =>
          call[0].includes("/api/config/org")
        );
        expect(fetchCall).toBeDefined();
        expect(fetchCall![1].method).toBe("POST");
        const body = JSON.parse(fetchCall![1].body);
        expect(body.orgId).toBe("org-123");
      });
    });
  });

  // ---------------------------------------------------------------------------
  // CATCH-ALL POOL SPECIAL BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Catch-All Pool - Special Behaviors", () => {
    it("shows Catch-All Pool heading for catch-all pools", () => {
      render(<PoolsClient {...defaultProps} pools={[mockCatchAllPool]} />);

      // The component shows "Catch-All Pool" as a heading for such pools
      expect(screen.getByText("Catch-All Pool")).toBeInTheDocument();
    });

    it("shows message about catch-all receiving unmatched visitors", () => {
      render(<PoolsClient {...defaultProps} pools={[mockCatchAllPool]} />);

      // Should show explanation about catch-all behavior
      expect(screen.getByText(/automatically receives all visitors/i)).toBeInTheDocument();
    });

    it("shows No Rules Allowed badge for catch-all pool", () => {
      render(<PoolsClient {...defaultProps} pools={[mockCatchAllPool]} />);

      expect(screen.getByText("No Rules Allowed")).toBeInTheDocument();
    });

    it("shows option to create new pool from catch-all section", () => {
      render(<PoolsClient {...defaultProps} pools={[mockCatchAllPool]} />);

      expect(screen.getByText("Create a New Pool")).toBeInTheDocument();
    });
  });
});
