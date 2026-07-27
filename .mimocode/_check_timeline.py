import sqlite3
conn = sqlite3.connect(r'E:\Dashboard\backend\solar_dashboard.db')
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%timeline%'")
print("Timeline tables:", c.fetchall())
try:
    c.execute("PRAGMA table_info(doc_review_timeline)")
    print("doc_review_timeline columns:", c.fetchall())
except Exception as e:
    print("Error:", e)
conn.close()
