const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const lines = content.split('\n');
lines.forEach((l, i) => {
    if (l.includes('checkIsAdmin') || l.includes('admin') || l.includes('ADMIN') || l.includes('@') || l.includes('R0PD') || l.includes('r0pd') || l.includes('ROPD')) {
        console.log(`${i+1}: ${l.slice(0, 100)}`);
    }
});
