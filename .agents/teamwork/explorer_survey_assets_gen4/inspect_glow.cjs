const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

const drawing = pj.targets.find(t => t.name === 'Drawing');

const glow = drawing.costumes.filter(c => c.name.startsWith('glow_'));
console.log('Total glow_* costumes:', glow.length);
const glowTypes = new Set(glow.map(g => g.name.replace(/_\d+$/, '')));
console.log('Unique glow types:', [...glowTypes]);
console.log('Sample glow costumes:', glow.slice(0, 20).map(g => `"${g.name}" -> ${g.md5ext}`));
