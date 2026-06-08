const fs = require('fs');
const c = fs.readFileSync('src/components/DashboardShell.jsx', 'utf8');
const lines = c.split('\n');
lines.forEach((l,i) => { 
  if (l.includes('switchTab') || l.includes('JSX_TABS') || l.includes('postMessage')) 
    console.log(i+1, l.trim()); 
});
