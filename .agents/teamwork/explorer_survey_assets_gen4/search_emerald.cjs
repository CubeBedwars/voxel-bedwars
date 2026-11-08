const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

console.log('Searching for emerald in project.json...');
const str = JSON.stringify(pj);
let count = 0;
let idx = 0;
while ((idx = str.toLowerCase().indexOf('emerald', idx)) !== -1) {
  count++;
  console.log(`Match at ${idx}: ${str.slice(Math.max(0, idx - 40), idx + 60)}`);
  idx += 7;
}
console.log('Total occurrences of emerald in project.json:', count);
