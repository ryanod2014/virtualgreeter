/**
 * Country and Region data for location filtering
 */

export interface Country {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  flag: string;
  region: Region;
}

export type Region = "americas" | "europe" | "asia_pacific" | "middle_east_africa";

// Special groupings (not mutually exclusive with regions)
export type SpecialGroup = "developing_countries";

export const REGIONS: Record<Region, { name: string; icon: string }> = {
  americas: { name: "Americas", icon: "🌎" },
  europe: { name: "Europe", icon: "🌍" },
  asia_pacific: { name: "Asia-Pacific", icon: "🌏" },
  middle_east_africa: { name: "Middle East & Africa", icon: "🌍" },
};

export const SPECIAL_GROUPS: Record<SpecialGroup, { name: string; icon: string }> = {
  developing_countries: { name: "Developing Countries", icon: "🌐" },
};

// Developing countries list based on UN/World Bank classifications
// These are typically lower-income and lower-middle-income countries
export const DEVELOPING_COUNTRY_CODES: string[] = [
  // Africa
  "NG", "ET", "EG", "CD", "TZ", "KE", "UG", "DZ", "SD", "MA", "AO", "GH", "MZ", 
  "CI", "CM", "NE", "BF", "ML", "MW", "ZM", "SN", "ZW", "TD", "RW", "TN", "GN", 
  "BJ", "BI", "SO", "SS", "TG", "SL", "LY", "CG", "LR", "CF", "MR", "ER", "GM", 
  "GW", "GQ", "DJ", "KM", "ST",
  // Middle East
  "IR", "IQ", "YE", "SY", "PS", "LB", "JO", "AF",
  // Asia
  "IN", "ID", "PK", "BD", "PH", "VN", "MM", "NP", "LK", "KH", "LA", "MN", "KG", 
  "TJ", "TM", "BT", "KP", "UZ",
  // Americas  
  "GT", "CU", "BO", "HN", "NI", "SV", "HT", "GY", "SR", "VE", "EC", "PE", "CO",
  // Eastern Europe
  "UA", "BY", "MD",
];

/**
 * Full list of countries with ISO codes, names, flags, and regions
 */
