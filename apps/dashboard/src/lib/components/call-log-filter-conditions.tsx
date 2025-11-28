"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, X, Layers, ChevronDown, Filter } from "lucide-react";

// Same types as pool routing rules
export type FilterMatchType = "is_exactly" | "contains" | "does_not_contain" | "starts_with" | "ends_with";
export type FilterConditionType = "domain" | "path" | "query_param";

export interface FilterCondition {
  type: FilterConditionType;
  matchType: FilterMatchType;
  value: string;
  paramName?: string; // For query_param type
}

export interface Pool {
  id: string;
  name: string;
}

interface CallLogFilterConditionsProps {
  pools: Pool[];
  selectedPools: string[];
  conditions: FilterCondition[];
  onPoolsChange: (pools: string[]) => void;
  onConditionsChange: (conditions: FilterCondition[]) => void;
  placeholder?: string;
  className?: string;
}

export function CallLogFilterConditions({
  pools,
  selectedPools,
  conditions,
  onPoolsChange,
  onConditionsChange,
  placeholder = "All Pools & URLs",
  className = "",
}: CallLogFilterConditionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const addCondition = () => {
    onConditionsChange([...conditions, { type: "path", matchType: "contains", value: "" }]);
  };

  const updateCondition = (index: number, condition: FilterCondition) => {
    const newConditions = [...conditions];
    newConditions[index] = condition;
    onConditionsChange(newConditions);
  };

  const removeCondition = (index: number) => {
    onConditionsChange(conditions.filter((_, i) => i !== index));
  };

  const togglePool = (poolId: string) => {
    if (selectedPools.includes(poolId)) {
      onPoolsChange(selectedPools.filter((id) => id !== poolId));
    } else {
      onPoolsChange([...selectedPools, poolId]);
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPoolsChange([]);
    onConditionsChange([]);
  };

  // Calculate menu position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const menuHeight = 450;
      const menuWidth = Math.max(rect.width, 380);

      const spaceBelow = viewportHeight - rect.bottom;
      const showAbove = spaceBelow < menuHeight && rect.top > menuHeight;

      // Calculate left position - ensure it doesn't overflow viewport
      let left = rect.left + window.scrollX;
      if (left + menuWidth > viewportWidth - 16) {
        // Align to right edge of button if it would overflow
        left = rect.right + window.scrollX - menuWidth;
      }

      setMenuPosition({
        top: showAbove
          ? rect.top + window.scrollY - menuHeight - 4
          : rect.bottom + window.scrollY + 4,
        left: Math.max(8, left), // Ensure at least 8px from left edge
        width: menuWidth,
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        // Close dropdown but don't prevent the click event from reaching other elements
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Use capture phase to close dropdown early, allowing click to reach target
      document.addEventListener("mousedown", handleClickOutside, true);
      return () => document.removeEventListener("mousedown", handleClickOutside, true);
    }
  }, [isOpen]);

  // Close on resize
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      setIsOpen(false);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen]);

  // Get display content for the button
  const getDisplayContent = () => {
    const validConditions = conditions.filter(c => c.value.trim() !== "");
    const hasSelections = selectedPools.length > 0 || validConditions.length > 0;

    if (!hasSelections) {
      return <span className="text-muted-foreground">{placeholder}</span>;
    }

    const items: string[] = [];

    // Add pool names
    selectedPools.forEach((poolId) => {
      const pool = pools.find((p) => p.id === poolId);
      if (pool) {
        items.push(pool.name);
      }
    });

    // Add condition summaries
    validConditions.forEach((c) => {
      const typeLabel = c.type === "query_param" ? `?${c.paramName}` : c.type;
      items.push(`${typeLabel} ${c.matchType.replace(/_/g, " ")} "${c.value}"`);
    });

    if (items.length === 0) {
      return <span className="text-muted-foreground">{placeholder}</span>;
    }

    if (items.length === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium truncate">
          <Filter className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{items[0]}</span>
        </span>
      );
    }

    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
          <Filter className="w-3 h-3" />
          {items[0].length > 20 ? items[0].slice(0, 20) + "..." : items[0]}
        </span>
        <span className="text-xs text-muted-foreground">
          +{items.length - 1} more
        </span>
      </div>
    );
  };

  const totalCount = selectedPools.length + conditions.filter(c => c.value.trim() !== "").length;

  return (
    <div className={`relative ${className}`}>
      {/* Dropdown Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/50 border transition-colors outline-none text-left min-h-[42px] ${
          isOpen ? "border-primary" : "border-border hover:border-primary/50"
        }`}
      >
        <div className="flex-1 min-w-0">{getDisplayContent()}</div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {totalCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu - Rendered via Portal */}
      {isOpen &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] rounded-xl bg-background border border-border shadow-xl overflow-hidden"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              maxHeight: "450px",
            }}
          >
            <div className="overflow-y-auto max-h-[450px]">
              {/* Pool Selection */}
              {pools.length > 0 && (
                <div className="p-3 border-b border-border bg-muted/30">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    Filter by Pool
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pools.map((pool) => {
                      const isSelected = selectedPools.includes(pool.id);
                      return (
                        <button
                          key={pool.id}
                          type="button"
                          onClick={() => togglePool(pool.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted hover:bg-muted/80"
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          {pool.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* URL Conditions */}
              <div className="p-3">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Filter by URL Conditions
                </div>
                <div className="space-y-2">
                  {conditions.map((condition, index) => (
                    <FilterConditionRow
                      key={index}
                      condition={condition}
                      index={index}
                      onUpdate={updateCondition}
                      onRemove={removeCondition}
                      showAndLabel={index > 0}
                    />
                  ))}
                </div>
                
                <button
                  type="button"
                  onClick={addCondition}
                  className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add condition
                </button>
              </div>
            </div>

            {/* Footer */}
            {totalCount > 0 && (
              <div className="p-3 border-t border-border bg-muted/30 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {totalCount} {totalCount === 1 ? "filter" : "filters"} active
                </span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-sm text-primary hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

// Individual condition row - matches pools rule builder exactly
function FilterConditionRow({
  condition,
  index,
  onUpdate,
  onRemove,
  showAndLabel,
}: {
  condition: FilterCondition;
  index: number;
  onUpdate: (index: number, condition: FilterCondition) => void;
  onRemove: (index: number) => void;
  showAndLabel: boolean;
}) {
  const matchTypeLabels: Record<FilterMatchType, string> = {
    is_exactly: "is exactly",
    contains: "contains",
    does_not_contain: "does not contain",
    starts_with: "starts with",
    ends_with: "ends with",
  };

  const getPlaceholder = () => {
    switch (condition.type) {
      case "domain": return "example.com";
      case "path": return "/pricing";
      case "query_param": return "google";
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50 group flex-wrap">
      {/* AND label for non-first conditions */}
      {showAndLabel && (
        <span className="text-xs font-semibold text-primary/70 bg-primary/10 px-2 py-0.5 rounded uppercase tracking-wider">
          AND
        </span>
      )}
      
      {/* Type selector */}
      <select
        value={condition.type}
        onChange={(e) => {
          const newType = e.target.value as FilterConditionType;
          onUpdate(index, { 
            ...condition, 
            type: newType,
            paramName: newType === "query_param" ? (condition.paramName || "utm_source") : undefined
          });
        }}
        className="px-2 py-1.5 rounded-lg bg-background border border-border text-xs font-medium focus:border-primary outline-none cursor-pointer"
      >
        <option value="domain">Domain</option>
        <option value="path">Path</option>
        <option value="query_param">Query Param</option>
      </select>

      {/* Parameter name input for query_param type */}
      {condition.type === "query_param" && (
        <input
          type="text"
          value={condition.paramName || ""}
          onChange={(e) => onUpdate(index, { ...condition, paramName: e.target.value })}
          placeholder="utm_source"
          className="w-24 px-2 py-1.5 rounded-lg bg-background border border-border text-xs font-mono focus:border-primary outline-none"
        />
      )}

      {/* Match type selector */}
      <select
        value={condition.matchType}
        onChange={(e) => onUpdate(index, { ...condition, matchType: e.target.value as FilterMatchType })}
        className="px-2 py-1.5 rounded-lg bg-background border border-border text-xs focus:border-primary outline-none cursor-pointer"
      >
        {Object.entries(matchTypeLabels).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      {/* Value input */}
      <input
        type="text"
        value={condition.value}
        onChange={(e) => onUpdate(index, { ...condition, value: e.target.value })}
        placeholder={getPlaceholder()}
        className="flex-1 px-2 py-1.5 rounded-lg bg-background border border-border text-xs font-mono focus:border-primary outline-none min-w-[100px]"
      />

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        title="Remove condition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// Helper to serialize conditions for URL params
export function serializeConditions(conditions: FilterCondition[]): string {
  const validConditions = conditions.filter(c => c.value.trim() !== "");
  if (validConditions.length === 0) return "";
  return JSON.stringify(validConditions);
}

// Helper to deserialize conditions from URL params
export function deserializeConditions(str: string | undefined): FilterCondition[] {
  if (!str) return [];
  try {
    return JSON.parse(str);
  } catch {
    return [];
  }
}
