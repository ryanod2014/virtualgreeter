# Feature: Internal APIs (INT1)

## Quick Summary
Internal APIs provide secure server-to-server communication within the Ghost Greeter platform. These endpoints handle critical operations like gracefully ending calls during agent removal, requiring authentication via shared API keys.

## Affected Users
- [ ] Website Visitor
- [x] Agent (indirectly)
- [x] Admin (indirectly)
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
Internal APIs enable secure communication between Ghost Greeter services (dashboard, server) for operations that require elevated privileges and protection from external access. The primary use case is gracefully terminating active calls when removing agents.

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Admin | Remove agent cleanly | Ensures active calls are properly ended when removing agents |
| Agent | Clean disconnection | Receives proper notification when removed during active call |
| Visitor | Clear communication | Sees friendly message when agent is removed mid-call |
| System | Security | Prevents unauthorized call termination via API key authentication |

---

## 2. HOW IT WORKS

### High-Level Flow (Agent Removal with Active Call)
1. Admin removes agent via dashboard
2. Dashboard checks if agent is in active call
3. If yes, dashboard calls `/api/agent/end-call` with INTERNAL_API_KEY
4. Server validates API key authentication
5. Server ends call in pool manager (Redis/in-memory)
6. Server notifies visitor and agent via Socket.io
7. Server marks call as ended in database
8. Dashboard continues with soft delete of agent

### API Authentication Flow
```
Dashboard                         Server
    |                               |
    |-- POST /api/agent/end-call -->|
    |   Headers:                    |
    |   x-internal-api-key: XXX     |
    |   Body: { agentId: "123" }    |
    |                               |
    |<-- Validate API Key --------->|
    |                               |
    |<-- 401 Unauthorized -----------| (if invalid)
    |                               |
    |<-- 200 { success: true } -----| (always for valid key)
```

### State Definitions
| State | Description | Response |
|-------|-------------|----------|
| Valid API key | Request authenticated | Process call termination |
| Invalid/missing key | Authentication failed | 401 Unauthorized |
| Production without key | Server misconfigured | 500 Server Error |
| Agent not found | No active call to end | 200 Success (prevent enumeration) |
| Call ended | Successfully terminated | 200 Success |

---

## 3. DETAILED LOGIC

### Endpoints

#### POST /api/agent/end-call
**Purpose:** Gracefully end an active call for an agent being removed

**Authentication:**
- Header: `x-internal-api-key: <INTERNAL_API_KEY>`
- Required in production or when INTERNAL_API_KEY is set
- Development mode allows requests without key if not configured

**Request:**
```json
{
  "agentId": "agent-profile-uuid"
}
```

**Responses:**
| Status | Body | When |
|--------|------|------|
| 200 | `{ "success": true }` | Always (if authenticated) |
| 400 | `{ "error": "agentId is required" }` | Missing/invalid agentId |
| 401 | `{ "error": "Unauthorized" }` | Invalid/missing API key |
| 500 | `{ "error": "Server misconfiguration" }` | Production without INTERNAL_API_KEY |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `POST /api/agent/end-call` | `apps/server/src/index.ts:415-532` | End active call endpoint |
| `getAgentOrgId()` | `apps/server/src/lib/auth.js` | Verify agent exists and get org |
| `markCallEnded()` | `apps/server/src/lib/call-logger.js` | Update call record in database |
| `recordStatusChange()` | `apps/server/src/lib/session-tracker.js` | Log agent status transition |

### Security Implementation Details
```typescript
// Authentication check
const INTERNAL_API_KEY = process.env["INTERNAL_API_KEY"];
const providedKey = req.headers["x-internal-api-key"];

if (IS_PRODUCTION || INTERNAL_API_KEY) {
  if (!INTERNAL_API_KEY) {
    // Fail closed in production
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  if (!providedKey || providedKey !== INTERNAL_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// Input validation
if (!agentId || typeof agentId !== "string") {
  return res.status(400).json({ error: "agentId is required" });
}

// Organization isolation (via generic response)
const agentOrgId = await getAgentOrgId(agentId);
if (!agentOrgId) {
  // Return success to prevent agent enumeration
  return res.json({ success: true });
}
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Request | Response | Notes |
|---|----------|---------|----------|-------|
| 1 | Valid request | Correct key + valid agent | 200 Success | Call ended |
| 2 | No API key | Missing header | 401 Unauthorized | ✅ |
| 3 | Wrong API key | Invalid key value | 401 Unauthorized | ✅ |
| 4 | Missing agentId | Empty body | 400 Bad Request | ✅ |
| 5 | Null agentId | `{ "agentId": null }` | 400 Bad Request | ✅ |
| 6 | Empty agentId | `{ "agentId": "" }` | 400 Bad Request | ✅ |
| 7 | Number agentId | `{ "agentId": 123 }` | 400 Bad Request | ✅ |
| 8 | Non-existent agent | Valid key + fake ID | 200 Success | Prevents enumeration |
| 9 | Agent not in call | Valid key + idle agent | 200 Success | Idempotent |
| 10 | SQL injection | `'; DROP TABLE--` | 200 Success | Input sanitized |
| 11 | XSS attempt | `<script>alert(1)` | 200 Success | Not rendered |
| 12 | Production no env | INTERNAL_API_KEY not set | 500 Error | Fail closed |
| 13 | Dev mode | No key configured | 200 Success | Allows development |
| 14 | DB write fails | Call logger error | 200 Success | Best effort, continues |
| 15 | Socket.io down | Can't notify users | 200 Success | Best effort |

