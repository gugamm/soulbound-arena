// ══════════════════════════════════════════════════════════════
//  SOULBOUND ARENA — Shared Game Data
// ══════════════════════════════════════════════════════════════

// ── Constants ──
export const GAME = {
  WIDTH: 1280,
  HEIGHT: 720,
  TILE_SIZE: 48,
  MAX_PLAYERS: 4,
  MAX_ITEMS: 6,
  TOTAL_MAPS: 8,
  MANA_REGEN_RATE: 4,       // per second
  SOUL_BASE_REWARD: 50,
  SOUL_PER_MAP: 15,
  SOUL_BOSS_BONUS: 100,
};

export const RARITY = {
  COMMON:    { name: 'Common',    color: 0xaaaaaa, weight: 50, statSlots: 1, negChance: 0    },
  UNCOMMON:  { name: 'Uncommon',  color: 0x55ff55, weight: 30, statSlots: 2, negChance: 0    },
  RARE:      { name: 'Rare',      color: 0x5599ff, weight: 13, statSlots: 2, negChance: 0.3  },
  EPIC:      { name: 'Epic',      color: 0xcc55ff, weight: 5,  statSlots: 3, negChance: 0.4  },
  LEGENDARY: { name: 'Legendary', color: 0xffcc00, weight: 2,  statSlots: 3, negChance: 0.2  },
};

export const RARITY_ORDER = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];

// ── Character Definitions ──
export const CHARACTERS = {
  mage: {
    name: 'Mage',
    description: 'Master of elemental control. Freezes, stuns, and burns enemies.',
    color: 0x6644cc,
    accent: 0xaa88ff,
    stats: { hp: 80, mana: 150, defense: 5, agility: 6, attack: 12 },
    attackRange: 250,
    attackType: 'ranged',
    attackProjectile: 'magic_bolt',
    skills: ['frost', 'lightning', 'fire'],
    dash: { type: 'teleport', cooldown: 15, range: 250 },
    ultimate: { name: 'Black Hole', type: 'blackhole', chargeNeeded: 1200, damage: 55, duration: 5, radius: 180, pullStrength: 200, color: 0x220044 },
  },
  warrior: {
    name: 'Warrior',
    description: 'Heavy-armored tank dealing devastating melee damage.',
    color: 0xcc4422,
    accent: 0xff6644,
    stats: { hp: 150, mana: 60, defense: 15, agility: 4, attack: 18 },
    attackRange: 110,
    attackType: 'melee',
    attackProjectile: null,
    skills: ['heavy_blade', 'enrage', 'cross_cut'],
    dash: { type: 'leap', cooldown: 5, distance: 120 },
    ultimate: { name: 'Whirlwind', type: 'whirlwind', chargeNeeded: 1200, damage: 30, duration: 5, radius: 100, knockback: 120, color: 0xff4422 },
  },
  archer: {
    name: 'Archer',
    description: 'Precise long-range fighter with area denial tools.',
    color: 0x22aa44,
    accent: 0x44dd66,
    stats: { hp: 100, mana: 100, defense: 8, agility: 8, attack: 15 },
    attackRange: 350,
    attackType: 'ranged',
    attackProjectile: 'arrow',
    skills: ['arrow_shower', 'precise_shot', 'trap_bomb'],
    dash: { type: 'backflip', cooldown: 10, distance: 150 },
    ultimate: { name: 'Wolf Companion', type: 'wolf', chargeNeeded: 1200, damage: 40, hp: 150, duration: 20, attackSpeed: 1.2, color: 0x88aa44 },
  },
  rogue: {
    name: 'Rogue',
    description: 'Lightning-fast assassin with explosive tricks.',
    color: 0x444444,
    accent: 0x888888,
    stats: { hp: 90, mana: 80, defense: 6, agility: 16, attack: 11 },
    moveSpeed: 0.55,
    attackRange: 110,
    attackType: 'melee',
    attackProjectile: null,
    skills: ['quick_shivs', 'grenade_launch', 'stealth_attack'],
    dash: { type: 'dash', cooldown: 3, distance: 160, maxCharges: 2 },
    ultimate: { name: 'Poison Storm', type: 'poison_storm', chargeNeeded: 1200, duration: 15, damageBoost: 1.2, poisonDamage: 20, poisonDuration: 3, range: 220, projectileSpeed: 450, color: 0x44cc44 },
  },
};

