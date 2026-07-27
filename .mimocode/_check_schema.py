import sqlite3
conn = sqlite3.connect(r'E:\Dashboard\backend\solar_dashboard.db')
c = conn.cursor()

c.execute("PRAGMA table_info(doc_review_projects)")
print("doc_review_projects columns:", c.fetchall())

c.execute("PRAGMA table_info(doc_submission_packages)")
print("doc_submission_packages columns:", c.fetchall())

c.execute("PRAGMA table_info(doc_review_checklists)")
print("doc_review_checklists columns:", c.fetchall())

c.execute("PRAGMA table_info(document_issues)")
print("document_issues columns:", c.fetchall())

conn.close()
