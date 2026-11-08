const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

const drawing = pj.targets.find(t => t.name === 'Drawing');

const testNames = ['dirt', 'stone', 'wood', 'planks', 'wool', 'obsidian', 'bed', 'end stone', 'glass', 'brick', 'ore'];

for (const tn of testNames) {
  const matches = drawing.costumes.filter(c => c.name.toLowerCase().includes(tn));
  console.log(`Matches for "${tn}" (${matches.length}):`);
  console.log(matches.slice(0, 10).map(c => `"${c.name}" (${c.md5ext})`).join(', '));
}
