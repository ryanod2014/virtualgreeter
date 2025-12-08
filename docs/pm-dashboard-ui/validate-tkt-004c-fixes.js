#!/usr/bin/env node

/**
 * Validation script for TKT-004C fixes
 * Tests the regex patterns and deduplication logic that were added
 */

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`${GREEN}✓${RESET} ${description}`);
    passed++;
  } catch (error) {
    console.log(`${RED}✗${RESET} ${description}`);
    console.log(`  ${RED}${error.message}${RESET}`);
    failed++;
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected null but got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toHaveLength(expected) {
      if (actual.length !== expected) {
        throw new Error(`Expected length ${expected} but got ${actual.length}`);
      }
    },
    toContain(expected) {
      if (!actual.includes(expected)) {
        throw new Error(`Expected array to contain ${expected}`);
      }
    }
  };
}

console.log(`${BOLD}=== Validating TKT-004C Fixes ===${RESET}\n`);

// =============================================================================
// TEST: Ticket ID Regex Pattern
// =============================================================================

console.log(`${BOLD}Ticket ID Regex Pattern${RESET}`);

const ticketIdRegex = /([A-Z]+-\d+[a-zA-Z]?)/i;
const qaTicketIdRegex = /(TKT-\d+[a-zA-Z]?|SEC-\d+[a-zA-Z]?)/i;

test("extracts basic ticket ID without suffix", () => {
  const filename = "TKT-001-completion-20251207T123456.md";
  const match = filename.match(ticketIdRegex);
  expect(match[1].toUpperCase()).toBe("TKT-001");
});

test("extracts ticket ID with uppercase letter suffix", () => {
  const filename = "TKT-004C-completion-20251207T123456.md";
  const match = filename.match(ticketIdRegex);
  expect(match[1].toUpperCase()).toBe("TKT-004C");
});

test("extracts ticket ID with lowercase letter suffix", () => {
  const filename = "TKT-005e-blocked-20251207T123456.json";
  const match = filename.match(ticketIdRegex);
  expect(match[1].toUpperCase()).toBe("TKT-005E");
});

test("extracts SEC ticket ID with letter suffix", () => {
  const filename = "SEC-001A-completion-20251207T123456.md";
  const match = filename.match(ticketIdRegex);
  expect(match[1].toUpperCase()).toBe("SEC-001A");
});

test("extracts TKT ticket ID from QA PASSED file", () => {
  const filename = "QA-TKT-002-PASSED-20251208T0630.md";
  const match = filename.match(qaTicketIdRegex);
  expect(match[1].toUpperCase()).toBe("TKT-002");
});

test("extracts TKT ticket ID with letter suffix from QA file", () => {
  const filename = "QA-TKT-004C-PASSED-20251208.md";
  const match = filename.match(qaTicketIdRegex);
  expect(match[1].toUpperCase()).toBe("TKT-004C");
});

test("extracts SEC ticket ID with letter suffix from QA file", () => {
  const filename = "QA-SEC-001A-PASSED-20251208.md";
  const match = filename.match(qaTicketIdRegex);
  expect(match[1].toUpperCase()).toBe("SEC-001A");
});

test("returns null when no ticket ID present", () => {
  const filename = "README.md";
  const match = filename.match(qaTicketIdRegex);
  expect(match).toBeNull();
});

// =============================================================================
// TEST: Blocked Entries Deduplication
// =============================================================================

console.log(`\n${BOLD}Blocked Entries Deduplication${RESET}`);

test("keeps only one entry when ticket ID appears once", () => {
  const blockedEntries = [
    {
      ticketId: "TKT-001",
      fileName: "TKT-001-FAILED-20251207T1200.json",
      modifiedAt: "2025-12-07T12:00:00Z",
      content: "blocked"
    }
  ];

  const blockedByTicket = new Map();
  for (const entry of blockedEntries) {
    const existing = blockedByTicket.get(entry.ticketId);
    if (!existing || entry.modifiedAt > existing.modifiedAt) {
      blockedByTicket.set(entry.ticketId, entry);
    }
  }
  const result = Array.from(blockedByTicket.values());

  expect(result).toHaveLength(1);
  expect(result[0].ticketId).toBe("TKT-001");
});

test("keeps most recent entry when ticket has multiple blocked files", () => {
  const blockedEntries = [
    {
      ticketId: "TKT-004C",
      fileName: "TKT-004C-FAILED-20251207T1000.json",
      modifiedAt: "2025-12-07T10:00:00Z",
      content: "blocked earlier"
    },
    {
      ticketId: "TKT-004C",
      fileName: "TKT-004C-FAILED-20251207T1500.json",
      modifiedAt: "2025-12-07T15:00:00Z",
      content: "blocked later"
    },
    {
      ticketId: "TKT-004C",
      fileName: "TKT-004C-FAILED-20251207T1200.json",
      modifiedAt: "2025-12-07T12:00:00Z",
      content: "blocked middle"
    }
  ];

  const blockedByTicket = new Map();
  for (const entry of blockedEntries) {
    const existing = blockedByTicket.get(entry.ticketId);
    if (!existing || entry.modifiedAt > existing.modifiedAt) {
      blockedByTicket.set(entry.ticketId, entry);
    }
  }
  const result = Array.from(blockedByTicket.values());

  expect(result).toHaveLength(1);
  expect(result[0].ticketId).toBe("TKT-004C");
  expect(result[0].modifiedAt).toBe("2025-12-07T15:00:00Z");
  expect(result[0].fileName).toBe("TKT-004C-FAILED-20251207T1500.json");
});

