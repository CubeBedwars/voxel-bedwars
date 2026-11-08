const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

const drawing = pj.targets.find(t => t.name === 'Drawing');

const samples = ['dirt 1', 'item_dirt', 'hotbar', 'crosshair', 'stone', 'water'];
for (const s of samples) {
  const c = drawing.costumes.find(x => x.name === s);
  console.log(s, c);
}
