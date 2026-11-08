const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

const drawing = pj.targets.find(t => t.name === 'Drawing');

for (let i = 425; i <= 440; i++) {
  const c = drawing.costumes[i - 1]; // 1-indexed to 0-indexed
  console.log(`Costume #${i}: name="${c.name}", md5ext="${c.md5ext}"`);
}
