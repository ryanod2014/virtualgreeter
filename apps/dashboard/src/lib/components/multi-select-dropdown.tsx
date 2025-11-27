"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

interface Option {
  value: string;
  label: string;
  icon?: ReactNode;
  color?: string;
}

interface MultiSelectDropdownProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  className = "",
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Calculate menu position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
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
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on resize, and scroll only if scrolling outside the menu
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => setIsOpen(false);
    
    const handleScroll = (event: Event) => {
      // Don't close if scrolling inside the menu
      if (menuRef.current && menuRef.current.contains(event.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const getDisplayText = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) {
      const option = options.find((o) => o.value === selected[0]);
      return option?.label || selected[0];
    }
    return `${selected.length} selected`;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Dropdown Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/50 border transition-colors outline-none text-left ${
          isOpen ? "border-primary" : "border-border hover:border-primary/50"
        }`}
      >
        <span className={`text-sm truncate ${selected.length === 0 ? "text-muted-foreground" : ""}`}>
          {getDisplayText()}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu - Rendered via Portal */}
      {isOpen &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] py-1 rounded-lg bg-background border border-border shadow-lg max-h-[200px] overflow-y-auto"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
          >
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">No options</div>
            ) : (
              options.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleOption(option.value)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors ${
                      isSelected ? "bg-primary/5" : ""
                    }`}
                  >
                    {/* Checkbox indicator */}
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected
                          ? "bg-primary border-primary"
                          : "border-border"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    
                    {/* Icon or color dot */}
                    {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                    {option.color && !option.icon && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    
                    {/* Label */}
                    <span className="text-sm truncate">{option.label}</span>
                  </button>
                );
              })
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
