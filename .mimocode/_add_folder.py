import sqlite3

conn = sqlite3.connect(r'E:\Dashboard\backend\solar_dashboard.db')
c = conn.cursor()

# Add folder column if not exists
try:
    c.execute("ALTER TABLE knowledge_base ADD COLUMN folder TEXT DEFAULT 'ทั่วไป'")
    print('Added folder column')
except:
    print('folder column already exists')

# Add index for folder
try:
    c.execute('CREATE INDEX IF NOT EXISTS idx_kb_folder ON knowledge_base(folder)')
    print('Added folder index')
except:
    print('folder index already exists')

conn.commit()
conn.close()
print('OK')
