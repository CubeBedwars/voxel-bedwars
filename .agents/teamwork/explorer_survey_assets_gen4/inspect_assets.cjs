const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

console.log('--- TARGET SOUNDS (251 sounds) ---');
const soundsTarget = pj.targets.find(t => t.name === 'Sounds');
console.log('Target "Sounds" sound count:', soundsTarget.sounds.length);
console.log('Sample sounds (first 20):');
soundsTarget.sounds.slice(0, 20).forEach((s, idx) => {
  console.log(`  [${idx}] name="${s.name}", md5ext="${s.md5ext}", format="${s.dataFormat}", rate=${s.rate}`);
});

console.log('\n--- TARGET MUSIC (135 sounds) ---');
const musicTarget = pj.targets.find(t => t.name === 'Music');
console.log('Target "Music" sound count:', musicTarget.sounds.length);
musicTarget.sounds.slice(0, 10).forEach((s, idx) => {
  console.log(`  [${idx}] name="${s.name}", md5ext="${s.md5ext}", format="${s.dataFormat}", rate=${s.rate}`);
});

console.log('\n--- TARGET DRAWING COSTUMES ---');
const drawingTarget = pj.targets.find(t => t.name === 'Drawing');
console.log('Target "Drawing" costumes count:', drawingTarget.costumes.length);
console.log('Sample drawing costumes (first 30):');
drawingTarget.costumes.slice(0, 30).forEach((c, idx) => {
  console.log(`  [${idx}] name="${c.name}", md5ext="${c.md5ext}", format="${c.dataFormat}"`);
});

// Let's also check if any costume names repeat or what the names look like
const drawingNames = drawingTarget.costumes.map(c => c.name);
console.log('Total costumes in Drawing:', drawingNames.length);

// Let's search for "wool", "sword", "heart", "crack", "stone", "break" in Drawing costumes:
const keywords = ['wool', 'sword', 'pickaxe', 'axe', 'shovel', 'hoe', 'heart', 'armor', 'crack', 'stage', 'bed', 'gui', 'crosshair', 'food', 'apple'];
for (const kw of keywords) {
  const matches = drawingTarget.costumes.filter(c => c.name.toLowerCase().includes(kw));
  console.log(`Costumes matching '${kw}': count=${matches.length}, samples:`, matches.slice(0, 5).map(m => m.name));
}
