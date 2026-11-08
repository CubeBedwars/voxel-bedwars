const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

// Check lists and variables in Stage and other targets
for (const t of pj.targets) {
  const varCount = Object.keys(t.variables || {}).length;
  const listCount = Object.keys(t.lists || {}).length;
  if (listCount > 0) {
    console.log(`Target ${t.name}: lists count = ${listCount}`);
    for (const [id, [name, val]] of Object.entries(t.lists)) {
      console.log(`  List "${name}": length=${val.length}, sample=${JSON.stringify(val.slice(0, 5))}`);
    }
  }
}