// ── Skill Definitions ──
export const SKILLS = {
  // ─── Mage ───
  frost: {
    name: 'Frost',
    description: 'Cone of ice that freezes enemies for 2.5s',
    icon: 'skill_frost',
    type: 'cone',
    manaCost: 30,
    cooldown: 5,
    damage: 15,
    range: 180,
    coneAngle: 60,
    effect: 'freeze',
    effectDuration: 2.5,
    color: 0x88ccff,
    particleColor: 0xaaeeff,
  },
  lightning: {
    name: 'Lightning',
    description: 'Chain lightning that stuns enemies for 1.5s',
    icon: 'skill_lightning',
    type: 'chain',
    manaCost: 35,
    cooldown: 7,
    damage: 25,
    range: 250,
    chainCount: 4,
    chainRange: 120,
    effect: 'stun',
    effectDuration: 1.5,
    color: 0xffff44,
    particleColor: 0xffffaa,
  },
  fire: {
    name: 'Fire',
    description: 'Fireball that explodes into a lava pool lasting 5s',
    icon: 'skill_fire',
    type: 'projectile_lava',
    manaCost: 25,
    cooldown: 4,
    damage: 18,
    range: 300,
    speed: 420,
    explosionRadius: 70,
    lavaDuration: 5,
    lavaDamage: 10,    // damage per second to enemies in lava
    color: 0xff4400,
    particleColor: 0xff8844,
  },

  // ─── Warrior ───
  heavy_blade: {
    name: 'Heavy Blade',
    description: 'Devastating overhead strike with massive damage',
    icon: 'skill_heavy_blade',
    type: 'melee_arc',
    manaCost: 30,
    cooldown: 4.5,
    damage: 55,
    range: 130,
    arcAngle: 135,
    knockback: 180,
    color: 0xff4444,
    particleColor: 0xff8888,
  },
  enrage: {
    name: 'Enrage',
    description: '+20% damage to all attacks & skills, +25% speed, but take 10% more damage for 9s',
    icon: 'skill_enrage',
    type: 'self_buff',
    manaCost: 30,
    cooldown: 16,
    damage: 0,
    duration: 9,
    buffs: { damageMultiplier: 1.2, agility: 1.25 },
    debuffs: { defense: 0.9 },
    color: 0xff0000,
    particleColor: 0xff4444,
    auraColor: 0xff2222,
  },
  cross_cut: {
    name: 'Cross Cut',
    description: 'Two devastating fire waves that scorch the earth',
    icon: 'skill_cross_cut',
    type: 'wave_fire',
    manaCost: 55,
    cooldown: 15,
    damage: 45,
    range: 350,
    speed: 300,
    waveCount: 2,
    waveAngle: 30,
    fireDuration: 5,
    fireDamage: 20,
    color: 0xff6622,
    particleColor: 0xffaa44,
  },

  // ─── Archer ───
  arrow_shower: {
    name: 'Arrow Shower',
    description: 'Rain of arrows over a large area',
    icon: 'skill_arrow_shower',
    type: 'area',
    manaCost: 35,
    cooldown: 10,
    damage: 10,
    range: 350,
    radius: 100,
    hitCount: 16,
    hitDelay: 200,  // ms between hits (~3.2s total)
    color: 0x88ff88,
    particleColor: 0xaaffaa,
  },
  precise_shot: {
    name: 'Precise Shot',
    description: 'Pinpoint shot with 30% chance for 2x critical hit',
    icon: 'skill_precise_shot',
    type: 'projectile',
    manaCost: 20,
    cooldown: 6,
    damage: 40,
    range: 400,
    speed: 600,
    critChance: 0.3,
    critMultiplier: 2,
    piercing: true,
    color: 0xffff00,
    particleColor: 0xffff88,
  },
  trap_bomb: {
    name: 'Trap Bomb',
    description: 'Place a trap that explodes when enemies step on it',
    icon: 'skill_trap_bomb',
    type: 'trap',
    manaCost: 30,
    cooldown: 12,
    damage: 55,
    range: 250,
    triggerRadius: 40,
    explosionRadius: 80,
    lifetime: 15,
    color: 0xff8800,
    particleColor: 0xffaa44,
  },

  // ─── Rogue ───
  quick_shivs: {
    name: 'Quick Shivs',
    description: 'Throw 5 fast daggers in a spread',
    icon: 'skill_quick_shivs',
    type: 'multi_projectile',
    manaCost: 25,
    cooldown: 5,
    damage: 12,
    range: 200,
    speed: 500,
    projectileCount: 5,
    spreadAngle: 40,
    color: 0xcccccc,
    particleColor: 0xeeeeee,
  },
  grenade_launch: {
    name: 'Grenade Launch',
    description: 'Launch an explosive grenade for AoE damage',
    icon: 'skill_grenade_launch',
    type: 'projectile_aoe',
    manaCost: 30,
    cooldown: 8,
    damage: 35,
    range: 280,
    speed: 350,
    explosionRadius: 90,
    color: 0x44aa44,
    particleColor: 0x88dd88,
  },
  stealth_attack: {
    name: 'Stealth Attack',
    description: 'Go invisible for 4s. Next attack deals 6x damage',
    icon: 'skill_stealth_attack',
    type: 'self_buff',
    manaCost: 35,
    cooldown: 12,
    damage: 0,
    duration: 4,
    buffs: { nextAttackMultiplier: 6, invisible: true },
    debuffs: {},
    color: 0x222222,
    particleColor: 0x666666,
  },
};

