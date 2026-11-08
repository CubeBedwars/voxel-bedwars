const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

// Let's examine all targets and their costumes
for (const t of pj.targets) {
  console.log(`Target: ${t.name}, costumes count: ${t.costumes.length}, sounds count: ${t.sounds.length}`);
}

// Let's check if any list in Stage has length 443 or close to it
const stage = pj.targets.find(t => t.name === 'Stage');
for (const [id, [name, val]] of Object.entries(stage.lists)) {
  if (val.length >= 400 && val.length <= 500) {
    console.log(`Stage list near 443: ${name} = ${val.length}`);
  }
}
