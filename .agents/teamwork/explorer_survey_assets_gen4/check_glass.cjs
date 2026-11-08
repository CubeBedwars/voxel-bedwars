const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

const stage = pj.targets.find(t => t.name === 'Stage');

let imgNames, imgIndexes, imgColours;
for (const [id, [name, val]] of Object.entries(stage.lists)) {
  if (name === '_Images Names') imgNames = val;
  if (name === '_Images Indexes') imgIndexes = val;
  if (name === '_Images Colours') imgColours = val;
}

const glassIdx = imgIndexes[8] - 1;
const glassPixels = imgColours.slice(glassIdx, glassIdx + 256);
console.log('Glass total pixels:', glassPixels.length);
const uniqueVals = new Set(glassPixels);
console.log('Unique values in glass:', [...uniqueVals].slice(0, 10));

for (const val of [...uniqueVals].slice(0, 5)) {
  const num = parseInt(val, 10);
  console.log(`Value ${val}: hex = #${(num >>> 0).toString(16)}`);
}
