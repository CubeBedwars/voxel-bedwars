import { BLOCK_TYPES } from '../engine/VoxelWorld.js';

export const SHOP_CATEGORIES = [
  { id: 'recommended', name: 'Quick Buy', icon: '⭐' },
  { id: 'blocks', name: 'Blocks', icon: '🧱' },
  { id: 'combat', name: 'Combat', icon: '⚔️' },
  { id: 'utility', name: 'Utility', icon: '🛠️' },
  { id: 'upgrades', name: 'Upgrades', icon: '✨' },
];

export const SHOP_ITEMS = [
  // =========================================================================
  // --- BLOCKS ---
  // =========================================================================
  {
    id: 'wool_16',
    name: 'Team Wool (x16)',
    category: 'blocks',
    costType: 'iron',
    cost: 4,
    icon: '🧶',
    desc: 'Basic building blocks for bridging and bed defense.',
    recommended: true,
    action: (player) => player.addItem({ type: 'block', blockType: player.teamWoolType, count: 16, name: 'Wool' })
  },
  {
    id: 'wood_16',
    name: 'Oak Wood (x16)',
    category: 'blocks',
    costType: 'gold',
    cost: 4,
    icon: '🪵',
    desc: 'Sturdy wooden planks resistant to pickaxes and basic tools.',
    recommended: true,
    action: (player) => player.addItem({ type: 'block', blockType: BLOCK_TYPES.WOOD, count: 16, name: 'Wood Planks' })
  },
  {
    id: 'end_stone_12',
    name: 'End Stone (x12)',
    category: 'blocks',
    costType: 'iron',
    cost: 24,
    icon: '🪨',
    desc: 'High blast resistance, perfect layer over wooden bed defense.',
    action: (player) => player.addItem({ type: 'block', blockType: BLOCK_TYPES.END_STONE, count: 12, name: 'End Stone' })
  },
  {
    id: 'terracotta_16',
    name: 'Terracotta (x16)',
    category: 'blocks',
    costType: 'iron',
    cost: 12,
    icon: '🧱',
    desc: 'Durable hardened clay blocks for solid bed defense.',
    action: (player) => player.addItem({ type: 'block', blockType: BLOCK_TYPES.END_STONE, count: 16, name: 'Terracotta' })
  },
  {
    id: 'glass_4',
    name: 'Blast-Proof Glass (x4)',
    category: 'blocks',
    costType: 'iron',
    cost: 12,
    icon: '🪟',
    desc: 'Blast-proof transparent glass impervious to TNT and fireballs.',
    action: (player) => player.addItem({ type: 'block', blockType: BLOCK_TYPES.GLASS, count: 4, name: 'Glass' })
  },
  {
    id: 'ladder_8',
    name: 'Ladder (x8)',
    category: 'blocks',
    costType: 'iron',
    cost: 4,
    icon: '🪜',
    desc: 'Climb vertical structures and bridge upwards rapidly.',
    action: (player) => player.addItem({ type: 'block', blockType: BLOCK_TYPES.WOOD, count: 8, name: 'Ladder' })
  },
  {
    id: 'obsidian_4',
    name: 'Obsidian (x4)',
    category: 'blocks',
    costType: 'emerald',
    cost: 4,
    icon: '⬛',
    desc: 'Immune to explosions! Can only be mined with a Diamond Pickaxe.',
    action: (player) => player.addItem({ type: 'block', blockType: BLOCK_TYPES.OBSIDIAN, count: 4, name: 'Obsidian' })
  },

  // =========================================================================
  // --- COMBAT (Weapons, Armor, Ranged) ---
  // =========================================================================
  {
    id: 'stone_sword',
    name: 'Stone Sword',
    category: 'combat',
    costType: 'iron',
    cost: 10,
    icon: '🗡️',
    desc: 'Deals 5 HP damage (+1 with Team Sharpness).',
    recommended: true,
    action: (player) => player.setWeapon('stone_sword', 5)
  },
  {
    id: 'iron_sword',
    name: 'Iron Sword',
    category: 'combat',
    costType: 'gold',
    cost: 7,
    icon: '⚔️',
    desc: 'Deals 6.5 HP damage (+1 with Team Sharpness).',
    recommended: true,
    action: (player) => player.setWeapon('iron_sword', 6.5)
  },
  {
    id: 'diamond_sword',
    name: 'Diamond Sword',
    category: 'combat',
    costType: 'emerald',
    cost: 4,
    icon: '💎⚔️',
    desc: 'Deals 8.5 HP damage (+1 with Team Sharpness).',
    action: (player) => player.setWeapon('diamond_sword', 8.5)
  },
  {
    id: 'knockback_stick',
    name: 'Stick of Knockback',
    category: 'combat',
    costType: 'gold',
    cost: 5,
    icon: '🪄',
    desc: 'Launches enemies off bridges and into the void!',
    action: (player) => player.setWeapon('knockback_stick', 2, 22) // high knockback
  },
  {
    id: 'bow',
    name: 'Bow',
    category: 'combat',
    costType: 'gold',
    cost: 12,
    icon: '🏹',
    desc: 'Long-range projectile weapon for tactical bridge defense.',
    action: (player) => player.addItem({ type: 'weapon', id: 'bow', name: 'Bow', damage: 6, count: 1 })
  },
  {
    id: 'arrows_8',
    name: 'Arrows (x8)',
    category: 'combat',
    costType: 'gold',
    cost: 2,
    icon: '🎯',
    desc: 'Ammunition for bows and crossbows.',
    action: (player) => player.addItem({ type: 'projectile', id: 'arrow', name: 'Arrow', count: 8 })
  },
  {
    id: 'crossbow',
    name: 'Crossbow',
    category: 'combat',
    costType: 'gold',
    cost: 8,
    icon: '🎯⚔️',
    desc: 'High-velocity piercing projectile launcher.',
    action: (player) => player.addItem({ type: 'weapon', id: 'crossbow', name: 'Crossbow', damage: 8, count: 1 })
  },
  {
    id: 'armor_chainmail',
    name: 'Chainmail Armor',
    category: 'combat',
    costType: 'iron',
    cost: 24,
    icon: '⛓️',
    desc: 'Reduces incoming combat damage by 20%.',
    recommended: true,
    action: (player) => player.setArmor('chainmail', 0.20)
  },
  {
    id: 'armor_iron',
    name: 'Iron Armor',
    category: 'combat',
    costType: 'gold',
    cost: 12,
    icon: '🛡️',
    desc: 'Reduces incoming combat damage by 35%.',
    recommended: true,
    action: (player) => player.setArmor('iron', 0.35)
  },
  {
    id: 'armor_diamond',
    name: 'Diamond Armor',
    category: 'combat',
    costType: 'emerald',
    cost: 6,
    icon: '💎🛡️',
    desc: 'Reduces incoming combat damage by 50%.',
    action: (player) => player.setArmor('diamond', 0.50)
  },

  // =========================================================================
  // --- UTILITY (Tools, Consumables, Projectiles) ---
  // =========================================================================
  {
    id: 'shears',
    name: 'Permanent Shears',
    category: 'utility',
    costType: 'iron',
    cost: 20,
    icon: '✂️',
    desc: 'Breaks wool blocks instantly.',
    recommended: true,
    action: (player) => player.setTool('shears', 4.0)
  },
  {
    id: 'wooden_pickaxe',
    name: 'Wooden Pickaxe',
    category: 'utility',
    costType: 'iron',
    cost: 10,
    icon: '🪵⛏️',
    desc: 'Basic starter pickaxe for mining simple blocks.',
    action: (player) => player.setTool('wooden_pickaxe', 2.0)
  },
  {
    id: 'stone_pickaxe',
    name: 'Stone Pickaxe',
    category: 'utility',
    costType: 'iron',
    cost: 10,
    icon: '🪨⛏️',
    desc: 'Sturdy stone pickaxe for breaking rock and ores.',
    action: (player) => player.setTool('stone_pickaxe', 2.5)
  },
  {
    id: 'iron_pickaxe',
    name: 'Iron Pickaxe',
    category: 'utility',
    costType: 'iron',
    cost: 20,
    icon: '⛏️',
    desc: 'Efficiently breaks stone, end stone, and ores.',
    recommended: true,
    action: (player) => player.setTool('pickaxe', 3.0)
  },
  {
    id: 'diamond_pickaxe',
    name: 'Diamond Pickaxe',
    category: 'utility',
    costType: 'gold',
    cost: 6,
    icon: '💎⛏️',
    desc: 'Rapidly mines obsidian and hard fortifications.',
    action: (player) => player.setTool('diamond_pickaxe', 6.0)
  },
  {
    id: 'wooden_axe',
    name: 'Wooden Axe',
    category: 'utility',
    costType: 'iron',
    cost: 10,
    icon: '🪵🪓',
    desc: 'Basic axe to break through wooden defenses faster.',
    action: (player) => player.setTool('wooden_axe', 2.0)
  },
  {
    id: 'iron_axe',
    name: 'Iron Axe',
    category: 'utility',
    costType: 'iron',
    cost: 20,
    icon: '🪓',
    desc: 'Quickly tears through wooden fortifications.',
    action: (player) => player.setTool('iron_axe', 3.5)
  },
  {
    id: 'diamond_axe',
    name: 'Diamond Axe',
    category: 'utility',
    costType: 'gold',
    cost: 6,
    icon: '💎🪓',
    desc: 'Slices through wood defenses with extreme speed.',
    action: (player) => player.setTool('diamond_axe', 5.0)
  },
  {
    id: 'water_bucket',
    name: 'Water Bucket',
    category: 'utility',
    costType: 'emerald',
    cost: 1,
    icon: '🪣',
    desc: 'Slows down attackers and extinguishes blast impulses.',
    action: (player) => player.addItem({ type: 'consumable', id: 'water_bucket', name: 'Water Bucket', count: 1 })
  },
  {
    id: 'ender_pearl',
    name: 'Ender Pearl',
    category: 'utility',
    costType: 'emerald',
    cost: 4,
    icon: '🔮',
    desc: 'Instant teleportation pearl to clutch or infiltrate bases.',
    action: (player) => player.addItem({ type: 'projectile', id: 'ender_pearl', name: 'Ender Pearl', count: 1 })
  },
  {
    id: 'golden_apple',
    name: 'Golden Apple',
    category: 'utility',
    costType: 'gold',
    cost: 3,
    icon: '🍏',
    desc: 'Instantly grants 6 HP and +2 absorption hearts for 10 seconds.',
    recommended: true,
    action: (player) => player.addItem({ type: 'consumable', id: 'gapple', name: 'Golden Apple', count: 1 })
  },
  {
    id: 'fireball',
    name: 'Fireball',
    category: 'utility',
    costType: 'iron',
    cost: 40,
    icon: '🔥',
    desc: 'Right-click to launch an explosive fireball that shatters bridges!',
    recommended: true,
    action: (player) => player.addItem({ type: 'projectile', id: 'fireball', name: 'Fireball', count: 1 })
  },
  {
    id: 'tnt',
    name: 'TNT Explosive',
    category: 'utility',
    costType: 'gold',
    cost: 4,
    icon: '🧨',
    desc: 'Placeable block that detonates after 3 seconds, blowing up defenses.',
    action: (player) => player.addItem({ type: 'block', blockType: BLOCK_TYPES.TNT, name: 'TNT', count: 1 })
  },
];