### Error States
| Error | When It Happens | Impact | Recovery |
|-------|-----------------|--------|----------|
| Unauthorized | Invalid/missing API key | Request rejected | Fix API key |
| Server misconfiguration | Production without key | All requests fail | Set INTERNAL_API_KEY |
| DB connection error | Can't mark call ended | Call record stale | Monitor logs |
| Socket notification fails | Users not notified | Poor UX | Natural timeout |

---

## 5. UI/UX REVIEW

### User Experience (Indirect)
| Event | What Visitor Sees | What Agent Sees |
|-------|------------------|-----------------|
| Agent removed during call | "Agent has ended the call" message | "Call ended due to agent removal" |
| Network issues | Standard disconnect handling | Standard disconnect handling |

### API Developer Experience
| Aspect | Implementation | Good? |
|--------|----------------|-------|
| Authentication | Standard header pattern | ✅ |
| Error messages | Clear, actionable | ✅ |
| Response consistency | Always returns JSON | ✅ |
| Status codes | RESTful conventions | ✅ |

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| API key comparison | Constant-time comparison needed | ⚠️ May be timing-attack vulnerable |
| Database writes | Wrapped in try-catch, non-blocking | ✅ Doesn't block response |
| Pool manager lookup | O(1) lookup by agentId | ✅ Efficient |

### Security
| Concern | Mitigation |
|---------|------------|
| API key exposure | Never logged, uses environment variable |
| Timing attacks | Should use constant-time string comparison |
| Information disclosure | Generic success response for all scenarios |
| Missing authentication | Fails closed in production |
| Replay attacks | No nonce/timestamp (stateless is OK here) |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Database failures | Wrapped in try-catch, continues operation |
| Socket.io failures | Best-effort notification, doesn't block |
| Missing env vars | Explicit 500 error in production |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** ✅ Yes - Simple auth header pattern
2. **Is the control intuitive?** ✅ Yes - Standard REST conventions
3. **Is feedback immediate?** ✅ Yes - Synchronous response
4. **Is the flow reversible?** N/A - Call termination is final
5. **Are errors recoverable?** ✅ Yes - Can retry with correct key
6. **Is the complexity justified?** ✅ Yes - Security requires auth

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| Timing attack on API key | Potential key extraction | 🟡 Medium | Use crypto.timingSafeEqual() |
| No rate limiting | Potential brute force | 🟡 Medium | Add rate limit middleware |
| No request logging | Hard to debug issues | 🟢 Low | Add structured logging |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Endpoint implementation | `apps/server/src/index.ts` | 415-532 | Main handler |
| Dashboard integration | `apps/dashboard/src/app/api/agents/remove/route.ts` | 48-72 | Calls endpoint |
| Environment config | `apps/server/env.example` | 82 | INTERNAL_API_KEY docs |
| Dashboard env config | `apps/dashboard/env.example` | 31 | Matching API key |

---

## 9. RELATED FEATURES
- [Agent Management (D4)](../admin/agent-management.md) - Primary consumer of this API
- [Call Lifecycle](./call-lifecycle.md) - Defines normal call ending flow
- [WebRTC Signaling](./webrtc-signaling.md) - Socket.io notifications

---

## 10. OPEN QUESTIONS

1. **Should we add rate limiting?** Current implementation has no rate limit on the endpoint.

2. **Should API keys rotate?** Single static key may be a security risk long-term.

3. **Should we log API usage?** No audit trail currently exists for these sensitive operations.

4. **Constant-time comparison?** Current string comparison may be vulnerable to timing attacks.

5. **Should we add more internal APIs?** This pattern could be useful for other admin operations.