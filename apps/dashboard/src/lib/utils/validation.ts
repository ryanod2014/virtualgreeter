/**
 * Validation constants and utilities for numeric inputs
 * P2-005: Input Validation - Trigger Delay and Max Simulations
 */

// Validation limits for widget settings
export const VALIDATION = {
  trigger_delay: {
    min: 0,
    max: 300, // 5 minutes
    label: "Trigger delay",
    unit: "seconds",
  },
  auto_hide_delay: {
    min: 0,
    max: 300, // 5 minutes (stored in seconds)
    label: "Auto-hide delay", 
    unit: "seconds",
    nullable: true,
  },
  auto_hide_delay_minutes: {
    min: 0,
    max: 60, // 60 minutes (UI input is in minutes)
    label: "Auto-hide delay",
    unit: "minutes",
  },
  max_simultaneous_simulations: {
    min: 1,
    max: 100,
    label: "Max simultaneous visitors",
    unit: "visitors",
  },
  priority_rank: {
    min: 1,
    max: 99,
    label: "Priority rank",
    unit: "",
  },
} as const;

/**
 * Validate a numeric value against min/max constraints
 * Returns error message if invalid, null if valid
 */
export function validateNumber(
  value: number | null | undefined,
  field: keyof typeof VALIDATION,
  options?: { allowNull?: boolean }
): string | null {
  const config = VALIDATION[field];
  
  // Handle null/undefined
  if (value === null || value === undefined) {
    if (options?.allowNull || ('nullable' in config && config.nullable)) {
      return null; // Valid
    }
    return `${config.label} is required`;
  }

  // Check if it's a number
  if (typeof value !== 'number' || isNaN(value)) {
    return `${config.label} must be a valid number`;
  }

  // Check if it's an integer
  if (!Number.isInteger(value)) {
    return `${config.label} must be a whole number`;
  }

  // Check min
  if (value < config.min) {
    return `${config.label} must be at least ${config.min}${config.unit ? ` ${config.unit}` : ''}`;
  }

  // Check max
  if (value > config.max) {
    return `${config.label} must be at most ${config.max}${config.unit ? ` ${config.unit}` : ''}`;
  }

  return null; // Valid
}

/**
 * Clamp a value to valid range (for graceful handling of existing invalid data)
 */
export function clampToValidRange(
  value: number | null | undefined,
  field: keyof typeof VALIDATION
): number {
  const config = VALIDATION[field];
  
  if (value === null || value === undefined || isNaN(value)) {
    return config.min;
  }
  
  return Math.min(Math.max(Math.round(value), config.min), config.max);
}

/**
 * Parse and validate a string input (from form input)
 * Returns { value: number | null, error: string | null }
 */
export function parseAndValidateInput(
  input: string,
  field: keyof typeof VALIDATION,
  options?: { allowNull?: boolean; allowEmpty?: boolean }
): { value: number | null; error: string | null } {
  // Empty string handling
  if (input === '' || input === null || input === undefined) {
    if (options?.allowEmpty || options?.allowNull) {
      return { value: null, error: null };
    }
    return { value: null, error: `${VALIDATION[field].label} is required` };
  }

  const parsed = parseInt(input, 10);
  
  if (isNaN(parsed)) {
    return { value: null, error: `${VALIDATION[field].label} must be a valid number` };
  }

  const error = validateNumber(parsed, field, options);
  return { value: error ? null : parsed, error };
}