export const COUNTRIES: Country[] = [
  // Americas
  { code: "US", name: "United States", flag: "🇺🇸", region: "americas" },
  { code: "CA", name: "Canada", flag: "🇨🇦", region: "americas" },
  { code: "MX", name: "Mexico", flag: "🇲🇽", region: "americas" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", region: "americas" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", region: "americas" },
  { code: "CO", name: "Colombia", flag: "🇨🇴", region: "americas" },
  { code: "CL", name: "Chile", flag: "🇨🇱", region: "americas" },
  { code: "PE", name: "Peru", flag: "🇵🇪", region: "americas" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪", region: "americas" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨", region: "americas" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹", region: "americas" },
  { code: "CU", name: "Cuba", flag: "🇨🇺", region: "americas" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴", region: "americas" },
  { code: "DO", name: "Dominican Republic", flag: "🇩🇴", region: "americas" },
  { code: "HN", name: "Honduras", flag: "🇭🇳", region: "americas" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾", region: "americas" },
  { code: "SV", name: "El Salvador", flag: "🇸🇻", region: "americas" },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮", region: "americas" },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷", region: "americas" },
  { code: "PA", name: "Panama", flag: "🇵🇦", region: "americas" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾", region: "americas" },
  { code: "JM", name: "Jamaica", flag: "🇯🇲", region: "americas" },
  { code: "PR", name: "Puerto Rico", flag: "🇵🇷", region: "americas" },
  { code: "TT", name: "Trinidad and Tobago", flag: "🇹🇹", region: "americas" },
  { code: "HT", name: "Haiti", flag: "🇭🇹", region: "americas" },
  { code: "BS", name: "Bahamas", flag: "🇧🇸", region: "americas" },
  { code: "BZ", name: "Belize", flag: "🇧🇿", region: "americas" },
  { code: "BB", name: "Barbados", flag: "🇧🇧", region: "americas" },
  { code: "GY", name: "Guyana", flag: "🇬🇾", region: "americas" },
  { code: "SR", name: "Suriname", flag: "🇸🇷", region: "americas" },

  // Europe
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", region: "europe" },
  { code: "DE", name: "Germany", flag: "🇩🇪", region: "europe" },
  { code: "FR", name: "France", flag: "🇫🇷", region: "europe" },
  { code: "IT", name: "Italy", flag: "🇮🇹", region: "europe" },
  { code: "ES", name: "Spain", flag: "🇪🇸", region: "europe" },
  { code: "PL", name: "Poland", flag: "🇵🇱", region: "europe" },
  { code: "RO", name: "Romania", flag: "🇷🇴", region: "europe" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", region: "europe" },
  { code: "BE", name: "Belgium", flag: "🇧🇪", region: "europe" },
  { code: "CZ", name: "Czech Republic", flag: "🇨🇿", region: "europe" },
  { code: "GR", name: "Greece", flag: "🇬🇷", region: "europe" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", region: "europe" },
  { code: "SE", name: "Sweden", flag: "🇸🇪", region: "europe" },
  { code: "HU", name: "Hungary", flag: "🇭🇺", region: "europe" },
  { code: "AT", name: "Austria", flag: "🇦🇹", region: "europe" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", region: "europe" },
  { code: "BG", name: "Bulgaria", flag: "🇧🇬", region: "europe" },
  { code: "DK", name: "Denmark", flag: "🇩🇰", region: "europe" },
  { code: "FI", name: "Finland", flag: "🇫🇮", region: "europe" },
  { code: "SK", name: "Slovakia", flag: "🇸🇰", region: "europe" },
  { code: "NO", name: "Norway", flag: "🇳🇴", region: "europe" },
  { code: "IE", name: "Ireland", flag: "🇮🇪", region: "europe" },
  { code: "HR", name: "Croatia", flag: "🇭🇷", region: "europe" },
  { code: "MD", name: "Moldova", flag: "🇲🇩", region: "europe" },
  { code: "BA", name: "Bosnia and Herzegovina", flag: "🇧🇦", region: "europe" },
  { code: "AL", name: "Albania", flag: "🇦🇱", region: "europe" },
  { code: "LT", name: "Lithuania", flag: "🇱🇹", region: "europe" },
  { code: "MK", name: "North Macedonia", flag: "🇲🇰", region: "europe" },
  { code: "SI", name: "Slovenia", flag: "🇸🇮", region: "europe" },
  { code: "LV", name: "Latvia", flag: "🇱🇻", region: "europe" },
  { code: "EE", name: "Estonia", flag: "🇪🇪", region: "europe" },
  { code: "ME", name: "Montenegro", flag: "🇲🇪", region: "europe" },
  { code: "LU", name: "Luxembourg", flag: "🇱🇺", region: "europe" },
  { code: "MT", name: "Malta", flag: "🇲🇹", region: "europe" },
  { code: "IS", name: "Iceland", flag: "🇮🇸", region: "europe" },
  { code: "CY", name: "Cyprus", flag: "🇨🇾", region: "europe" },
  { code: "RS", name: "Serbia", flag: "🇷🇸", region: "europe" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦", region: "europe" },
  { code: "BY", name: "Belarus", flag: "🇧🇾", region: "europe" },
  { code: "RU", name: "Russia", flag: "🇷🇺", region: "europe" },

  // Asia-Pacific
  { code: "CN", name: "China", flag: "🇨🇳", region: "asia_pacific" },
  { code: "JP", name: "Japan", flag: "🇯🇵", region: "asia_pacific" },
  { code: "IN", name: "India", flag: "🇮🇳", region: "asia_pacific" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", region: "asia_pacific" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰", region: "asia_pacific" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩", region: "asia_pacific" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", region: "asia_pacific" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", region: "asia_pacific" },
  { code: "TH", name: "Thailand", flag: "🇹🇭", region: "asia_pacific" },
  { code: "MM", name: "Myanmar", flag: "🇲🇲", region: "asia_pacific" },
  { code: "KR", name: "South Korea", flag: "🇰🇷", region: "asia_pacific" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", region: "asia_pacific" },
  { code: "NP", name: "Nepal", flag: "🇳🇵", region: "asia_pacific" },
  { code: "AU", name: "Australia", flag: "🇦🇺", region: "asia_pacific" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼", region: "asia_pacific" },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰", region: "asia_pacific" },
  { code: "KZ", name: "Kazakhstan", flag: "🇰🇿", region: "asia_pacific" },
  { code: "UZ", name: "Uzbekistan", flag: "🇺🇿", region: "asia_pacific" },
  { code: "KH", name: "Cambodia", flag: "🇰🇭", region: "asia_pacific" },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰", region: "asia_pacific" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", region: "asia_pacific" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", region: "asia_pacific" },
  { code: "LA", name: "Laos", flag: "🇱🇦", region: "asia_pacific" },
  { code: "MN", name: "Mongolia", flag: "🇲🇳", region: "asia_pacific" },
  { code: "KG", name: "Kyrgyzstan", flag: "🇰🇬", region: "asia_pacific" },
  { code: "TJ", name: "Tajikistan", flag: "🇹🇯", region: "asia_pacific" },
  { code: "TM", name: "Turkmenistan", flag: "🇹🇲", region: "asia_pacific" },
  { code: "BN", name: "Brunei", flag: "🇧🇳", region: "asia_pacific" },
  { code: "FJ", name: "Fiji", flag: "🇫🇯", region: "asia_pacific" },
  { code: "MV", name: "Maldives", flag: "🇲🇻", region: "asia_pacific" },
  { code: "BT", name: "Bhutan", flag: "🇧🇹", region: "asia_pacific" },
  { code: "KP", name: "North Korea", flag: "🇰🇵", region: "asia_pacific" },

  // Middle East & Africa
  { code: "NG", name: "Nigeria", flag: "🇳🇬", region: "middle_east_africa" },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹", region: "middle_east_africa" },
  { code: "EG", name: "Egypt", flag: "🇪🇬", region: "middle_east_africa" },
  { code: "CD", name: "DR Congo", flag: "🇨🇩", region: "middle_east_africa" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿", region: "middle_east_africa" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", region: "middle_east_africa" },
  { code: "KE", name: "Kenya", flag: "🇰🇪", region: "middle_east_africa" },
  { code: "UG", name: "Uganda", flag: "🇺🇬", region: "middle_east_africa" },
  { code: "DZ", name: "Algeria", flag: "🇩🇿", region: "middle_east_africa" },
  { code: "SD", name: "Sudan", flag: "🇸🇩", region: "middle_east_africa" },
  { code: "MA", name: "Morocco", flag: "🇲🇦", region: "middle_east_africa" },
  { code: "AO", name: "Angola", flag: "🇦🇴", region: "middle_east_africa" },
  { code: "GH", name: "Ghana", flag: "🇬🇭", region: "middle_east_africa" },
  { code: "MZ", name: "Mozambique", flag: "🇲🇿", region: "middle_east_africa" },
  { code: "CI", name: "Ivory Coast", flag: "🇨🇮", region: "middle_east_africa" },
  { code: "CM", name: "Cameroon", flag: "🇨🇲", region: "middle_east_africa" },
  { code: "NE", name: "Niger", flag: "🇳🇪", region: "middle_east_africa" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", region: "middle_east_africa" },
  { code: "ML", name: "Mali", flag: "🇲🇱", region: "middle_east_africa" },
  { code: "MW", name: "Malawi", flag: "🇲🇼", region: "middle_east_africa" },
  { code: "ZM", name: "Zambia", flag: "🇿🇲", region: "middle_east_africa" },
  { code: "SN", name: "Senegal", flag: "🇸🇳", region: "middle_east_africa" },
  { code: "ZW", name: "Zimbabwe", flag: "🇿🇼", region: "middle_east_africa" },
  { code: "TD", name: "Chad", flag: "🇹🇩", region: "middle_east_africa" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼", region: "middle_east_africa" },
  { code: "TN", name: "Tunisia", flag: "🇹🇳", region: "middle_east_africa" },
  { code: "GN", name: "Guinea", flag: "🇬🇳", region: "middle_east_africa" },
  { code: "BJ", name: "Benin", flag: "🇧🇯", region: "middle_east_africa" },
  { code: "BI", name: "Burundi", flag: "🇧🇮", region: "middle_east_africa" },
  { code: "SO", name: "Somalia", flag: "🇸🇴", region: "middle_east_africa" },
  { code: "SS", name: "South Sudan", flag: "🇸🇸", region: "middle_east_africa" },
  { code: "TG", name: "Togo", flag: "🇹🇬", region: "middle_east_africa" },
  { code: "SL", name: "Sierra Leone", flag: "🇸🇱", region: "middle_east_africa" },
  { code: "LY", name: "Libya", flag: "🇱🇾", region: "middle_east_africa" },
  { code: "CG", name: "Republic of Congo", flag: "🇨🇬", region: "middle_east_africa" },
  { code: "LR", name: "Liberia", flag: "🇱🇷", region: "middle_east_africa" },
  { code: "CF", name: "Central African Republic", flag: "🇨🇫", region: "middle_east_africa" },
  { code: "MR", name: "Mauritania", flag: "🇲🇷", region: "middle_east_africa" },
  { code: "ER", name: "Eritrea", flag: "🇪🇷", region: "middle_east_africa" },
  { code: "NA", name: "Namibia", flag: "🇳🇦", region: "middle_east_africa" },
  { code: "GM", name: "Gambia", flag: "🇬🇲", region: "middle_east_africa" },
  { code: "BW", name: "Botswana", flag: "🇧🇼", region: "middle_east_africa" },
  { code: "GA", name: "Gabon", flag: "🇬🇦", region: "middle_east_africa" },
  { code: "LS", name: "Lesotho", flag: "🇱🇸", region: "middle_east_africa" },
  { code: "GW", name: "Guinea-Bissau", flag: "🇬🇼", region: "middle_east_africa" },
  { code: "GQ", name: "Equatorial Guinea", flag: "🇬🇶", region: "middle_east_africa" },
  { code: "MU", name: "Mauritius", flag: "🇲🇺", region: "middle_east_africa" },
  { code: "SZ", name: "Eswatini", flag: "🇸🇿", region: "middle_east_africa" },
  { code: "DJ", name: "Djibouti", flag: "🇩🇯", region: "middle_east_africa" },
  { code: "CV", name: "Cape Verde", flag: "🇨🇻", region: "middle_east_africa" },
  { code: "KM", name: "Comoros", flag: "🇰🇲", region: "middle_east_africa" },
  { code: "SC", name: "Seychelles", flag: "🇸🇨", region: "middle_east_africa" },
  { code: "ST", name: "São Tomé and Príncipe", flag: "🇸🇹", region: "middle_east_africa" },
  // Middle East
  { code: "TR", name: "Turkey", flag: "🇹🇷", region: "middle_east_africa" },
  { code: "IR", name: "Iran", flag: "🇮🇷", region: "middle_east_africa" },
  { code: "IQ", name: "Iraq", flag: "🇮🇶", region: "middle_east_africa" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", region: "middle_east_africa" },
  { code: "YE", name: "Yemen", flag: "🇾🇪", region: "middle_east_africa" },
  { code: "SY", name: "Syria", flag: "🇸🇾", region: "middle_east_africa" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", region: "middle_east_africa" },
  { code: "IL", name: "Israel", flag: "🇮🇱", region: "middle_east_africa" },
  { code: "JO", name: "Jordan", flag: "🇯🇴", region: "middle_east_africa" },
  { code: "PS", name: "Palestine", flag: "🇵🇸", region: "middle_east_africa" },
  { code: "LB", name: "Lebanon", flag: "🇱🇧", region: "middle_east_africa" },
  { code: "OM", name: "Oman", flag: "🇴🇲", region: "middle_east_africa" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼", region: "middle_east_africa" },
  { code: "GE", name: "Georgia", flag: "🇬🇪", region: "middle_east_africa" },
  { code: "AM", name: "Armenia", flag: "🇦🇲", region: "middle_east_africa" },
  { code: "AZ", name: "Azerbaijan", flag: "🇦🇿", region: "middle_east_africa" },
  { code: "QA", name: "Qatar", flag: "🇶🇦", region: "middle_east_africa" },
  { code: "BH", name: "Bahrain", flag: "🇧🇭", region: "middle_east_africa" },
  { code: "AF", name: "Afghanistan", flag: "🇦🇫", region: "middle_east_africa" },
];

/**
 * Get countries by region
 */
export function getCountriesByRegion(region: Region): Country[] {
  return COUNTRIES.filter((c) => c.region === region);
}

/**
 * Get country codes by region
 */
export function getCountryCodesByRegion(region: Region): string[] {
  return getCountriesByRegion(region).map((c) => c.code);
}

/**
 * Get country by code
 */
export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
}

/**
 * Search countries by name or code
 */
export function searchCountries(query: string): Country[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return COUNTRIES;

  return COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(normalizedQuery) ||
      c.code.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Get all region keys
 */
export function getAllRegions(): Region[] {
  return Object.keys(REGIONS) as Region[];
}

/**
 * Get all special group keys
 */
export function getAllSpecialGroups(): SpecialGroup[] {
  return Object.keys(SPECIAL_GROUPS) as SpecialGroup[];
}

/**
 * Get country codes by special group
 */
export function getCountryCodesBySpecialGroup(group: SpecialGroup): string[] {
  switch (group) {
    case "developing_countries":
      return DEVELOPING_COUNTRY_CODES;
    default:
      return [];
  }
}

