const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

const drawing = pj.targets.find(t => t.name === 'Drawing');

const guiTerms = ['heart', 'food', 'armor', 'chestplate', 'bubble', 'xp', 'exp', 'level', 'hotbar', 'crosshair', 'slot', 'bar', 'icon', 'gui', 'inv'];

for (const term of guiTerms) {
  const matches = drawing.costumes.filter(c => c.name.toLowerCase().includes(term));
  console.log(`Term "${term}" (${matches.length}):`);
  matches.forEach(m => console.log(`  "${m.name}" (${m.md5ext})`));
}
