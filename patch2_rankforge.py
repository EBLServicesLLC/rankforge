import re, os, shutil

path = os.path.join("public", "rankforge3.html")
with open(path, "r", encoding="utf-8") as f:
    html = f.read()

print(f"Loaded: {len(html):,} bytes")

# Find the LOAD_DATA handler and show what's there
ld_pos = html.find("ev.data.type === 'LOAD_DATA'")
if ld_pos < 0:
    ld_pos = html.find('ev.data.type === "LOAD_DATA"')
if ld_pos < 0:
    print("ERROR: LOAD_DATA handler not found at all")
    exit(1)

print(f"\nLOAD_DATA handler found at position {ld_pos}")
print("First 600 chars of handler:")
print(repr(html[ld_pos:ld_pos+600]))