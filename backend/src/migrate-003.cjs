const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '..', 'solar_dashboard.db'));

db.run(`CREATE TABLE IF NOT EXISTS organization_contacts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  position TEXT,
  department TEXT,
  phone TEXT,
  email TEXT,
  line_id TEXT,
  contact_role TEXT DEFAULT 'other',
  is_primary INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`, (err) => {
  if (err) console.error('CREATE TABLE ERR:', err.message);
  else console.log('Table organization_contacts created');
});

db.run('CREATE INDEX IF NOT EXISTS idx_org_contacts_org_id ON organization_contacts(organization_id)', (err) => {
  if (err) console.error('IDX1 ERR:', err.message);
  else console.log('Index idx_org_contacts_org_id created');
});

db.run('CREATE INDEX IF NOT EXISTS idx_org_contacts_primary ON organization_contacts(organization_id, is_primary)', (err) => {
  if (err) console.error('IDX2 ERR:', err.message);
  else console.log('Index idx_org_contacts_primary created');
  db.close();
});
