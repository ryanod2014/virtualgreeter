"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search, X } from "lucide-react";
import {
  COUNTRIES,
  REGIONS,
  type Region,
  type Country,
  getCountryCodesByRegion,
  searchCountries,
  getAllRegions,
} from "@/lib/utils/countries";

interface CountrySelectorProps {
  selected: string[]; // Array of country codes
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function CountrySelector({
  selected,
  onChange,
  placeholder = "All Countries",
  className = "",
}: CountrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter countries based on search
  const filteredCountries = useMemo(() => {
    return searchCountries(searchQuery);
  }, [searchQuery]);

  // Group filtered countries by region
  const groupedCountries = useMemo(() => {
    const groups: Record<Region, Country[]> = {
      americas: [],
      europe: [],
      asia_pacific: [],
      middle_east_africa: [],
    };
    filteredCountries.forEach((country) => {
      groups[country.region].push(country);
    });
    return groups;
  }, [filteredCountries]);

  // Check if a full region is selected (all countries in region are selected)
  const isRegionFullySelected = (region: Region): boolean => {
    const regionCodes = getCountryCodesByRegion(region);
    return regionCodes.every((code) => selected.includes(code));
  };

  // Toggle entire region
  const toggleRegion = (region: Region) => {
    const regionCodes = getCountryCodesByRegion(region);
    if (isRegionFullySelected(region)) {
      // Deselect all countries in this region
      onChange(selected.filter((code) => !regionCodes.includes(code)));
    } else {
      // Select all countries in this region
      const newSelected = new Set([...selected, ...regionCodes]);
      onChange(Array.from(newSelected));
    }
  };

  // Toggle individual country
  const toggleCountry = (code: string) => {
    if (selected.includes(code)) {
      onChange(selected.filter((c) => c !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  // Remove a country from selection (from chip)
  const removeCountry = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((c) => c !== code));
  };

  // Clear all selections
  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  // Calculate menu position
  const updateMenuPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const menuHeight = Math.min(450, viewportHeight * 0.8); // Use actual height
      
      // Check if menu would go below viewport
      const spaceBelow = viewportHeight - rect.bottom;
      const showAbove = spaceBelow < menuHeight && rect.top > menuHeight;
      
      setMenuPosition({
        top: showAbove ? rect.top - menuHeight - 4 : rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 320),
      });
    }
  };

