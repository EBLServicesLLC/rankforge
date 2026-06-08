with open('src/components/DashboardShell.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "display:'none',alignItems:'center',padding:'0 14px',gap:10 }}>",
    "display:'flex',alignItems:'center',padding:'0 14px',gap:10 }}>"
)

if "display:'flex',alignItems:'center',padding:'0 14px',gap:10 }}>" in content:
    print("Fix 1 applied: topbar visible")
else:
    print("Fix 1 NOT applied")

with open('src/components/DashboardShell.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done.")