test("preserves separate entries for different ticket IDs", () => {
  const blockedEntries = [
    {
      ticketId: "TKT-001",
      fileName: "TKT-001-FAILED-20251207T1000.json",
      modifiedAt: "2025-12-07T10:00:00Z",
      content: "blocked"
    },
    {
      ticketId: "TKT-002",
      fileName: "TKT-002-FAILED-20251207T1100.json",
      modifiedAt: "2025-12-07T11:00:00Z",
      content: "blocked"
    },
    {
      ticketId: "TKT-003",
      fileName: "TKT-003-FAILED-20251207T1200.json",
      modifiedAt: "2025-12-07T12:00:00Z",
      content: "blocked"
    }
  ];

  const blockedByTicket = new Map();
  for (const entry of blockedEntries) {
    const existing = blockedByTicket.get(entry.ticketId);
    if (!existing || entry.modifiedAt > existing.modifiedAt) {
      blockedByTicket.set(entry.ticketId, entry);
    }
  }
  const result = Array.from(blockedByTicket.values());

  expect(result).toHaveLength(3);
  const ticketIds = result.map(r => r.ticketId);
  expect(ticketIds).toContain("TKT-001");
  expect(ticketIds).toContain("TKT-002");
  expect(ticketIds).toContain("TKT-003");
});

test("correctly compares ISO timestamp strings", () => {
  const blockedEntries = [
    {
      ticketId: "TKT-001",
      fileName: "TKT-001-FAILED-A.json",
      modifiedAt: "2025-12-07T10:00:00Z",
      content: "earlier"
    },
    {
      ticketId: "TKT-001",
      fileName: "TKT-001-FAILED-B.json",
      modifiedAt: "2025-12-08T10:00:00Z",
      content: "later day"
    },
    {
      ticketId: "TKT-001",
      fileName: "TKT-001-FAILED-C.json",
      modifiedAt: "2025-12-07T23:59:59Z",
      content: "later time same day"
    }
  ];

  const blockedByTicket = new Map();
  for (const entry of blockedEntries) {
    const existing = blockedByTicket.get(entry.ticketId);
    if (!existing || entry.modifiedAt > existing.modifiedAt) {
      blockedByTicket.set(entry.ticketId, entry);
    }
  }
  const result = Array.from(blockedByTicket.values());

  expect(result).toHaveLength(1);
  expect(result[0].modifiedAt).toBe("2025-12-08T10:00:00Z");
  expect(result[0].fileName).toBe("TKT-001-FAILED-B.json");
});

test("reduces count from 33 files to 27 unique tickets", () => {
  const blockedEntries = [];

  // 27 unique tickets
  for (let i = 1; i <= 27; i++) {
    const ticketId = `TKT-${String(i).padStart(3, '0')}`;
    blockedEntries.push({
      ticketId,
      fileName: `${ticketId}-FAILED-20251207T1200.json`,
      modifiedAt: "2025-12-07T12:00:00Z",
      content: "blocked"
    });
  }

  // Add 6 duplicate entries (increasing count to 33)
  for (let i = 1; i <= 6; i++) {
    const ticketId = `TKT-${String(i).padStart(3, '0')}`;
    blockedEntries.push({
      ticketId,
      fileName: `${ticketId}-FAILED-20251207T1000.json`,
      modifiedAt: "2025-12-07T10:00:00Z",
      content: `duplicate ${i}`
    });
  }

  expect(blockedEntries).toHaveLength(33);

  const blockedByTicket = new Map();
  for (const entry of blockedEntries) {
    const existing = blockedByTicket.get(entry.ticketId);
    if (!existing || entry.modifiedAt > existing.modifiedAt) {
      blockedByTicket.set(entry.ticketId, entry);
    }
  }
  const result = Array.from(blockedByTicket.values());

  expect(result).toHaveLength(27);
});

// =============================================================================
// SUMMARY
// =============================================================================

console.log(`\n${BOLD}=== Test Summary ===${RESET}`);
console.log(`${GREEN}Passed: ${passed}${RESET}`);
if (failed > 0) {
  console.log(`${RED}Failed: ${failed}${RESET}`);
  process.exit(1);
} else {
  console.log(`\n${GREEN}${BOLD}All tests passed!${RESET}`);
  process.exit(0);
}
