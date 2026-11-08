const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

const drawing = pj.targets.find(t => t.name === 'Drawing');

const currency = ['iron_ingot', 'gold_ingot', 'diamond', 'emerald', 'iron', 'gold'];

for (const c of currency) {
  const matches = drawing.costumes.filter(x => x.name.toLowerCase().includes(c));
  console.log(`Currency match "${c}":`, matches.map(m => m.name));
}
