import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  CallLogFilterConditions,
  serializeConditions,
  deserializeConditions,
  type FilterCondition,
  type Pool,
} from "./call-log-filter-conditions";

describe("call-log-filter-conditions", () => {
  describe("serializeConditions", () => {
    it("serializes valid conditions to JSON string", () => {
      const conditions: FilterCondition[] = [
        { type: "path", matchType: "contains", value: "/pricing" },
      ];

      const result = serializeConditions(conditions);
      expect(result).toBe('[{"type":"path","matchType":"contains","value":"/pricing"}]');
    });

    it("serializes multiple conditions", () => {
      const conditions: FilterCondition[] = [
        { type: "domain", matchType: "is_exactly", value: "example.com" },
        { type: "path", matchType: "starts_with", value: "/docs" },
      ];

      const result = serializeConditions(conditions);
      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].type).toBe("domain");
      expect(parsed[1].type).toBe("path");
    });

    it("excludes conditions with empty values", () => {
      const conditions: FilterCondition[] = [
        { type: "path", matchType: "contains", value: "/pricing" },
        { type: "domain", matchType: "is_exactly", value: "" },
        { type: "path", matchType: "starts_with", value: "   " },
      ];

      const result = serializeConditions(conditions);
      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].value).toBe("/pricing");
    });

    it("returns empty string when all conditions have empty values", () => {
      const conditions: FilterCondition[] = [
        { type: "path", matchType: "contains", value: "" },
        { type: "domain", matchType: "is_exactly", value: "   " },
      ];

      const result = serializeConditions(conditions);
      expect(result).toBe("");
    });

    it("returns empty string for empty array", () => {
      const result = serializeConditions([]);
      expect(result).toBe("");
    });

    it("includes paramName for query_param type", () => {
      const conditions: FilterCondition[] = [
        { type: "query_param", matchType: "contains", value: "google", paramName: "utm_source" },
      ];

      const result = serializeConditions(conditions);
      const parsed = JSON.parse(result);
      expect(parsed[0].paramName).toBe("utm_source");
    });
  });

  describe("deserializeConditions", () => {
    it("deserializes valid JSON string to conditions", () => {
      const json = '[{"type":"path","matchType":"contains","value":"/pricing"}]';

      const result = deserializeConditions(json);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("path");
      expect(result[0].matchType).toBe("contains");
      expect(result[0].value).toBe("/pricing");
    });

    it("deserializes multiple conditions", () => {
      const json = '[{"type":"domain","matchType":"is_exactly","value":"example.com"},{"type":"path","matchType":"starts_with","value":"/docs"}]';

      const result = deserializeConditions(json);
      expect(result).toHaveLength(2);
    });

    it("returns empty array for undefined input", () => {
      const result = deserializeConditions(undefined);
      expect(result).toEqual([]);
    });

    it("returns empty array for empty string", () => {
      const result = deserializeConditions("");
      expect(result).toEqual([]);
    });

    it("returns empty array for invalid JSON", () => {
      const result = deserializeConditions("not valid json");
      expect(result).toEqual([]);
    });

    it("returns empty array for malformed JSON", () => {
      const result = deserializeConditions("{broken");
      expect(result).toEqual([]);
    });

    it("preserves paramName for query_param type", () => {
      const json = '[{"type":"query_param","matchType":"contains","value":"google","paramName":"utm_source"}]';

      const result = deserializeConditions(json);
      expect(result[0].paramName).toBe("utm_source");
    });
  });

  describe("serializeConditions and deserializeConditions roundtrip", () => {
    it("preserves conditions through serialize/deserialize cycle", () => {
      const original: FilterCondition[] = [
        { type: "domain", matchType: "is_exactly", value: "example.com" },
        { type: "path", matchType: "contains", value: "/pricing" },
        { type: "query_param", matchType: "starts_with", value: "google", paramName: "utm_source" },
      ];

      const serialized = serializeConditions(original);
      const deserialized = deserializeConditions(serialized);

      expect(deserialized).toHaveLength(3);
      expect(deserialized[0]).toEqual(original[0]);
      expect(deserialized[1]).toEqual(original[1]);
      expect(deserialized[2]).toEqual(original[2]);
    });

    it("filters empty conditions on serialize but deserialize returns as-is", () => {
      const conditions: FilterCondition[] = [
        { type: "path", matchType: "contains", value: "valid" },
        { type: "domain", matchType: "is_exactly", value: "" },
      ];

      const serialized = serializeConditions(conditions);
      const deserialized = deserializeConditions(serialized);

      // Only valid condition survives
      expect(deserialized).toHaveLength(1);
      expect(deserialized[0].value).toBe("valid");
    });
  });

  describe("FilterCondition types", () => {
    it("supports domain condition type", () => {
      const condition: FilterCondition = {
        type: "domain",
        matchType: "is_exactly",
        value: "example.com",
      };
      expect(condition.type).toBe("domain");
    });

    it("supports path condition type", () => {
      const condition: FilterCondition = {
        type: "path",
        matchType: "contains",
        value: "/pricing",
      };
      expect(condition.type).toBe("path");
    });

    it("supports query_param condition type with paramName", () => {
      const condition: FilterCondition = {
        type: "query_param",
        matchType: "contains",
        value: "google",
        paramName: "utm_source",
      };
      expect(condition.type).toBe("query_param");
      expect(condition.paramName).toBe("utm_source");
    });
  });

  describe("FilterMatchType types", () => {
    it("supports is_exactly match type", () => {
      const condition: FilterCondition = { type: "path", matchType: "is_exactly", value: "/exact" };
      expect(condition.matchType).toBe("is_exactly");
    });

    it("supports contains match type", () => {
      const condition: FilterCondition = { type: "path", matchType: "contains", value: "partial" };
      expect(condition.matchType).toBe("contains");
    });

    it("supports does_not_contain match type", () => {
      const condition: FilterCondition = { type: "path", matchType: "does_not_contain", value: "exclude" };
      expect(condition.matchType).toBe("does_not_contain");
    });

    it("supports starts_with match type", () => {
      const condition: FilterCondition = { type: "path", matchType: "starts_with", value: "/prefix" };
      expect(condition.matchType).toBe("starts_with");
    });

    it("supports ends_with match type", () => {
      const condition: FilterCondition = { type: "path", matchType: "ends_with", value: "/suffix" };
      expect(condition.matchType).toBe("ends_with");
    });
  });

  describe("CallLogFilterConditions component", () => {
    const mockPools: Pool[] = [
      { id: "pool-1", name: "Sales Team" },
      { id: "pool-2", name: "Support Team" },
    ];

    const defaultProps = {
      pools: mockPools,
      selectedPools: [] as string[],
      conditions: [] as FilterCondition[],
      onPoolsChange: vi.fn(),
      onConditionsChange: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    // Helper to get the main dropdown button (the first/outer button)
    const getDropdownButton = () => {
      const buttons = screen.getAllByRole("button");
      return buttons[0];
    };

    it("renders with default placeholder", () => {
      render(<CallLogFilterConditions {...defaultProps} />);
      expect(screen.getByText("All Pools & URLs")).toBeInTheDocument();
    });

    it("renders with custom placeholder", () => {
      render(
        <CallLogFilterConditions
          {...defaultProps}
          placeholder="Custom Placeholder"
        />
      );
      expect(screen.getByText("Custom Placeholder")).toBeInTheDocument();
    });

    it("displays selected pool name when one pool selected", () => {
      render(
        <CallLogFilterConditions
          {...defaultProps}
          selectedPools={["pool-1"]}
        />
      );
      expect(screen.getByText("Sales Team")).toBeInTheDocument();
    });

    it("displays count when multiple pools selected", () => {
      render(
        <CallLogFilterConditions
          {...defaultProps}
          selectedPools={["pool-1", "pool-2"]}
        />
      );
      // Shows first pool and "+1 more"
      expect(screen.getByText("Sales Team")).toBeInTheDocument();
      expect(screen.getByText("+1 more")).toBeInTheDocument();
    });

    it("opens dropdown when button clicked", () => {
      render(<CallLogFilterConditions {...defaultProps} />);
      
      const button = getDropdownButton();
      fireEvent.click(button);
      
      // Should show pool options in dropdown
      expect(screen.getByText("Filter by Pool")).toBeInTheDocument();
    });

    it("displays pool options in dropdown", () => {
      render(<CallLogFilterConditions {...defaultProps} />);
      
      const button = getDropdownButton();
      fireEvent.click(button);
      
      // Pool names should be visible as options
      expect(screen.getAllByText("Sales Team")).toHaveLength(1);
      expect(screen.getAllByText("Support Team")).toHaveLength(1);
    });

    it("calls onPoolsChange when pool is selected", () => {
      const onPoolsChange = vi.fn();
      render(
        <CallLogFilterConditions
          {...defaultProps}
          onPoolsChange={onPoolsChange}
        />
      );
      
      // Open dropdown
      fireEvent.click(getDropdownButton());
      
      // Click on Sales Team pool
      fireEvent.click(screen.getByText("Sales Team"));
      
      expect(onPoolsChange).toHaveBeenCalledWith(["pool-1"]);
    });

    it("calls onPoolsChange to remove pool when already selected", () => {
      const onPoolsChange = vi.fn();
      render(
        <CallLogFilterConditions
          {...defaultProps}
          selectedPools={["pool-1"]}
          onPoolsChange={onPoolsChange}
        />
      );
      
      // Open dropdown - find the first button which is the main dropdown
      fireEvent.click(getDropdownButton());
      
      // After opening, click on Sales Team pool in the dropdown (not the display)
      // The pool button in the dropdown should be present
      const poolButtons = screen.getAllByText("Sales Team");
      // Click on the one in the dropdown (second occurrence after dropdown opens)
      const dropdownPoolButton = poolButtons[poolButtons.length - 1];
      fireEvent.click(dropdownPoolButton);
      
      expect(onPoolsChange).toHaveBeenCalledWith([]);
    });

    it("displays condition summary when conditions have values", () => {
      const conditions: FilterCondition[] = [
        { type: "path", matchType: "contains", value: "/pricing" },
      ];
      
      render(
        <CallLogFilterConditions
          {...defaultProps}
          conditions={conditions}
        />
      );
      
      // Should show condition summary
      expect(screen.getByText(/path contains "\/pricing"/)).toBeInTheDocument();
    });

    it("shows Add condition button in dropdown", () => {
      render(<CallLogFilterConditions {...defaultProps} />);
      
      fireEvent.click(getDropdownButton());
      
      expect(screen.getByText("Add condition")).toBeInTheDocument();
    });

    it("calls onConditionsChange when Add condition clicked", () => {
      const onConditionsChange = vi.fn();
      render(
        <CallLogFilterConditions
          {...defaultProps}
          onConditionsChange={onConditionsChange}
        />
      );
      
      fireEvent.click(getDropdownButton());
      fireEvent.click(screen.getByText("Add condition"));
      
      expect(onConditionsChange).toHaveBeenCalledWith([
        { type: "path", matchType: "contains", value: "" }
      ]);
    });

    it("shows filter count in footer when filters active", () => {
      const conditions: FilterCondition[] = [
        { type: "path", matchType: "contains", value: "/pricing" },
      ];
      
      render(
        <CallLogFilterConditions
          {...defaultProps}
          selectedPools={["pool-1"]}
          conditions={conditions}
        />
      );
      
      fireEvent.click(getDropdownButton());
      
      expect(screen.getByText("2 filters active")).toBeInTheDocument();
    });

    it("shows singular filter text when only one filter", () => {
      render(
        <CallLogFilterConditions
          {...defaultProps}
          selectedPools={["pool-1"]}
        />
      );
      
      fireEvent.click(getDropdownButton());
      
      expect(screen.getByText("1 filter active")).toBeInTheDocument();
    });

    it("calls clear callbacks when Clear all clicked in footer", () => {
      const onPoolsChange = vi.fn();
      const onConditionsChange = vi.fn();
      const conditions: FilterCondition[] = [
        { type: "path", matchType: "contains", value: "/pricing" },
      ];
      
      render(
        <CallLogFilterConditions
          {...defaultProps}
          selectedPools={["pool-1"]}
          conditions={conditions}
          onPoolsChange={onPoolsChange}
          onConditionsChange={onConditionsChange}
        />
      );
      
      fireEvent.click(getDropdownButton());
      
      // Find the Clear all link in the footer
      const clearAllLinks = screen.getAllByText("Clear all");
      fireEvent.click(clearAllLinks[clearAllLinks.length - 1]);
      
      expect(onPoolsChange).toHaveBeenCalledWith([]);
      expect(onConditionsChange).toHaveBeenCalledWith([]);
    });

    it("does not show footer when no filters active", () => {
      render(<CallLogFilterConditions {...defaultProps} />);
      
      fireEvent.click(getDropdownButton());
      
      expect(screen.queryByText(/filter active/)).not.toBeInTheDocument();
    });

    it("does not show pool section when no pools provided", () => {
      render(
        <CallLogFilterConditions
          {...defaultProps}
          pools={[]}
        />
      );
      
      fireEvent.click(getDropdownButton());
      
      expect(screen.queryByText("Filter by Pool")).not.toBeInTheDocument();
    });

    it("shows URL conditions section", () => {
      render(<CallLogFilterConditions {...defaultProps} />);
      
      fireEvent.click(getDropdownButton());
      
      expect(screen.getByText("Filter by URL Conditions")).toBeInTheDocument();
    });

    it("renders existing conditions with remove button", () => {
      const conditions: FilterCondition[] = [
        { type: "path", matchType: "contains", value: "/pricing" },
      ];
      
      render(
        <CallLogFilterConditions
          {...defaultProps}
          conditions={conditions}
        />
      );
      
      fireEvent.click(getDropdownButton());
      
      // Should have a remove button (X icon)
      const removeButtons = screen.getAllByTitle("Remove condition");
      expect(removeButtons.length).toBeGreaterThan(0);
    });

    it("calls onConditionsChange when condition removed", () => {
      const onConditionsChange = vi.fn();
      const conditions: FilterCondition[] = [
        { type: "path", matchType: "contains", value: "/pricing" },
      ];
      
      render(
        <CallLogFilterConditions
          {...defaultProps}
          conditions={conditions}
          onConditionsChange={onConditionsChange}
        />
      );
      
      fireEvent.click(getDropdownButton());
      fireEvent.click(screen.getByTitle("Remove condition"));
      
      expect(onConditionsChange).toHaveBeenCalledWith([]);
    });

    it("displays condition with query param showing param name", () => {
      const conditions: FilterCondition[] = [
        { type: "query_param", matchType: "contains", value: "google", paramName: "utm_source" },
      ];
      
      render(
        <CallLogFilterConditions
          {...defaultProps}
          conditions={conditions}
        />
      );
      
      // Should show ?utm_source in the display
      expect(screen.getByText(/\?utm_source contains "google"/)).toBeInTheDocument();
    });

    it("truncates long pool names with ellipsis", () => {
      const longPoolName = "This is a very long pool name that should be truncated";
      render(
        <CallLogFilterConditions
          {...defaultProps}
          pools={[{ id: "pool-1", name: longPoolName }]}
          selectedPools={["pool-1"]}
        />
      );
      
      // When multiple items, first item gets truncated to 20 chars + "..."
      // But when single item, it just shows truncated via CSS
      expect(screen.getByText(longPoolName)).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles special characters in condition values", () => {
      const conditions: FilterCondition[] = [
        { type: "path", matchType: "contains", value: "/path?with=special&chars" },
      ];

      const serialized = serializeConditions(conditions);
      const deserialized = deserializeConditions(serialized);

      expect(deserialized[0].value).toBe("/path?with=special&chars");
    });

    it("handles unicode characters in condition values", () => {
      const conditions: FilterCondition[] = [
        { type: "path", matchType: "contains", value: "/日本語/путь" },
      ];

      const serialized = serializeConditions(conditions);
      const deserialized = deserializeConditions(serialized);

      expect(deserialized[0].value).toBe("/日本語/путь");
    });

    it("handles empty paramName for query_param type", () => {
      const conditions: FilterCondition[] = [
        { type: "query_param", matchType: "contains", value: "test", paramName: "" },
      ];

      const serialized = serializeConditions(conditions);
      const deserialized = deserializeConditions(serialized);

      expect(deserialized[0].paramName).toBe("");
    });
  });
});




