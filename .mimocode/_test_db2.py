import sqlite3
conn = sqlite3.connect(r'E:\Dashboard\backend\solar_dashboard.db')
c = conn.cursor()

# Check doc_agency_submissions columns
c.execute("PRAGMA table_info(doc_agency_submissions)")
print("doc_agency_submissions columns:", c.fetchall())

# Check document_submissions columns
c.execute("PRAGMA table_info(document_submissions)")
print("document_submissions columns:", c.fetchall())

# Check doc_submission_packages columns
c.execute("PRAGMA table_info(doc_submission_packages)")
print("doc_submission_packages columns:", c.fetchall())

conn.close()
