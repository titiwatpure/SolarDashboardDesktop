import sqlite3
conn = sqlite3.connect(r'E:\Dashboard\backend\solar_dashboard.db')
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [t[0] for t in c.fetchall()]
print("Tables:", tables)
if 'accounting_transactions' in tables:
    c.execute("SELECT COUNT(*) FROM accounting_transactions")
    print("Transactions count:", c.fetchone()[0])
conn.close()