// ── Enemy Definitions ──
export const ENEMIES = {
  skeleton: {
    name: 'Skeleton',
    color: 0xddddaa,
    stats: { hp: 40, defense: 2, agility: 4, attack: 8 },
    attackRange: 35,
    attackType: 'melee',
    attackCooldown: 1.5,
    xpValue: 10,
    soulValue: 2,
    difficulty: 1,
  },
  bat: {
    name: 'Bat',
    color: 0x664466,
    stats: { hp: 20, defense: 0, agility: 5, attack: 5 },
    attackRange: 28,
    attackType: 'melee',
    attackCooldown: 0.8,
    xpValue: 8,
    soulValue: 1,
    difficulty: 1,
  },
  slime: {
    name: 'Slime',
    color: 0x44cc44,
    stats: { hp: 60, defense: 4, agility: 2, attack: 6 },
    attackRange: 30,
    attackType: 'melee',
    attackCooldown: 2,
    xpValue: 12,
    soulValue: 2,
    difficulty: 1,
  },
  goblin_archer: {
    name: 'Goblin Archer',
    color: 0x88aa44,
    stats: { hp: 35, defense: 3, agility: 5, attack: 12 },
    attackRange: 250,
    attackType: 'ranged',
    attackCooldown: 2,
    xpValue: 15,
    soulValue: 3,
    difficulty: 2,
  },
  dark_knight: {
    name: 'Dark Knight',
    color: 0x333355,
    stats: { hp: 100, defense: 10, agility: 3, attack: 16 },
    attackRange: 38,
    attackType: 'melee',
    attackCooldown: 1.8,
    xpValue: 25,
    soulValue: 5,
    difficulty: 2,
  },
  witch: {
    name: 'Witch',
    color: 0x8844aa,
    stats: { hp: 45, defense: 2, agility: 5, attack: 10 },
    attackRange: 220,
    attackType: 'ranged',
    attackCooldown: 2.5,
    xpValue: 20,
    soulValue: 4,
    difficulty: 3,
    specialAbility: 'debuff_slow',
  },
};

