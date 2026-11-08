const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

const drawing = pj.targets.find(t => t.name === 'Drawing');

for (let i = 1; i <= 10; i++) {
  const match = drawing.costumes.find(c => c.name.toLowerCase() === `cursor ${i}`);
  if (match) {
    console.log(`Found "cursor ${i}": md5ext="${match.md5ext}", format="${match.dataFormat}"`);
  } else {
    console.log(`NOT found "cursor ${i}"`);
  }
}
