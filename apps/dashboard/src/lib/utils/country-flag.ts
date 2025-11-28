/**
 * Convert a 2-letter country code to a flag emoji
 * Uses regional indicator symbols (Unicode)
 * 
 * Example: "US" → "🇺🇸", "GB" → "🇬🇧", "AU" → "🇦🇺"
 */
export function countryCodeToFlag(countryCode: string | null | undefined): string {
  if (!countryCode || countryCode.length !== 2) {
    return "🌍"; // Globe emoji for unknown
  }

  const code = countryCode.toUpperCase();
  
  // Convert each letter to regional indicator symbol
  // Regional indicators start at Unicode 0x1F1E6 (🇦)
  // A = 0x1F1E6, B = 0x1F1E7, etc.
  const firstLetter = code.charCodeAt(0) - 65 + 0x1F1E6;
  const secondLetter = code.charCodeAt(1) - 65 + 0x1F1E6;

  return String.fromCodePoint(firstLetter) + String.fromCodePoint(secondLetter);
}

/**
 * Format location with flag emoji
 * 
 * Example: "New York", "New York", "US" → "🇺🇸 New York, NY"
 */
export function formatLocationWithFlag(
  city: string | null | undefined,
  region: string | null | undefined,
  countryCode: string | null | undefined
): { flag: string; text: string } {
  const flag = countryCodeToFlag(countryCode);
  
  const parts = [city, region].filter(Boolean);
  const text = parts.length > 0 ? parts.join(", ") : "Unknown";
  
  return { flag, text };
}

