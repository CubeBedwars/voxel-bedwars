const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

// Check ALL costumes across ALL targets for crack / destroy / break
for (const t of pj.targets) {
  const matches = t.costumes.filter(c => {
    const n = c.name.toLowerCase();
    return n.includes('crack') || n.includes('destroy') || n.includes('break') || n.includes('damage') || n.includes('stage') || n.includes('dig');
  });
  if (matches.length > 0) {
    console.log(`Target ${t.name} matches (${matches.length}):`);
    matches.forEach(m => console.log(`  "${m.name}" -> ${m.md5ext}`));
  }
}
