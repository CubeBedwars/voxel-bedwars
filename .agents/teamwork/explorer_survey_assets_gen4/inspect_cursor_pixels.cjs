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

for (let stageNum = 1; stageNum <= 10; stageNum++) {
  const name = `cursor ${stageNum}`;
  const idxInNames = imgNames.indexOf(name);
  const dataOffset = imgIndexes[idxInNames] - 1;
  const pixels = imgColours.slice(dataOffset, dataOffset + 256);
  const nonZero = pixels.filter(p => p !== '0' && p !== 0 && p !== '16777216');
  console.log(`${name}: index=${idxInNames}, offset=${dataOffset}, non-transparent pixels=${nonZero.length}`);
  const uniqueVals = new Set(nonZero);
  console.log(`  Sample values:`, [...uniqueVals].slice(0, 5));
}
