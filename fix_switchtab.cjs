const fs = require('fs');
let c = fs.readFileSync('src/components/DashboardShell.jsx', 'utf8');
const lines = c.split('\n');

// Show lines 96-107 so we can see exact content
for (let i = 95; i < 107; i++) {
  console.log(i+1, JSON.stringify(lines[i]));
}
