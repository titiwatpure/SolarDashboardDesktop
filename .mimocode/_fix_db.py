import sqlite3

conn = sqlite3.connect(r'E:\Dashboard\backend\solar_dashboard.db')
c = conn.cursor()

try:
    c.execute("ALTER TABLE report_drafts ADD COLUMN custom_sections TEXT DEFAULT '[]'")
    print('Added custom_sections column')
except:
    print('custom_sections column already exists')

try:
    c.execute("ALTER TABLE report_drafts ADD COLUMN comments TEXT DEFAULT '[]'")
    print('Added comments column')
except:
    print('comments column already exists')

conn.commit()
conn.close()
print('OK')
