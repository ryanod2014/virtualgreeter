#!/usr/bin/env tsx

/**
 * Test script to verify MaxMind geolocation is working
 * Usage: tsx scripts/test-geolocation.ts
 */

import { getLocationFromIP } from "../src/lib/geolocation";

const TEST_IPS = [
  { ip: "8.8.8.8", expected: "Google DNS (US)" },
  { ip: "1.1.1.1", expected: "Cloudflare DNS (AU)" },
  { ip: "208.67.222.222", expected: "OpenDNS (US)" },
  { ip: "127.0.0.1", expected: "Localhost (should be null)" },
];

async function testGeolocation() {
  console.log("🧪 Testing MaxMind Geolocation");
  console.log("================================\n");

  let successCount = 0;
  let failureCount = 0;

  for (const test of TEST_IPS) {
    console.log(`Testing ${test.ip} (${test.expected}):`);
    try {
      const location = await getLocationFromIP(test.ip);
      if (location) {
        console.log(`  ✅ ${location.city || "Unknown"}, ${location.region || "Unknown"}, ${location.countryCode || "Unknown"}`);
        successCount++;
      } else {
        console.log(`  ℹ️  No location found (this is expected for private IPs)`);
        if (test.ip === "127.0.0.1") {
          successCount++;
        } else {
          failureCount++;
        }
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
      failureCount++;
    }
    console.log();
  }

  console.log("Results:");
  console.log(`  ✅ Successful: ${successCount}`);
  console.log(`  ❌ Failed: ${failureCount}`);

  if (failureCount === 0) {
    console.log("\n🎉 All tests passed! MaxMind geolocation is working correctly.");
    process.exit(0);
  } else {
    console.log("\n⚠️  Some tests failed. Check the MaxMind database setup.");
    process.exit(1);
  }
}

testGeolocation();
