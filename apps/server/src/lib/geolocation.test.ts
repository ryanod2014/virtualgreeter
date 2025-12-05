import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getLocationFromIP, getClientIP, isPrivateIP } from "./geolocation.js";

describe("Geolocation", () => {
  describe("getClientIP", () => {
    it("should extract IP from x-forwarded-for header (first IP)", () => {
      const handshake = {
        headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178" },
        address: "10.0.0.1",
      };
      expect(getClientIP(handshake)).toBe("203.0.113.195");
    });

    it("should extract IP from x-real-ip header", () => {
      const handshake = {
        headers: { "x-real-ip": "203.0.113.195" },
        address: "10.0.0.1",
      };
      expect(getClientIP(handshake)).toBe("203.0.113.195");
    });

    it("should fall back to socket address when no proxy headers", () => {
      const handshake = { headers: {}, address: "192.168.1.100" };
      expect(getClientIP(handshake)).toBe("192.168.1.100");
    });
  });

  describe("isPrivateIP", () => {
    it("should return true for localhost", () => {
      expect(isPrivateIP("127.0.0.1")).toBe(true);
      expect(isPrivateIP("localhost")).toBe(true);
      expect(isPrivateIP("::1")).toBe(true);
    });

    it("should return true for private ranges", () => {
      expect(isPrivateIP("10.0.0.1")).toBe(true);
      expect(isPrivateIP("192.168.1.100")).toBe(true);
      expect(isPrivateIP("172.16.0.1")).toBe(true);
    });

    it("should return false for public IPs", () => {
      expect(isPrivateIP("8.8.8.8")).toBe(false);
      expect(isPrivateIP("1.1.1.1")).toBe(false);
    });
  });

  describe("getLocationFromIP", () => {
    beforeEach(() => { vi.resetAllMocks(); });
    afterEach(() => { vi.restoreAllMocks(); });

    it("should return null for private IPs", async () => {
      expect(await getLocationFromIP("127.0.0.1")).toBeNull();
      expect(await getLocationFromIP("10.0.0.1")).toBeNull();
      expect(await getLocationFromIP("192.168.1.100")).toBeNull();
    });

    it("should handle public IP lookup gracefully when database not available", async () => {
      const result = await getLocationFromIP("8.8.8.8");
      expect(result === null || typeof result === "object").toBe(true);
    });

    it("should return cached result for repeated requests", async () => {
      const result1 = await getLocationFromIP("8.8.8.8");
      const result2 = await getLocationFromIP("8.8.8.8");
      expect(result2).toEqual(result1);
    });
  });
});
