const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

const main = pj.targets.find(t => t.name === 'Main');
console.log('Block a)F:', JSON.stringify(main.blocks['a)F']));
let curr = main.blocks['a)F'];
for (let i = 0; i < 5 && curr && curr.parent; i++) {
  console.log(`Parent: id=${curr.parent}, block:`, JSON.stringify(main.blocks[curr.parent]));
  curr = main.blocks[curr.parent];
}
