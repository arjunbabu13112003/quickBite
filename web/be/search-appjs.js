const fs = require('fs');
const content = fs.readFileSync('C:/Projects/test/mobile/App.js', 'utf8');

function findLines(pattern) {
  console.log(`=== Matches for: ${pattern} ===`);
  const lines = content.split('\n');
  let count = 0;
  lines.forEach((line, idx) => {
    if (line.toLowerCase().includes(pattern.toLowerCase())) {
      console.log(`${idx + 1}: ${line.trim()}`);
      count++;
    }
  });
  console.log(`Total: ${count} matches\n`);
}

findLines('handleLogout');
