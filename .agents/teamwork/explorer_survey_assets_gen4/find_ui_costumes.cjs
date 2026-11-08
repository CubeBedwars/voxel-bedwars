const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

const drawing = pj.targets.find(t => t.name === 'Drawing');

function getDimensions(filePath, format) {
  if (format === 'svg') return { width: 'svg', height: 'svg' };
  try {
    const buf = fs.readFileSync(filePath);
    if (buf.length >= 24 && buf.toString('ascii', 1, 4) === 'PNG') {
      return {
        width: buf.readUInt32BE(16),
        height: buf.readUInt32BE(20)
      };
    }
  } catch (e) {}
  return null;
}

const smallCostumes = [];
for (const c of drawing.costumes) {
  const p = path.join(refDir, c.md5ext);
  const dim = getDimensions(p, c.dataFormat);
  if (dim && (dim.width === 10 || dim.width === 18 || dim.width === 16 || dim.width === 20 || dim.width === 9 || dim.width === 8) && dim.height <= 20) {
    smallCostumes.push({ name: c.name, md5ext: c.md5ext, dim: `${dim.width}x${dim.height}` });
  }
}

console.log('Small UI-sized costumes count:', smallCostumes.length);
smallCostumes.forEach(s => console.log(`  "${s.name}" (${s.dim}) -> ${s.md5ext}`));
