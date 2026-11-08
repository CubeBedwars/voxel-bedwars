const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

const stage = pj.targets.find(t => t.name === 'Stage');

let imgNames, imgWidths, imgHeights, imgIndexes, imgColours;

for (const [id, [name, val]] of Object.entries(stage.lists)) {
  if (name === '_Images Names') imgNames = val;
  if (name === '_Images Widths') imgWidths = val;
  if (name === '_Images Heights') imgHeights = val;
  if (name === '_Images Indexes') imgIndexes = val;
  if (name === '_Images Colours') imgColours = val;
}

console.log('Total entries in _Images Names:', imgNames.length);

// Count non-empty, non-null names
const validImages = [];
for (let i = 0; i < imgNames.length; i++) {
  const name = imgNames[i];
  if (name && name !== 'null' && name !== '') {
    const idx = parseInt(imgIndexes[i], 10);
    const w = parseInt(imgWidths[i], 10);
    const h = parseInt(imgHeights[i], 10);
    validImages.push({ index: i, name, w, h, dataIdx: idx });
  }
}

console.log('Valid non-null images in _Images Names:', validImages.length);

// Print samples across the list
console.log('First 20 valid images:');
validImages.slice(0, 20).forEach(v => console.log(`  [${v.index}] "${v.name}" (${v.w}x${v.h}, offset ${v.dataIdx})`));

console.log('Last 20 valid images:');
validImages.slice(-20).forEach(v => console.log(`  [${v.index}] "${v.name}" (${v.w}x${v.h}, offset ${v.dataIdx})`));

// Check wool colors in _Images Names
const woolImages = validImages.filter(v => v.name.includes('wool'));
console.log(`Wool images (${woolImages.length}):`, woolImages.map(w => w.name));

// Check cursor images
const cursorImages = validImages.filter(v => v.name.includes('cursor'));
console.log(`Cursor images (${cursorImages.length}):`, cursorImages.map(w => w.name));

// Check ore images
const oreImages = validImages.filter(v => v.name.includes('ore'));
console.log(`Ore images (${oreImages.length}):`, oreImages.map(w => w.name));
