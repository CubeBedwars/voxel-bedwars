const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

// Check where 443 might appear:
console.log('Searching for 443 in lists or costumes...');
for (const t of pj.targets) {
  for (const [id, [name, val]] of Object.entries(t.lists || {})) {
    if (val.length === 443) {
      console.log(`Found list with 443 items: Target ${t.name}, list "${name}"`);
    }
  }
}

// Let's check unique costume names in Drawing:
const drawing = pj.targets.find(t => t.name === 'Drawing');
const names = new Set(drawing.costumes.map(c => c.name));
console.log('Unique costume names in Drawing:', names.size);

// Check if any costumes have md5s that exist in the directory:
let existingCostumeFiles = 0;
let missingCostumeFiles = 0;
for (const c of drawing.costumes) {
  const filePath = path.join(refDir, c.md5ext);
  if (fs.existsSync(filePath)) {
    existingCostumeFiles++;
  } else {
    missingCostumeFiles++;
  }
}
console.log(`Drawing costumes files check: existing=${existingCostumeFiles}, missing=${missingCostumeFiles}`);

// Let's check sounds in Sounds target:
const sounds = pj.targets.find(t => t.name === 'Sounds');
console.log('Sounds target sound count:', sounds.sounds.length);
let existingSounds = 0;
let missingSounds = 0;
for (const s of sounds.sounds) {
  const filePath = path.join(refDir, s.md5ext);
  if (fs.existsSync(filePath)) {
    existingSounds++;
  } else {
    missingSounds++;
  }
}
console.log(`Sounds target audio files check: existing=${existingSounds}, missing=${missingSounds}`);
