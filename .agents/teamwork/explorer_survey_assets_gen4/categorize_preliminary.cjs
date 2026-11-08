const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));
const drawing = pj.targets.find(t => t.name === 'Drawing');
const costumes = drawing.costumes;

// Let's inspect character / font costumes:
const fontCostumes = costumes.filter(c => c.name.length === 1 || c.name.startsWith('char_') || /^[A-Z0-9]$/i.test(c.name));
console.log('Single char or font costumes:', fontCostumes.length);

// Let's inspect item costumes:
const itemCostumes = costumes.filter(c => c.name.startsWith('item_'));
console.log('item_* costumes:', itemCostumes.length);

// Let's inspect glow costumes (enchantment / item glow):
const glowCostumes = costumes.filter(c => c.name.startsWith('glow_'));
console.log('glow_* costumes:', glowCostumes.length);

// Let's inspect animated multi-frame costumes (e.g. name ending in a number):
const animatedCostumes = costumes.filter(c => /\s\d+$/.test(c.name) || /_\d+$/.test(c.name));
console.log('Costumes ending in a number (potential animation frames or variants):', animatedCostumes.length);

// Let's inspect GUI elements:
const guiKeywords = ['heart', 'food', 'crosshair', 'bar', 'slot', 'gui', 'inv', 'button', 'cursor', 'icon', 'logo', 'title', 'bubble'];
const guiCostumes = costumes.filter(c => guiKeywords.some(kw => c.name.toLowerCase().includes(kw)));
console.log('Potential GUI costumes:', guiCostumes.length, guiCostumes.map(c => c.name).slice(0, 20));

// Let's inspect crack / destroy stages:
const crackCostumes = costumes.filter(c => c.name.toLowerCase().includes('crack') || c.name.toLowerCase().includes('destroy') || c.name.toLowerCase().includes('break') || c.name.toLowerCase().includes('damage'));
console.log('Crack / destroy costumes:', crackCostumes.length, crackCostumes.map(c => c.name));

// Let's check particle costumes:
const particleKeywords = ['particle', 'smoke', 'crit', 'bubble', 'flame', 'spark', 'drip', 'splash', 'explosion'];
const particleCostumes = costumes.filter(c => particleKeywords.some(kw => c.name.toLowerCase().includes(kw)));
console.log('Particle costumes:', particleCostumes.length, particleCostumes.map(c => c.name));
