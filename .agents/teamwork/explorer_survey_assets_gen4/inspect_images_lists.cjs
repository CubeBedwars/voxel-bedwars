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

console.log('imgNames count:', imgNames.length);
console.log('imgWidths count:', imgWidths.length);
console.log('imgHeights count:', imgHeights.length);
console.log('imgIndexes count:', imgIndexes.length);
console.log('imgColours count:', imgColours.length);

for (let i = 0; i < 15; i++) {
  console.log(`[${i}] name="${imgNames[i]}", w=${imgWidths[i]}, h=${imgHeights[i]}, idx=${imgIndexes[i]}`);
}
