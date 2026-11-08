const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

const stage = pj.targets.find(t => t.name === 'Stage');
let imgNames = [];
let blockIds = [];
for (const [id, [name, val]] of Object.entries(stage.lists)) {
  if (name === '_Images Names') imgNames = val;
  if (name === '_Block IDs') blockIds = val;
}

const drawing = pj.targets.find(t => t.name === 'Drawing');
const costumeNames = drawing.costumes.map(c => c.name);

console.log('Total Drawing costumes:', costumeNames.length);
console.log('Total _Images Names:', imgNames.length);
console.log('Total _Block IDs:', blockIds.length);

// How many _Images Names match a Drawing costume name directly?
const exactMatches = imgNames.filter(name => costumeNames.includes(name));
console.log('Exact matches between _Images Names and Drawing costumes:', exactMatches.length);

// What about case-insensitive or trimmed?
const ciCostumeNames = new Map(drawing.costumes.map(c => [c.name.toLowerCase(), c]));
const ciMatches = imgNames.filter(name => ciCostumeNames.has(name.toLowerCase()));
console.log('Case-insensitive matches:', ciMatches.length);

// How many _Block IDs match a Drawing costume name or item_*?
let blockDirectMatches = 0;
let blockItemMatches = 0;
for (const b of blockIds) {
  if (ciCostumeNames.has(b.toLowerCase())) blockDirectMatches++;
  if (ciCostumeNames.has(('item_' + b).toLowerCase())) blockItemMatches++;
}
console.log('Block IDs matching costume directly:', blockDirectMatches);
console.log('Block IDs matching item_<blockId>:', blockItemMatches);