// ── Boss Definition ──
export const BOSSES = {
  dragon_knight: {
    name: 'Dragon Knight',
    color: 0xcc2200,
    accent: 0xff6600,
    stats: { hp: 800, defense: 12, agility: 5, attack: 25 },
    size: 2.0,
    phases: [
      { hpThreshold: 1.0, attacks: ['charge', 'fire_breath'], spawnMinions: false },
      { hpThreshold: 0.6, attacks: ['charge', 'fire_breath', 'ground_slam'], spawnMinions: true, minionType: 'skeleton', minionCount: 3 },
      { hpThreshold: 0.3, attacks: ['charge', 'fire_breath', 'ground_slam', 'dragon_fury'], spawnMinions: true, minionType: 'dark_knight', minionCount: 2 },
    ],
    attackPatterns: {
      charge:      { damage: 30, cooldown: 6, speed: 500, range: 400, type: 'dash' },
      fire_breath: { damage: 8, cooldown: 8, range: 200, coneAngle: 70, duration: 2, tickRate: 0.3, type: 'cone_dot' },
      ground_slam: { damage: 40, cooldown: 10, radius: 150, type: 'aoe' },
      dragon_fury: { damage: 15, cooldown: 12, projectileCount: 12, speed: 300, type: 'radial' },
    },
    soulValue: 100,
  },
};

// ── Map Wave Definitions ──
export const MAP_WAVES = {
  1: [
    { enemies: { skeleton: 4 } },
    { enemies: { skeleton: 3, bat: 2 } },
  ],
  2: [
    { enemies: { skeleton: 3, bat: 3 } },
    { enemies: { slime: 3, bat: 2 } },
  ],
  3: [
    { enemies: { skeleton: 4, slime: 2 } },
    { enemies: { bat: 5, skeleton: 2 } },
    { enemies: { slime: 4 } },
  ],
  4: [
    { enemies: { goblin_archer: 3, skeleton: 2 } },
    { enemies: { dark_knight: 1, skeleton: 4 } },
  ],
  5: [
    { enemies: { goblin_archer: 2, dark_knight: 1, bat: 3 } },
    { enemies: { dark_knight: 2, goblin_archer: 2 } },
  ],
  6: [
    { enemies: { dark_knight: 2, goblin_archer: 3 } },
    { enemies: { dark_knight: 2, skeleton: 3, bat: 3 } },
    { enemies: { goblin_archer: 4, slime: 3 } },
  ],
  7: [
    { enemies: { witch: 2, dark_knight: 2, goblin_archer: 2 } },
    { enemies: { witch: 3, skeleton: 4, bat: 3 } },
    { enemies: { dark_knight: 3, witch: 2 } },
  ],
  8: [
    { enemies: { witch: 3, dark_knight: 3, goblin_archer: 3 } },
    { enemies: { witch: 2, dark_knight: 2, goblin_archer: 2, slime: 2, bat: 2 } },
    { enemies: { dark_knight: 4, witch: 3 } },
    { enemies: { witch: 4, dark_knight: 2, goblin_archer: 3 } },
  ],
};

