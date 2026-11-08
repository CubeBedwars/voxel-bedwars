const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

const drawing = pj.targets.find(t => t.name === 'Drawing');
const costumes = drawing.costumes;

console.log('Total costumes in Drawing:', costumes.length);

// Analyze prefixes or naming patterns
const prefixes = {};
const categories = {
  item: [],
  block: [],
  gui: [],
  particle_crack: [],
  entity: [],
  other: []
};

for (const c of costumes) {
  const name = c.name;
  const parts = name.split(/[\s_]/);
  const first = parts[0];
  prefixes[first] = (prefixes[first] || 0) + 1;
}

console.log('Top 30 prefixes in costume names:');
const sortedPrefixes = Object.entries(prefixes).sort((a,b) => b[1] - a[1]);
console.table(sortedPrefixes.slice(0, 30));

// Let's print out all costumes with their names and formats to a JSON or text file so we can analyze them completely
fs.writeFileSync(
  'C:/Users/alekhyo/.gemini/antigravity/scratch/voxel-bedwars/.agents/teamwork/explorer_survey_assets_gen4/all_drawing_costumes.json',
  JSON.stringify(costumes.map(c => ({ name: c.name, md5ext: c.md5ext, format: c.dataFormat })), null, 2)
);

console.log('Exported all_drawing_costumes.json');
