#!/usr/bin/env node

/**
 * PM Dashboard Server
 * 
 * Serves the dashboard AND auto-saves decisions to JSON files.
 * No more copy/paste!
 * 
 * Usage: node docs/pm-dashboard-ui/server.js
 * Then visit: http://localhost:3456
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const DOCS_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(DOCS_DIR, 'data');

// MIME types
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

// Read JSON file safely
function readJSON(filename) {
  const filepath = path.join(DATA_DIR, filename);
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    console.error(`Error reading ${filename}:`, e.message);
    return null;
  }
}

// Write JSON file
function writeJSON(filename, data) {
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`✅ Saved ${filename}`);
}

// Scan features directory recursively
function scanFeaturesDir(dir, basePath = '') {
  const features = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Recurse into subdirectory
      features.push(...scanFeaturesDir(fullPath, basePath ? `${basePath}/${item}` : item));
    } else if (item.endsWith('.md') && item !== 'README.md') {
      // It's a markdown file
      const relativePath = basePath ? `${basePath}/${item}` : item;
      const name = item.replace('.md', '').split('-').map(w => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ');
      const category = basePath || 'general';
      
      features.push({
        name,
        category,
        docPath: `docs/features/${relativePath}`,
        fileName: item
      });
    }
  }
  
  return features;
}

// Scan agent-output directories for per-agent files
// This aggregates outputs from multiple agents running in parallel
function scanAgentOutputs() {
  const AGENT_OUTPUT_DIR = path.join(DOCS_DIR, 'agent-output');
  const outputs = {
    reviews: [],
    completions: [],
    blocked: [],
    docTracker: []
  };
  
  const subdirs = {
    'reviews': 'reviews',
    'completions': 'completions',
    'blocked': 'blocked',
    'doc-tracker': 'docTracker'
  };
  
  for (const [dirName, outputKey] of Object.entries(subdirs)) {
    const dirPath = path.join(AGENT_OUTPUT_DIR, dirName);
    
    try {
      if (!fs.existsSync(dirPath)) continue;
      
      const files = fs.readdirSync(dirPath)
        .filter(f => f.endsWith('.md') && f !== '.gitkeep' && f !== 'README.md');
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          outputs[outputKey].push({
            fileName: file,
            filePath: `docs/agent-output/${dirName}/${file}`,
            content: content,
            modifiedAt: stat.mtime.toISOString(),
            // Extract ID from filename (e.g., "D-routing-rules-2025-12-04T1430.md" -> "D-routing-rules")
            id: file.replace(/-\d{4}-\d{2}-\d{2}T\d+\.md$/, '').replace(/\.md$/, '')
          });
        } catch (e) {
          console.error(`Error reading ${filePath}:`, e.message);
        }
      }
      
      // Sort by modification time (newest first)
      outputs[outputKey].sort((a, b) => 
        new Date(b.modifiedAt) - new Date(a.modifiedAt)
      );
      
    } catch (e) {
      console.error(`Error scanning ${dirPath}:`, e.message);
    }
  }
  
  return outputs;
}

// Handle API requests
function handleAPI(req, res, body) {
  const url = req.url;
  
  // GET /api/data - Load all data files
  if (req.method === 'GET' && url === '/api/data') {
    // Scan features directory
    const featuresDir = path.join(DOCS_DIR, 'features');
    let featuresList = [];
    try {
      featuresList = scanFeaturesDir(featuresDir);
    } catch (e) {
      console.error('Error scanning features:', e.message);
    }
    
    // Scan agent-output directories for per-agent files (auto-aggregation)
    let agentOutputs = { reviews: [], completions: [], blocked: [], docTracker: [] };
    try {
      agentOutputs = scanAgentOutputs();
    } catch (e) {
      console.error('Error scanning agent outputs:', e.message);
    }
    
    const data = {
      findings: readJSON('findings.json'),
      decisions: readJSON('decisions.json'),
      tickets: readJSON('tickets.json'),
      summary: readJSON('findings-summary.json'),
      devStatus: readJSON('dev-status.json'),
      featuresList,
      // Aggregated agent outputs (prevents race conditions with multiple agents)
      agentOutputs
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return true;
  }
  
  // POST /api/dev-status - Save dev status (blocked, in_progress, etc.)
  if (req.method === 'POST' && url === '/api/dev-status') {
    try {
      const devStatus = JSON.parse(body);
      devStatus.meta = devStatus.meta || {};
      devStatus.meta.last_updated = new Date().toISOString();
      writeJSON('dev-status.json', devStatus);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // POST /api/blocked-decision - Record a decision on a blocked agent
  if (req.method === 'POST' && url === '/api/blocked-decision') {
    try {
      const { ticketId, decision, customNote } = JSON.parse(body);
      const devStatus = readJSON('dev-status.json') || { blocked: [], in_progress: [], completed: [], observations: [] };
      
      // Find the blocked item
      const blockedIdx = devStatus.blocked.findIndex(b => b.ticket_id === ticketId);
      if (blockedIdx === -1) {
        throw new Error(`Ticket ${ticketId} not found in blocked queue`);
      }
      
      // Update with decision
      devStatus.blocked[blockedIdx].decision = {
        option: decision,
        custom_note: customNote,
        decided_at: new Date().toISOString()
      };
      devStatus.blocked[blockedIdx].status = 'decided';
      
      devStatus.meta = devStatus.meta || {};
      devStatus.meta.last_updated = new Date().toISOString();
      writeJSON('dev-status.json', devStatus);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // POST /api/decisions - Save decisions (with PM response preservation)
  if (req.method === 'POST' && url === '/api/decisions') {
    try {
      const incomingDecisions = JSON.parse(body);
      const existingDecisions = readJSON('decisions.json') || { threads: [] };
      
      // Merge: preserve PM responses (role: 'system') that dashboard might not have
      const existingThreadMap = new Map();
      for (const thread of existingDecisions.threads || []) {
        existingThreadMap.set(thread.finding_id, thread);
      }
      
      // For each incoming thread, merge in any PM messages from existing
      for (const inThread of incomingDecisions.threads || []) {
        const existingThread = existingThreadMap.get(inThread.finding_id);
        if (existingThread) {
          // Get PM messages from existing that aren't in incoming
          const existingPmMessages = (existingThread.messages || [])
            .filter(m => m.role === 'system');
          const incomingMsgTexts = new Set((inThread.messages || []).map(m => m.text));
          
          // Add PM messages that dashboard doesn't have
          for (const pmMsg of existingPmMessages) {
            if (!incomingMsgTexts.has(pmMsg.text)) {
              inThread.messages = inThread.messages || [];
              inThread.messages.push(pmMsg);
            }
          }
          
          // Sort messages by timestamp
          if (inThread.messages) {
            inThread.messages.sort((a, b) => 
              new Date(a.timestamp) - new Date(b.timestamp)
            );
          }
        }
      }
      
      writeJSON('decisions.json', incomingDecisions);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  return false;
}

// Serve static files
function serveStatic(req, res) {
  let filepath = req.url === '/' ? '/index.html' : req.url;
  filepath = path.join(__dirname, filepath);
  
  const ext = path.extname(filepath);
  const contentType = MIME[ext] || 'text/plain';
  
  fs.readFile(filepath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

// Create server
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Collect body for POST
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    // Try API first
    if (req.url.startsWith('/api/')) {
      if (!handleAPI(req, res, body)) {
        res.writeHead(404);
        res.end('API not found');
      }
    } else {
      serveStatic(req, res);
    }
  });
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║                   PM DASHBOARD                         ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║   🚀 Server running at: http://localhost:${PORT}         ║
║                                                        ║
║   Features:                                            ║
║   • Auto-saves decisions (no copy/paste!)              ║
║   • Loads data from docs/data/*.json                   ║
║   • Auto-aggregates agent outputs from:                ║
║     docs/agent-output/{reviews,completions,blocked,    ║
║     doc-tracker}/*.md                                  ║
║                                                        ║
║   Press Ctrl+C to stop                                 ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
`);
});

