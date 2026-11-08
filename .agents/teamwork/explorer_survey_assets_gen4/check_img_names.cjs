const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

const stage = pj.targets.find(t => t.name === 'Stage');
let imgNames = null;
for (const [id, [name, val]] of Object.entries(stage.lists)) {
  if (name === '_Images Names') {
    imgNames = val;
    break;
  }
}

console.log('Total items in _Images Names:', imgNames.length);

for (let i = 180; i <= 210; i++) {
  console.log(`_Images Names[${i}] = "${imgNames[i]}"`);
}
