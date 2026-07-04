/**
 * Run Migration 008: Document Review Workflow
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'solar_dashboard.db');
const db = new sqlite3.Database(dbPath);

const { up } = require('./src/migrations/008_document_review_workflow.cjs');

async function runMigration() {
  console.log('🔄 Running migration 008...');
  
  try {
    await new Promise((resolve, reject) => {
      db.exec(up, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    console.log('✅ Migration 008 completed successfully');
    
    // Verify tables exist
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'doc_%'", (err, rows) => {
      if (err) {
        console.error('Error checking tables:', err.message);
      } else {
        console.log('Doc Review tables:', rows.map(r => r.name).join(', '));
      }
      db.close(() => process.exit(0));
    });
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    db.close(() => process.exit(1));
  }
}

runMigration();