export const TEAM_UPGRADES = [
  {
    id: 'sharpness',
    name: 'Sharpened Swords',
    cost: 4,
    icon: '⚔️✨',
    desc: 'All team swords deal +1 extra damage permanently.',
    apply: (team) => { team.upgrades.sharpness = 1; }
  },
  {
    id: 'protection_1',
    name: 'Reinforced Armor I',
    cost: 2,
    icon: '🛡️I',
    desc: 'Reduces damage taken by team members by an extra 10%.',
    apply: (team) => { team.upgrades.protection = 1; }
  },
  {
    id: 'protection_2',
    name: 'Reinforced Armor II',
    cost: 4,
    icon: '🛡️II',
    desc: 'Reduces damage taken by team members by an extra 20%.',
    apply: (team) => { team.upgrades.protection = 2; }
  },
  {
    id: 'forge_2',
    name: 'Iron Forge (Tier II)',
    cost: 2,
    icon: '🏭II',
    desc: 'Increases team forge generator spawn speed by 50%.',
    apply: (team) => { team.upgrades.forgeTier = 1.5; }
  },
  {
    id: 'forge_3',
    name: 'Golden Forge (Tier III)',
    cost: 4,
    icon: '🏭III',
    desc: 'Increases team forge generator spawn speed by 100% and adds emeralds.',
    apply: (team) => { team.upgrades.forgeTier = 2.0; }
  },
  {
    id: 'heal_pool',
    name: 'Heal Pool',
    cost: 1,
    icon: '💖',
    desc: 'Provides continuous health regeneration while on your team island.',
    apply: (team) => { team.upgrades.healPool = true; }
  },
  {
    id: 'alarm_trap',
    name: 'Alarm Trap',
    cost: 1,
    icon: '🚨',
    desc: 'Sounds a loud alarm when an enemy invades your base island.',
    apply: (team) => { team.upgrades.alarmTrap = true; }
  },
];
