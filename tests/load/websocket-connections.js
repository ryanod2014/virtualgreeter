// =============================================================================
// WEBSOCKET CONNECTION STRESS TEST
// =============================================================================
// Goal: Find max concurrent WebSocket connections the server can handle
//
// Run: k6 run tests/load/websocket-connections.js
// Production: k6 run --env SERVER_URL=wss://ghost-greeterserver-production.up.railway.app tests/load/websocket-connections.js

import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';

// -----------------------------------------------------------------------------
// Custom Metrics
// -----------------------------------------------------------------------------
const connectionTime = new Trend('ws_connection_time', true);
const connectionFailures = new Counter('ws_connection_failures');
const connectionSuccesses = new Counter('ws_connection_successes');
const messagesSent = new Counter('ws_messages_sent');
const messagesReceived = new Counter('ws_messages_received');
const connectionRate = new Rate('ws_connection_success_rate');

// -----------------------------------------------------------------------------
// Test Configuration
// -----------------------------------------------------------------------------
export const options = {
  stages: [
    { duration: '1m', target: 100 },   // Ramp to 100 connections
    { duration: '2m', target: 500 },   // Ramp to 500 connections
    { duration: '2m', target: 1000 },  // Ramp to 1000 connections
    { duration: '3m', target: 1000 },  // Hold at 1000 (steady state)
    { duration: '1m', target: 0 },     // Ramp down gracefully
  ],
  thresholds: {
    'ws_connection_time': ['p(95)<2000'],           // 95% connect in <2s
    'ws_connection_failures': ['count<50'],         // <50 total failures
    'ws_connection_success_rate': ['rate>0.95'],    // >95% success rate
    'ws_messages_received': ['count>0'],            // Verify we're receiving messages
  },
};

// -----------------------------------------------------------------------------
// Configuration from Environment
// -----------------------------------------------------------------------------
const SERVER_URL = __ENV.SERVER_URL || 'wss://ghost-greeterserver-production.up.railway.app';

// Socket.io Engine.io v4 WebSocket URL
const WS_URL = `${SERVER_URL}/socket.io/?EIO=4&transport=websocket`;

// -----------------------------------------------------------------------------
// Main Test Function
// -----------------------------------------------------------------------------
export default function () {
  const startTime = Date.now();
  let connected = false;
  let socketioConnected = false;

  const res = ws.connect(WS_URL, {
    // Increase timeout for initial connection
    timeout: '10s',
  }, function (socket) {
    
    socket.on('open', () => {
      const connectionDuration = Date.now() - startTime;
      connectionTime.add(connectionDuration);
      connected = true;
      
      // Send Socket.io connect packet (Engine.io packet type 4 = MESSAGE, Socket.io type 0 = CONNECT)
      // Format: "40" means Engine.io MESSAGE packet containing Socket.io CONNECT
      socket.send('40');
      messagesSent.add(1);
    });

    socket.on('message', (msg) => {
      messagesReceived.add(1);
      
      // Handle Engine.io open packet (type 0)
      if (msg.startsWith('0')) {
        // Engine.io handshake - contains ping interval, etc.
        // Example: 0{"sid":"xxx","upgrades":[],"pingInterval":25000,"pingTimeout":20000}
        return;
      }
      
      // Handle Socket.io connect confirmation (40)
      if (msg === '40' || msg.startsWith('40{')) {
        socketioConnected = true;
        connectionSuccesses.add(1);
        connectionRate.add(1);
      }
      
      // Handle Engine.io ping (type 2)
      if (msg === '2') {
        // Respond with pong (type 3)
        socket.send('3');
        messagesSent.add(1);
      }
    });

    socket.on('error', (e) => {
      connectionFailures.add(1);
      connectionRate.add(0);
      console.error(`[${__VU}] WebSocket error: ${JSON.stringify(e)}`);
    });

    socket.on('close', () => {
      if (!connected) {
        connectionFailures.add(1);
        connectionRate.add(0);
      }
    });

    // Hold connection for 30-60 seconds (simulating active session)
    const holdTime = Math.random() * 30 + 30;
    sleep(holdTime);

    // Send Socket.io disconnect before closing
    socket.send('41');
    messagesSent.add(1);
    
    socket.close();
  });

  // Verify connection was successful
  check(res, {
    'WebSocket connected (status 101)': (r) => r && r.status === 101,
  });

  // Small delay between iterations to avoid thundering herd
  sleep(Math.random() * 2);
}

// -----------------------------------------------------------------------------
// Setup and Teardown
// -----------------------------------------------------------------------------
export function setup() {
  console.log('='.repeat(60));
  console.log('WebSocket Connection Stress Test');
  console.log('='.repeat(60));
  console.log(`Target Server: ${SERVER_URL}`);
  console.log(`WebSocket URL: ${WS_URL}`);
  console.log('');
  console.log('Test Stages:');
  console.log('  1min  -> 100 connections (warmup)');
  console.log('  2min  -> 500 connections');
  console.log('  2min  -> 1000 connections');
  console.log('  3min  -> 1000 connections (steady state)');
  console.log('  1min  -> 0 connections (cooldown)');
  console.log('='.repeat(60));
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = Math.round((Date.now() - data.startTime) / 1000);
  console.log('');
  console.log('='.repeat(60));
  console.log(`Test completed in ${duration} seconds`);
  console.log('='.repeat(60));
}

