const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pjPath = path.join(refDir, 'project.json');

const pj = JSON.parse(fs.readFileSync(pjPath, 'utf8'));

console.log('Project metadata:');
console.log('Targets count:', pj.targets.length);

let totalCostumes = 0;
let totalSounds = 0;
const uniqueCostumeMd5 = new Set();
const uniqueSoundMd5 = new Set();

const targetSummary = [];

for (const t of pj.targets) {
  totalCostumes += t.costumes.length;
  totalSounds += t.sounds.length;
  for (const c of t.costumes) {
    uniqueCostumeMd5.add(c.md5ext);
  }
  for (const s of t.sounds) {
    uniqueSoundMd5.add(s.md5ext);
  }
  targetSummary.push({
    name: t.name,
    isStage: t.isStage,
    costumesCount: t.costumes.length,
    soundsCount: t.sounds.length
  });
}

console.log('Total costumes across all targets:', totalCostumes);
console.log('Unique costume md5ext count:', uniqueCostumeMd5.size);
console.log('Total sounds across all targets:', totalSounds);
console.log('Unique sound md5ext count:', uniqueSoundMd5.size);

console.log('\nTarget Summary:');
console.table(targetSummary);
