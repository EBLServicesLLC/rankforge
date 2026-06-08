content = open('src/components/DashboardShell.jsx', encoding='utf-8').read()
import re
# Replace all icon:'...' values with simple ASCII
replacements = [
    ('dash',         '▪'),
    ('agents',       '▪'),
    ('dir',          '▪'),
    ('bl',           '▪'),
    ('web2',         '▪'),
    ('locallinks',   '▪'),
    ('local',        '▪'),
    ('mloc',         '▪'),
    ('napaudit',     '▪'),
    ('reputation',   '▪'),
    ('voice',        '▪'),
    ('gbpqa',        '▪'),
    ('pages',        '▪'),
    ('calendar',     '▪'),
    ('kwgap',        '▪'),
    ('rank-tracker', '▪'),
    ('gsc',          '▪'),
    ('schema-mon',   '▪'),
    ('social-pub',   '▪'),
    ('social-proof', '▪'),
    ('pdfreport',    '▪'),
    ('meta',         '▪'),
    ('index',        '▪'),
    ('keys',         '▪'),
]
content = re.sub(r"icon:'[^']*'", "icon:''", content)
open('src/components/DashboardShell.jsx', 'w', encoding='utf-8').write(content)
print('done, icons cleared')
