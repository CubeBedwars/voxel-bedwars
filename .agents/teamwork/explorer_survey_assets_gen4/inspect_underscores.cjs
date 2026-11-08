const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

for (const t of pj.targets) {
  if (t.name.startsWith('_')) {
    console.log(`Sprite ${t.name}: costumes=${t.costumes.length}, blocksCount=${Object.keys(t.blocks).length}`);
    // Check top level blocks
    for (const [id, block] of Object.entries(t.blocks)) {
      if (block.topLevel) {
        console.log(`  TopLevel block in ${t.name}: opcode=${block.opcode}`);
      }
    }
  }
}
