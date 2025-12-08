/**
 * @vitest-environment jsdom
 *
 * PoolsClient Toast Notifications Tests (TKT-043)
 *
 * Tests for toast notification behaviors added in TKT-043:
 * - Success toasts for all pool operations
 * - Error toasts with specific messages for network/duplicate/general errors
 * - Optimistic UI updates with rollback on failure
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock lucide-react icons (including new ones from TKT-043)
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
  CheckCircle2: () => <div data-testid="check-circle-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
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

// Mock Radix UI Toast
vi.mock("@radix-ui/react-toast", () => ({
  Provider: ({ children }: { children: React.ReactNode }) => <div data-testid="toast-provider">{children}</div>,
  Root: ({ children, className, duration }: { children: React.ReactNode; className?: string; duration?: number }) => (
    <div data-testid="toast-root" className={className} data-duration={duration}>{children}</div>
  ),
  Title: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="toast-title" className={className}>{children}</div>
  ),
  Description: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="toast-description" className={className}>{children}</div>
  ),
  Close: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <button data-testid="toast-close" className={className}>{children}</button>
  ),
  Viewport: ({ className }: { className?: string }) => <div data-testid="toast-viewport" className={className} />,
}));

import { PoolsClient } from "./pools-client";

describe("PoolsClient - Toast Notifications (TKT-043)", () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
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

  describe("Toast UI Components", () => {
    it("renders toast provider component", () => {
      render(<PoolsClient {...defaultProps} />);
      expect(screen.getByTestId("toast-provider")).toBeInTheDocument();
    });

    it("renders toast viewport component", () => {
      render(<PoolsClient {...defaultProps} />);
      expect(screen.getByTestId("toast-viewport")).toBeInTheDocument();
    });
  });

  describe("Pool Creation Toasts", () => {
    it("shows success toast with correct message when pool is created", async () => {
      const newPool = { ...mockPool, id: "new-id", name: "Test Pool", pool_routing_rules: [], agent_pool_members: [] };
      setupInsertMock(newPool);

      render(<PoolsClient {...defaultProps} />);

      fireEvent.click(screen.getByText("New Pool"));
      const nameInput = screen.getByPlaceholderText("e.g., Sales Team, Support, Enterprise");
      fireEvent.change(nameInput, { target: { value: "Test Pool" } });
      fireEvent.click(screen.getByText("Create Pool"));

      await waitFor(() => {
        expect(screen.getByText("Pool created")).toBeInTheDocument();
        expect(screen.getByText('"Test Pool" has been created successfully')).toBeInTheDocument();
      });
    });

    it("shows CheckCircle2 icon for success toast", async () => {
      const newPool = { ...mockPool, id: "new-id", name: "Test", pool_routing_rules: [], agent_pool_members: [] };
      setupInsertMock(newPool);

      render(<PoolsClient {...defaultProps} />);

      fireEvent.click(screen.getByText("New Pool"));
      const nameInput = screen.getByPlaceholderText("e.g., Sales Team, Support, Enterprise");
      fireEvent.change(nameInput, { target: { value: "Test" } });
      fireEvent.click(screen.getByText("Create Pool"));

      await waitFor(() => {
        expect(screen.getByTestId("check-circle-icon")).toBeInTheDocument();
      });
    });

    it("shows error toast for duplicate pool name", async () => {
      setupInsertMock(null, { code: "23505", message: "duplicate key value" });

      render(<PoolsClient {...defaultProps} />);

      fireEvent.click(screen.getByText("New Pool"));
      const nameInput = screen.getByPlaceholderText("e.g., Sales Team, Support, Enterprise");
      fireEvent.change(nameInput, { target: { value: "Existing Pool" } });
      fireEvent.click(screen.getByText("Create Pool"));

      await waitFor(() => {
        expect(screen.getByText("Failed to create pool")).toBeInTheDocument();
        expect(screen.getByText('A pool named "Existing Pool" already exists. Please choose a different name.')).toBeInTheDocument();
      });
    });

    it("shows AlertCircle icon for error toast", async () => {
      setupInsertMock(null, { message: "Error" });

      render(<PoolsClient {...defaultProps} />);

      fireEvent.click(screen.getByText("New Pool"));
      const nameInput = screen.getByPlaceholderText("e.g., Sales Team, Support, Enterprise");
      fireEvent.change(nameInput, { target: { value: "Test" } });
      fireEvent.click(screen.getByText("Create Pool"));

      await waitFor(() => {
        expect(screen.getByTestId("alert-circle-icon")).toBeInTheDocument();
      });
    });

    it("shows connection error toast for network errors", async () => {
      setupInsertMock(null, { message: "network error occurred" });

      render(<PoolsClient {...defaultProps} />);

      fireEvent.click(screen.getByText("New Pool"));
      const nameInput = screen.getByPlaceholderText("e.g., Sales Team, Support, Enterprise");
      fireEvent.change(nameInput, { target: { value: "Test Pool" } });
      fireEvent.click(screen.getByText("Create Pool"));

      await waitFor(() => {
        expect(screen.getByText("Connection error")).toBeInTheDocument();
        expect(screen.getByText("Unable to save pool. Please check your connection and try again.")).toBeInTheDocument();
      });
    });

    it("shows connection error toast for fetch errors", async () => {
      setupInsertMock(null, { message: "fetch failed" });

      render(<PoolsClient {...defaultProps} />);

      fireEvent.click(screen.getByText("New Pool"));
      const nameInput = screen.getByPlaceholderText("e.g., Sales Team, Support, Enterprise");
      fireEvent.change(nameInput, { target: { value: "Test Pool" } });
      fireEvent.click(screen.getByText("Create Pool"));

      await waitFor(() => {
        expect(screen.getByText("Connection error")).toBeInTheDocument();
      });
    });

    it("shows generic error toast for other errors", async () => {
      setupInsertMock(null, { message: "Something went wrong" });

      render(<PoolsClient {...defaultProps} />);

      fireEvent.click(screen.getByText("New Pool"));
      const nameInput = screen.getByPlaceholderText("e.g., Sales Team, Support, Enterprise");
      fireEvent.change(nameInput, { target: { value: "Test Pool" } });
      fireEvent.click(screen.getByText("Create Pool"));

      await waitFor(() => {
        expect(screen.getByText("Failed to create pool")).toBeInTheDocument();
        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      });
    });
  });

  describe("Pool Deletion Toasts with Optimistic UI", () => {
    it("shows success toast when pool is deleted", async () => {
      setupDeleteMock();

      render(<PoolsClient {...defaultProps} pools={[mockPool]} />);

      const trashIcon = screen.getByTestId("trash-icon");
      const deleteButton = trashIcon.closest("button");
      fireEvent.click(deleteButton!);

      await waitFor(() => {
        expect(screen.getByText("Pool deleted")).toBeInTheDocument();
        expect(screen.getByText('"Sales Team" has been deleted successfully')).toBeInTheDocument();
      });
    });

    it("optimistically removes pool from UI immediately", async () => {
      const mockEq = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100)));
      const mockDelete = vi.fn(() => ({ eq: mockEq }));
      mockSupabaseClient.from.mockReturnValue({ delete: mockDelete });

      render(<PoolsClient {...defaultProps} pools={[mockPool]} />);

      const trashIcon = screen.getByTestId("trash-icon");
      const deleteButton = trashIcon.closest("button");
      fireEvent.click(deleteButton!);

      // Pool should be removed from UI immediately (optimistic update)
      expect(screen.queryByText("Sales Team")).not.toBeInTheDocument();
    });

    it("reverts UI when deletion fails", async () => {
      setupDeleteMock({ message: "Database error" });

      render(<PoolsClient {...defaultProps} pools={[mockPool]} />);

      const trashIcon = screen.getByTestId("trash-icon");
      const deleteButton = trashIcon.closest("button");
      fireEvent.click(deleteButton!);

      // After error, pool should be back in the list (rollback)
      await waitFor(() => {
        expect(screen.getByText("Sales Team")).toBeInTheDocument();
        expect(screen.getByText("Failed to delete pool")).toBeInTheDocument();
      });
    });

    it("shows connection error toast for network errors", async () => {
      setupDeleteMock({ message: "network error" });

      render(<PoolsClient {...defaultProps} pools={[mockPool]} />);

      const trashIcon = screen.getByTestId("trash-icon");
      const deleteButton = trashIcon.closest("button");
      fireEvent.click(deleteButton!);

      await waitFor(() => {
        expect(screen.getByText("Connection error")).toBeInTheDocument();
        expect(screen.getByText("Unable to delete pool. Please check your connection and try again.")).toBeInTheDocument();
      });
    });
  });

  describe("Toast Close Button", () => {
    it("toast includes close button", async () => {
      const newPool = { ...mockPool, id: "new-id", name: "Test", pool_routing_rules: [], agent_pool_members: [] };
      setupInsertMock(newPool);

      render(<PoolsClient {...defaultProps} />);

      fireEvent.click(screen.getByText("New Pool"));
      const nameInput = screen.getByPlaceholderText("e.g., Sales Team, Support, Enterprise");
      fireEvent.change(nameInput, { target: { value: "Test" } });
      fireEvent.click(screen.getByText("Create Pool"));

      await waitFor(() => {
        expect(screen.getByTestId("toast-close")).toBeInTheDocument();
      });
    });
  });
});
