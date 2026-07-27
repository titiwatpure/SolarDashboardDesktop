import sqlite3
conn = sqlite3.connect(r'E:\Dashboard\backend\solar_dashboard.db')
c = conn.cursor()

# Check submission tables
c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%submission%'")
print("Submission tables:", c.fetchall())

# Check doc_submissions columns
try:
    c.execute("PRAGMA table_info(doc_submissions)")
    print("doc_submissions columns:", c.fetchall())
except Exception as e:
    print("Error:", e)

# Check if table exists
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [t[0] for t in c.fetchall()]
print("All tables with 'sub':", [t for t in tables if 'sub' in t.lower()])

conn.close()
