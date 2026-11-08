const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

// Search blocks for breaking, cracking, or destroying
for (const t of pj.targets) {
  for (const [id, block] of Object.entries(t.blocks || {})) {
    if (typeof block === 'object' && block.opcode) {
      const str = JSON.stringify(block);
      if (str.includes('crack') || str.includes('destroy') || str.includes('break') || str.includes('mining')) {
        console.log(`Target ${t.name} opcode: ${block.opcode}`);
        console.log(`  Snippet: ${str.slice(0, 150)}`);
      }
    }
  }
}
