const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

const sounds = pj.targets.find(t => t.name === 'Sounds').sounds;

const formats = {};
for (const s of sounds) {
  formats[s.dataFormat] = (formats[s.dataFormat] || 0) + 1;
}
console.log('Audio formats in Sounds target:', formats);

// Check file sizes
let totalBytes = 0;
let minSize = Infinity, maxSize = -Infinity;
let minFile = '', maxFile = '';
for (const s of sounds) {
  const p = path.join(refDir, s.md5ext);
  const stat = fs.statSync(p);
  totalBytes += stat.size;
  if (stat.size < minSize) { minSize = stat.size; minFile = s.name; }
  if (stat.size > maxSize) { maxSize = stat.size; maxFile = s.name; }
}
console.log(`Total audio size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Min file: "${minFile}" (${minSize} bytes), Max file: "${maxFile}" (${maxSize} bytes)`);
