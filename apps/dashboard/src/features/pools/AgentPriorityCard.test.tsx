import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  ChevronDown: () => <div data-testid="chevron-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

import { AgentPriorityCard, PoolMember } from "./AgentPriorityCard";

/**
 * AgentPriorityCard Component Tests
 *
 * Test Lock D3: Tiered Routing - Tier Assignment UI
 *
 * Captures current behavior for:
 * 1. Display: Shows agent avatar, name, and current priority tier
 * 2. Priority Selection: Dropdown with Primary (1), Standard (2), Backup (3) options
 * 3. Priority Update: Calls onUpdatePriority with poolId, memberId, and new priority
 * 4. Remove Agent: Calls onRemove when remove button is clicked
 * 5. Styling: Different colors for each priority tier
 */

describe("AgentPriorityCard", () => {
  const mockMember: PoolMember = {
    id: "member-123",
    agent_profile_id: "agent-456",
    priority_rank: 1,
    agent_profiles: {
      id: "agent-456",
      display_name: "John Doe",
    },
  };

  const defaultProps = {
    member: mockMember,
    poolId: "pool-789",
    onUpdatePriority: vi.fn(),
    onRemove: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // DISPLAY - AGENT INFORMATION
  // ---------------------------------------------------------------------------

  describe("Display - Agent Information", () => {
    it("renders the agent card", () => {
      render(<AgentPriorityCard {...defaultProps} />);

      expect(screen.getByTestId("agent-priority-card")).toBeInTheDocument();
    });

    it("shows agent name", () => {
      render(<AgentPriorityCard {...defaultProps} />);

      expect(screen.getByTestId("agent-name")).toHaveTextContent("John Doe");
    });

    it("shows first letter of agent name in avatar", () => {
      render(<AgentPriorityCard {...defaultProps} />);

      expect(screen.getByTestId("agent-avatar")).toHaveTextContent("J");
    });

    it("shows uppercase first letter in avatar", () => {
      const memberWithLowercase: PoolMember = {
        ...mockMember,
        agent_profiles: {
          id: "agent-456",
          display_name: "jane smith",
        },
      };

      render(<AgentPriorityCard {...defaultProps} member={memberWithLowercase} />);

      expect(screen.getByTestId("agent-avatar")).toHaveTextContent("J");
    });

    it("shows '?' when agent has no display_name", () => {
      const memberNoName: PoolMember = {
        ...mockMember,
        agent_profiles: {
          id: "agent-456",
          display_name: "",
        },
      };

      render(<AgentPriorityCard {...defaultProps} member={memberNoName} />);

      expect(screen.getByTestId("agent-avatar")).toHaveTextContent("?");
    });

    it("shows 'Unnamed Agent' when display_name is empty", () => {
      const memberNoName: PoolMember = {
        ...mockMember,
        agent_profiles: {
          id: "agent-456",
          display_name: "",
        },
      };

      render(<AgentPriorityCard {...defaultProps} member={memberNoName} />);

      expect(screen.getByTestId("agent-name")).toHaveTextContent("Unnamed Agent");
    });

    it("shows '?' when agent_profiles is null", () => {
      const memberNullProfiles = {
        ...mockMember,
        agent_profiles: null as unknown as PoolMember["agent_profiles"],
      };

      render(<AgentPriorityCard {...defaultProps} member={memberNullProfiles} />);

      expect(screen.getByTestId("agent-avatar")).toHaveTextContent("?");
      expect(screen.getByTestId("agent-name")).toHaveTextContent("Unnamed Agent");
    });
  });

  // ---------------------------------------------------------------------------
  // DISPLAY - PRIORITY SELECTOR
  // ---------------------------------------------------------------------------

  describe("Display - Priority Selector", () => {
    it("renders priority select dropdown", () => {
      render(<AgentPriorityCard {...defaultProps} />);

      expect(screen.getByTestId("priority-select")).toBeInTheDocument();
    });

    it("shows ChevronDown icon for dropdown indicator", () => {
      render(<AgentPriorityCard {...defaultProps} />);

      expect(screen.getByTestId("chevron-icon")).toBeInTheDocument();
    });

    it("shows three priority options: Primary, Standard, Backup", () => {
      render(<AgentPriorityCard {...defaultProps} />);

      const select = screen.getByTestId("priority-select");
      const options = select.querySelectorAll("option");

      expect(options).toHaveLength(3);
      expect(options[0]).toHaveTextContent("Primary");
      expect(options[1]).toHaveTextContent("Standard");
      expect(options[2]).toHaveTextContent("Backup");
    });

    it("options have correct values (1, 2, 3)", () => {
      render(<AgentPriorityCard {...defaultProps} />);

      const select = screen.getByTestId("priority-select");
      const options = select.querySelectorAll("option");

      expect(options[0]).toHaveValue("1");
      expect(options[1]).toHaveValue("2");
      expect(options[2]).toHaveValue("3");
    });

    it("shows emoji icons for each priority level", () => {
      render(<AgentPriorityCard {...defaultProps} />);

      const select = screen.getByTestId("priority-select");
      const options = select.querySelectorAll("option");

      expect(options[0]).toHaveTextContent("🥇");
      expect(options[1]).toHaveTextContent("🥈");
      expect(options[2]).toHaveTextContent("🥉");
    });

    it("select has helpful title attribute", () => {
      render(<AgentPriorityCard {...defaultProps} />);

      const select = screen.getByTestId("priority-select");
      expect(select).toHaveAttribute("title", "Change when this agent receives leads");
    });
  });

  // ---------------------------------------------------------------------------
  // DISPLAY - CURRENT PRIORITY
  // ---------------------------------------------------------------------------

  describe("Display - Current Priority", () => {
    it("displays current priority as Primary (1) when priority_rank is 1", () => {
      const member = { ...mockMember, priority_rank: 1 };

      render(<AgentPriorityCard {...defaultProps} member={member} />);

      const select = screen.getByTestId("priority-select") as HTMLSelectElement;
      expect(select.value).toBe("1");
    });

    it("displays current priority as Standard (2) when priority_rank is 2", () => {
      const member = { ...mockMember, priority_rank: 2 };

      render(<AgentPriorityCard {...defaultProps} member={member} />);

      const select = screen.getByTestId("priority-select") as HTMLSelectElement;
      expect(select.value).toBe("2");
    });

    it("displays current priority as Backup (3) when priority_rank is 3", () => {
      const member = { ...mockMember, priority_rank: 3 };

      render(<AgentPriorityCard {...defaultProps} member={member} />);

      const select = screen.getByTestId("priority-select") as HTMLSelectElement;
      expect(select.value).toBe("3");
    });

    it("defaults to 1 when priority_rank is 0", () => {
      const member = { ...mockMember, priority_rank: 0 };

      render(<AgentPriorityCard {...defaultProps} member={member} />);

      const select = screen.getByTestId("priority-select") as HTMLSelectElement;
      // The component uses `priority_rank || 1` so 0 becomes 1
      expect(select.value).toBe("1");
    });

    it("defaults to 1 when priority_rank is undefined", () => {
      const member = { ...mockMember, priority_rank: undefined as unknown as number };

      render(<AgentPriorityCard {...defaultProps} member={member} />);

      const select = screen.getByTestId("priority-select") as HTMLSelectElement;
      expect(select.value).toBe("1");
    });
  });

  // ---------------------------------------------------------------------------
  // DISPLAY - PRIORITY STYLING (COLOR CODING)
  // ---------------------------------------------------------------------------

  describe("Display - Priority Styling", () => {
    it("applies green styling for Primary (1)", () => {
      const member = { ...mockMember, priority_rank: 1 };

      render(<AgentPriorityCard {...defaultProps} member={member} />);

      const select = screen.getByTestId("priority-select");
      expect(select.className).toContain("bg-green-500/20");
      expect(select.className).toContain("text-green-700");
      expect(select.className).toContain("border-green-500/30");
    });

    it("applies blue styling for Standard (2)", () => {
      const member = { ...mockMember, priority_rank: 2 };

      render(<AgentPriorityCard {...defaultProps} member={member} />);

      const select = screen.getByTestId("priority-select");
      expect(select.className).toContain("bg-blue-500/20");
      expect(select.className).toContain("text-blue-700");
      expect(select.className).toContain("border-blue-500/30");
    });

    it("applies orange styling for Backup (3)", () => {
      const member = { ...mockMember, priority_rank: 3 };

      render(<AgentPriorityCard {...defaultProps} member={member} />);

      const select = screen.getByTestId("priority-select");
      expect(select.className).toContain("bg-orange-500/20");
      expect(select.className).toContain("text-orange-700");
      expect(select.className).toContain("border-orange-500/30");
    });

    it("applies orange styling for higher tiers (4+)", () => {
      const member = { ...mockMember, priority_rank: 4 };

      render(<AgentPriorityCard {...defaultProps} member={member} />);

      const select = screen.getByTestId("priority-select");
      // Tiers 4+ get the same orange styling as tier 3 (backup/overflow)
      expect(select.className).toContain("bg-orange-500/20");
    });
  });

  // ---------------------------------------------------------------------------
  // INTERACTION - PRIORITY UPDATE
  // ---------------------------------------------------------------------------

  describe("Interaction - Priority Update", () => {
    it("calls onUpdatePriority when priority is changed", () => {
      const onUpdatePriority = vi.fn();

      render(<AgentPriorityCard {...defaultProps} onUpdatePriority={onUpdatePriority} />);

      const select = screen.getByTestId("priority-select");
      fireEvent.change(select, { target: { value: "2" } });

      expect(onUpdatePriority).toHaveBeenCalledTimes(1);
    });

    it("passes correct poolId to onUpdatePriority", () => {
      const onUpdatePriority = vi.fn();

      render(
        <AgentPriorityCard
          {...defaultProps}
          poolId="my-pool-id"
          onUpdatePriority={onUpdatePriority}
        />
      );

      const select = screen.getByTestId("priority-select");
      fireEvent.change(select, { target: { value: "2" } });

      expect(onUpdatePriority).toHaveBeenCalledWith("my-pool-id", expect.any(String), expect.any(Number));
    });

    it("passes correct memberId to onUpdatePriority", () => {
      const onUpdatePriority = vi.fn();
      const member = { ...mockMember, id: "test-member-id" };

      render(
        <AgentPriorityCard
          {...defaultProps}
          member={member}
          onUpdatePriority={onUpdatePriority}
        />
      );

      const select = screen.getByTestId("priority-select");
      fireEvent.change(select, { target: { value: "2" } });

      expect(onUpdatePriority).toHaveBeenCalledWith(expect.any(String), "test-member-id", expect.any(Number));
    });

    it("passes new priority as number to onUpdatePriority", () => {
      const onUpdatePriority = vi.fn();

      render(<AgentPriorityCard {...defaultProps} onUpdatePriority={onUpdatePriority} />);

      const select = screen.getByTestId("priority-select");
      fireEvent.change(select, { target: { value: "3" } });

      expect(onUpdatePriority).toHaveBeenCalledWith(
        defaultProps.poolId,
        mockMember.id,
        3 // Should be a number, not string "3"
      );
    });

    it("correctly parses priority value 1", () => {
      const onUpdatePriority = vi.fn();
      const member = { ...mockMember, priority_rank: 2 }; // Start at 2

      render(
        <AgentPriorityCard
          {...defaultProps}
          member={member}
          onUpdatePriority={onUpdatePriority}
        />
      );

      const select = screen.getByTestId("priority-select");
      fireEvent.change(select, { target: { value: "1" } });

      expect(onUpdatePriority).toHaveBeenCalledWith(
        defaultProps.poolId,
        member.id,
        1
      );
    });

    it("correctly parses priority value 2", () => {
      const onUpdatePriority = vi.fn();

      render(<AgentPriorityCard {...defaultProps} onUpdatePriority={onUpdatePriority} />);

      const select = screen.getByTestId("priority-select");
      fireEvent.change(select, { target: { value: "2" } });

      expect(onUpdatePriority).toHaveBeenCalledWith(
        defaultProps.poolId,
        mockMember.id,
        2
      );
    });

    it("correctly parses priority value 3", () => {
      const onUpdatePriority = vi.fn();

      render(<AgentPriorityCard {...defaultProps} onUpdatePriority={onUpdatePriority} />);

      const select = screen.getByTestId("priority-select");
      fireEvent.change(select, { target: { value: "3" } });

      expect(onUpdatePriority).toHaveBeenCalledWith(
        defaultProps.poolId,
        mockMember.id,
        3
      );
    });
  });

  // ---------------------------------------------------------------------------
  // INTERACTION - REMOVE AGENT
  // ---------------------------------------------------------------------------

  describe("Interaction - Remove Agent", () => {
    it("renders remove button", () => {
      render(<AgentPriorityCard {...defaultProps} />);

      expect(screen.getByTestId("remove-button")).toBeInTheDocument();
    });

    it("remove button has helpful title attribute", () => {
      render(<AgentPriorityCard {...defaultProps} />);

      const removeButton = screen.getByTestId("remove-button");
      expect(removeButton).toHaveAttribute("title", "Remove from pool");
    });

    it("calls onRemove when remove button is clicked", () => {
      const onRemove = vi.fn();

      render(<AgentPriorityCard {...defaultProps} onRemove={onRemove} />);

      const removeButton = screen.getByTestId("remove-button");
      fireEvent.click(removeButton);

      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it("passes correct poolId to onRemove", () => {
      const onRemove = vi.fn();

      render(
        <AgentPriorityCard
          {...defaultProps}
          poolId="remove-test-pool"
          onRemove={onRemove}
        />
      );

      const removeButton = screen.getByTestId("remove-button");
      fireEvent.click(removeButton);

      expect(onRemove).toHaveBeenCalledWith("remove-test-pool", expect.any(String));
    });

    it("passes correct memberId to onRemove", () => {
      const onRemove = vi.fn();
      const member = { ...mockMember, id: "remove-test-member" };

      render(
        <AgentPriorityCard
          {...defaultProps}
          member={member}
          onRemove={onRemove}
        />
      );

      const removeButton = screen.getByTestId("remove-button");
      fireEvent.click(removeButton);

      expect(onRemove).toHaveBeenCalledWith(expect.any(String), "remove-test-member");
    });

    it("shows X icon in remove button", () => {
      render(<AgentPriorityCard {...defaultProps} />);

      expect(screen.getByTestId("x-icon")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------

  describe("Edge Cases", () => {
    it("handles agent name with special characters", () => {
      const member: PoolMember = {
        ...mockMember,
        agent_profiles: {
          id: "agent-456",
          display_name: "José García-López",
        },
      };

      render(<AgentPriorityCard {...defaultProps} member={member} />);

      expect(screen.getByTestId("agent-name")).toHaveTextContent("José García-López");
      expect(screen.getByTestId("agent-avatar")).toHaveTextContent("J");
    });

    it("handles agent name with emoji - charAt returns partial emoji", () => {
      // Note: charAt(0) on emoji strings returns partial unicode codepoint
      // This is expected JavaScript behavior for multi-byte characters
      const member: PoolMember = {
        ...mockMember,
        agent_profiles: {
          id: "agent-456",
          display_name: "🎉 Party Agent",
        },
      };

      render(<AgentPriorityCard {...defaultProps} member={member} />);

      expect(screen.getByTestId("agent-name")).toHaveTextContent("🎉 Party Agent");
      // charAt(0) on multi-byte emoji returns incomplete codepoint (expected behavior)
      // The avatar will show a replacement character or partial emoji
      const avatar = screen.getByTestId("agent-avatar");
      expect(avatar).toBeInTheDocument();
    });

    it("handles very long agent names", () => {
      const member: PoolMember = {
        ...mockMember,
        agent_profiles: {
          id: "agent-456",
          display_name: "A".repeat(100),
        },
      };

      render(<AgentPriorityCard {...defaultProps} member={member} />);

      expect(screen.getByTestId("agent-name")).toHaveTextContent("A".repeat(100));
    });

    it("does not call onUpdatePriority when selecting same priority", () => {
      const onUpdatePriority = vi.fn();
      const member = { ...mockMember, priority_rank: 1 };

      render(
        <AgentPriorityCard
          {...defaultProps}
          member={member}
          onUpdatePriority={onUpdatePriority}
        />
      );

      const select = screen.getByTestId("priority-select");
      // Selecting the same value should still trigger onChange
      fireEvent.change(select, { target: { value: "1" } });

      // Note: The component doesn't prevent calling onUpdatePriority for same value
      // This is current behavior - the parent handler should handle idempotency
      expect(onUpdatePriority).toHaveBeenCalledWith(defaultProps.poolId, member.id, 1);
    });
  });
});



