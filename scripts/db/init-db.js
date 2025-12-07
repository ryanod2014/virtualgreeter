#!/usr/bin/env node
/**
 * Initialize the workflow database
 * Creates the SQLite database and schema
 */

import { initDB, closeDB } from './db.js';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../../data');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  console.log(`Creating data directory: ${DATA_DIR}`);
  mkdirSync(DATA_DIR, { recursive: true });
}

console.log('Initializing workflow database...');

try {
  const db = initDB();
  console.log('✓ Database initialized successfully');
  
  // Verify tables exist
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    ORDER BY name
  `).all();
  
  console.log('\nTables created:');
  tables.forEach(t => console.log(`  - ${t.name}`));
  
  closeDB();
  console.log('\n✓ Database ready');
} catch (error) {
  console.error('✗ Database initialization failed:', error.message);
  process.exit(1);
}
