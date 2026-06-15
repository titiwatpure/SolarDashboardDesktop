module.exports = {
  async up(runSql) {
    await runSql(`
      CREATE TABLE IF NOT EXISTS organization_contacts (
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
      )
    `);
    await runSql('CREATE INDEX IF NOT EXISTS idx_org_contacts_org_id ON organization_contacts(organization_id)');
    await runSql('CREATE INDEX IF NOT EXISTS idx_org_contacts_primary ON organization_contacts(organization_id, is_primary)');
  }
};