  // Keep menu position updated while open
  useEffect(() => {
    if (!isOpen) return;
    
    // Initial position
    updateMenuPosition();
    
    // Update position on any scroll event (capture phase to catch all scrollable containers)
    const handleScroll = () => {
      requestAnimationFrame(updateMenuPosition);
    };
    
    document.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", updateMenuPosition);
    
    return () => {
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updateMenuPosition);
    };
  }, [isOpen]);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
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
        setSearchQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);


  // Get display text - always shows individual countries, never regions
  const getDisplayContent = () => {
    if (selected.length === 0) {
      return <span className="text-muted-foreground">{placeholder}</span>;
    }

    // Build display items from selected country codes
    const displayItems: { label: string; code: string; flag: string }[] = [];

    selected.forEach((code) => {
      const country = COUNTRIES.find((c) => c.code === code);
      if (country) {
        displayItems.push({ 
          label: country.name, 
          code, 
          flag: country.flag 
        });
      }
    });

    if (displayItems.length === 0) {
      return <span className="text-muted-foreground">{placeholder}</span>;
    }

    // Show chips for up to 2 items, then count
    if (displayItems.length <= 2) {
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          {displayItems.map((item) => (
            <span
              key={item.code}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium"
            >
              <span className="text-sm">{item.flag}</span>
              {item.label}
              <button
                type="button"
                onClick={(e) => removeCountry(item.code, e)}
                className="hover:bg-primary/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium"
        >
          <span className="text-sm">{displayItems[0].flag}</span>
          {displayItems[0].label}
        </span>
        <span className="text-xs text-muted-foreground">
          +{displayItems.length - 1} more
        </span>
      </div>
    );
  };

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
          {selected.length > 0 && (
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
              height: "450px",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Search Input */}
            <div className="p-3 border-b border-border" style={{ flexShrink: 0 }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search countries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none text-sm"
                />
              </div>
            </div>

            {/* Selected Countries as Chips */}
            {selected.length > 0 && !searchQuery && (
              <div className="p-2 border-b border-border bg-primary/5" style={{ flexShrink: 0 }}>
                <div className="text-xs font-medium text-primary mb-1.5">
                  Selected ({selected.length})
                </div>
                <div className="flex flex-wrap gap-1 max-h-[60px] overflow-y-auto">
                  {selected.map((code) => {
                    const country = COUNTRIES.find((c) => c.code === code);
                    if (!country) return null;
                    return (
                      <span
                        key={code}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium"
                      >
                        <span>{country.flag}</span>
                        {country.name}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCountry(code);
                          }}
                          className="hover:bg-primary/20 rounded-full p-0.5 ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Region Quick Buttons */}
            {!searchQuery && (
              <div className="px-3 py-2 border-b border-border bg-muted/30" style={{ flexShrink: 0 }}>
                <div className="flex flex-wrap gap-1.5">
                  {getAllRegions().map((region) => {
                    const isFullySelected = isRegionFullySelected(region);
                    return (
                      <button
                        key={region}
                        type="button"
                        onClick={() => toggleRegion(region)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                          isFullySelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        <span className="text-sm">{REGIONS[region].icon}</span>
                        {REGIONS[region].name}
                        {isFullySelected && <Check className="w-3 h-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Country List - Scrollable */}
            <div 
              ref={listRef}
              style={{ 
                flex: "1 1 0",
                overflowY: "auto", 
                minHeight: 0,
                overscrollBehavior: "contain",
              }}
            >
              {filteredCountries.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No countries found for "{searchQuery}"
                </div>
              ) : searchQuery ? (
                // Flat list when searching
                <div className="p-1">
                  {filteredCountries.map((country) => (
                    <CountryOption
                      key={country.code}
                      country={country}
                      isSelected={selected.includes(country.code)}
                      onToggle={() => toggleCountry(country.code)}
                    />
                  ))}
                </div>
              ) : (
                // Grouped by region when not searching
                getAllRegions().map((region) => {
                  const countries = groupedCountries[region];
                  if (countries.length === 0) return null;
                  return (
                    <div key={region}>
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                        {REGIONS[region].icon} {REGIONS[region].name}
                      </div>
                      <div className="p-1">
                        {countries.map((country) => (
                          <CountryOption
                            key={country.code}
                            country={country}
                            isSelected={selected.includes(country.code)}
                            onToggle={() => toggleCountry(country.code)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer with selection count */}
            {selected.length > 0 && (
              <div className="p-3 border-t border-border bg-muted/30 flex items-center justify-between rounded-b-xl" style={{ flexShrink: 0 }}>
                <span className="text-sm text-muted-foreground">
                  {selected.length} {selected.length === 1 ? "country" : "countries"} selected
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

// Individual country option component
function CountryOption({
  country,
  isSelected,
  onToggle,
}: {
  country: Country;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg hover:bg-muted/50 transition-colors ${
        isSelected ? "bg-primary/5" : ""
      }`}
    >
      {/* Checkbox indicator */}
      <div
        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
          isSelected ? "bg-primary border-primary" : "border-border"
        }`}
      >
        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
      </div>

      {/* Flag */}
      <span className="text-base flex-shrink-0">{country.flag}</span>

      {/* Country name */}
      <span className="text-sm truncate">{country.name}</span>

      {/* Country code */}
      <span className="text-xs text-muted-foreground ml-auto">{country.code}</span>
    </button>
  );
}

