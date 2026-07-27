import sqlite3

conn = sqlite3.connect(r'E:\Dashboard\backend\solar_dashboard.db')
c = conn.cursor()

# Create knowledge_base table
c.execute('''CREATE TABLE IF NOT EXISTS knowledge_base (
    id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    content TEXT NOT NULL,
    keywords TEXT DEFAULT '',
    category TEXT DEFAULT 'general',
    file_path TEXT,
    file_type TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)''')

# Create index for faster search
c.execute('CREATE INDEX IF NOT EXISTS idx_kb_topic ON knowledge_base(topic)')
c.execute('CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base(category)')
c.execute('CREATE INDEX IF NOT EXISTS idx_kb_keywords ON knowledge_base(keywords)')

conn.commit()
conn.close()
print('OK: knowledge_base table created')