// ── Item Pool ──
export const ITEM_TEMPLATES = [
  // ─── Mage Items ───
  { id: 'frost_ring', name: 'Frost Ring', forClass: 'mage', slot: 'accessory',
    description: 'Increases freeze duration',
    statBoosts: { skillBoost: { frost: { effectDuration: 0.8 } } } },
  { id: 'ember_staff', name: 'Ember Staff', forClass: 'mage', slot: 'weapon',
    description: 'Fire burns hotter',
    statBoosts: { skillBoost: { fire: { effectDamage: 4 } } } },
  { id: 'storm_pendant', name: 'Storm Pendant', forClass: 'mage', slot: 'accessory',
    description: 'Lightning chains to more targets',
    statBoosts: { skillBoost: { lightning: { chainCount: 2 } } } },
  { id: 'arcane_focus', name: 'Arcane Focus', forClass: 'mage', slot: 'accessory',
    description: 'All spell damage increased',
    statBoosts: { attack: 5, mana: 20 } },
  { id: 'glass_cannon', name: 'Glass Cannon', forClass: 'mage', slot: 'accessory',
    description: 'Massive damage, fragile body',
    statBoosts: { attack: 12 }, negatives: { hp: -15, defense: -2 } },

  // ─── Warrior Items ───
  { id: 'heavy_gauntlets', name: 'Heavy Gauntlets', forClass: 'warrior', slot: 'armor',
    description: 'Heavy Blade hits harder',
    statBoosts: { skillBoost: { heavy_blade: { damage: 15 } } } },
  { id: 'berserker_helm', name: "Berserker's Helm", forClass: 'warrior', slot: 'armor',
    description: 'Enrage lasts longer',
    statBoosts: { skillBoost: { enrage: { duration: 2 } } } },
  { id: 'wind_cleaver', name: 'Wind Cleaver', forClass: 'warrior', slot: 'weapon',
    description: 'Cross Cut waves travel further',
    statBoosts: { skillBoost: { cross_cut: { range: 80, speed: 50 } } } },
  { id: 'iron_shield', name: 'Iron Shield', forClass: 'warrior', slot: 'armor',
    description: 'Greatly increases defense',
    statBoosts: { defense: 8, hp: 20 } },
  { id: 'blood_blade', name: 'Blood Blade', forClass: 'warrior', slot: 'weapon',
    description: 'More attack, less defense',
    statBoosts: { attack: 10 }, negatives: { defense: -5 } },

  // ─── Archer Items ───
  { id: 'quiver_of_storms', name: 'Quiver of Storms', forClass: 'archer', slot: 'accessory',
    description: 'Arrow Shower covers a larger area',
    statBoosts: { skillBoost: { arrow_shower: { radius: 30, hitCount: 3 } } } },
  { id: 'hawk_eye', name: 'Hawk Eye', forClass: 'archer', slot: 'accessory',
    description: 'Precise Shot crits more often',
    statBoosts: { skillBoost: { precise_shot: { critChance: 0.15 } } } },
  { id: 'explosive_traps', name: 'Explosive Traps', forClass: 'archer', slot: 'accessory',
    description: 'Trap Bomb has bigger explosion',
    statBoosts: { skillBoost: { trap_bomb: { explosionRadius: 30, damage: 10 } } } },
  { id: 'swift_boots', name: 'Swift Boots', forClass: 'archer', slot: 'armor',
    description: 'Move and attack faster',
    statBoosts: { agility: 3 } },
  { id: 'glass_arrows', name: 'Glass Arrows', forClass: 'archer', slot: 'weapon',
    description: 'Piercing damage, but fragile',
    statBoosts: { attack: 8 }, negatives: { hp: -10 } },

  // ─── Rogue Items ───
  { id: 'shadow_daggers', name: 'Shadow Daggers', forClass: 'rogue', slot: 'weapon',
    description: 'Quick Shivs throw more daggers',
    statBoosts: { skillBoost: { quick_shivs: { projectileCount: 2, damage: 3 } } } },
  { id: 'frag_grenades', name: 'Frag Grenades', forClass: 'rogue', slot: 'accessory',
    description: 'Grenades deal more damage in a wider area',
    statBoosts: { skillBoost: { grenade_launch: { damage: 10, explosionRadius: 20 } } } },
  { id: 'cloak_of_shadows', name: 'Cloak of Shadows', forClass: 'rogue', slot: 'armor',
    description: 'Stealth lasts longer',
    statBoosts: { skillBoost: { stealth_attack: { duration: 1.5 } } } },
  { id: 'assassin_mark', name: "Assassin's Mark", forClass: 'rogue', slot: 'accessory',
    description: 'All attacks hit harder',
    statBoosts: { attack: 6, agility: 2 } },
  { id: 'risk_reward', name: 'Risk & Reward', forClass: 'rogue', slot: 'weapon',
    description: 'Big damage boost, lower health',
    statBoosts: { attack: 10, agility: 3 }, negatives: { hp: -20, defense: -3 } },

  // ─── Universal Items ───
  { id: 'health_crystal', name: 'Health Crystal', forClass: null, slot: 'accessory',
    description: 'Increases maximum HP',
    statBoosts: { hp: 30 } },
  { id: 'mana_crystal', name: 'Mana Crystal', forClass: null, slot: 'accessory',
    description: 'Increases maximum mana',
    statBoosts: { mana: 30 } },
  { id: 'defense_charm', name: 'Defense Charm', forClass: null, slot: 'accessory',
    description: 'Reduces incoming damage',
    statBoosts: { defense: 5 } },
  { id: 'speed_boots', name: 'Speed Boots', forClass: null, slot: 'armor',
    description: 'Increases movement and attack speed',
    statBoosts: { agility: 2 } },
  { id: 'balanced_orb', name: 'Balanced Orb', forClass: null, slot: 'accessory',
    description: 'Small boost to all stats',
    statBoosts: { hp: 10, mana: 10, defense: 2, agility: 1, attack: 3 } },
];

