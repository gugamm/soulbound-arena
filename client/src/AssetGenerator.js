// AssetGenerator.js - Procedural sprite generation for Soulbound Arena
// Generates all game textures using Phaser's Graphics API (no external assets needed)

export default function generateAssets(scene) {
  // ── Helpers ──────────────────────────────────────────────────────────
  function hex(color) {
    return color;
  }

  function lighter(color, amount = 0.3) {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    return (
      (Math.min(255, Math.floor(r + (255 - r) * amount)) << 16) |
      (Math.min(255, Math.floor(g + (255 - g) * amount)) << 8) |
      Math.min(255, Math.floor(b + (255 - b) * amount))
    );
  }

  function darker(color, amount = 0.3) {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    return (
      (Math.floor(r * (1 - amount)) << 16) |
      (Math.floor(g * (1 - amount)) << 8) |
      Math.floor(b * (1 - amount))
    );
  }

  function makeTexture(key, w, h, drawFn) {
    const g = scene.add.graphics();
    drawFn(g, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  // Pixel-art rectangle helper
  function px(g, x, y, w, h, color, alpha) {
    if (alpha !== undefined) g.fillStyle(color, alpha);
    else g.fillStyle(color);
    g.fillRect(x, y, w, h);
  }

  // ════════════════════════════════════════════════════════════════════
  // CHARACTERS (32x32)
  // ════════════════════════════════════════════════════════════════════

  // ── Mage ─────────────────────────────────────────────────────────
  makeTexture('char_mage', 32, 32, (g) => {
    const main = 0x6644cc;
    const light = lighter(main);
    const dark = darker(main);
    const skin = 0xffcc99;

    // Pointed hat
    px(g, 15, 0, 2, 2, dark);
    px(g, 14, 2, 4, 2, main);
    px(g, 13, 4, 6, 2, main);
    px(g, 12, 6, 8, 2, light);
    // Hat brim
    px(g, 10, 8, 12, 2, dark);

    // Face
    px(g, 13, 10, 6, 5, skin);
    // Eyes
    px(g, 14, 11, 2, 2, 0x222244);
    px(g, 17, 11, 2, 2, 0x222244);
    // Eye highlights
    px(g, 14, 11, 1, 1, 0xffffff);
    px(g, 17, 11, 1, 1, 0xffffff);

    // Robe body
    px(g, 11, 15, 10, 8, main);
    px(g, 12, 15, 8, 2, light);
    // Belt
    px(g, 12, 21, 8, 1, 0xccaa44);
    // Robe bottom / skirt
    px(g, 10, 23, 12, 5, main);
    px(g, 9, 26, 14, 2, dark);

    // Arms / sleeves
    px(g, 8, 16, 3, 6, main);
    px(g, 21, 16, 3, 6, main);
    // Hands
    px(g, 8, 22, 3, 2, skin);
    px(g, 21, 22, 3, 2, skin);

    // Staff in right hand
    px(g, 23, 8, 2, 16, 0x8B4513);
    // Staff orb
    px(g, 22, 5, 4, 4, 0x88aaff);
    px(g, 23, 6, 2, 2, 0xccddff);

    // Feet
    px(g, 12, 28, 3, 2, dark);
    px(g, 18, 28, 3, 2, dark);
  });

  // ── Warrior ──────────────────────────────────────────────────────
  makeTexture('char_warrior', 32, 32, (g) => {
    const main = 0xcc4422;
    const light = lighter(main);
    const dark = darker(main);
    const armor = 0x888899;
    const armorLight = 0xaaaabb;
    const skin = 0xeebb88;

    // Helmet
    px(g, 12, 2, 8, 3, armor);
    px(g, 13, 1, 6, 2, armorLight);
    px(g, 15, 0, 2, 2, 0xcc4422); // Helmet crest
    // Visor
    px(g, 13, 5, 6, 2, 0x333344);

    // Face
    px(g, 13, 7, 6, 5, skin);
    // Eyes
    px(g, 14, 8, 2, 2, 0x443322);
    px(g, 17, 8, 2, 2, 0x443322);

    // Broad shoulders / pauldrons
    px(g, 7, 12, 5, 4, armor);
    px(g, 20, 12, 5, 4, armor);
    px(g, 8, 12, 3, 2, armorLight);
    px(g, 21, 12, 3, 2, armorLight);

    // Chest armor
    px(g, 12, 12, 8, 9, armor);
    px(g, 13, 13, 6, 3, armorLight);
    // Emblem on chest
    px(g, 15, 14, 2, 2, main);

    // Belt
    px(g, 11, 21, 10, 2, 0x664422);
    px(g, 15, 21, 2, 2, 0xccaa44); // Belt buckle

    // Arms
    px(g, 7, 16, 5, 6, main);
    px(g, 20, 16, 5, 6, main);

    // Sword in right hand
    px(g, 5, 10, 2, 2, 0xccaa44); // Pommel
    px(g, 5, 7, 2, 4, 0x664422); // Grip
    px(g, 4, 12, 4, 2, 0xccaa44); // Cross guard
    px(g, 5, 2, 2, 10, 0xccccdd); // Blade
    px(g, 5, 2, 1, 10, 0xeeeeff); // Blade highlight

    // Legs
    px(g, 12, 23, 4, 5, dark);
    px(g, 17, 23, 4, 5, dark);
    // Boots
    px(g, 11, 27, 5, 3, 0x553311);
    px(g, 17, 27, 5, 3, 0x553311);
  });

  // ── Archer ───────────────────────────────────────────────────────
  makeTexture('char_archer', 32, 32, (g) => {
    const main = 0x22aa44;
    const light = lighter(main);
    const dark = darker(main);
    const skin = 0xffddaa;

    // Hood
    px(g, 12, 1, 8, 4, dark);
    px(g, 11, 3, 10, 3, main);
    px(g, 13, 1, 6, 2, main);
    px(g, 15, 0, 2, 2, dark);

    // Face (visible under hood)
    px(g, 13, 6, 6, 5, skin);
    // Eyes
    px(g, 14, 7, 2, 2, 0x224422);
    px(g, 17, 7, 2, 2, 0x224422);
    px(g, 14, 7, 1, 1, 0xffffff);
    px(g, 17, 7, 1, 1, 0xffffff);

    // Slim torso / tunic
    px(g, 12, 11, 8, 8, main);
    px(g, 13, 11, 6, 3, light);
    // Belt with quiver strap
    px(g, 12, 18, 8, 2, 0x664422);
    px(g, 19, 11, 2, 8, 0x664422); // Strap diagonal

    // Arms
    px(g, 9, 12, 3, 6, main);
    px(g, 20, 12, 3, 6, main);
    // Hands
    px(g, 9, 18, 3, 2, skin);
    px(g, 20, 18, 3, 2, skin);

    // Bow in left hand
    px(g, 6, 8, 2, 16, 0x8B4513); // Bow stave
    px(g, 5, 8, 1, 1, 0x8B4513);
    px(g, 5, 23, 1, 1, 0x8B4513);
    // Bowstring
    px(g, 8, 9, 1, 14, 0xcccccc);

    // Quiver on back
    px(g, 22, 8, 3, 10, 0x664422);
    px(g, 22, 6, 1, 3, 0xccaa66); // Arrow tips
    px(g, 23, 7, 1, 2, 0xccaa66);
    px(g, 24, 6, 1, 3, 0xccaa66);

    // Legs (slim)
    px(g, 13, 20, 3, 7, dark);
    px(g, 17, 20, 3, 7, dark);
    // Boots
    px(g, 12, 27, 4, 3, 0x553311);
    px(g, 17, 27, 4, 3, 0x553311);
  });

  // ── Rogue ────────────────────────────────────────────────────────
  makeTexture('char_rogue', 32, 32, (g) => {
    const main = 0x555566;
    const light = 0x777788;
    const dark = 0x333344;
    const skin = 0xddbb88;
    const accent = 0xcc3333;
    const leather = 0x664422;

    // Hood / cowl
    px(g, 12, 1, 8, 5, dark);
    px(g, 11, 3, 10, 4, main);
    px(g, 14, 0, 4, 2, dark);
    px(g, 13, 1, 6, 2, 0x444455); // hood top highlight

    // Face (partially shadowed)
    px(g, 13, 6, 6, 4, skin);
    px(g, 13, 6, 6, 2, 0xccaa77); // Shadow on upper face
    // Eyes (glowing red)
    px(g, 14, 7, 2, 1, accent);
    px(g, 17, 7, 2, 1, accent);
    px(g, 14, 7, 1, 1, 0xff4444); // bright pupil left
    px(g, 17, 7, 1, 1, 0xff4444); // bright pupil right
    // Mask / scarf
    px(g, 13, 9, 6, 2, 0x444455);

    // Slim body / vest
    px(g, 11, 11, 10, 9, main);
    px(g, 12, 11, 8, 3, light);
    // Leather harness with buckle
    px(g, 12, 14, 8, 1, leather);
    px(g, 15, 13, 2, 3, leather); // vertical strap
    px(g, 15, 14, 2, 1, 0xbbaa44); // gold buckle
    px(g, 12, 17, 8, 1, leather);

    // Arms
    px(g, 8, 12, 3, 7, main);
    px(g, 21, 12, 3, 7, main);
    px(g, 8, 12, 3, 1, light); // shoulder highlight
    px(g, 21, 12, 3, 1, light);
    // Daggers in hands (bigger, brighter)
    px(g, 6, 9, 2, 6, 0xccccee); // Left dagger blade
    px(g, 6, 9, 2, 1, 0xffffff); // tip shine
    px(g, 7, 15, 2, 2, leather);  // Left hilt
    px(g, 24, 9, 2, 6, 0xccccee); // Right dagger blade
    px(g, 24, 9, 2, 1, 0xffffff); // tip shine
    px(g, 23, 15, 2, 2, leather);  // Right hilt

    // Cloak flowing
    px(g, 10, 20, 12, 5, main);
    px(g, 9, 22, 14, 3, dark);
    // Cloak tattered edge
    px(g, 9, 25, 2, 2, main);
    px(g, 13, 26, 2, 1, main);
    px(g, 18, 25, 2, 2, main);
    px(g, 22, 26, 2, 1, main);

    // Legs
    px(g, 13, 26, 3, 3, dark);
    px(g, 17, 26, 3, 3, dark);
    // Boots (brown leather)
    px(g, 13, 28, 3, 3, 0x553322);
    px(g, 17, 28, 3, 3, 0x553322);
    px(g, 13, 28, 3, 1, 0x664433); // boot top highlight
    px(g, 17, 28, 3, 1, 0x664433);
  });

  // ════════════════════════════════════════════════════════════════════
  // ENEMIES (28x28)
  // ════════════════════════════════════════════════════════════════════

  // ── Skeleton ─────────────────────────────────────────────────────
  makeTexture('enemy_skeleton', 28, 28, (g) => {
    const bone = 0xddddaa;
    const boneLight = 0xeeeebb;
    const boneDark = 0xbbbb88;

    // Skull
    px(g, 10, 1, 8, 7, bone);
    px(g, 11, 0, 6, 2, boneLight);
    // Eye sockets
    px(g, 11, 3, 3, 3, 0x221100);
    px(g, 16, 3, 3, 3, 0x221100);
    // Eye glow
    px(g, 12, 4, 1, 1, 0xff4444);
    px(g, 17, 4, 1, 1, 0xff4444);
    // Jaw
    px(g, 11, 6, 6, 2, boneDark);
    // Teeth
    px(g, 12, 6, 1, 1, boneLight);
    px(g, 14, 6, 1, 1, boneLight);
    px(g, 16, 6, 1, 1, boneLight);

    // Spine
    px(g, 13, 8, 2, 8, bone);

    // Ribcage
    px(g, 10, 9, 8, 1, bone);
    px(g, 10, 11, 8, 1, bone);
    px(g, 10, 13, 8, 1, bone);
    px(g, 10, 9, 1, 5, boneDark);
    px(g, 17, 9, 1, 5, boneDark);

    // Arms (bony)
    px(g, 7, 9, 3, 2, bone);
    px(g, 6, 11, 2, 5, boneDark);
    px(g, 18, 9, 3, 2, bone);
    px(g, 20, 11, 2, 5, boneDark);

    // Pelvis
    px(g, 11, 16, 6, 2, boneDark);

    // Legs
    px(g, 11, 18, 2, 7, bone);
    px(g, 15, 18, 2, 7, bone);
    // Feet
    px(g, 10, 25, 4, 2, boneDark);
    px(g, 14, 25, 4, 2, boneDark);

    // Sword
    px(g, 4, 5, 2, 10, 0xaaaacc);
    px(g, 4, 14, 2, 2, 0x886633);
  });

  // ── Bat ──────────────────────────────────────────────────────────
  makeTexture('enemy_bat', 28, 28, (g) => {
    const main = 0x664466;
    const wing = 0x553355;
    const wingLight = 0x775577;

    // Body (small oval)
    px(g, 12, 10, 4, 6, main);
    px(g, 11, 11, 6, 4, main);

    // Head
    px(g, 12, 8, 4, 3, main);
    // Ears
    px(g, 11, 6, 2, 3, main);
    px(g, 15, 6, 2, 3, main);
    px(g, 11, 6, 1, 1, wingLight);
    px(g, 16, 6, 1, 1, wingLight);

    // Eyes (red, glowing)
    px(g, 12, 9, 2, 1, 0xff2222);
    px(g, 15, 9, 2, 1, 0xff2222);

    // Fangs
    px(g, 13, 11, 1, 1, 0xffffff);
    px(g, 15, 11, 1, 1, 0xffffff);

    // Left wing
    px(g, 2, 8, 10, 2, wing);
    px(g, 0, 9, 12, 3, wing);
    px(g, 1, 12, 10, 2, wingLight);
    px(g, 3, 14, 7, 1, wing);
    // Wing membrane lines
    px(g, 3, 9, 1, 4, wingLight);
    px(g, 6, 9, 1, 4, wingLight);
    px(g, 9, 9, 1, 3, wingLight);

    // Right wing
    px(g, 16, 8, 10, 2, wing);
    px(g, 16, 9, 12, 3, wing);
    px(g, 17, 12, 10, 2, wingLight);
    px(g, 18, 14, 7, 1, wing);
    // Wing membrane lines
    px(g, 19, 9, 1, 4, wingLight);
    px(g, 22, 9, 1, 4, wingLight);
    px(g, 25, 9, 1, 3, wingLight);

    // Feet
    px(g, 12, 16, 1, 2, 0x443344);
    px(g, 15, 16, 1, 2, 0x443344);
  });

  // ── Slime ────────────────────────────────────────────────────────
  makeTexture('enemy_slime', 28, 28, (g) => {
    const main = 0x44cc44;
    const light = 0x66ee66;
    const dark = 0x228822;

    // Blob body
    px(g, 6, 14, 16, 8, main);
    px(g, 4, 16, 20, 6, main);
    px(g, 8, 12, 12, 4, main);
    px(g, 10, 10, 8, 4, light);

    // Shiny highlight
    px(g, 11, 11, 3, 2, 0x99ff99);
    px(g, 12, 10, 2, 1, 0xccffcc);

    // Eyes
    px(g, 9, 15, 4, 4, 0xffffff);
    px(g, 16, 15, 4, 4, 0xffffff);
    px(g, 10, 16, 2, 2, 0x112211);
    px(g, 17, 16, 2, 2, 0x112211);

    // Mouth (happy slime)
    px(g, 12, 20, 4, 1, 0x116611);

    // Bottom drips
    px(g, 5, 22, 18, 2, dark);
    px(g, 7, 24, 3, 2, dark);
    px(g, 14, 24, 2, 3, dark);
    px(g, 19, 24, 3, 2, dark);

    // Surface goo puddle
    px(g, 3, 24, 22, 2, dark, 0.4);
  });

  // ── Goblin Archer ────────────────────────────────────────────────
  makeTexture('enemy_goblin_archer', 28, 28, (g) => {
    const main = 0x88aa44;
    const skin = 0x669933;
    const dark = 0x557722;

    // Big ears
    px(g, 6, 3, 3, 4, skin);
    px(g, 19, 3, 3, 4, skin);
    px(g, 7, 4, 1, 2, lighter(skin));
    px(g, 20, 4, 1, 2, lighter(skin));

    // Head
    px(g, 10, 1, 8, 7, skin);
    // Eyes (big, yellow)
    px(g, 11, 3, 3, 3, 0xffff44);
    px(g, 16, 3, 3, 3, 0xffff44);
    px(g, 12, 4, 1, 1, 0x222200);
    px(g, 17, 4, 1, 1, 0x222200);
    // Pointy nose
    px(g, 14, 5, 1, 2, darker(skin));
    // Mouth
    px(g, 12, 7, 4, 1, 0x445522);

    // Body (small)
    px(g, 10, 8, 8, 7, main);
    px(g, 11, 9, 6, 2, lighter(main));
    // Belt
    px(g, 10, 14, 8, 1, 0x553322);

    // Arms
    px(g, 7, 9, 3, 5, skin);
    px(g, 18, 9, 3, 5, skin);

    // Bow
    px(g, 4, 5, 2, 12, 0x8B4513);
    px(g, 3, 5, 1, 1, 0x8B4513);
    px(g, 3, 16, 1, 1, 0x8B4513);
    px(g, 6, 6, 1, 10, 0xaaaaaa);

    // Legs
    px(g, 11, 15, 3, 7, dark);
    px(g, 16, 15, 3, 7, dark);
    // Feet
    px(g, 10, 22, 4, 3, 0x553311);
    px(g, 15, 22, 4, 3, 0x553311);
  });

  // ── Dark Knight ──────────────────────────────────────────────────
  makeTexture('enemy_dark_knight', 28, 28, (g) => {
    const main = 0x333355;
    const armor = 0x444466;
    const armorLight = 0x555588;
    const accent = 0x8833aa;

    // Helmet with horns
    px(g, 10, 3, 8, 6, armor);
    px(g, 11, 2, 6, 2, armorLight);
    px(g, 9, 1, 2, 4, main); // Left horn
    px(g, 17, 1, 2, 4, main); // Right horn
    px(g, 9, 0, 1, 2, armorLight);
    px(g, 18, 0, 1, 2, armorLight);
    // Visor (glowing purple)
    px(g, 11, 5, 6, 2, 0x111122);
    px(g, 12, 5, 2, 1, accent);
    px(g, 15, 5, 2, 1, accent);

    // Shoulders
    px(g, 6, 9, 5, 3, armor);
    px(g, 17, 9, 5, 3, armor);
    px(g, 7, 9, 3, 1, armorLight);
    px(g, 18, 9, 3, 1, armorLight);
    // Shoulder spikes
    px(g, 6, 8, 2, 2, accent);
    px(g, 20, 8, 2, 2, accent);

    // Chest
    px(g, 10, 9, 8, 8, armor);
    px(g, 12, 10, 4, 3, accent); // Dark emblem
    px(g, 13, 11, 2, 1, 0xff44ff);

    // Arms
    px(g, 6, 12, 4, 5, main);
    px(g, 18, 12, 4, 5, main);

    // Greatsword
    px(g, 3, 2, 2, 14, 0x8888aa);
    px(g, 3, 2, 1, 14, 0xaaaacc);
    px(g, 2, 15, 4, 2, 0x665544);

    // Legs
    px(g, 11, 17, 3, 7, main);
    px(g, 15, 17, 3, 7, main);
    // Greaves
    px(g, 10, 22, 4, 4, armor);
    px(g, 15, 22, 4, 4, armor);
  });

  // ── Witch ────────────────────────────────────────────────────────
  makeTexture('enemy_witch', 28, 28, (g) => {
    const main = 0x8844aa;
    const light = lighter(main);
    const dark = darker(main);
    const skin = 0xbbdd99;

    // Witch hat
    px(g, 13, 0, 2, 2, dark);
    px(g, 12, 2, 4, 2, main);
    px(g, 11, 4, 6, 2, main);
    // Hat brim
    px(g, 8, 6, 12, 2, dark);
    // Hat buckle
    px(g, 13, 4, 2, 1, 0xccaa44);

    // Face (greenish - witchy)
    px(g, 11, 8, 6, 5, skin);
    // Eyes
    px(g, 12, 9, 2, 2, 0xffaa00);
    px(g, 15, 9, 2, 2, 0xffaa00);
    px(g, 12, 9, 1, 1, 0xff4400);
    px(g, 15, 9, 1, 1, 0xff4400);
    // Nose
    px(g, 14, 11, 1, 1, darker(skin));

    // Robe
    px(g, 10, 13, 8, 6, main);
    px(g, 11, 13, 6, 2, light);
    // Belt
    px(g, 10, 18, 8, 1, 0x443366);

    // Arms
    px(g, 7, 14, 3, 5, main);
    px(g, 18, 14, 3, 5, main);

    // Staff
    px(g, 21, 4, 2, 16, 0x664422);
    // Staff crystal
    px(g, 20, 1, 4, 4, 0xaa44ff);
    px(g, 21, 2, 2, 2, 0xdd88ff);

    // Skirt
    px(g, 9, 19, 10, 5, dark);
    px(g, 8, 22, 12, 3, main);

    // Feet
    px(g, 10, 25, 3, 2, 0x332244);
    px(g, 16, 25, 3, 2, 0x332244);
  });

  // ════════════════════════════════════════════════════════════════════
  // BOSS (64x64)
  // ════════════════════════════════════════════════════════════════════

  makeTexture('boss_dragon_knight', 64, 64, (g) => {
    const main = 0xcc2200;
    const accent = 0xff6600;
    const armor = 0x552211;
    const armorLight = 0x773322;
    const dark = 0x441100;

    // Wings (behind body)
    // Left wing
    px(g, 2, 10, 16, 3, dark);
    px(g, 0, 12, 20, 4, dark);
    px(g, 3, 16, 16, 3, accent);
    px(g, 5, 19, 12, 2, dark);
    // Wing membrane
    px(g, 4, 12, 2, 6, accent);
    px(g, 8, 11, 2, 7, accent);
    px(g, 12, 11, 2, 6, accent);

    // Right wing
    px(g, 46, 10, 16, 3, dark);
    px(g, 44, 12, 20, 4, dark);
    px(g, 45, 16, 16, 3, accent);
    px(g, 47, 19, 12, 2, dark);
    px(g, 50, 12, 2, 6, accent);
    px(g, 54, 11, 2, 7, accent);
    px(g, 58, 11, 2, 6, accent);

    // Horns
    px(g, 20, 2, 3, 6, 0x886644);
    px(g, 19, 0, 2, 4, 0xaa8866);
    px(g, 41, 2, 3, 6, 0x886644);
    px(g, 43, 0, 2, 4, 0xaa8866);

    // Helmet
    px(g, 22, 4, 20, 10, armor);
    px(g, 24, 3, 16, 4, armorLight);
    // Visor
    px(g, 24, 8, 16, 4, 0x221100);
    // Glowing eyes
    px(g, 26, 9, 4, 2, accent);
    px(g, 34, 9, 4, 2, accent);
    px(g, 27, 9, 2, 1, 0xffcc00);
    px(g, 35, 9, 2, 1, 0xffcc00);

    // Neck
    px(g, 27, 14, 10, 3, main);

    // Massive shoulders
    px(g, 12, 17, 12, 6, armor);
    px(g, 40, 17, 12, 6, armor);
    px(g, 14, 17, 8, 3, armorLight);
    px(g, 42, 17, 8, 3, armorLight);
    // Shoulder spikes
    px(g, 12, 15, 3, 4, accent);
    px(g, 49, 15, 3, 4, accent);

    // Chest plate
    px(g, 22, 17, 20, 16, armor);
    px(g, 24, 19, 16, 6, armorLight);
    // Dragon emblem on chest
    px(g, 29, 20, 6, 6, accent);
    px(g, 30, 21, 4, 4, 0xffcc00);
    px(g, 31, 22, 2, 2, 0xffffff);

    // Belt
    px(g, 21, 33, 22, 3, 0x664422);
    px(g, 30, 33, 4, 3, 0xccaa44);

    // Arms
    px(g, 14, 23, 8, 12, main);
    px(g, 42, 23, 8, 12, main);
    // Gauntlets
    px(g, 13, 32, 10, 6, armor);
    px(g, 41, 32, 10, 6, armor);

    // Massive sword (right hand)
    px(g, 8, 4, 4, 30, 0xaaaacc);
    px(g, 8, 4, 2, 30, 0xccccee);
    px(g, 7, 34, 6, 3, 0xccaa44); // Cross guard
    px(g, 9, 37, 2, 4, 0x664422); // Grip
    // Blade glow
    px(g, 9, 6, 1, 26, 0xeeeeff, 0.5);

    // Shield (left hand)
    px(g, 50, 24, 10, 14, 0x553322);
    px(g, 51, 25, 8, 12, armor);
    px(g, 53, 28, 4, 4, accent);

    // Legs
    px(g, 24, 36, 7, 16, main);
    px(g, 33, 36, 7, 16, main);
    // Leg armor
    px(g, 23, 36, 9, 4, armor);
    px(g, 32, 36, 9, 4, armor);
    // Knee guards
    px(g, 25, 42, 5, 3, armorLight);
    px(g, 34, 42, 5, 3, armorLight);

    // Boots
    px(g, 22, 52, 10, 6, armor);
    px(g, 32, 52, 10, 6, armor);
    px(g, 22, 56, 11, 4, armorLight);
    px(g, 32, 56, 11, 4, armorLight);

    // Fire effects at feet
    px(g, 20, 58, 4, 3, accent, 0.6);
    px(g, 40, 58, 4, 3, accent, 0.6);
    px(g, 28, 60, 8, 2, accent, 0.4);
  });

  // ════════════════════════════════════════════════════════════════════
  // PROJECTILES
  // ════════════════════════════════════════════════════════════════════

  makeTexture('proj_magic_bolt', 12, 12, (g) => {
    // Outer glow
    px(g, 2, 2, 8, 8, 0x4422aa, 0.3);
    // Core
    px(g, 3, 3, 6, 6, 0x6644cc);
    px(g, 4, 4, 4, 4, 0x8866ee);
    px(g, 5, 5, 2, 2, 0xccbbff);
  });

  makeTexture('proj_arrow', 12, 12, (g) => {
    // Shaft
    px(g, 2, 5, 8, 2, 0x8B4513);
    // Head
    px(g, 9, 4, 2, 4, 0xaaaaaa);
    px(g, 11, 5, 1, 2, 0xcccccc);
    // Fletching
    px(g, 0, 4, 2, 1, 0xcc4444);
    px(g, 0, 7, 2, 1, 0xcc4444);
  });

  makeTexture('proj_fireball', 12, 12, (g) => {
    // Outer glow
    px(g, 1, 1, 10, 10, 0xff4400, 0.3);
    // Core
    px(g, 2, 2, 8, 8, 0xff6600);
    px(g, 3, 3, 6, 6, 0xff8800);
    px(g, 4, 4, 4, 4, 0xffcc00);
    px(g, 5, 5, 2, 2, 0xffffaa);
  });

  makeTexture('proj_lightning', 12, 12, (g) => {
    const y = 0xffff44;
    const w = 0xffffff;
    // Zigzag bolt
    px(g, 1, 0, 2, 3, y);
    px(g, 3, 2, 3, 2, y);
    px(g, 5, 3, 2, 3, w);
    px(g, 3, 5, 3, 2, y);
    px(g, 5, 6, 2, 3, y);
    px(g, 7, 8, 3, 2, w);
    px(g, 9, 9, 2, 3, y);
    // Glow
    px(g, 4, 4, 4, 4, 0xffff88, 0.3);
  });

  makeTexture('proj_ice_shard', 12, 12, (g) => {
    // Crystal shape
    px(g, 5, 0, 2, 12, 0x88ccff);
    px(g, 3, 2, 6, 8, 0x66aaee);
    px(g, 4, 3, 4, 6, 0xaaddff);
    px(g, 5, 4, 2, 4, 0xeeffff);
  });

  makeTexture('proj_shiv', 12, 12, (g) => {
    // Sleek throwing dagger
    // Blade (bright silver, angled)
    px(g, 5, 0, 2, 7, 0xccccee);
    px(g, 4, 1, 1, 5, 0xaaaacc);
    px(g, 7, 1, 1, 5, 0xaaaacc);
    // Sharp tip
    px(g, 5, 0, 2, 1, 0xffffff);
    px(g, 6, 0, 1, 1, 0xffffff);
    // Blade shine
    px(g, 6, 2, 1, 3, 0xeeeeff);
    // Guard
    px(g, 3, 7, 6, 1, 0x888899);
    // Handle (leather wrapped)
    px(g, 5, 8, 2, 3, 0x774422);
    px(g, 5, 9, 1, 1, 0x886633);
    // Pommel
    px(g, 5, 11, 2, 1, 0x999999);
  });

  makeTexture('proj_grenade', 12, 12, (g) => {
    // Round grenade with glowing fuse
    // Body (dark green metal)
    px(g, 3, 4, 6, 6, 0x445533);
    px(g, 2, 5, 8, 4, 0x445533);
    px(g, 4, 3, 4, 1, 0x556644);
    px(g, 4, 10, 4, 1, 0x334422);
    // Highlight
    px(g, 4, 5, 2, 2, 0x667755);
    // Top cap
    px(g, 4, 2, 4, 2, 0x777777);
    px(g, 5, 2, 2, 1, 0x999999);
    // Fuse
    px(g, 5, 0, 2, 2, 0x886644);
    // Spark
    px(g, 4, 0, 1, 1, 0xffaa22);
    px(g, 7, 0, 1, 1, 0xffaa22);
    px(g, 5, 0, 2, 1, 0xffdd44);
    // Ridges on body
    px(g, 3, 6, 6, 1, 0x334422);
    px(g, 3, 8, 6, 1, 0x334422);
  });

  makeTexture('proj_wave', 12, 12, (g) => {
    // Arc/crescent shape
    px(g, 0, 4, 12, 4, 0xaaddff, 0.4);
    px(g, 1, 3, 10, 2, 0x88bbff);
    px(g, 2, 2, 8, 2, 0x66aaff);
    px(g, 3, 1, 6, 2, 0xaaddff);
    // Inner gap (crescent)
    px(g, 3, 4, 6, 3, 0x000000, 0);
    // Bright edge
    px(g, 2, 2, 8, 1, 0xeeffff);
  });

  makeTexture('proj_fire_wave', 16, 16, (g) => {
    // Blazing crescent blade
    // Outer flame glow
    px(g, 0, 6, 16, 5, 0xff4400, 0.2);
    px(g, 1, 5, 14, 3, 0xff6600, 0.3);
    // Main blade arc
    px(g, 1, 4, 14, 4, 0xff6622);
    px(g, 2, 3, 12, 3, 0xff8833);
    px(g, 3, 2, 10, 2, 0xffaa44);
    // Hot core
    px(g, 4, 3, 8, 2, 0xffcc66);
    px(g, 5, 3, 6, 1, 0xffeeaa);
    // Leading edge (white-hot)
    px(g, 2, 2, 12, 1, 0xffffcc);
    // Trailing flames
    px(g, 2, 8, 3, 3, 0xff4400, 0.4);
    px(g, 6, 9, 4, 2, 0xff2200, 0.3);
    px(g, 11, 8, 3, 3, 0xff4400, 0.4);
    // Ember sparks
    px(g, 1, 10, 1, 1, 0xffaa22, 0.6);
    px(g, 7, 11, 1, 1, 0xffaa22, 0.6);
    px(g, 14, 10, 1, 1, 0xffaa22, 0.6);
  });

  // ── Enemy-specific projectiles ──

  makeTexture('proj_enemy_melee', 10, 10, (g) => {
    // Bone shard / claw slash
    px(g, 4, 0, 2, 8, 0xddddaa);
    px(g, 3, 1, 1, 6, 0xcccc88);
    px(g, 6, 1, 1, 6, 0xcccc88);
    px(g, 4, 0, 2, 1, 0xffffff);
    px(g, 3, 8, 4, 2, 0x998866);
  });

  makeTexture('proj_enemy_arrow', 12, 12, (g) => {
    // Crude goblin arrow
    px(g, 1, 5, 9, 2, 0x665533);
    px(g, 9, 4, 2, 4, 0x888888);
    px(g, 11, 5, 1, 2, 0xaaaaaa);
    // Feathers
    px(g, 0, 3, 2, 2, 0x446622);
    px(g, 0, 7, 2, 2, 0x446622);
  });

  makeTexture('proj_enemy_magic', 12, 12, (g) => {
    // Witch dark magic orb
    px(g, 2, 2, 8, 8, 0x6622aa, 0.3);
    px(g, 3, 3, 6, 6, 0x8844cc);
    px(g, 4, 4, 4, 4, 0xaa66ee);
    px(g, 5, 5, 2, 2, 0xdd99ff);
    // Sparkle
    px(g, 2, 5, 1, 2, 0xcc88ff, 0.5);
    px(g, 9, 5, 1, 2, 0xcc88ff, 0.5);
    px(g, 5, 2, 2, 1, 0xcc88ff, 0.5);
    px(g, 5, 9, 2, 1, 0xcc88ff, 0.5);
  });

  makeTexture('proj_boss_fire', 14, 14, (g) => {
    // Large fireball for boss
    px(g, 1, 1, 12, 12, 0xff2200, 0.3);
    px(g, 2, 2, 10, 10, 0xff4400);
    px(g, 3, 3, 8, 8, 0xff6600);
    px(g, 4, 4, 6, 6, 0xff8800);
    px(g, 5, 5, 4, 4, 0xffbb00);
    px(g, 6, 6, 2, 2, 0xffffaa);
    // Flame tips
    px(g, 6, 0, 2, 3, 0xff4400, 0.5);
    px(g, 0, 6, 3, 2, 0xff4400, 0.5);
    px(g, 11, 6, 3, 2, 0xff4400, 0.5);
    px(g, 6, 11, 2, 3, 0xff4400, 0.5);
  });

  // ════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ════════════════════════════════════════════════════════════════════

  makeTexture('effect_explosion', 48, 48, (g) => {
    // Outer burst
    px(g, 4, 4, 40, 40, 0xff4400, 0.2);
    px(g, 8, 8, 32, 32, 0xff6600, 0.3);
    // Core
    px(g, 14, 14, 20, 20, 0xff8800, 0.6);
    px(g, 18, 18, 12, 12, 0xffcc00, 0.8);
    px(g, 21, 21, 6, 6, 0xffffaa);
    // Rays
    px(g, 22, 2, 4, 10, 0xff6600, 0.5);
    px(g, 22, 36, 4, 10, 0xff6600, 0.5);
    px(g, 2, 22, 10, 4, 0xff6600, 0.5);
    px(g, 36, 22, 10, 4, 0xff6600, 0.5);
    // Diagonal rays
    px(g, 6, 6, 8, 8, 0xff8800, 0.3);
    px(g, 34, 6, 8, 8, 0xff8800, 0.3);
    px(g, 6, 34, 8, 8, 0xff8800, 0.3);
    px(g, 34, 34, 8, 8, 0xff8800, 0.3);
  });

  makeTexture('effect_freeze', 32, 32, (g) => {
    const ice = 0x88ccff;
    const iceLight = 0xcceeFF;
    // Crystal overlay cross
    px(g, 14, 2, 4, 28, ice, 0.6);
    px(g, 2, 14, 28, 4, ice, 0.6);
    // Diagonal
    px(g, 4, 4, 6, 6, ice, 0.4);
    px(g, 22, 4, 6, 6, ice, 0.4);
    px(g, 4, 22, 6, 6, ice, 0.4);
    px(g, 22, 22, 6, 6, ice, 0.4);
    // Center crystal
    px(g, 12, 12, 8, 8, iceLight, 0.7);
    px(g, 14, 14, 4, 4, 0xffffff, 0.8);
  });

  makeTexture('effect_stun', 24, 24, (g) => {
    const y = 0xffff44;
    const w = 0xffffff;
    // Star 1 (top-left)
    px(g, 4, 3, 4, 1, y);
    px(g, 5, 2, 2, 3, y);
    px(g, 5, 2, 1, 1, w);
    // Star 2 (top-right)
    px(g, 16, 5, 4, 1, y);
    px(g, 17, 4, 2, 3, y);
    px(g, 17, 4, 1, 1, w);
    // Star 3 (middle)
    px(g, 10, 9, 4, 1, y);
    px(g, 11, 8, 2, 3, y);
    px(g, 11, 8, 1, 1, w);
    // Circles of confusion
    px(g, 3, 14, 6, 6, y, 0.3);
    px(g, 15, 14, 6, 6, y, 0.3);
    px(g, 9, 16, 6, 6, y, 0.3);
  });

  makeTexture('effect_burn', 24, 24, (g) => {
    // Flame 1
    px(g, 4, 12, 4, 8, 0xff4400);
    px(g, 5, 8, 2, 6, 0xff6600);
    px(g, 5, 6, 2, 4, 0xff8800);
    px(g, 5, 4, 2, 3, 0xffcc00);
    // Flame 2
    px(g, 10, 14, 4, 6, 0xff4400);
    px(g, 11, 10, 2, 6, 0xff6600);
    px(g, 11, 7, 2, 4, 0xffcc00);
    // Flame 3
    px(g, 16, 12, 4, 8, 0xff4400);
    px(g, 17, 9, 2, 5, 0xff6600);
    px(g, 17, 6, 2, 4, 0xff8800);
    // Embers
    px(g, 3, 20, 2, 2, 0xffcc00, 0.6);
    px(g, 19, 18, 2, 2, 0xffcc00, 0.6);
    px(g, 8, 20, 2, 2, 0xff6600, 0.6);
  });

  makeTexture('effect_stealth', 32, 32, (g) => {
    // Smoke/shadow cloud
    px(g, 4, 8, 24, 16, 0x222233, 0.3);
    px(g, 6, 6, 20, 20, 0x333344, 0.25);
    px(g, 8, 10, 16, 12, 0x444455, 0.3);
    // Wispy edges
    px(g, 2, 12, 4, 8, 0x222233, 0.15);
    px(g, 26, 10, 4, 10, 0x222233, 0.15);
    px(g, 10, 4, 12, 4, 0x333344, 0.15);
    px(g, 8, 24, 16, 4, 0x333344, 0.15);
    // Sparkle
    px(g, 14, 14, 4, 4, 0x8888aa, 0.4);
    px(g, 15, 15, 2, 2, 0xaaaacc, 0.5);
  });

  makeTexture('effect_heal', 24, 24, (g) => {
    const green = 0x44ff44;
    const greenLight = 0xaaffaa;
    // Cross shape
    px(g, 9, 3, 6, 18, green, 0.7);
    px(g, 3, 9, 18, 6, green, 0.7);
    // Inner cross (brighter)
    px(g, 10, 5, 4, 14, greenLight, 0.8);
    px(g, 5, 10, 14, 4, greenLight, 0.8);
    // Center
    px(g, 10, 10, 4, 4, 0xffffff, 0.9);
    // Sparkles
    px(g, 2, 2, 2, 2, green, 0.5);
    px(g, 20, 2, 2, 2, green, 0.5);
    px(g, 2, 20, 2, 2, green, 0.5);
    px(g, 20, 20, 2, 2, green, 0.5);
  });

  // ════════════════════════════════════════════════════════════════════
  // UI ELEMENTS
  // ════════════════════════════════════════════════════════════════════

  makeTexture('ui_heart', 16, 16, (g) => {
    const red = 0xee2244;
    const light = 0xff4466;
    // Heart shape
    px(g, 1, 3, 4, 4, red);
    px(g, 5, 5, 6, 6, red);
    px(g, 11, 3, 4, 4, red);
    px(g, 2, 2, 5, 3, red);
    px(g, 9, 2, 5, 3, red);
    px(g, 3, 7, 10, 3, red);
    px(g, 4, 10, 8, 2, red);
    px(g, 5, 12, 6, 1, red);
    px(g, 6, 13, 4, 1, red);
    px(g, 7, 14, 2, 1, red);
    // Highlight
    px(g, 3, 3, 2, 2, light);
    px(g, 3, 3, 1, 1, 0xffaaaa);
  });

  makeTexture('ui_mana', 16, 16, (g) => {
    const blue = 0x2244ee;
    const light = 0x4466ff;
    // Diamond shape
    px(g, 7, 1, 2, 2, light);
    px(g, 6, 3, 4, 2, blue);
    px(g, 5, 5, 6, 2, blue);
    px(g, 4, 7, 8, 2, blue);
    px(g, 5, 9, 6, 2, blue);
    px(g, 6, 11, 4, 2, blue);
    px(g, 7, 13, 2, 2, blue);
    // Highlight
    px(g, 6, 4, 2, 3, light);
    px(g, 7, 3, 1, 2, 0xaaccff);
  });

  makeTexture('ui_soul', 16, 16, (g) => {
    const purple = 0x8844cc;
    const light = 0xaa66ee;
    // Flame shape
    px(g, 6, 12, 4, 3, purple);
    px(g, 5, 9, 6, 4, purple);
    px(g, 4, 6, 8, 4, light);
    px(g, 5, 3, 6, 4, purple);
    px(g, 6, 1, 4, 3, light);
    px(g, 7, 0, 2, 2, 0xcc88ff);
    // Inner glow
    px(g, 6, 7, 4, 4, 0xcc88ff, 0.7);
    px(g, 7, 8, 2, 2, 0xffffff, 0.6);
  });

  // ── Training Dummy (32x48) ───────────────────────────────────────
  makeTexture('training_dummy', 32, 48, (g) => {
    const wood = 0xaa7744;
    const woodLight = 0xcc9966;
    const woodDark = 0x886633;

    // Post
    px(g, 14, 20, 4, 26, wood);
    px(g, 15, 20, 2, 26, woodLight);

    // Base
    px(g, 8, 44, 16, 4, woodDark);
    px(g, 10, 43, 12, 2, wood);

    // Cross-beam (arms)
    px(g, 4, 18, 24, 4, wood);
    px(g, 4, 18, 24, 2, woodLight);

    // Head (round)
    px(g, 11, 2, 10, 10, wood);
    px(g, 10, 4, 12, 6, wood);
    px(g, 12, 2, 8, 2, woodLight);
    // Target on face
    px(g, 14, 5, 4, 4, 0xcc4444);
    px(g, 15, 6, 2, 2, 0xff6666);

    // Neck
    px(g, 14, 12, 4, 6, wood);

    // Shoulder pads (straw bundles)
    px(g, 3, 16, 6, 6, 0xccaa66);
    px(g, 23, 16, 6, 6, 0xccaa66);

    // Body target
    px(g, 12, 24, 8, 8, woodDark);
    px(g, 13, 25, 6, 6, 0xcc4444);
    px(g, 14, 26, 4, 4, 0xff6666);
    px(g, 15, 27, 2, 2, 0xffaaaa);
  });

  // ── Wolf companion sprite (28x20) ──
  makeTexture('wolf_companion', 28, 20, (g) => {
    const fur = 0x777766;
    const furLight = 0x999988;
    const furDark = 0x555544;
    const belly = 0xaaaa99;

    // Body
    px(g, 6, 7, 14, 8, fur);
    px(g, 5, 8, 16, 6, fur);
    px(g, 7, 8, 10, 3, furLight); // back highlight
    px(g, 8, 13, 8, 2, belly);   // belly

    // Head
    px(g, 19, 4, 6, 7, fur);
    px(g, 18, 5, 8, 5, fur);
    px(g, 20, 4, 4, 3, furLight); // forehead
    // Snout
    px(g, 24, 7, 4, 3, furLight);
    px(g, 27, 8, 1, 1, 0x222222); // nose
    // Eye
    px(g, 22, 6, 2, 1, 0xffaa22);
    px(g, 22, 6, 1, 1, 0xffdd44); // pupil glint
    // Ears (pointed)
    px(g, 20, 1, 2, 4, furDark);
    px(g, 24, 1, 2, 4, furDark);
    px(g, 20, 1, 1, 2, furLight);
    px(g, 24, 1, 1, 2, furLight);
    // Mouth line
    px(g, 25, 10, 2, 1, furDark);

    // Tail (bushy, curled up)
    px(g, 2, 5, 5, 3, fur);
    px(g, 0, 4, 3, 2, furLight);
    px(g, 0, 3, 2, 2, furDark);

    // Front legs
    px(g, 18, 14, 3, 5, fur);
    px(g, 22, 14, 3, 5, fur);
    px(g, 18, 18, 3, 2, furDark); // paws
    px(g, 22, 18, 3, 2, furDark);

    // Back legs (thicker haunches)
    px(g, 6, 13, 4, 6, fur);
    px(g, 11, 13, 4, 6, fur);
    px(g, 6, 18, 3, 2, furDark);
    px(g, 12, 18, 3, 2, furDark);

    // Fur texture
    px(g, 9, 7, 1, 1, furDark);
    px(g, 12, 8, 1, 1, furDark);
    px(g, 15, 7, 1, 1, furDark);
    px(g, 10, 10, 1, 1, furLight);
    px(g, 14, 9, 1, 1, furLight);
  });

  // ════════════════════════════════════════════════════════════════════
  // MAP / ENVIRONMENT (48x48)
  // ════════════════════════════════════════════════════════════════════

  makeTexture('tile_floor', 48, 48, (g) => {
    // Base stone
    g.fillStyle(0x555566);
    g.fillRect(0, 0, 48, 48);

    // Stone tiles with subtle variation
    const colors = [0x555566, 0x505060, 0x5a5a6a, 0x4f4f5f, 0x585868];
    for (let ty = 0; ty < 4; ty++) {
      for (let tx = 0; tx < 4; tx++) {
        const c = colors[(tx * 3 + ty * 7) % colors.length];
        px(g, tx * 12 + 1, ty * 12 + 1, 10, 10, c);
      }
    }
    // Grout lines
    for (let i = 0; i < 4; i++) {
      px(g, 0, i * 12, 48, 1, 0x444455);
      px(g, i * 12, 0, 1, 48, 0x444455);
    }
    // Random pebble accents
    px(g, 8, 20, 2, 2, 0x606070);
    px(g, 30, 10, 2, 1, 0x4a4a5a);
    px(g, 22, 38, 3, 2, 0x606070);
  });

  makeTexture('tile_wall', 48, 48, (g) => {
    // Dark wall base
    g.fillStyle(0x333344);
    g.fillRect(0, 0, 48, 48);

    // Brick pattern
    for (let row = 0; row < 4; row++) {
      const offset = row % 2 === 0 ? 0 : 12;
      for (let col = -1; col < 3; col++) {
        const bx = col * 24 + offset;
        const shade = (row + col) % 3 === 0 ? 0x3a3a4a : 0x2e2e3e;
        px(g, bx + 1, row * 12 + 1, 22, 10, shade);
      }
    }
    // Mortar lines
    for (let i = 0; i < 5; i++) {
      px(g, 0, i * 12, 48, 1, 0x222233);
    }
    // Top edge highlight
    px(g, 0, 0, 48, 2, 0x444466);
    // Moss accents
    px(g, 4, 46, 6, 2, 0x335533, 0.4);
    px(g, 36, 44, 8, 3, 0x335533, 0.3);
  });

  makeTexture('tile_door', 48, 48, (g) => {
    // Door frame
    g.fillStyle(0x444455);
    g.fillRect(0, 0, 48, 48);
    // Frame borders
    px(g, 0, 0, 6, 48, 0x664422);
    px(g, 42, 0, 6, 48, 0x664422);
    px(g, 0, 0, 48, 4, 0x664422);

    // Door surface
    px(g, 6, 4, 36, 44, 0x553311);
    px(g, 8, 6, 32, 40, 0x664422);

    // Door panels
    px(g, 10, 8, 12, 16, 0x553311);
    px(g, 26, 8, 12, 16, 0x553311);
    px(g, 10, 28, 12, 14, 0x553311);
    px(g, 26, 28, 12, 14, 0x553311);

    // Handle
    px(g, 22, 26, 4, 4, 0xccaa44);
    px(g, 23, 27, 2, 2, 0xeedd66);

    // Glow/portal effect
    px(g, 12, 10, 24, 30, 0x6644cc, 0.15);
    px(g, 16, 14, 16, 22, 0x8866ee, 0.1);
  });

  makeTexture('lobby_floor', 48, 48, (g) => {
    // Warm wooden planks
    g.fillStyle(0x8B6B3D);
    g.fillRect(0, 0, 48, 48);

    const plankColors = [0x8B6B3D, 0x916F41, 0x856539, 0x8E6C3E, 0x7F6137];
    for (let i = 0; i < 6; i++) {
      const c = plankColors[i % plankColors.length];
      px(g, 0, i * 8, 48, 7, c);
      // Plank gap
      px(g, 0, i * 8 + 7, 48, 1, 0x5a4425);
      // Wood grain
      px(g, (i * 13) % 40, i * 8 + 2, 8, 1, lighter(c, 0.1));
      px(g, (i * 17 + 5) % 36, i * 8 + 4, 12, 1, darker(c, 0.1));
    }
    // Knot
    px(g, 20, 18, 3, 3, 0x6a5030);
    px(g, 21, 19, 1, 1, 0x5a4020);
  });

  makeTexture('lobby_wall', 48, 48, (g) => {
    // Ornate wall base
    g.fillStyle(0x665544);
    g.fillRect(0, 0, 48, 48);

    // Wainscoting (lower panel)
    px(g, 0, 28, 48, 20, 0x554433);
    px(g, 2, 30, 20, 16, 0x5e4d3c);
    px(g, 26, 30, 20, 16, 0x5e4d3c);

    // Trim line
    px(g, 0, 28, 48, 2, 0x887755);
    px(g, 0, 26, 48, 2, 0x776644);

    // Upper wall - wallpaper pattern
    px(g, 0, 0, 48, 26, 0x776655);
    // Decorative pattern
    px(g, 10, 8, 4, 4, 0x887766, 0.5);
    px(g, 34, 8, 4, 4, 0x887766, 0.5);
    px(g, 22, 4, 4, 4, 0x887766, 0.5);
    px(g, 10, 18, 4, 4, 0x887766, 0.5);
    px(g, 34, 18, 4, 4, 0x887766, 0.5);

    // Top molding
    px(g, 0, 0, 48, 3, 0x887755);
    px(g, 0, 0, 48, 1, 0x998866);

    // Torch bracket hint
    px(g, 22, 10, 4, 6, 0x886644);
    px(g, 23, 8, 2, 3, 0xff8844, 0.4);
  });

  // ════════════════════════════════════════════════════════════════════
  // SKILL ICONS (24x24)
  // ════════════════════════════════════════════════════════════════════

  function makeSkillIcon(key, bgColor, drawIconFn) {
    makeTexture(key, 24, 24, (g) => {
      // Background rounded-ish square
      px(g, 1, 0, 22, 24, darker(bgColor, 0.4));
      px(g, 0, 1, 24, 22, darker(bgColor, 0.4));
      px(g, 2, 1, 20, 22, bgColor);
      px(g, 1, 2, 22, 20, bgColor);
      // Border highlight
      px(g, 2, 1, 20, 1, lighter(bgColor, 0.3));
      px(g, 1, 2, 1, 20, lighter(bgColor, 0.2));
      // Draw the icon content
      drawIconFn(g);
    });
  }

  // Mage skills
  makeSkillIcon('skill_frost', 0x224466, (g) => {
    // Snowflake / ice crystal
    px(g, 11, 4, 2, 16, 0x88ccff);
    px(g, 4, 11, 16, 2, 0x88ccff);
    px(g, 6, 6, 3, 3, 0x66aaee);
    px(g, 15, 6, 3, 3, 0x66aaee);
    px(g, 6, 15, 3, 3, 0x66aaee);
    px(g, 15, 15, 3, 3, 0x66aaee);
    px(g, 11, 11, 2, 2, 0xeeffff);
  });

  makeSkillIcon('skill_lightning', 0x444422, (g) => {
    // Lightning bolt
    px(g, 10, 3, 4, 3, 0xffff44);
    px(g, 8, 6, 4, 3, 0xffff44);
    px(g, 6, 8, 6, 3, 0xffff00);
    px(g, 10, 10, 6, 3, 0xffff44);
    px(g, 12, 12, 4, 3, 0xffff44);
    px(g, 14, 14, 3, 4, 0xffff00);
    px(g, 9, 9, 3, 2, 0xffffff);
  });

  makeSkillIcon('skill_fire', 0x442211, (g) => {
    // Fire burst
    px(g, 9, 14, 6, 6, 0xff4400);
    px(g, 8, 10, 8, 6, 0xff6600);
    px(g, 9, 6, 6, 6, 0xff8800);
    px(g, 10, 3, 4, 5, 0xffcc00);
    px(g, 11, 2, 2, 3, 0xffffaa);
    // Side flames
    px(g, 6, 12, 3, 4, 0xff4400);
    px(g, 15, 11, 3, 5, 0xff4400);
  });

  // Warrior skills
  makeSkillIcon('skill_heavy_blade', 0x442222, (g) => {
    // Big sword
    px(g, 11, 2, 3, 14, 0xccccdd);
    px(g, 11, 2, 2, 14, 0xeeeeff);
    // Cross guard
    px(g, 7, 15, 10, 2, 0xccaa44);
    // Handle
    px(g, 11, 17, 3, 4, 0x664422);
    // Pommel
    px(g, 11, 20, 3, 2, 0xccaa44);
  });

  makeSkillIcon('skill_enrage', 0x441111, (g) => {
    // Angry face / rage symbol
    px(g, 6, 6, 12, 12, 0xcc2222, 0.4);
    // Angry eyes
    px(g, 7, 8, 4, 2, 0xff4444);
    px(g, 13, 8, 4, 2, 0xff4444);
    // Slashed eyebrows
    px(g, 6, 7, 5, 1, 0xff2222);
    px(g, 13, 7, 5, 1, 0xff2222);
    // Mouth
    px(g, 9, 14, 6, 2, 0xff2222);
    // Aura lines
    px(g, 4, 4, 2, 2, 0xff4444, 0.6);
    px(g, 18, 4, 2, 2, 0xff4444, 0.6);
    px(g, 4, 18, 2, 2, 0xff4444, 0.6);
    px(g, 18, 18, 2, 2, 0xff4444, 0.6);
  });

  makeSkillIcon('skill_cross_cut', 0x443322, (g) => {
    // Two crossed slashes
    // Slash 1 (top-left to bottom-right)
    px(g, 4, 4, 3, 3, 0xccccdd);
    px(g, 7, 7, 3, 3, 0xeeeeff);
    px(g, 10, 10, 3, 3, 0xeeeeff);
    px(g, 13, 13, 3, 3, 0xccccdd);
    px(g, 16, 16, 3, 3, 0xaaaacc);
    // Slash 2 (top-right to bottom-left)
    px(g, 16, 4, 3, 3, 0xccccdd);
    px(g, 13, 7, 3, 3, 0xeeeeff);
    px(g, 7, 13, 3, 3, 0xeeeeff);
    px(g, 4, 16, 3, 3, 0xccccdd);
    // Impact center
    px(g, 10, 10, 4, 4, 0xffffff, 0.6);
  });

  // Archer skills
  makeSkillIcon('skill_arrow_shower', 0x224422, (g) => {
    // Multiple arrows raining down
    for (let i = 0; i < 4; i++) {
      const x = 5 + i * 4;
      const y = 3 + i * 2;
      px(g, x, y, 1, 8, 0x8B6B3D);
      px(g, x, y, 1, 2, 0xcccccc);
      px(g, x - 1, y + 7, 3, 1, 0xcc4444);
    }
    // Rain effect
    px(g, 3, 18, 18, 2, 0x88aa88, 0.3);
  });

  makeSkillIcon('skill_precise_shot', 0x223322, (g) => {
    // Crosshair with arrow
    px(g, 11, 3, 2, 18, 0x44ff44, 0.5);
    px(g, 3, 11, 18, 2, 0x44ff44, 0.5);
    // Circle
    px(g, 7, 7, 10, 1, 0x44ff44);
    px(g, 7, 16, 10, 1, 0x44ff44);
    px(g, 7, 7, 1, 10, 0x44ff44);
    px(g, 16, 7, 1, 10, 0x44ff44);
    // Center dot
    px(g, 11, 11, 2, 2, 0xff4444);
  });

  makeSkillIcon('skill_trap_bomb', 0x334422, (g) => {
    // Bear trap / bomb
    // Trap jaws
    px(g, 5, 10, 14, 2, 0x888888);
    px(g, 5, 8, 2, 4, 0xaaaaaa);
    px(g, 8, 7, 2, 3, 0xaaaaaa);
    px(g, 14, 7, 2, 3, 0xaaaaaa);
    px(g, 17, 8, 2, 4, 0xaaaaaa);
    // Chain
    px(g, 11, 12, 2, 6, 0x666666);
    // Base plate
    px(g, 7, 16, 10, 3, 0x777777);
    // Danger symbol
    px(g, 11, 3, 2, 4, 0xff4444);
    px(g, 11, 3, 2, 1, 0xffaa44);
  });

  // Rogue skills
  makeSkillIcon('skill_quick_shivs', 0x2a2a3a, (g) => {
    // Five bright silver throwing daggers in a fan pattern
    // Dagger 1 (left)
    px(g, 3, 14, 2, 1, 0x886644); // handle
    px(g, 3, 10, 2, 4, 0xddddee); // blade
    px(g, 3, 9, 2, 1, 0xffffff);  // tip
    // Dagger 2
    px(g, 7, 12, 2, 1, 0x886644);
    px(g, 7, 8, 2, 4, 0xddddee);
    px(g, 7, 7, 2, 1, 0xffffff);
    // Dagger 3 (center)
    px(g, 11, 11, 2, 1, 0x886644);
    px(g, 11, 7, 2, 4, 0xddddee);
    px(g, 11, 6, 2, 1, 0xffffff);
    // Dagger 4
    px(g, 15, 12, 2, 1, 0x886644);
    px(g, 15, 8, 2, 4, 0xddddee);
    px(g, 15, 7, 2, 1, 0xffffff);
    // Dagger 5 (right)
    px(g, 19, 14, 2, 1, 0x886644);
    px(g, 19, 10, 2, 4, 0xddddee);
    px(g, 19, 9, 2, 1, 0xffffff);
    // Speed lines
    px(g, 4, 17, 6, 1, 0x8888aa, 0.6);
    px(g, 10, 18, 5, 1, 0x8888aa, 0.4);
    px(g, 14, 17, 6, 1, 0x8888aa, 0.6);
  });

  makeSkillIcon('skill_grenade_launch', 0x2a3322, (g) => {
    // Bright green grenade with orange explosion
    // Grenade body
    px(g, 8, 9, 8, 9, 0x66aa44);
    px(g, 7, 11, 10, 5, 0x66aa44);
    // Highlight
    px(g, 9, 10, 3, 3, 0x88cc66);
    // Top cap / pin
    px(g, 10, 7, 4, 3, 0x888888);
    px(g, 11, 7, 2, 1, 0xaaaaaa);
    // Fuse
    px(g, 11, 4, 2, 3, 0xcc8844);
    // Spark / explosion hints
    px(g, 10, 2, 4, 3, 0xff8844);
    px(g, 11, 1, 2, 2, 0xffdd44);
    px(g, 9, 3, 1, 1, 0xff6622);
    px(g, 14, 3, 1, 1, 0xff6622);
    // Ridges
    px(g, 9, 13, 6, 1, 0x558833);
    px(g, 9, 15, 6, 1, 0x558833);
  });

  makeSkillIcon('skill_stealth_attack', 0x1a1a2e, (g) => {
    // Hooded figure emerging from shadows with glowing eyes
    // Shadow base (dark purple mist)
    px(g, 4, 16, 16, 4, 0x443366, 0.5);
    px(g, 3, 18, 18, 3, 0x332255, 0.6);
    // Cloak body
    px(g, 8, 8, 8, 10, 0x555588);
    px(g, 7, 10, 10, 7, 0x555588);
    px(g, 6, 14, 12, 4, 0x444477);
    // Hood
    px(g, 8, 4, 8, 5, 0x6666aa);
    px(g, 9, 3, 6, 3, 0x7777bb);
    px(g, 10, 3, 4, 2, 0x8888cc);
    // Glowing red eyes
    px(g, 10, 7, 2, 1, 0xff2222);
    px(g, 13, 7, 2, 1, 0xff2222);
    // Eye glow
    px(g, 10, 6, 2, 1, 0xff4444, 0.3);
    px(g, 13, 6, 2, 1, 0xff4444, 0.3);
    // Shadow wisps
    px(g, 4, 12, 3, 2, 0x6655aa, 0.4);
    px(g, 17, 11, 3, 2, 0x6655aa, 0.4);
    // Dagger glint in hand
    px(g, 16, 13, 1, 4, 0xddddee);
    px(g, 16, 12, 1, 1, 0xffffff);
  });

  // ════════════════════════════════════════════════════════════════════
  // ITEM SLOTS
  // ════════════════════════════════════════════════════════════════════

  // ── Ultimate Icons (24x24) ──

  makeSkillIcon('ult_blackhole', 0x110022, (g) => {
    // Dark swirling vortex
    px(g, 7, 7, 10, 10, 0x220044);
    px(g, 8, 8, 8, 8, 0x330066);
    px(g, 9, 9, 6, 6, 0x110022);
    px(g, 10, 10, 4, 4, 0x000000);
    px(g, 11, 11, 2, 2, 0x000000);
    // Swirl arms
    px(g, 5, 10, 3, 2, 0x6622cc, 0.7);
    px(g, 16, 11, 3, 2, 0x6622cc, 0.7);
    px(g, 10, 4, 2, 3, 0x8844ee, 0.6);
    px(g, 12, 16, 2, 3, 0x8844ee, 0.6);
    // Outer glow
    px(g, 4, 11, 2, 1, 0xaa66ff, 0.4);
    px(g, 18, 12, 2, 1, 0xaa66ff, 0.4);
    px(g, 11, 3, 1, 2, 0xaa66ff, 0.4);
    px(g, 12, 19, 1, 2, 0xaa66ff, 0.4);
  });

  makeSkillIcon('ult_whirlwind', 0x331111, (g) => {
    // Spinning blade circle
    px(g, 10, 10, 4, 4, 0xff6644);
    // Blade arcs
    px(g, 4, 9, 7, 2, 0xffaa66);
    px(g, 13, 12, 7, 2, 0xffaa66);
    px(g, 10, 4, 2, 7, 0xff8844);
    px(g, 12, 13, 2, 7, 0xff8844);
    // Curved motion lines
    px(g, 3, 7, 4, 1, 0xffcc88, 0.5);
    px(g, 17, 15, 4, 1, 0xffcc88, 0.5);
    px(g, 7, 17, 1, 4, 0xffcc88, 0.5);
    px(g, 15, 3, 1, 4, 0xffcc88, 0.5);
    // Center highlight
    px(g, 11, 11, 2, 2, 0xffffff, 0.7);
  });

  makeSkillIcon('ult_wolf', 0x223311, (g) => {
    // Wolf head silhouette
    // Ears
    px(g, 6, 3, 3, 4, 0x88aa44);
    px(g, 15, 3, 3, 4, 0x88aa44);
    // Head
    px(g, 7, 6, 10, 8, 0x99bb55);
    px(g, 8, 5, 8, 2, 0x88aa44);
    // Snout
    px(g, 9, 14, 6, 3, 0xaacc66);
    px(g, 10, 16, 4, 2, 0x88aa44);
    // Eyes
    px(g, 9, 8, 2, 2, 0xff4444);
    px(g, 13, 8, 2, 2, 0xff4444);
    // Nose
    px(g, 11, 14, 2, 1, 0x333322);
    // Fur highlights
    px(g, 8, 6, 2, 1, 0xbbdd77);
    px(g, 14, 6, 2, 1, 0xbbdd77);
  });

  makeSkillIcon('ult_poison_storm', 0x112211, (g) => {
    // Poison daggers radiating out with toxic cloud
    // Toxic cloud center
    px(g, 8, 8, 8, 8, 0x44cc44, 0.4);
    px(g, 7, 9, 10, 6, 0x44cc44, 0.3);
    // Daggers radiating outward
    px(g, 11, 2, 2, 5, 0xccddcc); // up
    px(g, 11, 17, 2, 5, 0xccddcc); // down
    px(g, 2, 11, 5, 2, 0xccddcc); // left
    px(g, 17, 11, 5, 2, 0xccddcc); // right
    // Poison drips
    px(g, 6, 14, 1, 3, 0x66ee66, 0.6);
    px(g, 17, 8, 1, 3, 0x66ee66, 0.6);
    px(g, 10, 4, 1, 2, 0x66ee66, 0.6);
    // Skull hint in center
    px(g, 10, 9, 4, 3, 0x88ff88, 0.5);
    px(g, 10, 10, 1, 1, 0x226622);
    px(g, 13, 10, 1, 1, 0x226622);
    px(g, 11, 12, 2, 1, 0x226622);
  });

  // ════════════════════════════════════════════════════════════════════
  // ITEM SLOTS
  // ════════════════════════════════════════════════════════════════════

  makeTexture('item_slot', 36, 36, (g) => {
    // Outer border
    px(g, 0, 0, 36, 36, 0x444455);
    // Inner area
    px(g, 2, 2, 32, 32, 0x222233);
    // Highlight edges
    px(g, 2, 2, 32, 1, 0x555566);
    px(g, 2, 2, 1, 32, 0x555566);
    // Shadow edges
    px(g, 2, 33, 32, 1, 0x111122);
    px(g, 33, 2, 1, 32, 0x111122);
    // Corner accents
    px(g, 0, 0, 3, 3, 0x666677);
    px(g, 33, 0, 3, 3, 0x666677);
    px(g, 0, 33, 3, 3, 0x666677);
    px(g, 33, 33, 3, 3, 0x666677);
  });

  makeTexture('item_slot_selected', 36, 36, (g) => {
    // Glowing border
    px(g, 0, 0, 36, 36, 0xccaa44);
    // Inner glow
    px(g, 1, 1, 34, 34, 0xaa8833);
    // Inner area
    px(g, 2, 2, 32, 32, 0x2a2a3b);
    // Highlight edges (golden)
    px(g, 2, 2, 32, 1, 0xeedd66);
    px(g, 2, 2, 1, 32, 0xeedd66);
    // Shadow edges
    px(g, 2, 33, 32, 1, 0x886622);
    px(g, 33, 2, 1, 32, 0x886622);
    // Corner accents (brighter gold)
    px(g, 0, 0, 3, 3, 0xffee88);
    px(g, 33, 0, 3, 3, 0xffee88);
    px(g, 0, 33, 3, 3, 0xffee88);
    px(g, 33, 33, 3, 3, 0xffee88);
  });

  // ════════════════════════════════════════════════════════════════════
  // PARTICLE
  // ════════════════════════════════════════════════════════════════════

  makeTexture('particle_white', 4, 4, (g) => {
    g.fillStyle(0xffffff);
    g.fillRect(0, 0, 4, 4);
  });
}
