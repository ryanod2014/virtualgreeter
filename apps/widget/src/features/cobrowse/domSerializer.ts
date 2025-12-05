/**
 * DOM Serialization utilities for co-browse feature
 *
 * This module handles sanitization of sensitive data before
 * DOM snapshots are transmitted to agents.
 */

/** The mask character used to replace sensitive values */
const MASK_VALUE = "••••••••";

/**
 * Selectors for elements that should have their values masked
 */
const SENSITIVE_SELECTORS = [
  // Password inputs
  'input[type="password"]',
  // Credit card inputs (autocomplete attribute)
  'input[autocomplete="cc-number"]',
  'input[autocomplete="cc-csc"]',
  'input[autocomplete="cc-exp"]',
  'input[autocomplete="cc-exp-month"]',
  'input[autocomplete="cc-exp-year"]',
  // Custom sensitive elements
  '[data-sensitive="true"]',
] as const;

/**
 * Masks sensitive field values in a cloned DOM document.
 *
 * This function should be called on a cloned document before serialization
 * to prevent sensitive data (passwords, credit cards, etc.) from being
 * transmitted during co-browse sessions.
 *
 * @param docClone - The cloned Document to sanitize (will be mutated)
 *
 * @example
 * ```ts
 * const docClone = document.cloneNode(true) as Document;
 * maskSensitiveFields(docClone);
 * const html = docClone.documentElement.outerHTML;
 * ```
 */
export function maskSensitiveFields(docClone: Document): void {
  // Build combined selector for all sensitive elements
  const combinedSelector = SENSITIVE_SELECTORS.join(", ");

  // Query all sensitive elements
  const sensitiveElements = docClone.querySelectorAll(combinedSelector);

  sensitiveElements.forEach((element) => {
    if (element instanceof HTMLInputElement) {
      // For input elements, mask the value attribute
      element.setAttribute("value", MASK_VALUE);
      // Also clear any data-value or similar attributes that might hold the value
      element.removeAttribute("data-value");
    } else if (element instanceof HTMLTextAreaElement) {
      // For textareas marked as sensitive
      element.textContent = MASK_VALUE;
      element.setAttribute("value", MASK_VALUE);
    } else {
      // For other elements with data-sensitive="true"
      // Mask their text content if they have any
      if (element.textContent && element.textContent.trim()) {
        element.textContent = MASK_VALUE;
      }
    }
  });
}

/**
 * Checks if an element is considered sensitive and should be masked.
 *
 * @param element - The element to check
 * @returns true if the element matches any sensitive selector
 */
export function isSensitiveElement(element: Element): boolean {
  return SENSITIVE_SELECTORS.some((selector) => element.matches(selector));
}

/** Exported for testing */
export { MASK_VALUE, SENSITIVE_SELECTORS };

