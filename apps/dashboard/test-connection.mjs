// Simple test to verify Socket.io server is responding
import { io } from 'socket.io-client';

const SERVER_URL = process.env.SERVER_URL || 'https://ghost-greeterserver-production.up.railway.app';

console.log(`Connecting to ${SERVER_URL}...`);

const socket = io(SERVER_URL, {
  transports: ['websocket'],
  timeout: 10000,
});

socket.on('connect', () => {
  console.log('✅ Connected! Socket ID:', socket.id);
  
  // Test visitor join
  socket.emit('visitor:join', {
    visitorId: `test-${Date.now()}`,
    orgId: 'test-org',
    pageUrl: 'https://example.com/test',
    referrer: 'https://google.com',
  });
  
  console.log('📤 Sent visitor:join event');
});

socket.on('agent:assigned', (data) => {
  console.log('✅ Agent assigned:', data);
});

socket.on('agent:unavailable', (data) => {
  console.log('⚠️ No agent available:', data);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

// Disconnect after 10 seconds
setTimeout(() => {
  console.log('\n✅ Test complete - server is responding');
  socket.disconnect();
  process.exit(0);
}, 10000);

