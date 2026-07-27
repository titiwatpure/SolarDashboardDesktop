import os
import json
from collections import defaultdict

ROOT = r"E:\Dashboard"
SKIP = {
    "node_modules", ".git", "__pycache__", ".mimocode/node_modules",
    "dist", "build", ".next", "coverage", ".pytest_cache",
    "frontend/node_modules", "backend/node_modules",
}

def get_size(path):
    total = 0
    try:
        for entry in os.scandir(path):
            if entry.is_file(follow_symlinks=False):
                total += entry.stat().st_size
            elif entry.is_dir(follow_symlinks=False):
                if entry.name not in SKIP:
                    total += get_size(entry.path)
    except PermissionError:
        pass
    return total

def fmt_size(b):
    if b < 1024: return f"{b} B"
    if b < 1024*1024: return f"{b/1024:.1f} KB"
    if b < 1024*1024*1024: return f"{b/1024/1024:.1f} MB"
    return f"{b/1024/1024/1024:.2f} GB"

# 1. Top-level directory sizes
print("=" * 60)
print("TOP-LEVEL DIRECTORY SIZES (excluding node_modules/.git)")
print("=" * 60)
top_items = []
for entry in os.scandir(ROOT):
    if entry.name.startswith(".") and entry.name != ".mimocode":
        continue
    if entry.name in ("node_modules", ".git"):
        continue
    if entry.is_dir():
        size = get_size(entry.path)
        top_items.append((entry.name, size, "dir"))
    elif entry.is_file():
        size = entry.stat().st_size
        top_items.append((entry.name, size, "file"))

top_items.sort(key=lambda x: -x[1])
for name, size, typ in top_items:
    icon = "📁" if typ == "dir" else "📄"
    print(f"  {icon} {name:<40} {fmt_size(size):>10}")

# 2. File count by extension
print("\n" + "=" * 60)
print("FILE COUNT BY EXTENSION")
print("=" * 60)
ext_counts = defaultdict(lambda: {"count": 0, "size": 0})
for dirpath, dirnames, filenames in os.walk(ROOT):
    # Skip excluded dirs
    dirnames[:] = [d for d in dirnames if d not in SKIP and not d.startswith(".")]
    for f in filenames:
        ext = os.path.splitext(f)[1].lower() or "(no ext)"
        fp = os.path.join(dirpath, f)
        try:
            sz = os.path.getsize(fp)
        except:
            sz = 0
        ext_counts[ext]["count"] += 1
        ext_counts[ext]["size"] += sz

sorted_exts = sorted(ext_counts.items(), key=lambda x: -x[1]["size"])
for ext, info in sorted_exts[:20]:
    print(f"  {ext:<15} {info['count']:>5} files  {fmt_size(info['size']):>10}")

# 3. Largest files (top 25)
print("\n" + "=" * 60)
print("LARGEST FILES (top 25)")
print("=" * 60)
all_files = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in SKIP and not d.startswith(".")]
    for f in filenames:
        fp = os.path.join(dirpath, f)
        try:
            sz = os.path.getsize(fp)
        except:
            sz = 0
        rel = os.path.relpath(fp, ROOT)
        all_files.append((rel, sz))

all_files.sort(key=lambda x: -x[1])
for rel, sz in all_files[:25]:
    print(f"  {fmt_size(sz):>10}  {rel}")

# 4. Temp/scratch files that might be deletable
print("\n" + "=" * 60)
print("POTENTIALLY DELETABLE FILES")
print("=" * 60)
patterns = {
    ".py": "Python scripts",
    ".bak": "Backup files",
    ".tmp": "Temp files",
    ".log": "Log files",
    ".old": "Old files",
}
deletable = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in SKIP and not d.startswith(".")]
    for f in filenames:
        ext = os.path.splitext(f)[1].lower()
        fp = os.path.join(dirpath, f)
        rel = os.path.relpath(fp, ROOT)
        try:
            sz = os.path.getsize(fp)
        except:
            sz = 0
        
        # Temp/scratch files in .mimocode
        if ".mimocode" in rel and f.startswith("_"):
            deletable.append((rel, sz, "temp/scratch script"))
        # Backup files
        elif ext in (".bak", ".tmp", ".old"):
            deletable.append((rel, sz, patterns.get(ext, "backup")))
        # Python scripts outside node_modules
        elif ext == ".py" and "node_modules" not in rel:
            deletable.append((rel, sz, "Python script"))
        # Log files
        elif ext == ".log":
            deletable.append((rel, sz, "log file"))

deletable.sort(key=lambda x: -x[1])
for rel, sz, reason in deletable:
    print(f"  {fmt_size(sz):>10}  {reason:<25}  {rel}")

# 5. .mimocode contents
print("\n" + "=" * 60)
print(".mimocode/ CONTENTS (project-level)")
print("=" * 60)
mimocode_dir = os.path.join(ROOT, ".mimocode")
if os.path.exists(mimocode_dir):
    for entry in os.scandir(mimocode_dir):
        if entry.name == "node_modules":
            continue
        if entry.is_dir():
            size = get_size(entry.path)
            count = sum(1 for _ in os.scandir(entry.path) if _.is_file())
            print(f"  📁 {entry.name:<30} {fmt_size(size):>10}  ({count} files)")
        elif entry.is_file():
            size = entry.stat().st_size
            print(f"  📄 {entry.name:<30} {fmt_size(size):>10}")

# 6. Summary
print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
total_size = get_size(ROOT)
print(f"  Total project size: {fmt_size(total_size)}")
print(f"  Total files: {len(all_files)}")
print(f"  Largest directory: {top_items[0][0]} ({fmt_size(top_items[0][1])})")
