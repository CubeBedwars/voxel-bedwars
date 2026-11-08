const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

const main = pj.targets.find(t => t.name === 'Main');
console.log('Block a)D:', JSON.stringify(main.blocks['a)D']));
let curr = main.blocks['a)D'];
while (curr && curr.parent) {
  console.log(`Parent of ${curr.opcode}: id=${curr.parent}, block:`, JSON.stringify(main.blocks[curr.parent]));
  curr = main.blocks[curr.parent];
}
