// =============================================================================
// CALL REQUEST BURST TEST
// =============================================================================
// Goal: Test handling of simultaneous call requests (high-demand scenario)
//
// Run: k6 run tests/load/call-requests.js
// Custom rate: k6 run --env CALL_RATE=20 tests/load/call-requests.js

import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// -----------------------------------------------------------------------------
// Custom Metrics
// -----------------------------------------------------------------------------
const callsRequested = new Counter('calls_requested');
const callsAccepted = new Counter('calls_accepted');
const callsRejected = new Counter('calls_rejected');
const callsCancelled = new Counter('calls_cancelled');
const callsTimedOut = new Counter('calls_timed_out');
const callRequestTime = new Trend('call_request_time', true);
const callAcceptTime = new Trend('call_accept_time', true);
const callSuccessRate = new Rate('call_success_rate');
const connectionFailures = new Counter('connection_failures');

// -----------------------------------------------------------------------------
// Test Configuration
// -----------------------------------------------------------------------------
const CALL_RATE = parseInt(__ENV.CALL_RATE || '10', 10);
const TEST_DURATION = __ENV.TEST_DURATION || '2m';

export const options = {
  scenarios: {
    call_burst: {
      executor: 'constant-arrival-rate',
      rate: CALL_RATE,           // Call requests per second
      timeUnit: '1s',
      duration: TEST_DURATION,
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
  thresholds: {
    'call_request_time': ['p(95)<5000'],      // 95% call requests handled in <5s
    'calls_requested': ['count>0'],           // At least some calls made
    'connection_failures': ['count<10'],      // <10 connection failures
  },
};

// -----------------------------------------------------------------------------
// Configuration from Environment
// -----------------------------------------------------------------------------
const SERVER_URL = __ENV.SERVER_URL || 'wss://ghost-greeterserver-production.up.railway.app';
const ORG_ID = __ENV.ORG_ID || 'test-org-load-test';
const AGENT_ID = __ENV.AGENT_ID || 'test-agent-load-test';

// Socket.io Engine.io v4 WebSocket URL
const WS_URL = `${SERVER_URL}/socket.io/?EIO=4&transport=websocket`;

// -----------------------------------------------------------------------------
// Main Test Function
// -----------------------------------------------------------------------------
export default function () {
  const visitorId = uuidv4();
  const requestId = uuidv4();
  const pageUrl = 'https://example.com/load-test';
  
  let connected = false;
  let socketioConnected = false;
  let joinResponseReceived = false;
  let callRequested = false;
  let callRequestSentTime = 0;
  let callResponseReceived = false;

  const res = ws.connect(WS_URL, {
    timeout: '15s',
  }, function (socket) {
    
    socket.on('open', () => {
      connected = true;
      // Send Socket.io connect packet
      socket.send('40');
    });

    socket.on('message', (msg) => {
      // Handle Engine.io open packet
      if (msg.startsWith('0')) {
        return;
      }
      
      // Handle Socket.io connect confirmation
      if (msg === '40' || msg.startsWith('40{')) {
        socketioConnected = true;
        
        // Step 1: Send visitor:join
        const joinPayload = JSON.stringify([
          'visitor:join',
          {
            visitorId: visitorId,
            orgId: ORG_ID,
            pageUrl: pageUrl,
            referrer: 'https://google.com',
          }
        ]);
        socket.send(`42${joinPayload}`);
      }
      
      // Handle agent:assigned - now we can request a call
      if (msg.includes('"agent:assigned"')) {
        joinResponseReceived = true;
        
        // Small delay to simulate user clicking "Call" button
        sleep(Math.random() * 2 + 1); // 1-3 second delay
        
        // Step 2: Send call:request
        callRequestSentTime = Date.now();
        const callPayload = JSON.stringify([
          'call:request',
          {
            requestId: requestId,
            agentId: AGENT_ID,
            visitorName: `Load Test User ${__VU}`,
          }
        ]);
        socket.send(`42${callPayload}`);
        callsRequested.add(1);
        callRequested = true;
      }
      
      // Handle agent:unavailable - no agent to call
      if (msg.includes('"agent:unavailable"')) {
        joinResponseReceived = true;
        // Can't make a call without an agent
        callResponseReceived = true; // Mark as "handled"
      }
      
      // Handle call:accepted
      if (msg.includes('"call:accepted"')) {
        callResponseReceived = true;
        callsAccepted.add(1);
        callSuccessRate.add(1);
        if (callRequestSentTime > 0) {
          callAcceptTime.add(Date.now() - callRequestSentTime);
          callRequestTime.add(Date.now() - callRequestSentTime);
        }
      }
      
      // Handle call:rejected
      if (msg.includes('"call:rejected"')) {
        callResponseReceived = true;
        callsRejected.add(1);
        callSuccessRate.add(0);
        if (callRequestSentTime > 0) {
          callRequestTime.add(Date.now() - callRequestSentTime);
        }
      }
      
      // Handle call:cancelled (agent didn't answer)
      if (msg.includes('"call:cancelled"')) {
        callResponseReceived = true;
        callsCancelled.add(1);
        callSuccessRate.add(0);
        if (callRequestSentTime > 0) {
          callRequestTime.add(Date.now() - callRequestSentTime);
        }
      }
      
      // Handle call:incoming (this goes to agent, but we might see it)
      if (msg.includes('"call:incoming"')) {
        // Call is ringing
      }
      
      // Handle errors
      if (msg.includes('"error"')) {
        callResponseReceived = true;
        callSuccessRate.add(0);
        if (callRequestSentTime > 0) {
          callRequestTime.add(Date.now() - callRequestSentTime);
        }
        console.error(`[${__VU}] Server error: ${msg}`);
      }
      
      // Handle Engine.io ping
      if (msg === '2') {
        socket.send('3');
      }
    });

    socket.on('error', (e) => {
      connectionFailures.add(1);
      console.error(`[${__VU}] WebSocket error: ${JSON.stringify(e)}`);
    });

    socket.on('close', () => {
      if (!connected) {
        connectionFailures.add(1);
      }
      // If we requested a call but didn't get a response, count as timeout
      if (callRequested && !callResponseReceived) {
        callsTimedOut.add(1);
        callSuccessRate.add(0);
      }
    });

    // Wait for call response or timeout (max 30 seconds for RNA timeout + buffer)
    let waitTime = 0;
    const maxWait = 35; // seconds
    while (!callResponseReceived && waitTime < maxWait) {
      sleep(1);
      waitTime++;
    }

    // If call was accepted, hold connection briefly to simulate call
    if (callResponseReceived) {
      sleep(Math.random() * 5 + 5); // 5-10 seconds "call"
      
      // End the call
      const endPayload = JSON.stringify([
        'call:end',
        {
          callId: requestId,
          reason: 'visitor_ended',
        }
      ]);
      socket.send(`42${endPayload}`);
    }

    // Disconnect
    socket.send('41');
    socket.close();
  });

  // Verify connection was successful
  check(res, {
    'WebSocket connected': (r) => r && r.status === 101,
  });
}

// -----------------------------------------------------------------------------
// Setup and Teardown
// -----------------------------------------------------------------------------
export function setup() {
  console.log('='.repeat(60));
  console.log('Call Request Burst Test');
  console.log('='.repeat(60));
  console.log(`Target Server: ${SERVER_URL}`);
  console.log(`Organization ID: ${ORG_ID}`);
  console.log(`Target Agent ID: ${AGENT_ID}`);
  console.log('');
  console.log('Test Configuration:');
  console.log(`  Call rate: ${CALL_RATE} requests/second`);
  console.log(`  Duration: ${TEST_DURATION}`);
  console.log(`  Total expected calls: ~${CALL_RATE * 120} (if 2m duration)`);
  console.log('');
  console.log('⚠️  NOTE: This test simulates call requests.');
  console.log('   Without real agents accepting calls, most will timeout.');
  console.log('   Use with a test agent logged in for realistic results.');
  console.log('='.repeat(60));
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = Math.round((Date.now() - data.startTime) / 1000);
  console.log('');
  console.log('='.repeat(60));
  console.log(`Test completed in ${duration} seconds`);
  console.log('');
  console.log('Key Metrics to Review:');
  console.log('  - calls_requested: Total call requests sent');
  console.log('  - calls_accepted: Calls that were accepted');
  console.log('  - calls_rejected: Calls that were rejected');
  console.log('  - calls_timed_out: Calls that timed out (RNA)');
  console.log('  - call_request_time: Time from request to response');
  console.log('='.repeat(60));
}

