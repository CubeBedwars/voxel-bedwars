const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

for (const t of pj.targets) {
  for (const [id, block] of Object.entries(t.blocks || {})) {
    const str = JSON.stringify(block);
    if (str.includes('Cursor Breaking State')) {
      console.log(`Target ${t.name} opcode ${block.opcode}:`);
      console.log(`  ${str}`);
    }
  }
}
