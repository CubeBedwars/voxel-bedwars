const fs = require('fs');
const sounds = JSON.parse(fs.readFileSync('C:/Users/alekhyo/.gemini/antigravity/scratch/voxel-bedwars/.agents/teamwork/explorer_survey_assets_gen4/categorized_sounds.json', 'utf8'));

console.log('Combat sounds:');
console.log(sounds.combat.map(s => s.name));

console.log('Player actions sounds:');
console.log(sounds.player_actions.map(s => s.name));

console.log('UI Inventory sounds:');
console.log(sounds.ui_inventory.map(s => s.name));

console.log('Explosions sounds:');
console.log(sounds.explosions_fire.map(s => s.name));
