// =============================================================================
// WIDGET VISITOR FLOW TEST
// =============================================================================
// Goal: Test realistic widget visitor flow (join, watch simulation, browse)
//
// Run: k6 run tests/load/widget-flow.js
// With org: k6 run --env SERVER_URL=wss://your-server --env ORG_ID=your-org-id tests/load/widget-flow.js

import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// -----------------------------------------------------------------------------
// Custom Metrics
// -----------------------------------------------------------------------------
const connectionTime = new Trend('ws_connection_time', true);
const joinTime = new Trend('widget_join_time', true);
const agentAssignedCount = new Counter('agent_assigned_count');
const agentUnavailableCount = new Counter('agent_unavailable_count');
const connectionFailures = new Counter('connection_failures');
const joinSuccessRate = new Rate('join_success_rate');

// -----------------------------------------------------------------------------
// Test Configuration
// -----------------------------------------------------------------------------
export const options = {
  stages: [
    { duration: '2m', target: 200 },   // Ramp to 200 concurrent visitors
    { duration: '5m', target: 200 },   // Hold at 200 (steady state)
    { duration: '1m', target: 0 },     // Ramp down gracefully
  ],
  thresholds: {
    'ws_connection_time': ['p(95)<3000'],    // 95% connect in <3s
    'widget_join_time': ['p(95)<1000'],       // 95% join response in <1s
    'connection_failures': ['count<20'],      // <20 connection failures
    'join_success_rate': ['rate>0.90'],       // >90% join success rate
  },
};

// -----------------------------------------------------------------------------
// Configuration from Environment
// -----------------------------------------------------------------------------
const SERVER_URL = __ENV.SERVER_URL || 'wss://ghost-greeterserver-production.up.railway.app';
const ORG_ID = __ENV.ORG_ID || 'test-org-load-test';

// Socket.io Engine.io v4 WebSocket URL
const WS_URL = `${SERVER_URL}/socket.io/?EIO=4&transport=websocket`;

// Sample page URLs for realistic traffic patterns
const SAMPLE_PAGES = [
  'https://example.com/',
  'https://example.com/pricing',
  'https://example.com/features',
  'https://example.com/about',
  'https://example.com/contact',
  'https://example.com/blog',
  'https://example.com/demo',
  'https://example.com/signup',
  'https://example.com/products/widget',
  'https://example.com/solutions/enterprise',
];

const SAMPLE_REFERRERS = [
  'https://google.com',
  'https://bing.com',
  'https://twitter.com',
  'https://linkedin.com',
  'https://facebook.com',
  '',
  'direct',
];

// -----------------------------------------------------------------------------
// Main Test Function
// -----------------------------------------------------------------------------
export default function () {
  const visitorId = uuidv4();
  const pageUrl = SAMPLE_PAGES[Math.floor(Math.random() * SAMPLE_PAGES.length)];
  const referrer = SAMPLE_REFERRERS[Math.floor(Math.random() * SAMPLE_REFERRERS.length)];
  
  const startTime = Date.now();
  let connected = false;
  let joinSent = false;
  let joinResponseReceived = false;
  let joinSentTime = 0;

  const res = ws.connect(WS_URL, {
    timeout: '15s',
  }, function (socket) {
    
    socket.on('open', () => {
      const connectionDuration = Date.now() - startTime;
      connectionTime.add(connectionDuration);
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
        // Now send visitor:join event
        // Socket.io event format: 42["event_name", payload]
        joinSentTime = Date.now();
        const joinPayload = JSON.stringify([
          'visitor:join',
          {
            visitorId: visitorId,
            orgId: ORG_ID,
            pageUrl: pageUrl,
            referrer: referrer,
          }
        ]);
        socket.send(`42${joinPayload}`);
        joinSent = true;
      }
      
      // Handle agent:assigned event
      if (msg.includes('"agent:assigned"') || msg.includes("'agent:assigned'")) {
        joinResponseReceived = true;
        joinSuccessRate.add(1);
        agentAssignedCount.add(1);
        if (joinSentTime > 0) {
          joinTime.add(Date.now() - joinSentTime);
        }
      }
      
      // Handle agent:unavailable event
      if (msg.includes('"agent:unavailable"') || msg.includes("'agent:unavailable'")) {
        joinResponseReceived = true;
        joinSuccessRate.add(1); // Still a successful join, just no agent
        agentUnavailableCount.add(1);
        if (joinSentTime > 0) {
          joinTime.add(Date.now() - joinSentTime);
        }
      }
      
      // Handle Engine.io ping
      if (msg === '2') {
        socket.send('3');
      }
    });

    socket.on('error', (e) => {
      connectionFailures.add(1);
      joinSuccessRate.add(0);
      console.error(`[${__VU}] WebSocket error: ${JSON.stringify(e)}`);
    });

    socket.on('close', () => {
      if (!connected) {
        connectionFailures.add(1);
      }
      if (joinSent && !joinResponseReceived) {
        joinSuccessRate.add(0);
      }
    });

    // Simulate visitor browsing for 1-3 minutes (realistic session duration)
    const browseTime = Math.random() * 120 + 60; // 60-180 seconds
    sleep(browseTime);

    // Optionally simulate page navigation (visitor:interaction)
    if (Math.random() > 0.7) {
      const interactionPayload = JSON.stringify([
        'visitor:interaction',
        {
          type: 'click',
          timestamp: Date.now(),
        }
      ]);
      socket.send(`42${interactionPayload}`);
    }

    // Send Socket.io disconnect
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
  console.log('Widget Visitor Flow Test');
  console.log('='.repeat(60));
  console.log(`Target Server: ${SERVER_URL}`);
  console.log(`Organization ID: ${ORG_ID}`);
  console.log('');
  console.log('Test Stages:');
  console.log('  2min -> 200 concurrent visitors (ramp up)');
  console.log('  5min -> 200 concurrent visitors (steady state)');
  console.log('  1min -> 0 visitors (cooldown)');
  console.log('');
  console.log('Simulated Behavior:');
  console.log('  - Visitors join with random page URLs');
  console.log('  - Session duration: 1-3 minutes');
  console.log('  - 30% chance of page interaction');
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
  console.log('  - agent_assigned_count: Visitors who got an agent');
  console.log('  - agent_unavailable_count: Visitors with no agent available');
  console.log('  - widget_join_time: Time to receive join response');
  console.log('='.repeat(60));
}

