const fs = require('fs');
const sounds = JSON.parse(fs.readFileSync('C:/Users/alekhyo/.gemini/antigravity/scratch/voxel-bedwars/.agents/teamwork/explorer_survey_assets_gen4/categorized_sounds.json', 'utf8'));

console.log('Block dig / step sounds (' + sounds.block_dig_step.length + '):');
const names = sounds.block_dig_step.map(s => s.name);
console.log(names);
