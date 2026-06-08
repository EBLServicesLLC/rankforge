# Run this from C:\Users\Darno\RankForgedAI:
# python write_rankforge.py
import shutil, os

src = os.path.join(os.path.expanduser('~'), 'Downloads', 'rankforge3.html')
dst = os.path.join('public', 'rankforge3.html')

# Try all numbered versions, pick the largest (most recent build)
import glob
candidates = glob.glob(os.path.join(os.path.expanduser('~'), 'Downloads', 'rankforge3*.html'))
if not candidates:
    print("No rankforge3*.html found in Downloads")
    exit(1)

# Pick by size - our correct file is ~1,077,232 bytes
best = max(candidates, key=os.path.getsize)
size = os.path.getsize(best)
print(f"Found: {best} ({size:,} bytes)")

# Check it has gscDashRefresh
with open(best, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

if 'gscDashRefresh' in content:
    print("✓ File has gscDashRefresh — correct version")
    shutil.copy2(best, dst)
    print(f"✓ Copied to {dst}")
else:
    print("✗ File does NOT have gscDashRefresh — wrong version")
    print("Sizes of all candidates:")
    for c in sorted(candidates, key=os.path.getsize, reverse=True):
        print(f"  {os.path.getsize(c):,} bytes - {os.path.basename(c)}")