// ── Soul Upgrades ──
export const SOUL_UPGRADES = {
  max_hp:       { name: 'Vitality',     description: '+10 Max HP per level',   maxLevel: 10, costBase: 30,  costScale: 15, stat: 'hp',      perLevel: 10 },
  max_mana:     { name: 'Wisdom',       description: '+10 Max Mana per level', maxLevel: 10, costBase: 25,  costScale: 12, stat: 'mana',    perLevel: 10 },
  defense:      { name: 'Fortitude',    description: '+2 Defense per level',   maxLevel: 10, costBase: 35,  costScale: 18, stat: 'defense', perLevel: 2  },
  agility:      { name: 'Swiftness',    description: '+1 Agility per level',   maxLevel: 10, costBase: 40,  costScale: 20, stat: 'agility', perLevel: 1  },
  attack:       { name: 'Might',        description: '+3 Attack per level',    maxLevel: 10, costBase: 35,  costScale: 18, stat: 'attack',  perLevel: 3  },
  drop_luck:    { name: 'Fortune',      description: '+5% better drop chance', maxLevel: 10, costBase: 50,  costScale: 30, stat: 'luck',    perLevel: 5  },
};

// ── Utility Functions ──
export function rollRarity(luckBonus = 0) {
  const total = RARITY_ORDER.reduce((sum, r) => sum + RARITY[r].weight, 0);
  let roll = Math.random() * total - luckBonus;
  for (let i = RARITY_ORDER.length - 1; i >= 0; i--) {
    roll -= RARITY[RARITY_ORDER[i]].weight;
    if (roll <= 0) return RARITY_ORDER[i];
  }
  return 'COMMON';
}

export function generateItem(characterClass, luckBonus = 0) {
  const rarity = rollRarity(luckBonus);
  const rarityDef = RARITY[rarity];

  // Filter items for this class (class-specific + universal)
  const pool = ITEM_TEMPLATES.filter(t => t.forClass === null || t.forClass === characterClass);
  const template = pool[Math.floor(Math.random() * pool.length)];

  // Scale stats by rarity
  const rarityMultiplier = RARITY_ORDER.indexOf(rarity) * 0.25 + 1;
  const scaledBoosts = scaleStats(template.statBoosts, rarityMultiplier);
  const scaledNegatives = template.negatives ? scaleStats(template.negatives, rarityMultiplier) : null;

  return {
    ...template,
    rarity,
    rarityDef,
    statBoosts: scaledBoosts,
    negatives: scaledNegatives,
    id: `${template.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    templateId: template.id,
  };
}

function scaleStats(stats, multiplier) {
  const scaled = {};
  for (const [key, value] of Object.entries(stats)) {
    if (key === 'skillBoost') {
      scaled.skillBoost = {};
      for (const [skill, boosts] of Object.entries(value)) {
        scaled.skillBoost[skill] = {};
        for (const [stat, val] of Object.entries(boosts)) {
          scaled.skillBoost[skill][stat] = typeof val === 'number' ? Math.round(val * multiplier * 10) / 10 : val;
        }
      }
    } else {
      scaled[key] = typeof value === 'number' ? Math.round(value * multiplier) : value;
    }
  }
  return scaled;
}

export function generateRewardChoices(characterClass, luckBonus = 0) {
  return {
    item: generateItem(characterClass, luckBonus),
    heal: { type: 'heal', amount: 0.4 }, // 40% max HP
    boost: generateStatBoost(),
  };
}

function generateStatBoost() {
  const stats = ['hp', 'mana', 'defense', 'agility', 'attack'];
  const stat = stats[Math.floor(Math.random() * stats.length)];
  const amounts = { hp: 15, mana: 12, defense: 3, agility: 1, attack: 4 };
  return { type: 'boost', stat, amount: amounts[stat] };
}

export function calculateDamage(attackerAtk, defenderDef, skillDamage = 0) {
  const baseDamage = attackerAtk + skillDamage;
  const reduction = defenderDef / (defenderDef + 20); // diminishing returns
  const damage = Math.max(1, Math.round(baseDamage * (1 - reduction)));
  return damage;
}
