const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

const drawing = pj.targets.find(t => t.name === 'Drawing');
for (const [id, block] of Object.entries(drawing.blocks || {})) {
  const str = JSON.stringify(block);
  if (str.includes('breaking') || str.includes('crack') || str.includes('destroy') || str.includes('progress')) {
    console.log(`Drawing opcode: ${block.opcode}`);
    console.log(`  Snippet: ${str.slice(0, 200)}`);
  }
}
