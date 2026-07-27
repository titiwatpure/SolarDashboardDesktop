import os
import re

ROOT = r'E:\Dashboard\backend\node_modules'
PATTERN = re.compile(r'enableMouse|mouse.*track|\x1b\[.*M|\\x1b\[.*M', re.IGNORECASE)

results = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    # Skip deep node_modules
    if dirpath.count('node_modules') > 1:
        continue
    for f in filenames:
        if not f.endswith('.js'):
            continue
        fp = os.path.join(dirpath, f)
        try:
            with open(fp, 'r', encoding='utf-8', errors='ignore') as fh:
                for i, line in enumerate(fh, 1):
                    if PATTERN.search(line):
                        rel = os.path.relpath(fp, ROOT)
                        results.append((rel, i, line.strip()[:100]))
        except:
            pass

if results:
    print(f"Found {len(results)} matches:")
    for path, line, content in results[:30]:
        print(f"  {path}:{line}: {content}")
else:
    print("No mouse tracking patterns found in node_modules")
