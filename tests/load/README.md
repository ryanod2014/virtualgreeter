# Load Testing Suite

Systematically test the Ghost Greeter signaling server under simulated load to identify breaking points, bottlenecks, and capacity limits.

## Why Load Testing Is Critical

- **Unknown limits**: You don't know if Railway + Redis can handle 10k concurrent WebSocket connections
- **Costly failures**: Finding limits during a promotion = lost users + reputation damage
- **Capacity planning**: Know exactly when to scale up

## Prerequisites

### Install k6

```bash
# macOS
brew install k6

# Or via npm (if brew not available)
npm install -g k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Verify Installation

```bash
k6 version
```

## Test Scenarios

### 1. WebSocket Connection Stress Test (`websocket-connections.js`)

**Goal**: Find maximum concurrent WebSocket connections the server can handle.

**What it does**:
- Ramps up to 1000 concurrent connections
- Holds connections for 30-60 seconds each
- Measures connection time and failure rates

**Run**:
```bash
# Against production
k6 run tests/load/websocket-connections.js

# Against staging/local
k6 run --env SERVER_URL=wss://your-staging-server tests/load/websocket-connections.js

# Quick smoke test (lighter load)
k6 run -u 50 -d 2m tests/load/websocket-connections.js
```

**Key Metrics**:
- `ws_connection_time`: Time to establish WebSocket connection
- `ws_connection_failures`: Number of failed connections
- `ws_connection_success_rate`: Percentage of successful connections

---

### 2. Widget Visitor Flow (`widget-flow.js`)

**Goal**: Test realistic widget visitor behavior (join, watch simulation, browse).

**What it does**:
- Simulates 200 concurrent visitors
- Each visitor joins with random page URLs
- Sessions last 1-3 minutes (realistic)
- 30% chance of page interaction

**Run**:
```bash
# Against production
k6 run tests/load/widget-flow.js

# With specific org ID
k6 run --env ORG_ID=your-org-id tests/load/widget-flow.js

# Against staging
k6 run --env SERVER_URL=wss://your-staging-server --env ORG_ID=test-org tests/load/widget-flow.js
```

**Key Metrics**:
- `widget_join_time`: Time to receive join response
- `agent_assigned_count`: Visitors who got an agent
- `agent_unavailable_count`: Visitors with no agent available

---

### 3. Call Request Burst (`call-requests.js`)

**Goal**: Test handling of simultaneous call requests (high-demand scenario).

**What it does**:
- Sends constant rate of call requests (default: 10/second)
- Simulates full call flow: join → request call → wait for response
- Tracks accept/reject/timeout rates

**Run**:
```bash
# Default rate (10 calls/second for 2 minutes)
k6 run tests/load/call-requests.js

# Higher rate burst
k6 run --env CALL_RATE=20 tests/load/call-requests.js

# Custom duration
k6 run --env CALL_RATE=5 --env TEST_DURATION=5m tests/load/call-requests.js

# With specific agent
k6 run --env AGENT_ID=your-agent-id tests/load/call-requests.js
```

**Key Metrics**:
- `calls_requested`: Total call requests sent
- `calls_accepted`: Calls that were accepted
- `calls_rejected`: Calls that were rejected
- `calls_timed_out`: Calls that hit RNA timeout

> ⚠️ **Note**: Without real agents accepting calls, most will timeout. Use with a test agent logged in for realistic results.

---

## Test Execution Plan

### Phase 1: Baseline (Smoke Test)

Light load to verify basic functionality:

```bash
# 50 users for 2 minutes
k6 run -u 50 -d 2m tests/load/websocket-connections.js
```

**Expected**: All connections succeed, <1s connection time.

### Phase 2: Capacity Test

Ramp up to find limits:

```bash
# Full connection stress test
k6 run tests/load/websocket-connections.js
```

**Watch for**: Connection failures, increasing latency, server errors.

### Phase 3: Realistic Load

Test with actual visitor patterns:

```bash
k6 run tests/load/widget-flow.js
```

**Watch for**: Join response times, agent assignment rates.

### Phase 4: Soak Test (Optional)

Hold moderate load for extended period to find memory leaks:

```bash
k6 run -u 200 -d 30m tests/load/widget-flow.js
```

**Watch for**: Memory growth, increasing latency over time.

---

## Key Metrics Reference

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| Connection time (p95) | <1s | 1-3s | >3s |
| Connection failures | <1% | 1-5% | >5% |
| Server memory (Railway) | <70% | 70-85% | >85% |
| Redis latency | <10ms | 10-50ms | >50ms |
| WebSocket errors | 0 | <10/min | >10/min |

---

## Monitoring During Tests

### 1. Railway Dashboard
- Go to Railway → Your Project → Metrics
- Watch: CPU, Memory, Network
- Set up alerts for >85% memory

### 2. Server Metrics Endpoint

```bash
# Get real-time server metrics
curl https://ghost-greeterserver-production.up.railway.app/metrics

# Or with API key if configured
curl "https://ghost-greeterserver-production.up.railway.app/metrics?key=YOUR_API_KEY"
```

### 3. Better Stack / Uptime Monitoring
- Verify health checks stay green during load
- Check for any alert triggers

### 4. Sentry
- Watch for new errors during load tests
- Check error rate trends

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_URL` | `wss://ghost-greeterserver-production.up.railway.app` | WebSocket server URL |
| `ORG_ID` | `test-org-load-test` | Organization ID for visitor join |
| `AGENT_ID` | `test-agent-load-test` | Agent ID for call requests |
| `CALL_RATE` | `10` | Calls per second (call-requests.js) |
| `TEST_DURATION` | `2m` | Test duration (call-requests.js) |

---

## Expected Findings & Actions

| Finding | Action |
|---------|--------|
| Max 500 connections per instance | Scale to 3+ replicas |
| Memory grows over time | Check for leaks in socket handlers |
| Redis latency spikes | Upgrade Upstash plan |
| Connection timeouts | Increase Railway instance size |
| Rate limiting kicks in | Tune rate limits for expected load |

---

## Scaling Recommendations

Based on test results, follow these scaling guidelines:

### Connections per Instance
- **Conservative**: 500 concurrent connections per Railway instance
- **Optimistic**: 1000 connections with upgraded instance

### Horizontal Scaling
```
Expected Users | Recommended Replicas
     1,000     |         2
     5,000     |         5
    10,000     |        10
    50,000     |        25
   100,000     |        50
```

### Vertical Scaling (Railway)
- **Starter**: Up to 500 connections
- **Pro (2GB RAM)**: Up to 2000 connections
- **Pro (4GB RAM)**: Up to 5000 connections

---

## Quick Checklist

- [ ] Install k6 locally (`brew install k6`)
- [ ] Run smoke test (50 users, 2 min)
- [ ] Run capacity test (ramp to 1000)
- [ ] Document max connections per instance
- [ ] Monitor Railway/Redis/Sentry during tests
- [ ] Scale replicas based on findings
- [ ] Re-test after scaling
- [ ] Document final capacity limits

---

## Troubleshooting

### "Connection refused" errors
- Check if server is running
- Verify SERVER_URL is correct (use `wss://` for secure)

### "Rate limited" errors
- Server has rate limiting enabled
- Reduce test intensity or disable rate limiting during tests

### High memory usage on test machine
- k6 is memory-efficient, but reduce VUs if needed
- Close other applications during tests

### Inconsistent results
- Run tests multiple times
- Use dedicated test environment when possible
- Account for network variability

---

## Support

For issues with load testing:
1. Check k6 documentation: https://k6.io/docs/
2. Review server logs in Railway
3. Check Sentry for any captured errors

