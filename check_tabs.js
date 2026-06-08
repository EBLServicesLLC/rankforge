const fs = require('fs');
let c = fs.readFileSync('src/components/DashboardShell.jsx', 'utf8');
const lines = c.split('\n');
lines.forEach((l,i) => { if (l.includes('JSX_TABS')) console.log(i+1, l.trim()); });
