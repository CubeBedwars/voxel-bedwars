const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

const stage = pj.targets.find(t => t.name === 'Stage');
let imgNames = [];
for (const [id, [name, val]] of Object.entries(stage.lists)) {
  if (name === '_Images Names') imgNames = val;
}

const drawing = pj.targets.find(t => t.name === 'Drawing');

console.log('Sample _Images Names (0..50):');
imgNames.slice(0, 50).forEach((name, i) => {
  console.log(`[${i}] "${name}"`);
});

console.log('\nSample Drawing costumes (0..50):');
drawing.costumes.slice(0, 50).forEach((c, i) => {
  console.log(`[${i}] "${c.name}" -> ${c.md5ext}`);
});
