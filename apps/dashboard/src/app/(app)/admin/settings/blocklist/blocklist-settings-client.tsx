"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowLeft, Shield, Search, X, Check, Loader2, Globe, Ban, CheckCircle2, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CountryListMode } from "@ghost-greeter/domain/database.types";
import {
  COUNTRIES,
  REGIONS,
  SPECIAL_GROUPS,
  type Region,
  type SpecialGroup,
  getCountryCodesByRegion,
  getCountryCodesBySpecialGroup,
  searchCountries,
  getAllRegions,
  getAllSpecialGroups,
  type Country,
} from "@/lib/utils/countries";

// Create a lookup map for quick country retrieval
const COUNTRY_MAP = new Map(COUNTRIES.map((c) => [c.code, c]));

interface Props {
  orgId: string;
  initialBlockedCountries: string[];
  initialMode: CountryListMode;
  initialGeoFailureHandling: "allow" | "block";
}

export function BlocklistSettingsClient({ orgId, initialBlockedCountries, initialMode, initialGeoFailureHandling }: Props) {
  const [countryList, setCountryList] = useState<string[]>(initialBlockedCountries);
  const [mode, setMode] = useState<CountryListMode>(initialMode);
  const [geoFailureHandling, setGeoFailureHandling] = useState<"allow" | "block">(initialGeoFailureHandling);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const hasChanges =
    JSON.stringify([...countryList].sort()) !== JSON.stringify([...initialBlockedCountries].sort()) ||
    mode !== initialMode ||
    geoFailureHandling !== initialGeoFailureHandling;

  // Filter countries based on search query
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

  // Check if a full region is selected
  const isRegionFullySelected = (region: Region): boolean => {
    const regionCodes = getCountryCodesByRegion(region);
    return regionCodes.every((code) => countryList.includes(code));
  };

  // Check if a special group is fully selected
  const isSpecialGroupFullySelected = (group: SpecialGroup): boolean => {
    const groupCodes = getCountryCodesBySpecialGroup(group);
    return groupCodes.every((code) => countryList.includes(code));
  };

  // Toggle entire region
  const toggleRegion = (region: Region) => {
    const regionCodes = getCountryCodesByRegion(region);
    if (isRegionFullySelected(region)) {
      setCountryList(countryList.filter((code) => !regionCodes.includes(code)));
    } else {
      const newSelected = new Set([...countryList, ...regionCodes]);
      setCountryList(Array.from(newSelected));
    }
  };

  // Toggle special group
  const toggleSpecialGroup = (group: SpecialGroup) => {
    const groupCodes = getCountryCodesBySpecialGroup(group);
    if (isSpecialGroupFullySelected(group)) {
      setCountryList(countryList.filter((code) => !groupCodes.includes(code)));
    } else {
      const newSelected = new Set([...countryList, ...groupCodes]);
      setCountryList(Array.from(newSelected));
    }
  };

  // Toggle individual country
  const toggleCountry = (code: string) => {
    if (countryList.includes(code)) {
      setCountryList(countryList.filter((c) => c !== code));
    } else {
      setCountryList([...countryList, code]);
    }
  };

  // Remove a country from selection
  const removeCountry = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCountryList(countryList.filter((c) => c !== code));
  };

  // Clear all selections
  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCountryList([]);
  };

  // Calculate menu position
  const updateMenuPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const menuHeight = Math.min(450, viewportHeight * 0.8);
      
      const spaceBelow = viewportHeight - rect.bottom;
      const showAbove = spaceBelow < menuHeight && rect.top > menuHeight;
      
      setMenuPosition({
        top: showAbove ? rect.top - menuHeight - 4 : rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 400),
      });
    }
  };

  // Keep menu position updated while open
  useEffect(() => {
    if (!isDropdownOpen) return;
    
    updateMenuPosition();
    
    const handleScroll = () => {
      requestAnimationFrame(updateMenuPosition);
    };
    
    document.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", updateMenuPosition);
    
    return () => {
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updateMenuPosition);
    };
  }, [isDropdownOpen]);

  // Focus search input when opening
  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isDropdownOpen]);

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
        setIsDropdownOpen(false);
        setSearchQuery("");
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen]);

  const handleModeChange = (newMode: CountryListMode) => {
    setMode(newMode);
    if (countryList.length > 0) {
      setCountryList([]);
    }
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          blocked_countries: countryList,
          country_list_mode: mode,
          geo_failure_handling: geoFailureHandling,
        })
        .eq("id", orgId);

      if (updateError) throw updateError;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const isBlocklistMode = mode === "blocklist";

  // Get display content for the dropdown button
  const getDisplayContent = () => {
    if (countryList.length === 0) {
      return (
        <span className="text-muted-foreground">
          {isBlocklistMode ? "Select countries to block..." : "Select countries to allow..."}
        </span>
      );
    }

    const displayItems = countryList
      .map((code) => COUNTRY_MAP.get(code))
      .filter(Boolean) as Country[];

    if (displayItems.length <= 2) {
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          {displayItems.map((country) => (
            <span
              key={country.code}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                isBlocklistMode
                  ? "bg-destructive/10 text-destructive"
                  : "bg-green-500/10 text-green-500"
              }`}
            >
              <span className="text-sm">{country.flag}</span>
              {country.name}
              <button
                type="button"
                onClick={(e) => removeCountry(country.code, e)}
                className={`rounded-full p-0.5 ${
                  isBlocklistMode ? "hover:bg-destructive/20" : "hover:bg-green-500/20"
                }`}
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
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
            isBlocklistMode
              ? "bg-destructive/10 text-destructive"
              : "bg-green-500/10 text-green-500"
          }`}
        >
          <span className="text-sm">{displayItems[0].flag}</span>
          {displayItems[0].name}
        </span>
        <span className="text-xs text-muted-foreground">
          +{displayItems.length - 1} more
        </span>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>

        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Country Restrictions</h1>
            <p className="text-muted-foreground">
              Control which countries can see the widget
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
          {error}
        </div>
      )}

      {/* Success Alert */}
      {saveSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 flex items-center gap-2">
          <Check className="w-5 h-5" />
          Changes saved successfully
        </div>
      )}

      {/* Mode Selection */}
      <div className="space-y-6">
        <div className="glass rounded-2xl overflow-hidden">
          {/* Mode Toggle Header */}
          <div className="p-3 border-b border-border" style={{ flexShrink: 0 }}>
            <span className="text-sm font-medium text-muted-foreground">Restriction Mode</span>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Blocklist Option */}
              <button
                onClick={() => handleModeChange("blocklist")}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  isBlocklistMode
                    ? "border-destructive bg-destructive/5"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${isBlocklistMode ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                    <Ban className="w-5 h-5" />
                  </div>
                  <span className="font-semibold">Blocklist</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Block specific countries. Everyone else can see the widget.
                </p>
              </button>

              {/* Allowlist Option */}
              <button
                onClick={() => handleModeChange("allowlist")}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  !isBlocklistMode
                    ? "border-green-500 bg-green-500/5"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${!isBlocklistMode ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"}`}>
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="font-semibold">Allowlist</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Only allow specific countries. Everyone else is blocked.
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Geo-Failure Handling Section */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-3 border-b border-border" style={{ flexShrink: 0 }}>
            <span className="text-sm font-medium text-muted-foreground">Geolocation Failure Handling</span>
          </div>

          <div className="p-4">
            <p className="text-sm text-muted-foreground mb-4">
              When we cannot determine a visitor&apos;s location (e.g., VPN, privacy tools, or API failure), choose what to do:
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* Allow Option */}
              <button
                onClick={() => setGeoFailureHandling("allow")}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  geoFailureHandling === "allow"
                    ? "border-green-500 bg-green-500/5"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${geoFailureHandling === "allow" ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"}`}>
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="font-semibold">Allow</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Let visitors through when location cannot be determined (lenient).
                </p>
              </button>

              {/* Block Option */}
              <button
                onClick={() => setGeoFailureHandling("block")}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  geoFailureHandling === "block"
                    ? "border-destructive bg-destructive/5"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${geoFailureHandling === "block" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                    <Ban className="w-5 h-5" />
                  </div>
                  <span className="font-semibold">Block</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Block visitors when location cannot be determined (strict).
                </p>
              </button>
            </div>

            {/* Failure Rate Info */}
            <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Note:</span> Geolocation typically fails for 2-5% of visitors using VPNs, privacy tools, or from certain networks. Choose &apos;Allow&apos; to be lenient (recommended for most sites) or &apos;Block&apos; to be strict (better for restricted services).
              </p>
            </div>
          </div>
        </div>

        {/* Country List Section */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-3 border-b border-border" style={{ flexShrink: 0 }}>
            <span className="text-sm font-medium text-muted-foreground">
              {isBlocklistMode ? "Blocked Countries" : "Allowed Countries"}
            </span>
          </div>
          
          <div className="p-4">
            <p className="text-sm text-muted-foreground mb-4">
              {isBlocklistMode
                ? "Visitors from these countries will not see the widget on your website. Their connection will be silently ignored."
                : "Only visitors from these countries will see the widget. All other countries will be blocked."}
            </p>

            {/* Country Selector Dropdown */}
            <div className="relative">
              <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/50 border transition-colors outline-none text-left min-h-[42px] ${
                  isDropdownOpen ? "border-primary" : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex-1 min-w-0">{getDisplayContent()}</div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {countryList.length > 0 && (
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
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {/* Dropdown Menu - Rendered via Portal */}
              {isDropdownOpen &&
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
                          placeholder={isBlocklistMode ? "Search countries to block..." : "Search countries to allow..."}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none text-sm"
                        />
                      </div>
                    </div>

                    {/* Selected Countries as Chips */}
                    {countryList.length > 0 && !searchQuery && (
                      <div 
                        className={`p-2 border-b border-border ${isBlocklistMode ? "bg-destructive/5" : "bg-green-500/5"}`}
                        style={{ flexShrink: 0 }}
                      >
                        <div className={`text-xs font-medium mb-1.5 ${isBlocklistMode ? "text-destructive" : "text-green-500"}`}>
                          {isBlocklistMode ? "Blocked" : "Allowed"} ({countryList.length})
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-[60px] overflow-y-auto">
                          {countryList.map((code) => {
                            const country = COUNTRY_MAP.get(code);
                            if (!country) return null;
                            return (
                              <span
                                key={code}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                                  isBlocklistMode
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-green-500/10 text-green-500"
                                }`}
                              >
                                <span>{country.flag}</span>
                                {country.name}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCountry(code);
                                  }}
                                  className={`rounded-full p-0.5 ml-0.5 ${
                                    isBlocklistMode ? "hover:bg-destructive/20" : "hover:bg-green-500/20"
                                  }`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Region & Special Group Quick Buttons */}
                    {!searchQuery && (
                      <div className="px-3 py-2 border-b border-border bg-muted/30" style={{ flexShrink: 0 }}>
                        <div className="flex flex-wrap gap-1.5">
                          {/* Special Groups First (like Developing Countries) */}
                          {getAllSpecialGroups().map((group) => {
                            const isFullySelected = isSpecialGroupFullySelected(group);
                            return (
                              <button
                                key={group}
                                type="button"
                                onClick={() => toggleSpecialGroup(group)}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                                  isFullySelected
                                    ? isBlocklistMode
                                      ? "bg-destructive text-destructive-foreground"
                                      : "bg-green-500 text-white"
                                    : "bg-muted hover:bg-muted/80"
                                }`}
                              >
                                <span className="text-sm">{SPECIAL_GROUPS[group].icon}</span>
                                {SPECIAL_GROUPS[group].name}
                                {isFullySelected && <Check className="w-3 h-3" />}
                              </button>
                            );
                          })}
                          
                          {/* Divider */}
                          <div className="w-px h-6 bg-border mx-1" />
                          
                          {/* Region Buttons */}
                          {getAllRegions().map((region) => {
                            const isFullySelected = isRegionFullySelected(region);
                            return (
                              <button
                                key={region}
                                type="button"
                                onClick={() => toggleRegion(region)}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                                  isFullySelected
                                    ? isBlocklistMode
                                      ? "bg-destructive text-destructive-foreground"
                                      : "bg-green-500 text-white"
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
                      style={{ 
                        flex: "1 1 0",
                        overflowY: "auto", 
                        minHeight: 0,
                        overscrollBehavior: "contain",
                      }}
                    >
                      {filteredCountries.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No countries found for &quot;{searchQuery}&quot;
                        </div>
                      ) : searchQuery ? (
                        // Flat list when searching
                        <div className="p-1">
                          {filteredCountries.map((country) => (
                            <CountryOption
                              key={country.code}
                              country={country}
                              isSelected={countryList.includes(country.code)}
                              onToggle={() => toggleCountry(country.code)}
                              isBlocklistMode={isBlocklistMode}
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
                                    isSelected={countryList.includes(country.code)}
                                    onToggle={() => toggleCountry(country.code)}
                                    isBlocklistMode={isBlocklistMode}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer with selection count */}
                    {countryList.length > 0 && (
                      <div className="p-3 border-t border-border bg-muted/30 flex items-center justify-between rounded-b-xl" style={{ flexShrink: 0 }}>
                        <span className="text-sm text-muted-foreground">
                          {countryList.length} {countryList.length === 1 ? "country" : "countries"} {isBlocklistMode ? "blocked" : "allowed"}
                        </span>
                        <button
                          type="button"
                          onClick={clearAll}
                          className={`text-sm hover:underline ${isBlocklistMode ? "text-destructive" : "text-green-500"}`}
                        >
                          Clear all
                        </button>
                      </div>
                    )}
                  </div>,
                  document.body
                )}
            </div>

            {/* Empty State */}
            {countryList.length === 0 && !isDropdownOpen && (
              <div className="flex items-center gap-3 py-8 justify-center text-muted-foreground mt-4">
                <Globe className="w-5 h-5" />
                <span>
                  {isBlocklistMode
                    ? "No countries blocked - widget visible worldwide"
                    : "No countries allowed - add countries to show widget"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
        <h4 className="font-medium mb-2 text-orange-500">
          ⚠️ How Country {isBlocklistMode ? "Blocking" : "Allowlisting"} Works
        </h4>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li>• Visitor location is determined by IP address when they load your page</li>
          {isBlocklistMode ? (
            <>
              <li>• Blocked visitors will simply not see the widget - no error is shown to them</li>
              <li>• If we cannot determine a visitor&apos;s location, they will <strong>not</strong> be blocked</li>
            </>
          ) : (
            <>
              <li>• Only visitors from allowed countries will see the widget</li>
              <li>• If we cannot determine a visitor&apos;s location, they will be <strong>blocked</strong></li>
              <li>• Make sure to add all countries you want to serve!</li>
            </>
          )}
          <li>• VPN users may bypass this restriction by appearing from a different country</li>
        </ul>
      </div>
    </div>
  );
}

// Individual country option component
function CountryOption({
  country,
  isSelected,
  onToggle,
  isBlocklistMode,
}: {
  country: Country;
  isSelected: boolean;
  onToggle: () => void;
  isBlocklistMode: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg hover:bg-muted/50 transition-colors ${
        isSelected ? (isBlocklistMode ? "bg-destructive/5" : "bg-green-500/5") : ""
      }`}
    >
      {/* Checkbox indicator */}
      <div
        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
          isSelected
            ? isBlocklistMode
              ? "bg-destructive border-destructive"
              : "bg-green-500 border-green-500"
            : "border-border"
        }`}
      >
        {isSelected && <Check className="w-3 h-3 text-white" />}
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
