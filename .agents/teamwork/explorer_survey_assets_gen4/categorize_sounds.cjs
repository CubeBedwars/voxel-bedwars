const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

const soundsTarget = pj.targets.find(t => t.name === 'Sounds');
const sounds = soundsTarget.sounds;

console.log('Total sounds in Sounds target:', sounds.length);

// Group by category based on name keywords
const categorized = {
  block_dig_step: [],
  combat: [],
  damage_hurt: [],
  player_actions: [], // eat, drink, swim, splash, fall
  ambient_environment: [],
  entities: [], // mobs: zombie, skeleton, creeper, slime, enderman, blaze, etc.
  ui_inventory: [],
  explosions_fire: [],
  other: []
};

for (const s of sounds) {
  const name = s.name.toLowerCase();
  
  if (name.includes('step') || name.includes('dig') || name.includes('cloth') || name.includes('grass') || name.includes('gravel') || name.includes('sand') || name.includes('snow') || name.includes('stone') || name.includes('wood') || name.includes('glass') || name.includes('ladder')) {
    categorized.block_dig_step.push(s);
  } else if (name.includes('hit') || name.includes('bow') || name.includes('arrow') || name.includes('attack') || name.includes('damage') || name.includes('hurt')) {
    if (name.startsWith('blaze') || name.startsWith('creeper') || name.startsWith('zombie') || name.startsWith('skeleton') || name.startsWith('slime') || name.startsWith('enderman') || name.startsWith('spider') || name.startsWith('cow') || name.startsWith('pig') || name.startsWith('sheep') || name.startsWith('chicken') || name.startsWith('wolf') || name.startsWith('ghast') || name.startsWith('silverfish') || name.startsWith('magma')) {
      categorized.entities.push(s);
    } else {
      categorized.combat.push(s);
    }
  } else if (name.includes('die') || name.includes('idle') || name.startsWith('blaze') || name.startsWith('creeper') || name.startsWith('zombie') || name.startsWith('skeleton') || name.startsWith('slime') || name.startsWith('enderman') || name.startsWith('spider') || name.startsWith('cow') || name.startsWith('pig') || name.startsWith('sheep') || name.startsWith('chicken') || name.startsWith('wolf') || name.startsWith('ghast') || name.startsWith('silverfish') || name.startsWith('magma') || name.startsWith('bat') || name.startsWith('cat') || name.startsWith('horse') || name.startsWith('squid') || name.startsWith('villager') || name.startsWith('irongolem')) {
    categorized.entities.push(s);
  } else if (name.includes('eat') || name.includes('drink') || name.includes('burp') || name.includes('fall') || name.includes('splash') || name.includes('swim') || name.includes('breath') || name.includes('pop')) {
    categorized.player_actions.push(s);
  } else if (name.includes('ambient') || name.includes('rain') || name.includes('thunder') || name.includes('water') || name.includes('lava') || name.includes('fire') || name.includes('portal')) {
    categorized.ambient_environment.push(s);
  } else if (name.includes('click') || name.includes('button') || name.includes('anvil') || name.includes('chest') || name.includes('door') || name.includes('piston') || name.includes('fuse') || name.includes('explode') || name.includes('explosion')) {
    if (name.includes('explode') || name.includes('explosion') || name.includes('fuse')) {
      categorized.explosions_fire.push(s);
    } else {
      categorized.ui_inventory.push(s);
    }
  } else {
    categorized.other.push(s);
  }
}

for (const [cat, list] of Object.entries(categorized)) {
  console.log(`Category "${cat}": count=${list.length}`);
}

if (categorized.other.length > 0) {
  console.log('Other sounds:', categorized.other.map(s => s.name));
}

// Export categorized sounds
fs.writeFileSync(
  'C:/Users/alekhyo/.gemini/antigravity/scratch/voxel-bedwars/.agents/teamwork/explorer_survey_assets_gen4/categorized_sounds.json',
  JSON.stringify(categorized, null, 2)
);
