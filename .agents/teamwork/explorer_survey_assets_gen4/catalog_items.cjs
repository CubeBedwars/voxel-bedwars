const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

const drawing = pj.targets.find(t => t.name === 'Drawing');

const items = drawing.costumes.filter(c => c.name.startsWith('item_'));
console.log('Total item_* costumes:', items.length);

// Subclassify items
const subcategories = {
  weapons: [],
  tools: [],
  armor: [],
  food_potions: [],
  blocks_items: [],
  utility: [],
  materials: []
};

for (const it of items) {
  const n = it.name.toLowerCase();
  if (n.includes('sword') || n.includes('bow') || n.includes('arrow')) {
    subcategories.weapons.push(it);
  } else if (n.includes('pickaxe') || n.includes('axe') || n.includes('shovel') || n.includes('hoe') || n.includes('shears')) {
    subcategories.tools.push(it);
  } else if (n.includes('helmet') || n.includes('chestplate') || n.includes('leggings') || n.includes('boots')) {
    subcategories.armor.push(it);
  } else if (n.includes('apple') || n.includes('bread') || n.includes('beef') || n.includes('porkchop') || n.includes('chicken') || n.includes('fish') || n.includes('carrot') || n.includes('potato') || n.includes('cookie') || n.includes('melon') || n.includes('stew') || n.includes('bottle') || n.includes('potion')) {
    subcategories.food_potions.push(it);
  } else if (n.includes('wool') || n.includes('planks') || n.includes('stone') || n.includes('brick') || n.includes('obsidian') || n.includes('glass') || n.includes('dirt') || n.includes('sand') || n.includes('wood') || n.includes('log') || n.includes('ore') || n.includes('block') || n.includes('tnt') || n.includes('bed')) {
    subcategories.blocks_items.push(it);
  } else if (n.includes('pearl') || n.includes('bucket') || n.includes('fire') || n.includes('charge') || n.includes('compass') || n.includes('clock') || n.includes('rod') || n.includes('flint')) {
    subcategories.utility.push(it);
  } else {
    subcategories.materials.push(it);
  }
}

for (const [sub, list] of Object.entries(subcategories)) {
  console.log(`Subcategory "${sub}": count=${list.length}`);
}

console.log('\nWeapons:', subcategories.weapons.map(i => i.name));
console.log('\nTools:', subcategories.tools.map(i => i.name));
console.log('\nArmor:', subcategories.armor.map(i => i.name));
console.log('\nUtility (sample):', subcategories.utility.map(i => i.name));
