import { describe, it, expect } from "vitest";
import {
  maskSensitiveFields,
  isSensitiveElement,
  MASK_VALUE,
  SENSITIVE_SELECTORS,
} from "./domSerializer";

/**
 * Create a minimal DOM document for testing
 */
function createTestDocument(html: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(html, "text/html");
}

describe("domSerializer", () => {
  describe("maskSensitiveFields", () => {
    describe("Password fields", () => {
      it("should mask password input values", () => {
        const doc = createTestDocument(`
          <html>
            <body>
              <input type="password" id="pwd" value="secretPassword123" />
            </body>
          </html>
        `);

        maskSensitiveFields(doc);

        const input = doc.getElementById("pwd") as HTMLInputElement;
        expect(input.getAttribute("value")).toBe(MASK_VALUE);
      });

      it("should mask multiple password fields", () => {
        const doc = createTestDocument(`
          <html>
            <body>
              <input type="password" id="pwd1" value="password1" />
              <input type="password" id="pwd2" value="password2" />
            </body>
          </html>
        `);

        maskSensitiveFields(doc);

        const input1 = doc.getElementById("pwd1") as HTMLInputElement;
        const input2 = doc.getElementById("pwd2") as HTMLInputElement;
        expect(input1.getAttribute("value")).toBe(MASK_VALUE);
        expect(input2.getAttribute("value")).toBe(MASK_VALUE);
      });

      it("should remove data-value attributes from password fields", () => {
        const doc = createTestDocument(`
          <html>
            <body>
              <input type="password" id="pwd" value="secret" data-value="secret" />
            </body>
          </html>
        `);

        maskSensitiveFields(doc);

        const input = doc.getElementById("pwd") as HTMLInputElement;
        expect(input.hasAttribute("data-value")).toBe(false);
      });
    });

    describe("Credit card fields", () => {
      it("should mask credit card number inputs (autocomplete=cc-number)", () => {
        const doc = createTestDocument(`
          <html>
            <body>
              <input type="text" id="cc" autocomplete="cc-number" value="4111111111111111" />
            </body>
          </html>
        `);

        maskSensitiveFields(doc);

        const input = doc.getElementById("cc") as HTMLInputElement;
        expect(input.getAttribute("value")).toBe(MASK_VALUE);
      });

      it("should mask CVV inputs (autocomplete=cc-csc)", () => {
        const doc = createTestDocument(`
          <html>
            <body>
              <input type="text" id="cvv" autocomplete="cc-csc" value="123" />
            </body>
          </html>
        `);

        maskSensitiveFields(doc);

        const input = doc.getElementById("cvv") as HTMLInputElement;
        expect(input.getAttribute("value")).toBe(MASK_VALUE);
      });

      it("should mask credit card expiry inputs", () => {
        const doc = createTestDocument(`
          <html>
            <body>
              <input type="text" id="exp" autocomplete="cc-exp" value="12/25" />
              <input type="text" id="exp-month" autocomplete="cc-exp-month" value="12" />
              <input type="text" id="exp-year" autocomplete="cc-exp-year" value="2025" />
            </body>
          </html>
        `);

        maskSensitiveFields(doc);

        expect((doc.getElementById("exp") as HTMLInputElement).getAttribute("value")).toBe(MASK_VALUE);
        expect((doc.getElementById("exp-month") as HTMLInputElement).getAttribute("value")).toBe(MASK_VALUE);
        expect((doc.getElementById("exp-year") as HTMLInputElement).getAttribute("value")).toBe(MASK_VALUE);
      });
    });

    describe("Custom sensitive fields (data-sensitive)", () => {
      it("should mask inputs with data-sensitive=true", () => {
        const doc = createTestDocument(`
          <html>
            <body>
              <input type="text" id="ssn" data-sensitive="true" value="123-45-6789" />
            </body>
          </html>
        `);

        maskSensitiveFields(doc);

        const input = doc.getElementById("ssn") as HTMLInputElement;
        expect(input.getAttribute("value")).toBe(MASK_VALUE);
      });

      it("should mask text content of elements with data-sensitive=true", () => {
        const doc = createTestDocument(`
          <html>
            <body>
              <span id="secret" data-sensitive="true">Sensitive information here</span>
            </body>
          </html>
        `);

        maskSensitiveFields(doc);

        const span = doc.getElementById("secret");
        expect(span?.textContent).toBe(MASK_VALUE);
      });

      it("should mask textarea content with data-sensitive=true", () => {
        const doc = createTestDocument(`
          <html>
            <body>
              <textarea id="notes" data-sensitive="true">Private notes</textarea>
            </body>
          </html>
        `);

        maskSensitiveFields(doc);

        const textarea = doc.getElementById("notes") as HTMLTextAreaElement;
        expect(textarea.textContent).toBe(MASK_VALUE);
      });

      it("should NOT mask elements with data-sensitive=false", () => {
        const doc = createTestDocument(`
          <html>
            <body>
              <input type="text" id="name" data-sensitive="false" value="John Doe" />
            </body>
          </html>
        `);

        maskSensitiveFields(doc);

        const input = doc.getElementById("name") as HTMLInputElement;
        expect(input.getAttribute("value")).toBe("John Doe");
      });
    });

    describe("Regular fields (should NOT be masked)", () => {
      it("should NOT mask regular text inputs", () => {
        const doc = createTestDocument(`
          <html>
            <body>
              <input type="text" id="name" value="John Doe" />
              <input type="email" id="email" value="john@example.com" />
            </body>
          </html>
        `);

        maskSensitiveFields(doc);

        expect((doc.getElementById("name") as HTMLInputElement).getAttribute("value")).toBe("John Doe");
        expect((doc.getElementById("email") as HTMLInputElement).getAttribute("value")).toBe("john@example.com");
      });

      it("should NOT mask regular spans and divs", () => {
        const doc = createTestDocument(`
          <html>
            <body>
              <span id="text">Regular text</span>
              <div id="content">Regular content</div>
            </body>
          </html>
        `);

        maskSensitiveFields(doc);

        expect(doc.getElementById("text")?.textContent).toBe("Regular text");
        expect(doc.getElementById("content")?.textContent).toBe("Regular content");
      });
    });

    describe("Mixed form scenarios", () => {
      it("should correctly mask only sensitive fields in a complete form", () => {
        const doc = createTestDocument(`
          <html>
            <body>
              <form>
                <input type="text" id="username" value="johndoe" />
                <input type="password" id="password" value="secret123" />
                <input type="email" id="email" value="john@test.com" />
                <input type="text" id="cc-num" autocomplete="cc-number" value="4111111111111111" />
                <input type="text" id="phone" data-sensitive="true" value="555-1234" />
                <input type="text" id="address" value="123 Main St" />
              </form>
            </body>
          </html>
        `);

        maskSensitiveFields(doc);

        // Should NOT be masked
        expect((doc.getElementById("username") as HTMLInputElement).getAttribute("value")).toBe("johndoe");
        expect((doc.getElementById("email") as HTMLInputElement).getAttribute("value")).toBe("john@test.com");
        expect((doc.getElementById("address") as HTMLInputElement).getAttribute("value")).toBe("123 Main St");

        // SHOULD be masked
        expect((doc.getElementById("password") as HTMLInputElement).getAttribute("value")).toBe(MASK_VALUE);
        expect((doc.getElementById("cc-num") as HTMLInputElement).getAttribute("value")).toBe(MASK_VALUE);
        expect((doc.getElementById("phone") as HTMLInputElement).getAttribute("value")).toBe(MASK_VALUE);
      });

      it("should handle React-style forms (controlled inputs)", () => {
        // React forms often don't set value attribute directly
        const doc = createTestDocument(`
          <html>
            <body>
              <input type="password" id="pwd" />
            </body>
          </html>
        `);

        // Simulate React setting the value property (not attribute)
        const input = doc.getElementById("pwd") as HTMLInputElement;
        input.value = "reactPassword";

        maskSensitiveFields(doc);

        // Should set the value attribute to mask
        expect(input.getAttribute("value")).toBe(MASK_VALUE);
      });
    });

    describe("Edge cases", () => {
      it("should handle empty documents", () => {
        const doc = createTestDocument("<html><body></body></html>");

        // Should not throw
        expect(() => maskSensitiveFields(doc)).not.toThrow();
      });

      it("should handle documents with no sensitive fields", () => {
        const doc = createTestDocument(`
          <html>
            <body>
              <input type="text" value="regular" />
              <p>Just text</p>
            </body>
          </html>
        `);

        // Should not throw and not modify anything unexpectedly
        expect(() => maskSensitiveFields(doc)).not.toThrow();
      });

      it("should handle empty data-sensitive elements gracefully", () => {
        const doc = createTestDocument(`
          <html>
            <body>
              <span id="empty" data-sensitive="true"></span>
              <span id="whitespace" data-sensitive="true">   </span>
            </body>
          </html>
        `);

        maskSensitiveFields(doc);

        // Empty content should remain empty (no mask added for empty)
        expect(doc.getElementById("empty")?.textContent).toBe("");
        expect(doc.getElementById("whitespace")?.textContent?.trim()).toBe("");
      });
    });
  });

  describe("isSensitiveElement", () => {
    it("should return true for password inputs", () => {
      const doc = createTestDocument('<input type="password" />');
      const input = doc.querySelector("input")!;
      expect(isSensitiveElement(input)).toBe(true);
    });

    it("should return true for credit card inputs", () => {
      const doc = createTestDocument('<input autocomplete="cc-number" />');
      const input = doc.querySelector("input")!;
      expect(isSensitiveElement(input)).toBe(true);
    });

    it("should return true for data-sensitive elements", () => {
      const doc = createTestDocument('<span data-sensitive="true">Secret</span>');
      const span = doc.querySelector("span")!;
      expect(isSensitiveElement(span)).toBe(true);
    });

    it("should return false for regular elements", () => {
      const doc = createTestDocument('<input type="text" />');
      const input = doc.querySelector("input")!;
      expect(isSensitiveElement(input)).toBe(false);
    });

    it("should return false for data-sensitive=false", () => {
      const doc = createTestDocument('<span data-sensitive="false">Not secret</span>');
      const span = doc.querySelector("span")!;
      expect(isSensitiveElement(span)).toBe(false);
    });
  });

  describe("SENSITIVE_SELECTORS", () => {
    it("should include password selector", () => {
      expect(SENSITIVE_SELECTORS).toContain('input[type="password"]');
    });

    it("should include credit card selectors", () => {
      expect(SENSITIVE_SELECTORS).toContain('input[autocomplete="cc-number"]');
      expect(SENSITIVE_SELECTORS).toContain('input[autocomplete="cc-csc"]');
    });

    it("should include data-sensitive selector", () => {
      expect(SENSITIVE_SELECTORS).toContain('[data-sensitive="true"]');
    });
  });

  describe("MASK_VALUE", () => {
    it("should be a string of bullet characters", () => {
      expect(MASK_VALUE).toBe("••••••••");
      expect(MASK_VALUE.length).toBe(8);
    });
  });
});

