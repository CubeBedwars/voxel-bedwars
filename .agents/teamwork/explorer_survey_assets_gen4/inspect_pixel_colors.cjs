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

// Check "dirt" (index 1)
const dirtIdx = imgIndexes[1] - 1; // 1-indexed to 0-indexed
const dirtPixels = imgColours.slice(dirtIdx, dirtIdx + 16);
console.log('Dirt first 16 pixels:', dirtPixels);

// Check if these are decimal RGB or ARGB colors
// Convert first pixel to hex
dirtPixels.forEach((p, i) => {
  const num = parseInt(p, 10);
  const hex = (num >>> 0).toString(16).padStart(6, '0');
  console.log(`pixel ${i}: dec=${num}, hex=#${hex}`);
});

// Also check "cursor 1" (index 189)
const cursor1Idx = imgIndexes[189] - 1;
console.log('cursor 1 idx:', cursor1Idx, 'name:', imgNames[189]);
const cursor1Pixels = imgColours.slice(cursor1Idx, cursor1Idx + 16);
console.log('cursor 1 first 16 pixels:', cursor1Pixels);
