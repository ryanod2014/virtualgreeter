import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getLocationFromIP, getClientIP } from "./geolocation.js";

describe("Geolocation", () => {
  describe("getClientIP", () => {
    it("should extract IP from x-forwarded-for header (first IP)", () => {
      const handshake = {
        headers: {
          "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178",
        },
        address: "10.0.0.1",
      };
      expect(getClientIP(handshake)).toBe("203.0.113.195");
    });

    it("should extract IP from x-forwarded-for header (single IP)", () => {
      const handshake = {
        headers: {
          "x-forwarded-for": "203.0.113.195",
        },
        address: "10.0.0.1",
      };
      expect(getClientIP(handshake)).toBe("203.0.113.195");
    });

    it("should extract IP from x-real-ip header", () => {
      const handshake = {
        headers: {
          "x-real-ip": "203.0.113.195",
        },
        address: "10.0.0.1",
      };
      expect(getClientIP(handshake)).toBe("203.0.113.195");
    });

    it("should prefer x-forwarded-for over x-real-ip", () => {
      const handshake = {
        headers: {
          "x-forwarded-for": "203.0.113.100",
          "x-real-ip": "203.0.113.200",
        },
        address: "10.0.0.1",
      };
      expect(getClientIP(handshake)).toBe("203.0.113.100");
    });

    it("should fall back to socket address when no proxy headers", () => {
      const handshake = {
        headers: {},
        address: "192.168.1.100",
      };
      expect(getClientIP(handshake)).toBe("192.168.1.100");
    });

    it("should handle array-type headers", () => {
      const handshake = {
        headers: {
          "x-forwarded-for": ["203.0.113.195", "70.41.3.18"],
        },
        address: "10.0.0.1",
      };
      expect(getClientIP(handshake)).toBe("203.0.113.195");
    });
  });

  describe("getLocationFromIP", () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should return null for localhost IPv4", async () => {
      const result = await getLocationFromIP("127.0.0.1");
      expect(result).toBeNull();
    });

    it("should return null for localhost string", async () => {
      const result = await getLocationFromIP("localhost");
      expect(result).toBeNull();
    });

    it("should return null for IPv6 localhost", async () => {
      const result = await getLocationFromIP("::1");
      expect(result).toBeNull();
    });

    it("should return null for IPv6 mapped localhost", async () => {
      const result = await getLocationFromIP("::ffff:127.0.0.1");
      expect(result).toBeNull();
    });

    it("should return null for 10.x.x.x private range", async () => {
      const result = await getLocationFromIP("10.0.0.1");
      expect(result).toBeNull();
    });

    it("should return null for 192.168.x.x private range", async () => {
      const result = await getLocationFromIP("192.168.1.100");
      expect(result).toBeNull();
    });

    it("should return null for 172.16-31.x.x private range", async () => {
      const privateIPs = [
        "172.16.0.1",
        "172.17.0.1",
        "172.20.0.1",
        "172.31.255.255",
      ];
      for (const ip of privateIPs) {
        const result = await getLocationFromIP(ip);
        expect(result).toBeNull();
      }
    });

    it("should make API call for public IPs", async () => {
      // Mock successful API response
      const mockResponse = {
        ok: true,
        json: async () => ({
          status: "success",
          city: "New York",
          regionName: "New York",
          country: "United States",
          countryCode: "US",
        }),
      };
      vi.spyOn(global, "fetch").mockResolvedValueOnce(mockResponse as Response);

      const result = await getLocationFromIP("8.8.8.8");
      expect(result).toEqual({
        city: "New York",
        region: "New York",
        country: "United States",
        countryCode: "US",
      });
      expect(fetch).toHaveBeenCalledWith(
        "http://ip-api.com/json/8.8.8.8?fields=status,city,regionName,country,countryCode"
      );
    });

    it("should handle API failure gracefully", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          status: "fail",
          message: "reserved range",
        }),
      };
      vi.spyOn(global, "fetch").mockResolvedValueOnce(mockResponse as Response);

      const result = await getLocationFromIP("224.0.0.1");
      expect(result).toBeNull();
    });

    it("should handle network errors gracefully", async () => {
      vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network error"));

      const result = await getLocationFromIP("8.8.4.4");
      expect(result).toBeNull();
    });

    it("should handle non-OK HTTP response gracefully", async () => {
      const mockResponse = {
        ok: false,
        status: 429,
      };
      vi.spyOn(global, "fetch").mockResolvedValueOnce(mockResponse as Response);

      // Use a different IP that hasn't been cached
      const result = await getLocationFromIP("1.1.1.1");
      expect(result).toBeNull();
    });

    it("should use cached result for repeated requests", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          status: "success",
          city: "San Francisco",
          regionName: "California",
          country: "United States",
          countryCode: "US",
        }),
      };
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(mockResponse as Response);

      // First call - should hit API
      const result1 = await getLocationFromIP("216.58.214.206");
      expect(result1).not.toBeNull();
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await getLocationFromIP("216.58.214.206");
      expect(result2).toEqual(result1);
      expect(fetchSpy).toHaveBeenCalledTimes(1); // No additional call
    });
  });
});

