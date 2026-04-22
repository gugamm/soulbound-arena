// ══════════════════════════════════════════════════════════════
//  SOULBOUND ARENA — Combat Scene
//  Main gameplay: 8 maps + 1 boss fight, wave-based combat
// ══════════════════════════════════════════════════════════════

import { GAME, CHARACTERS, SKILLS, ENEMIES, BOSSES, MAP_WAVES, calculateDamage, generateRewardChoices } from '/shared/gameData.js';
import Player from '../entities/Player.js';
import Enemy, { Boss } from '../entities/Enemy.js';
import { HealthBar, ManaBar, SkillBar, InventoryPanel, DamageText, RewardPanel } from '../ui/UIComponents.js';
import sound from '../systems/SoundManager.js';

// ── Arena dimensions ──
const ARENA_W = 1200;
const ARENA_H = 700;
const ARENA_X = (GAME.WIDTH - ARENA_W) / 2;
const ARENA_Y = (GAME.HEIGHT - ARENA_H) / 2;
const TILE = GAME.TILE_SIZE;

// ── Floor tint per difficulty band ──
const FLOOR_TINTS = {
  light:  0xddddcc, // maps 1-3
  medium: 0xaa9988, // maps 4-6
  dark:   0x776666, // maps 7-8
  boss:   0x553333, // map 9
};

function floorTintForMap(map) {
  if (map <= 3) return FLOOR_TINTS.light;
  if (map <= 6) return FLOOR_TINTS.medium;
  if (map <= 8) return FLOOR_TINTS.dark;
  return FLOOR_TINTS.boss;
}

// Map a skill id to a matching SFX flavor
function _skillSoundFor(skillId) {
  const id = (skillId || '').toLowerCase();
  if (id.includes('fire') || id.includes('lava') || id.includes('cross_cut')) return 'skill_fire';
  if (id.includes('ice') || id.includes('frost') || id.includes('freeze')) return 'skill_ice';
  if (id.includes('lightning') || id.includes('shock') || id.includes('chain')) return 'skill_lightning';
  if (id.includes('enrage') || id.includes('buff') || id.includes('stealth')) {
    return id.includes('stealth') ? 'skill_stealth' : 'skill_buff';
  }
  if (id.includes('heavy') || id.includes('slam')) return 'skill_heavy';
  if (id.includes('slash') || id.includes('blade')) return 'skill_slash';
  if (id.includes('arrow') || id.includes('shot') || id.includes('precise')) return 'skill_arrow';
  if (id.includes('poison')) return 'skill_poison';
  if (id.includes('grenade') || id.includes('trap') || id.includes('bomb')) return 'skill_trap';
  return 'skill_cast';
}

// ══════════════════════════════════════════════════════════════
//  Projectile helper — lightweight physics sprite
// ══════════════════════════════════════════════════════════════

class Projectile extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture, config) {
    super(scene, x, y, texture || 'particle_white');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setSize(8, 8);
    this.body.setAllowGravity(false);

    this.damage = config.damage || 0;
    this.maxRange = config.range || 300;
    this.source = config.source || 'player'; // 'player' | 'enemy'
    this.effect = config.effect || null;
    this.effectDuration = config.effectDuration || 0;
    this.effectDamage = config.effectDamage || 0;
    this.piercing = config.piercing || false;
    this.critChance = config.critChance || 0;
    this.critMultiplier = config.critMultiplier || 1;
    this.explosionRadius = config.explosionRadius || 0;
    this.color = config.color || 0xffffff;
    this.skillDef = config.skillDef || null;

    this.startX = x;
    this.startY = y;
    this._hitTargets = new Set();

    // Tint based on color
    this.setTint(this.color);
    this.setScale(0.6);
  }

  update() {
    if (!this.active) return;
    const dist = Phaser.Math.Distance.Between(this.startX, this.startY, this.x, this.y);
    if (dist >= this.maxRange) {
      this._onMaxRange();
      this.kill();
      return;
    }

    // Fire wave: record trail positions
    if (this._fireWave && this._trailPositions) {
      this._trailTimer = (this._trailTimer || 0) + 1;
      if (this._trailTimer % 3 === 0) { // every 3 frames
        this._trailPositions.push({ x: this.x, y: this.y });
      }
    }

    // Trail effect for enhanced projectiles
    if (this.trail && this.scene) {
      const trailSize = this._fireWave ? 6 : 4;
      const trail = this.scene.add.circle(this.x, this.y, trailSize, this.color, this._fireWave ? 0.6 : 0.5).setDepth(this.depth - 1);
      this.scene.tweens.add({
        targets: trail,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: this._fireWave ? 400 : 250,
        onComplete: () => trail.destroy(),
      });
    }
  }

  _onMaxRange() {
    if (!this.scene) return;
    // Lava pool at max range
    if (this._lavaSkill && this.scene._spawnLavaPool) {
      if (this.explosionRadius > 0) {
        this.scene._createExplosion(this.x, this.y, this.explosionRadius, this.damage, this.color);
      }
      this.scene._spawnLavaPool(this.x, this.y, this._explosionRadius, this._lavaDuration, this._lavaDamage, this.color);
    }
    // Fire wave trail at max range
    if (this._fireWave && this._trailPositions && this._trailPositions.length > 0 && this.scene._spawnFireTrail) {
      this.scene._spawnFireTrail(this._trailPositions, this._fireDuration, this._fireDamage);
    }
  }

  kill() {
    if (this._killed) return;
    this._killed = true;
    if (this.body) this.body.enable = false;
    this.setActive(false);
    this.setVisible(false);
    // Defer destroy to next frame so we don't tear down a physics body
    // that Phaser's arcade world is still iterating over (fixes crash on
    // collision callbacks, e.g. archer arrow hitting player).
    const scene = this.scene;
    if (scene && scene.time) {
      scene.time.delayedCall(0, () => {
        if (this.scene) this.destroy();
      });
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  Trap helper
// ══════════════════════════════════════════════════════════════

class Trap extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, config) {
    super(scene, x, y, 'particle_white');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setSize(config.triggerRadius * 2, config.triggerRadius * 2);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);

    this.damage = config.damage || 0;
    this.triggerRadius = config.triggerRadius || 40;
    this.explosionRadius = config.explosionRadius || 80;
    this.lifetime = config.lifetime || 15;
    this.color = config.color || 0xff8800;
    this.skillDef = config.skillDef || null;
    this._armed = false;
    this._lifeTimer = 0;

    this.setTint(this.color);
    this.setScale(0.8);
    this.setAlpha(0.7);

    // Arm after 0.3s so it doesn't instantly trigger
    scene.time.delayedCall(300, () => {
      if (this.active) this._armed = true;
    });
  }

  update(time, delta) {
    if (!this.active) return;
    this._lifeTimer += delta / 1000;
    if (this._lifeTimer >= this.lifetime) {
      this.kill();
    }
    // Pulse alpha
    this.setAlpha(0.5 + Math.sin(this._lifeTimer * 4) * 0.2);
  }

  kill() {
    if (this._killed) return;
    this._killed = true;
    if (this.body) this.body.enable = false;
    this.setActive(false);
    this.setVisible(false);
    const scene = this.scene;
    if (scene && scene.time) {
      scene.time.delayedCall(0, () => {
        if (this.scene) this.destroy();
      });
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  CombatScene
// ══════════════════════════════════════════════════════════════

export default class CombatScene extends Phaser.Scene {
  constructor() {
    super('Combat');
  }

  // ── Lifecycle ──

  init(data) {
    this.characterType = data.character;
    this.currentMap = data.currentMap || 1;
    this.souls = data.souls || 0;
    this.upgrades = data.upgrades || {};
    this.savedItems = data.items || [];
    this.savedHp = data.currentHp || null;
    this.soulsEarned = 0;
    this.isBossMap = this.currentMap === 9;

    // Run stats (carried between maps)
    this.runStats = data.runStats || {
      enemiesKilled: 0,
      bossesKilled: 0,
      damageDealt: 0,
      damageTaken: 0,
      skillsUsed: 0,
      itemsCollected: 0,
      wavesCleared: 0,
      mapsCleared: 0,
    };
  }

  create() {
    // Music — boss theme on map 9, combat theme otherwise
    sound.playMusic(this.isBossMap ? 'boss' : 'combat');
    sound.play('level_start');

    // Store soul upgrades in registry for Player to access
    this.registry.set('soulUpgrades', this.upgrades);

    // ── Build arena ──
    this._buildArena();

    // ── Physics groups ──
    this.playerProjectiles = this.physics.add.group({ classType: Projectile, runChildUpdate: true });
    this.enemyProjectiles = this.physics.add.group({ classType: Projectile, runChildUpdate: true });
    this.enemies = this.physics.add.group({ runChildUpdate: false });
    this.traps = this.physics.add.group({ classType: Trap, runChildUpdate: true });

    // ── Player ──
    const cx = GAME.WIDTH / 2;
    const cy = GAME.HEIGHT / 2;
    this.player = new Player(this, cx, cy, this.characterType, true);
    this.player.body.setCollideWorldBounds(true);
    this.players = [this.player]; // array for enemy AI

    // Restore items and HP from previous maps
    for (const item of this.savedItems) {
      this.player.equipItem(item);
    }
    if (this.savedHp !== null) {
      this.player.currentHp = Math.min(this.savedHp, this.player.maxHp);
    }

    // ── Input ──
    this._setupInput();

    // ── HUD ──
    this._createHUD();

    // ── Colliders ──
    this._setupColliders();

    // ── Scene events from entities ──
    this._setupEntityEvents();

    // ── Wave / boss state ──
    this.currentWaveIndex = 0;
    this.wavesData = this.isBossMap ? null : MAP_WAVES[this.currentMap];
    this.totalWaves = this.wavesData ? this.wavesData.length : 0;
    this.waveCleared = false;
    this.mapCleared = false;
    this.playerDead = false;
    this.betweenWaves = false;
    this.contactDamageTimer = 0;

    // Boss reference
    this.boss = null;
    this.bossHpBar = null;

    // Start first wave or boss
    if (this.isBossMap) {
      this._spawnBoss();
    } else {
      this._spawnWave(0);
    }

    this._updateWaveText();
  }

  update(time, delta) {
    // Always update HUD so HP bar reflects current state
    this._updateHUD();

    if (this.playerDead || this.mapCleared || this.isPaused) return;

    // Auto-attack while holding left mouse
    if (this.isAttacking && this.player && this.player.active && !(this.inventoryPanel && this.inventoryPanel.visible)) {
      const result = this.player.basicAttack();
      if (result && result.type === 'melee') {
        this._executeMeleeAttack(result);
      }
    }

    // Safety: recover player from ANY broken state as long as not dead
    if (this.player && !this.playerDead) {
      // CRITICAL: restore scene reference if lost (Phaser may null it in edge cases)
      if (!this.player.scene) {
        this.player.scene = this;
      }

      // Force active flag
      if (!this.player.active) {
        this.player.setActive(true);
      }

      // Force visibility
      if (!this.player.visible) {
        this.player.setVisible(true);
      }

      // Force alpha - player must ALWAYS be visible unless stealthed
      if (this.player.alpha < 0.2 && !this.player.isStealthed) {
        // Kill any tweens that might be fading the player FIRST
        this.tweens.killTweensOf(this.player);
        this.player.setAlpha(1);
        this.player.clearTint();
      }

      // Force body enabled
      if (!this.player.body) {
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setSize(24, 24);
      } else if (!this.player.body.enable) {
        this.player.body.enable = true;
      }

      // Clear stuck invulnerability (max 0.5s, but not during stealth)
      if (this.player.isInvulnerable && !this.player.isStealthed) {
        this._invulnTimer = (this._invulnTimer || 0) + 1;
        if (this._invulnTimer > 30) {
          this.player.isInvulnerable = false;
          this.player._iframeTimer = 0;
          this.player.clearTint();
          this.player.setAlpha(1);
          this._invulnTimer = 0;
        }
      } else {
        this._invulnTimer = 0;
      }

      // Safety: clamp iframe timer to max 1 second
      if (this.player._iframeTimer > 1000) {
        this.player._iframeTimer = 200;
      }

      // Clamp position to arena
      const bounds = this.physics.world.bounds;
      if (this.player.x < bounds.x || this.player.x > bounds.x + bounds.width ||
          this.player.y < bounds.y || this.player.y > bounds.y + bounds.height) {
        this.player.body.reset(GAME.WIDTH / 2, GAME.HEIGHT / 2);
      }

      // If HP reached 0 but death wasn't triggered, trigger it now
      if (this.player.currentHp <= 0) {
        this._onPlayerDeath();
      }
    }

    // Update player (with all safety guards active, this should always work)
    if (this.player && this.player.active) {
      // Re-attach scene if needed before update
      if (!this.player.scene) this.player.scene = this;
      this.player.update(time, delta);
    }

    // Update enemies
    const enemyChildren = this.enemies.getChildren();
    for (let i = enemyChildren.length - 1; i >= 0; i--) {
      const e = enemyChildren[i];
      if (e && e.active) {
        e.update(time, delta, this.players);
      }
    }

    // Update boss
    if (this.boss && this.boss.active) {
      this.boss.update(time, delta, this.players);
    }

    // Contact damage timer (enemies touching player)
    this.contactDamageTimer -= delta / 1000;

    // Wave progression check
    if (!this.isBossMap && !this.betweenWaves && !this.waveCleared) {
      this._checkWaveComplete();
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  Arena Construction
  // ══════════════════════════════════════════════════════════════

  _buildArena() {
    // Dark background behind arena
    this.add.rectangle(GAME.WIDTH / 2, GAME.HEIGHT / 2, GAME.WIDTH, GAME.HEIGHT, 0x111111);

    const tint = floorTintForMap(this.currentMap);

    // Floor tiles
    const cols = Math.ceil(ARENA_W / TILE);
    const rows = Math.ceil(ARENA_H / TILE);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tx = ARENA_X + c * TILE + TILE / 2;
        const ty = ARENA_Y + r * TILE + TILE / 2;
        const isEdge = r === 0 || r === rows - 1 || c === 0 || c === cols - 1;

        if (isEdge) {
          const wall = this.add.image(tx, ty, 'tile_wall').setDisplaySize(TILE, TILE);
          wall.setTint(0x666666);
        } else {
          const floor = this.add.image(tx, ty, 'tile_floor').setDisplaySize(TILE, TILE);
          floor.setTint(tint);
        }
      }
    }

    // Static wall colliders (invisible physics rectangles along edges)
    this.walls = this.physics.add.staticGroup();

    // Top wall
    const topWall = this.add.rectangle(GAME.WIDTH / 2, ARENA_Y + TILE / 2, ARENA_W, TILE, 0x000000, 0);
    this.physics.add.existing(topWall, true);
    this.walls.add(topWall);

    // Bottom wall
    const botWall = this.add.rectangle(GAME.WIDTH / 2, ARENA_Y + ARENA_H - TILE / 2, ARENA_W, TILE, 0x000000, 0);
    this.physics.add.existing(botWall, true);
    this.walls.add(botWall);

    // Left wall
    const leftWall = this.add.rectangle(ARENA_X + TILE / 2, GAME.HEIGHT / 2, TILE, ARENA_H, 0x000000, 0);
    this.physics.add.existing(leftWall, true);
    this.walls.add(leftWall);

    // Right wall
    const rightWall = this.add.rectangle(ARENA_X + ARENA_W - TILE / 2, GAME.HEIGHT / 2, TILE, ARENA_H, 0x000000, 0);
    this.physics.add.existing(rightWall, true);
    this.walls.add(rightWall);

    // Set world bounds to arena interior
    this.physics.world.setBounds(
      ARENA_X + TILE, ARENA_Y + TILE,
      ARENA_W - TILE * 2, ARENA_H - TILE * 2
    );
  }

  // ══════════════════════════════════════════════════════════════
  //  Input
  // ══════════════════════════════════════════════════════════════

  _setupInput() {
    // Auto-attack while holding left mouse button (checked in update)
    this.isAttacking = false;
    this.input.on('pointerdown', (pointer) => {
      if (pointer.leftButtonDown()) this.isAttacking = true;
    });
    this.input.on('pointerup', (pointer) => {
      if (!pointer.leftButtonDown()) this.isAttacking = false;
    });

    // Skill keys 1, 2, 3
    this.skillKeys = [
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
    ];

    for (let i = 0; i < 3; i++) {
      this.skillKeys[i].on('down', () => {
        if (this.playerDead || this.mapCleared) return;
        if (this.inventoryPanel && this.inventoryPanel.visible) return;

        const result = this.player.useSkill(i);
        if (result) {
          this.skillBar.highlightSkill(i);
          this.executeSkill(this.player, result);
          sound.play(_skillSoundFor(result.skillId));
        }
      });
    }

    // Inventory toggle
    this.tabKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
    this.tabKey.on('down', () => {
      if (this.inventoryPanel) {
        this.inventoryPanel.toggle();
        if (this.inventoryPanel.visible) {
          this.inventoryPanel.setItems(this.player.items);
        }
      }
    });

    // Dash on Space
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.spaceKey.on('down', () => {
      if (this.playerDead || this.mapCleared || this.isPaused) return;
      if (this.inventoryPanel && this.inventoryPanel.visible) return;
      const result = this.player.dash();
      if (result) { this._executeDash(result); sound.play('dash'); }
    });

    // Ultimate on R
    this.rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.rKey.on('down', () => {
      if (this.playerDead || this.mapCleared || this.isPaused) return;
      if (this.inventoryPanel && this.inventoryPanel.visible) return;
      const result = this.player.useUlt();
      if (result) this._executeUltimate(result);
    });

    // Escape - pause menu
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.escKey.on('down', () => {
      if (this.playerDead || this.mapCleared) return;
      if (this.isPaused) {
        this._resumeGame();
      } else {
        this._pauseGame();
      }
    });

    this.isPaused = false;
    this.pauseElements = [];
  }

  // ══════════════════════════════════════════════════════════════
  //  HUD
  // ══════════════════════════════════════════════════════════════

  _createHUD() {
    const charData = CHARACTERS[this.characterType];

    // HP bar (top left)
    this.hpBar = new HealthBar(this, 120, 28, 180, 18, this.player.maxHp, 0xff2222);
    this.hpBar.setScrollFactor(0);

    // HP label
    this.hpLabel = this.add.text(16, 20, 'HP', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ff4444', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(1000);

    // Mana bar
    this.manaBar = new ManaBar(this, 120, 52, 180, 14, this.player.maxMana, 0x4488ff);
    this.manaBar.setScrollFactor(0);

    this.manaLabel = this.add.text(16, 46, 'MP', {
      fontSize: '12px', fontFamily: 'monospace', color: '#4488ff', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(1000);

    // Ultimate charge bar
    if (charData.ultimate) {
      this.ultBarBg = this.add.rectangle(120, 70, 180, 10, 0x222222, 0.8)
        .setStrokeStyle(1, 0x555555).setScrollFactor(0).setDepth(1000);
      this.ultBarFill = this.add.rectangle(31, 70, 0, 8, charData.ultimate.color || 0xffcc00)
        .setOrigin(0, 0.5).setScrollFactor(0).setDepth(1001);
      this.ultLabel = this.add.text(16, 64, 'R', {
        fontSize: '10px', fontFamily: 'monospace', color: '#ffcc00', fontStyle: 'bold',
      }).setScrollFactor(0).setDepth(1001);
      this.ultText = this.add.text(210, 64, '', {
        fontSize: '9px', fontFamily: 'monospace', color: '#aaaaaa',
      }).setScrollFactor(0).setDepth(1001);
    }

    // Skill bar (bottom center)
    this.skillBar = new SkillBar(this, charData.skills);

    // Dash cooldown slot (next to skills)
    if (charData.dash) {
      this.skillBar.createDashSlot(this, charData.dash.type);
    }

    // Map progress (top center)
    const mapLabel = this.isBossMap ? 'BOSS' : `Map ${this.currentMap}/8`;
    this.mapText = this.add.text(GAME.WIDTH / 2, 16, mapLabel, {
      fontSize: '18px', fontFamily: 'monospace', color: '#ffcc00', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1000);

    // Wave progress
    this.waveText = this.add.text(GAME.WIDTH / 2, 38, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#cccccc',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1000);

    // Soul counter (top right)
    this.soulText = this.add.text(GAME.WIDTH - 16, 16, `Souls: ${this.souls}`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#cc88ff',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(1000);

    // Inventory panel
    this.inventoryPanel = new InventoryPanel(this);

    // Reward panel
    this.rewardPanel = new RewardPanel(this);

    // Controls HUD (bottom-left)
    this._createControlsHUD();
  }

  _createControlsHUD() {
    const x = 16;
    const y = GAME.HEIGHT - 16;
    const style = { fontSize: '10px', fontFamily: 'monospace', color: '#666688', lineSpacing: 3 };
    const dashName = { teleport: 'Blink', leap: 'Leap', dash: 'Dash', backflip: 'Backflip' };
    const dType = CHARACTERS[this.characterType].dash?.type || 'dash';
    const ultName = CHARACTERS[this.characterType].ultimate?.name || 'Ultimate';
    const lines = [
      'WASD  Move',
      'Mouse Aim',
      'Click Attack',
      '1-2-3 Skills',
      `R     ${ultName}`,
      `Space ${dashName[dType]}`,
      'Tab   Items',
    ];
    this.add.text(x, y, lines.join('\n'), style)
      .setOrigin(0, 1).setScrollFactor(0).setDepth(1000).setAlpha(0.7);
  }

  _updateHUD() {
    if (!this.player) return;
    const displayHp = Math.max(0, this.player.currentHp);
    this.hpBar.setValue(displayHp, this.player.maxHp);
    this.manaBar.setValue(this.player.currentMana, this.player.maxMana);
    this.soulText.setText(`Souls: ${this.souls + this.soulsEarned}`);

    // Skill cooldowns and mana checks
    const charData = CHARACTERS[this.characterType];
    for (let i = 0; i < charData.skills.length; i++) {
      const skillId = charData.skills[i];
      const skillDef = SKILLS[skillId];
      const remaining = this.player.skillCooldowns[skillId];
      const total = skillDef.cooldown * 1000;
      this.skillBar.updateCooldown(i, remaining / 1000, skillDef.cooldown);
      this.skillBar.setManaAvailable(i, this.player.currentMana >= skillDef.manaCost);
    }

    // Boss HP bar
    if (this.bossHpBar && this.boss && this.boss.active) {
      this.bossHpBar.setValue(this.boss.currentHp, this.boss.maxHp);
    }

    // Dash indicator (in skill bar)
    if (this.skillBar.dashSlot) {
      const info = this.player.getDashInfo();
      this.skillBar.updateDash(info);
    }

    // Ultimate charge bar
    if (this.ultBarFill) {
      const ultInfo = this.player.getUltInfo();
      if (ultInfo) {
        const ratio = Phaser.Math.Clamp(ultInfo.charge / ultInfo.chargeNeeded, 0, 1);
        this.ultBarFill.width = 178 * ratio;

        if (ultInfo.active) {
          this.ultText.setText(`${ultInfo.name} ACTIVE`);
          this.ultText.setColor('#ffcc00');
          this.ultBarFill.setFillStyle(0xffcc00);
          // Pulse effect
          this.ultBarFill.setAlpha(0.6 + Math.sin(Date.now() / 150) * 0.4);
        } else if (ultInfo.ready) {
          this.ultText.setText(`${ultInfo.name} READY!`);
          this.ultText.setColor('#ffcc00');
          this.ultBarFill.setAlpha(0.8 + Math.sin(Date.now() / 200) * 0.2);
        } else {
          const pct = Math.floor(ratio * 100);
          this.ultText.setText(`${ultInfo.name} ${pct}%`);
          this.ultText.setColor('#888888');
          this.ultBarFill.setAlpha(1);
        }
      }
    }
  }

  _updateWaveText() {
    if (this.isBossMap) {
      this.waveText.setText('Defeat the Dragon Knight!');
    } else {
      this.waveText.setText(`Wave ${this.currentWaveIndex + 1}/${this.totalWaves}`);
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  Colliders
  // ══════════════════════════════════════════════════════════════

  _setupColliders() {
    // Player projectiles vs enemies
    this.physics.add.overlap(this.playerProjectiles, this.enemies, (proj, enemy) => {
      this._onPlayerProjectileHitEnemy(proj, enemy);
    });

    // Player projectiles vs boss (if present, checked manually)
    // We'll handle boss overlap in update or via separate collider when boss spawns

    // Enemy projectiles vs player. Phaser may swap callback arg order; pick
    // whichever arg isn't the player, otherwise the hit handler's cleanup
    // (setActive/setVisible(false), destroy) runs on the player itself.
    this.physics.add.overlap(this.enemyProjectiles, this.player, (a, b) => {
      const proj = a === this.player ? b : a;
      this._onEnemyProjectileHitPlayer(proj);
    });

    // Player vs enemies (contact damage)
    this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
      this._onPlayerContactEnemy(enemy);
    });

    // Player vs walls
    this.physics.add.collider(this.player, this.walls);

    // Enemies vs walls
    this.physics.add.collider(this.enemies, this.walls);

    // Traps vs enemies
    this.physics.add.overlap(this.traps, this.enemies, (trap, enemy) => {
      if (trap._armed) {
        this._detonateTrap(trap, enemy);
      }
    });
  }

  _addBossColliders() {
    if (!this.boss) return;

    // Player projectiles vs boss
    this.physics.add.overlap(this.playerProjectiles, this.boss, (a, b) => {
      // Phaser may swap argument order - figure out which is the projectile
      const proj = (a && typeof a.kill === 'function') ? a : (b && typeof b.kill === 'function') ? b : null;
      const boss = (a && typeof a.takeDamage === 'function') ? a : (b && typeof b.takeDamage === 'function') ? b : null;
      if (proj && boss) this._onPlayerProjectileHitBoss(proj, boss);
    });

    // Boss vs walls
    this.physics.add.collider(this.boss, this.walls);

    // Player vs boss (contact damage)
    this.physics.add.overlap(this.player, this.boss, () => {
      this._onPlayerContactBoss();
    });

    // Traps vs boss
    this.physics.add.overlap(this.traps, this.boss, (a, b) => {
      const trap = (a && a._armed !== undefined) ? a : (b && b._armed !== undefined) ? b : null;
      const boss = (a && typeof a.takeDamage === 'function') ? a : (b && typeof b.takeDamage === 'function') ? b : null;
      if (trap && trap._armed && boss) {
        this._detonateTrapOnBoss(trap, boss);
      }
    });
  }

  // ── Collision callbacks ──

  _onPlayerProjectileHitEnemy(proj, enemy) {
    if (!proj || !proj.active || !enemy || !enemy.active) return;
    if (!proj._hitTargets) proj._hitTargets = new Set();
    if (proj._hitTargets.has(enemy)) return;

    proj._hitTargets.add(enemy);

    let damage = proj.damage;
    let isCrit = false;

    // Crit check
    if (proj.critChance > 0 && Math.random() < proj.critChance) {
      damage = Math.round(damage * proj.critMultiplier);
      isCrit = true;
    }

    const actual = enemy.takeDamage(damage);
    DamageText.show(this, enemy.x, enemy.y - 16, actual, isCrit ? 0xffff00 : 0xffffff, isCrit);

    // Apply status effect
    if (proj.effect && enemy.active) {
      const effectData = {};
      if (proj.effect === 'burn' || proj.effect === 'poison') {
        effectData.damage = proj.effectDamage || 5;
        effectData.tickRate = 0.5;
        effectData.stacking = proj.effect === 'poison';
      }
      enemy.applyStatusEffect(proj.effect, proj.effectDuration, effectData);
    }

    // Screen shake on big hits
    if (actual > 25) {
      this.cameras.main.shake(80, 0.005);
    }

    // AoE explosion on impact
    if (proj.explosionRadius > 0) {
      this._createExplosion(proj.x, proj.y, proj.explosionRadius, proj.damage, proj.color);
    }

    // Lava pool on impact
    if (proj._lavaSkill) {
      this._spawnLavaPool(proj.x, proj.y, proj._explosionRadius, proj._lavaDuration, proj._lavaDamage, proj.color);
    }

    if (!proj.piercing) {
      proj.kill();
    }
  }

  _onPlayerProjectileHitBoss(proj, boss) {
    if (!proj || !proj.active || !boss || !boss.active) return;
    if (typeof boss.takeDamage !== 'function') return;
    if (!proj._hitTargets) proj._hitTargets = new Set();
    if (proj._hitTargets.has(boss)) return;

    proj._hitTargets.add(boss);

    let damage = proj.damage;
    let isCrit = false;

    if (proj.critChance > 0 && Math.random() < proj.critChance) {
      damage = Math.round(damage * proj.critMultiplier);
      isCrit = true;
    }

    const actual = boss.takeDamage(damage);
    DamageText.show(this, boss.x, boss.y - 32, actual, isCrit ? 0xffff00 : 0xffffff, isCrit);

    if (proj.effect && boss.active) {
      const effectData = {};
      if (proj.effect === 'burn') {
        effectData.damage = proj.effectDamage || 5;
        effectData.tickRate = 0.5;
      }
      boss.applyStatusEffect(proj.effect, proj.effectDuration, effectData);
    }

    if (actual > 30) {
      this.cameras.main.shake(100, 0.008);
    }

    if (proj.explosionRadius > 0) {
      this._createExplosion(proj.x, proj.y, proj.explosionRadius, proj.damage, proj.color);
    }

    if (proj._lavaSkill) {
      this._spawnLavaPool(proj.x, proj.y, proj._explosionRadius, proj._lavaDuration, proj._lavaDamage, proj.color);
    }

    if (!proj.piercing) {
      proj.kill();
    }
  }

  _onEnemyProjectileHitPlayer(proj) {
    if (!proj || !proj.active || proj._killed || this.player.isInvulnerable) return;

    const actual = this.player.takeDamage(proj.damage || 5);
    DamageText.show(this, this.player.x, this.player.y - 16, actual, 0xff4444);
    this.cameras.main.shake(60, 0.004);

    // Mark killed + deactivate immediately so no further overlap fires.
    // NEVER call destroy() synchronously from inside a physics overlap
    // callback — Phaser's collision iterator is still holding the body
    // and will throw "Cannot read properties of undefined (reading
    // 'destroy')" when it tries to preDestroy the torn-down sprite.
    proj._killed = true;
    if (proj.body) proj.body.enable = false;
    proj.setActive(false);
    proj.setVisible(false);
    this.time.delayedCall(0, () => {
      if (proj && proj.scene && !proj._destroyed) {
        proj._destroyed = true;
        proj.destroy();
      }
    });
  }

  _onPlayerContactEnemy(enemy) {
    if (!enemy.active || this.player.isInvulnerable) return;
    if (this.contactDamageTimer > 0) return;

    this.contactDamageTimer = 0.5; // tick every 0.5s
    const damage = Math.max(1, Math.floor(enemy.stats.attack * 0.3));
    const actual = this.player.takeDamage(damage);
    DamageText.show(this, this.player.x, this.player.y - 16, actual, 0xff6666);
  }

  _onPlayerContactBoss() {
    if (!this.boss || !this.boss.active || this.player.isInvulnerable) return;
    if (this.contactDamageTimer > 0) return;

    this.contactDamageTimer = 0.5;
    const damage = Math.max(1, Math.floor(this.boss.stats.attack * 0.4));
    const actual = this.player.takeDamage(damage);
    DamageText.show(this, this.player.x, this.player.y - 16, actual, 0xff4444);
    this.cameras.main.shake(80, 0.006);
  }

  // ══════════════════════════════════════════════════════════════
  //  Entity Events
  // ══════════════════════════════════════════════════════════════

  _setupEntityEvents() {
    // ── Player events ──

    this.events.on('player-shoot', (data) => {
      this._createPlayerProjectile(data);
      sound.play('attack_shoot', { minGap: 0.08 });
    });

    this.events.on('player-melee', (data) => {
      sound.play('attack_melee', { minGap: 0.08 });
    });

    this.events.on('player-damaged', (data) => {
      this._flashVignette(0xff0000, 150);
      this.runStats.damageTaken += data.damage || 0;
      sound.play('hit_player', { minGap: 0.1 });
    });

    this.events.on('player-died', () => {
      this._onPlayerDeath();
      sound.play('death_player');
    });

    // ── Enemy events ──

    this.events.on('enemy-attack', (data) => {
      // Melee attack: check distance to player
      const dist = Phaser.Math.Distance.Between(data.enemy.x, data.enemy.y, this.player.x, this.player.y);
      if (dist <= data.enemy.enemyData.attackRange + 10) {
        const actual = this.player.takeDamage(data.damage);
        DamageText.show(this, this.player.x, this.player.y - 16, actual, 0xff4444);
        this.cameras.main.shake(50, 0.003);
      }
    });

    this.events.on('enemy-shoot', (data) => {
      this._createEnemyProjectile(data);
    });

    this.events.on('enemy-debuff', (data) => {
      if (data.target === this.player) {
        this.player.applyStatusEffect(data.type, data.duration);
      }
    });

    this.events.on('enemy-died', (data) => {
      this.soulsEarned += data.soulValue;
      this.runStats.enemiesKilled++;
      this._spawnDeathParticles(data.x, data.y, data.enemy ? data.enemy.enemyData.color : 0xffffff);
      sound.play('death_enemy', { minGap: 0.05 });
    });

    this.events.on('enemy-hit', (data) => {
      this.runStats.damageDealt += data.damage || 0;
      this.player.addUltCharge(data.damage || 0);
      sound.play('hit_enemy', { minGap: 0.04 });
    });

    // ── Boss events ──

    this.events.on('boss-attack', (data) => {
      this._handleBossAttack(data);
    });

    this.events.on('boss-attack-telegraph', (data) => {
      this._showBossTelegraph(data);
    });

    this.events.on('boss-spawn-minions', (data) => {
      this._spawnBossMinions(data);
    });

    this.events.on('boss-died', (data) => {
      this.runStats.bossesKilled++;
      this._onBossDeath(data);
      sound.play('death_boss');
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  Wave System
  // ══════════════════════════════════════════════════════════════

  _spawnWave(waveIndex) {
    if (!this.wavesData || waveIndex >= this.wavesData.length) return;

    this.currentWaveIndex = waveIndex;
    this.betweenWaves = false;
    this._updateWaveText();

    const waveData = this.wavesData[waveIndex];

    for (const [enemyType, count] of Object.entries(waveData.enemies)) {
      for (let i = 0; i < count; i++) {
        const pos = this._randomEdgePosition();
        const enemy = new Enemy(this, pos.x, pos.y, enemyType);
        this.enemies.add(enemy);

        // Spawn animation: fade in + scale up
        enemy.setAlpha(0);
        enemy.setScale(0);
        this.tweens.add({
          targets: enemy,
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          duration: 300,
          ease: 'Back.easeOut',
          delay: i * 80, // stagger spawns
        });
      }
    }
  }

  _checkWaveComplete() {
    const aliveEnemies = this.enemies.getChildren().filter(e => e && e.active);
    if (aliveEnemies.length > 0) return;

    // Current wave cleared
    this.runStats.wavesCleared++;
    if (this.currentWaveIndex < this.totalWaves - 1) {
      // More waves to go
      this.betweenWaves = true;
      this.time.delayedCall(1500, () => {
        this._spawnWave(this.currentWaveIndex + 1);
      });
    } else {
      // All waves cleared
      this._onMapCleared();
    }
  }

  _onMapCleared() {
    this.mapCleared = true;
    this.runStats.mapsCleared++;
    sound.play('level_complete');

    // Award map souls
    this.soulsEarned += GAME.SOUL_PER_MAP;

    // "MAP CLEARED!" text
    const clearedText = this.add.text(GAME.WIDTH / 2, GAME.HEIGHT / 2 - 40, 'MAP CLEARED!', {
      fontSize: '36px', fontFamily: 'monospace', color: '#ffcc00', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5, 0.5).setDepth(2000).setScrollFactor(0);

    this.tweens.add({
      targets: clearedText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 300,
      yoyo: true,
      ease: 'Power2',
    });

    // After brief pause, show reward
    this.time.delayedCall(1500, () => {
      clearedText.destroy();
      this._showRewards();
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  Boss Fight
  // ══════════════════════════════════════════════════════════════

  _spawnBoss() {
    const bossType = 'dragon_knight';
    const bx = GAME.WIDTH / 2;
    const by = ARENA_Y + TILE * 3;

    this.boss = new Boss(this, bx, by, bossType);
    this.boss.body.setCollideWorldBounds(true);

    // Spawn animation
    this.boss.setAlpha(0);
    this.boss.setScale(0);
    this.tweens.add({
      targets: this.boss,
      alpha: 1,
      scaleX: this.boss.bossData.size,
      scaleY: this.boss.bossData.size,
      duration: 800,
      ease: 'Back.easeOut',
    });

    // Boss HP bar (large, at top)
    this.bossHpBar = new HealthBar(this, GAME.WIDTH / 2, 70, 400, 22, this.boss.maxHp, 0xcc2200);
    this.bossHpBar.setScrollFactor(0);

    this.bossNameText = this.add.text(GAME.WIDTH / 2, 52, this.boss.bossData.name, {
      fontSize: '14px', fontFamily: 'monospace', color: '#ff6600', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(1000);

    this._addBossColliders();
  }

  _handleBossAttack(data) {
    switch (data.type) {
      case 'dash':
        this._handleBossDash(data);
        break;
      case 'cone_dot':
        this._handleBossConeDot(data);
        break;
      case 'aoe':
        this._handleBossAoe(data);
        break;
      case 'radial':
        this._handleBossRadial(data);
        break;
    }
  }

  _handleBossDash(data) {
    // Trail effect along dash path
    const trailCount = 5;
    for (let i = 0; i < trailCount; i++) {
      this.time.delayedCall(i * 60, () => {
        if (!this.boss || !this.boss.active) return;
        const trail = this.add.rectangle(this.boss.x, this.boss.y, 48, 48, 0xff4400, 0.5);
        trail.setDepth(5);
        this.tweens.add({
          targets: trail,
          alpha: 0,
          scaleX: 0.5,
          scaleY: 0.5,
          duration: 400,
          onComplete: () => trail.destroy(),
        });
      });
    }

    // Check player collision during dash
    const dashCheck = this.time.addEvent({
      delay: 50,
      repeat: 15,
      callback: () => {
        if (!this.boss || !this.boss.active || this.player.isInvulnerable) return;
        const dist = Phaser.Math.Distance.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
        if (dist < 50) {
          const actual = this.player.takeDamage(data.damage);
          DamageText.show(this, this.player.x, this.player.y - 16, actual, 0xff4444);
          this.cameras.main.shake(150, 0.01);
          dashCheck.destroy();
        }
      },
    });
  }

  _handleBossConeDot(data) {
    // Show cone area effect
    const graphics = this.add.graphics();
    graphics.setDepth(5);

    const halfAngle = Phaser.Math.DegToRad(data.coneAngle / 2);
    const duration = data.duration * 1000;
    const tickMs = data.tickRate * 1000;
    let elapsed = 0;

    const coneEvent = this.time.addEvent({
      delay: tickMs,
      repeat: Math.floor(duration / tickMs) - 1,
      callback: () => {
        elapsed += tickMs;
        if (!this.boss || !this.boss.active) {
          coneEvent.destroy();
          graphics.destroy();
          return;
        }

        // Draw cone visual
        graphics.clear();
        graphics.fillStyle(0xff4400, 0.2);
        graphics.beginPath();
        graphics.moveTo(this.boss.x, this.boss.y);
        const startAngle = data.angle - halfAngle;
        const endAngle = data.angle + halfAngle;
        graphics.arc(this.boss.x, this.boss.y, data.range, startAngle, endAngle, false);
        graphics.closePath();
        graphics.fillPath();

        // Check if player is in cone
        const dist = Phaser.Math.Distance.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
        if (dist <= data.range) {
          const angleToPlayer = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
          const angleDiff = Phaser.Math.Angle.Wrap(angleToPlayer - data.angle);
          if (Math.abs(angleDiff) <= halfAngle) {
            if (!this.player.isInvulnerable) {
              const actual = this.player.takeDamage(data.damage);
              DamageText.show(this, this.player.x, this.player.y - 16, actual, 0xff6600);
            }
          }
        }

        if (elapsed >= duration) {
          graphics.destroy();
        }
      },
    });
  }

  _handleBossAoe(data) {
    // Explosion effect at position
    const circle = this.add.circle(data.x, data.y, data.radius, 0xff4400, 0.4);
    circle.setDepth(5);

    this.tweens.add({
      targets: circle,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 500,
      onComplete: () => circle.destroy(),
    });

    // Damage player if in radius
    const dist = Phaser.Math.Distance.Between(data.x, data.y, this.player.x, this.player.y);
    if (dist <= data.radius && !this.player.isInvulnerable) {
      const actual = this.player.takeDamage(data.damage);
      DamageText.show(this, this.player.x, this.player.y - 16, actual, 0xff4444);
      this.cameras.main.shake(200, 0.015);
    }
  }

  _handleBossRadial(data) {
    for (const projData of data.projectiles) {
      const proj = new Projectile(this, data.x, data.y, 'proj_boss_fire', {
        damage: projData.damage,
        range: 500,
        source: 'enemy',
        color: 0xff4400,
      });
      this.enemyProjectiles.add(proj);
      this.physics.velocityFromAngle(
        Phaser.Math.RadToDeg(projData.angle),
        projData.speed,
        proj.body.velocity
      );
    }
  }

  _showBossTelegraph(data) {
    if (data.type === 'aoe') {
      // Red circle telegraph that fills up
      const telegraph = this.add.circle(data.x, data.y, data.radius, 0xff0000, 0);
      telegraph.setStrokeStyle(2, 0xff4444, 0.8);
      telegraph.setDepth(4);

      this.tweens.add({
        targets: telegraph,
        fillAlpha: 0.25,
        duration: data.duration,
        onComplete: () => telegraph.destroy(),
      });
    }
  }

  _spawnBossMinions(data) {
    for (const pos of data.positions) {
      // Clamp positions to arena bounds
      const clampedX = Phaser.Math.Clamp(pos.x, ARENA_X + TILE * 2, ARENA_X + ARENA_W - TILE * 2);
      const clampedY = Phaser.Math.Clamp(pos.y, ARENA_Y + TILE * 2, ARENA_Y + ARENA_H - TILE * 2);

      const minion = new Enemy(this, clampedX, clampedY, data.type);
      this.enemies.add(minion);

      // Spawn animation
      minion.setAlpha(0);
      minion.setScale(0);
      this.tweens.add({
        targets: minion,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 300,
        ease: 'Back.easeOut',
      });
    }
  }

  _onBossDeath(data) {
    this.mapCleared = true;
    this.soulsEarned += data.soulValue + GAME.SOUL_BOSS_BONUS;

    // Camera shake
    this.cameras.main.shake(500, 0.02);

    // "ACT 1 COMPLETE!" text
    this.time.delayedCall(2000, () => {
      const completeText = this.add.text(GAME.WIDTH / 2, GAME.HEIGHT / 2 - 60, 'ACT 1 COMPLETE!', {
        fontSize: '42px', fontFamily: 'monospace', color: '#ffcc00', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 5,
      }).setOrigin(0.5, 0.5).setDepth(2000).setScrollFactor(0);

      const soulsText = this.add.text(GAME.WIDTH / 2, GAME.HEIGHT / 2, `+${this.soulsEarned} Souls Earned`, {
        fontSize: '20px', fontFamily: 'monospace', color: '#cc88ff',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5, 0.5).setDepth(2000).setScrollFactor(0);

      const returnBtn = this.add.text(GAME.WIDTH / 2, GAME.HEIGHT / 2 + 60, '[ Return to Lobby ]', {
        fontSize: '18px', fontFamily: 'monospace', color: '#ffffff',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5, 0.5).setDepth(2000).setScrollFactor(0).setInteractive({ useHandCursor: true });

      returnBtn.on('pointerover', () => returnBtn.setColor('#ffcc00'));
      returnBtn.on('pointerout', () => returnBtn.setColor('#ffffff'));
      returnBtn.on('pointerdown', () => {
        this._saveSouls();
        this.scene.start('Lobby', {
          character: this.characterType,
          souls: this.souls + this.soulsEarned,
          upgrades: this.upgrades,
        });
      });
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  Rewards (between maps)
  // ══════════════════════════════════════════════════════════════

  async _showRewards() {
    const luckBonus = (this.upgrades.drop_luck || 0) * 5;
    const choices = generateRewardChoices(this.characterType, luckBonus);

    const result = await this.rewardPanel.showRewards(choices);

    if (result.type === 'item') {
      const item = result.data;
      const equipped = this.player.equipItem(item);
      if (!equipped) {
        await this._showReplacePrompt(item);
      }
      this.runStats.itemsCollected++;
      sound.play('pickup_item');
    } else if (result.type === 'heal') {
      const healAmount = Math.floor(this.player.maxHp * (result.data.amount || 0.4));
      this.player.heal(healAmount);
      DamageText.showHeal(this, this.player.x, this.player.y - 16, healAmount);
      sound.play('heal');
    } else if (result.type === 'boost') {
      const boost = result.data;
      this.player.stats[boost.stat] = (this.player.stats[boost.stat] || 0) + boost.amount;
      if (boost.stat === 'hp') {
        this.player.maxHp += boost.amount;
        this.player.currentHp += boost.amount;
      } else if (boost.stat === 'mana') {
        this.player.maxMana += boost.amount;
        this.player.currentMana += boost.amount;
      }
    }

    // Load next map
    this._loadNextMap();
  }

  _showReplacePrompt(newItem) {
    return new Promise((resolve) => {
      const overlay = this.add.rectangle(
        GAME.WIDTH / 2, GAME.HEIGHT / 2,
        GAME.WIDTH, GAME.HEIGHT,
        0x000000, 0.7
      ).setDepth(3000).setScrollFactor(0);

      const titleText = this.add.text(GAME.WIDTH / 2, 100, 'Inventory Full! Choose item to replace:', {
        fontSize: '18px', fontFamily: 'monospace', color: '#ffcc00', fontStyle: 'bold',
      }).setOrigin(0.5, 0.5).setDepth(3001).setScrollFactor(0);

      const elements = [overlay, titleText];

      // Show current items as clickable options
      const items = this.player.items;
      const startY = 160;
      const slotH = 50;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const iy = startY + i * slotH;
        const rarityColor = item.rarityDef ? '#' + item.rarityDef.color.toString(16).padStart(6, '0') : '#aaaaaa';

        const slotBg = this.add.rectangle(GAME.WIDTH / 2, iy, 400, 40, 0x222233, 0.9);
        slotBg.setStrokeStyle(1, 0x555555);
        slotBg.setDepth(3001).setScrollFactor(0).setInteractive({ useHandCursor: true });

        const slotText = this.add.text(GAME.WIDTH / 2, iy, `${item.name} [${item.rarityDef ? item.rarityDef.name : '?'}]`, {
          fontSize: '13px', fontFamily: 'monospace', color: rarityColor,
        }).setOrigin(0.5, 0.5).setDepth(3002).setScrollFactor(0);

        elements.push(slotBg, slotText);

        slotBg.on('pointerover', () => slotBg.setStrokeStyle(2, 0xffcc00));
        slotBg.on('pointerout', () => slotBg.setStrokeStyle(1, 0x555555));

        slotBg.on('pointerdown', () => {
          if (this.player && this.player.scene) {
            this.player.unequipItem(i);
            this.player.equipItem(newItem);
          }
          elements.forEach(el => { if (el && el.scene) el.destroy(); });
          resolve();
        });
      }

      // "Discard new item" option
      const discardY = startY + items.length * slotH + 20;
      const discardBg = this.add.rectangle(GAME.WIDTH / 2, discardY, 400, 40, 0x332222, 0.9);
      discardBg.setStrokeStyle(1, 0x555555);
      discardBg.setDepth(3001).setScrollFactor(0).setInteractive({ useHandCursor: true });

      const discardText = this.add.text(GAME.WIDTH / 2, discardY, 'Discard new item', {
        fontSize: '13px', fontFamily: 'monospace', color: '#ff6666',
      }).setOrigin(0.5, 0.5).setDepth(3002).setScrollFactor(0);

      elements.push(discardBg, discardText);

      discardBg.on('pointerover', () => discardBg.setStrokeStyle(2, 0xff4444));
      discardBg.on('pointerout', () => discardBg.setStrokeStyle(1, 0x555555));
      discardBg.on('pointerdown', () => {
        elements.forEach(el => el.destroy());
        resolve();
      });
    });
  }

  _loadNextMap() {
    const nextMap = this.currentMap + 1;
    if (nextMap > GAME.TOTAL_MAPS + 1) {
      // Beyond boss — shouldn't happen, go to lobby
      this._saveSouls();
      this.scene.start('Lobby', {
        character: this.characterType,
        souls: this.souls + this.soulsEarned,
        upgrades: this.upgrades,
      });
      return;
    }

    this.scene.restart({
      character: this.characterType,
      currentMap: nextMap,
      items: this.player.items,
      currentHp: this.player.currentHp,
      souls: this.souls + this.soulsEarned,
      upgrades: this.upgrades,
      runStats: this.runStats,
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  Player Death
  // ══════════════════════════════════════════════════════════════

  _onPlayerDeath() {
    if (this.playerDead) return;
    this.playerDead = true;

    if (this.player.body) {
      this.player.setVelocity(0, 0);
      this.player.body.enable = false;
    }

    // Camera shake
    this.cameras.main.shake(400, 0.02);

    // Fade player out (tween tracked so we can kill it if revived)
    this.tweens.killTweensOf(this.player);
    this.tweens.add({
      targets: this.player,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => {
        // If somehow not dead anymore, restore alpha
        if (!this.playerDead && this.player) {
          this.player.setAlpha(1);
        }
      },
    });

    // Death particles
    this._spawnParticleBurst(this.player.x, this.player.y, 0xff2222, 15);

    // Death modal after brief delay
    this.time.delayedCall(1000, () => {
      const cx = GAME.WIDTH / 2;
      const cy = GAME.HEIGHT / 2;
      const depth = 5000;

      // Full-screen dark overlay
      const overlay = this.add.rectangle(cx, cy, GAME.WIDTH, GAME.HEIGHT, 0x000000, 0)
        .setDepth(depth).setScrollFactor(0);
      this.tweens.add({ targets: overlay, fillAlpha: 0.85, duration: 500 });

      // Modal panel
      const panelW = 420;
      const panelH = 440;
      const panel = this.add.rectangle(cx, cy, panelW, panelH, 0x111118, 0.95)
        .setStrokeStyle(2, 0x882222).setDepth(depth + 1).setScrollFactor(0);
      panel.setAlpha(0);
      this.tweens.add({ targets: panel, alpha: 1, duration: 400, delay: 200 });

      // Inner border
      const innerBorder = this.add.rectangle(cx, cy, panelW - 12, panelH - 12)
        .setStrokeStyle(1, 0x442222, 0.5).setFillStyle().setDepth(depth + 1).setScrollFactor(0);

      // "YOU DIED" title
      const title = this.add.text(cx, cy - panelH / 2 + 40, 'YOU DIED', {
        fontSize: '38px', fontFamily: 'monospace', color: '#ff2222', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(depth + 2).setScrollFactor(0).setAlpha(0);

      this.tweens.add({
        targets: title, alpha: 1, scaleX: { from: 1.3, to: 1 }, scaleY: { from: 1.3, to: 1 },
        duration: 400, delay: 300, ease: 'Back.easeOut',
      });

      // Subtitle
      const charName = CHARACTERS[this.characterType].name;
      const subtitle = this.add.text(cx, cy - panelH / 2 + 75, `${charName} fell on Map ${this.currentMap}`, {
        fontSize: '13px', fontFamily: 'monospace', color: '#886666',
      }).setOrigin(0.5).setDepth(depth + 2).setScrollFactor(0);

      // Divider
      const divider = this.add.rectangle(cx, cy - panelH / 2 + 95, panelW - 60, 1, 0x442222)
        .setDepth(depth + 2).setScrollFactor(0);

      // Run stats
      const stats = this.runStats;
      const statLines = [
        { label: 'Enemies Killed',  value: stats.enemiesKilled,                      color: '#ff6644' },
        { label: 'Bosses Slain',    value: stats.bossesKilled,                       color: '#ffcc00' },
        { label: 'Maps Cleared',    value: stats.mapsCleared,                        color: '#44aaff' },
        { label: 'Waves Survived',  value: stats.wavesCleared,                       color: '#44aaff' },
        { label: 'Damage Dealt',    value: stats.damageDealt.toLocaleString(),        color: '#ff8844' },
        { label: 'Damage Taken',    value: stats.damageTaken.toLocaleString(),        color: '#ff4444' },
        { label: 'Skills Used',     value: stats.skillsUsed,                         color: '#aa88ff' },
        { label: 'Items Collected', value: stats.itemsCollected,                     color: '#44ff88' },
      ];

      const startY = cy - panelH / 2 + 115;
      const rowH = 24;

      statLines.forEach((stat, i) => {
        const y = startY + i * rowH;
        this.add.text(cx - panelW / 2 + 40, y, stat.label, {
          fontSize: '13px', fontFamily: 'monospace', color: '#999999',
        }).setOrigin(0, 0.5).setDepth(depth + 2).setScrollFactor(0);

        this.add.text(cx + panelW / 2 - 40, y, `${stat.value}`, {
          fontSize: '13px', fontFamily: 'monospace', color: stat.color, fontStyle: 'bold',
        }).setOrigin(1, 0.5).setDepth(depth + 2).setScrollFactor(0);
      });

      // Divider before souls
      const divider2Y = startY + statLines.length * rowH + 8;
      this.add.rectangle(cx, divider2Y, panelW - 60, 1, 0x442222)
        .setDepth(depth + 2).setScrollFactor(0);

      // Souls earned (prominent)
      const soulsY = divider2Y + 28;
      this.add.text(cx, soulsY, `+${this.soulsEarned} Souls`, {
        fontSize: '22px', fontFamily: 'monospace', color: '#cc88ff', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(depth + 2).setScrollFactor(0);

      // Return to Lobby button
      const btnY = cy + panelH / 2 - 45;
      const btnW = 240;
      const btnH = 44;
      const btnBg = this.add.rectangle(cx, btnY, btnW, btnH, 0x331111, 0.9)
        .setStrokeStyle(2, 0x882222).setDepth(depth + 2).setScrollFactor(0)
        .setInteractive({ useHandCursor: true });

      const btnText = this.add.text(cx, btnY, 'RETURN TO LOBBY', {
        fontSize: '16px', fontFamily: 'monospace', color: '#ff8888', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(depth + 3).setScrollFactor(0);

      btnBg.on('pointerover', () => {
        btnBg.setFillStyle(0x552222, 1);
        btnBg.setStrokeStyle(2, 0xcc4444);
        btnText.setColor('#ffcccc');
      });
      btnBg.on('pointerout', () => {
        btnBg.setFillStyle(0x331111, 0.9);
        btnBg.setStrokeStyle(2, 0x882222);
        btnText.setColor('#ff8888');
      });
      btnBg.on('pointerdown', () => {
        this._saveSouls();
        this.scene.start('Lobby', {
          character: this.characterType,
          souls: this.souls + this.soulsEarned,
          upgrades: this.upgrades,
        });
      });
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  Skill Execution — the core combat choreography
  // ══════════════════════════════════════════════════════════════

  executeSkill(player, result) {
    const { skillId, skillDef } = result;
    this.runStats.skillsUsed++;

    switch (skillDef.type) {
      case 'projectile':
        this._executeProjectileSkill(player, result);
        break;
      case 'cone':
        this._executeConeSkill(player, result);
        break;
      case 'chain':
        this._executeChainSkill(player, result);
        break;
      case 'melee_arc':
        this._executeMeleeArcSkill(player, result);
        break;
      case 'self_buff':
        this._executeSelfBuffSkill(player, result);
        break;
      case 'wave':
        this._executeWaveSkill(player, result);
        break;
      case 'wave_fire':
        this._executeWaveFireSkill(player, result);
        break;
      case 'area':
        this._executeAreaSkill(player, result);
        break;
      case 'trap':
        this._executeTrapSkill(player, result);
        break;
      case 'multi_projectile':
        this._executeMultiProjectileSkill(player, result);
        break;
      case 'projectile_aoe':
        this._executeProjectileAoeSkill(player, result);
        break;
      case 'projectile_lava':
        this._executeProjectileLavaSkill(player, result);
        break;
    }
  }

  // ── Projectile skill (e.g. Fireball, Precise Shot) ──
  _executeProjectileSkill(player, result) {
    const { skillDef } = result;
    const texKey = skillDef.color === 0xff4400 ? 'proj_fireball' : 'particle_white';
    const proj = new Projectile(this, player.x, player.y, texKey, {
      damage: Math.round(calculateDamage(player.stats.attack, 0, skillDef.damage) * player.getDamageMultiplier()),
      range: skillDef.range,
      source: 'player',
      effect: skillDef.effect || null,
      effectDuration: skillDef.effectDuration || 0,
      effectDamage: skillDef.effectDamage || 0,
      piercing: skillDef.piercing || false,
      critChance: skillDef.critChance || 0,
      critMultiplier: skillDef.critMultiplier || 1,
      color: skillDef.color,
      skillDef,
    });

    // Enhance mage projectiles
    if (this.characterType === 'mage') {
      proj.setScale(2.0);
      proj.trail = true;
    }

    this.playerProjectiles.add(proj);
    proj.body.setVelocity(result.directionX * skillDef.speed, result.directionY * skillDef.speed);

    // Muzzle flash
    this._spawnParticleBurst(player.x, player.y, skillDef.particleColor, 6);
  }

  // ── Cone skill (e.g. Frost) ──
  _executeConeSkill(player, result) {
    const { skillDef } = result;
    const halfAngle = Phaser.Math.DegToRad(skillDef.coneAngle / 2);

    // Visual: draw cone flash
    const graphics = this.add.graphics();
    graphics.setDepth(5);
    graphics.fillStyle(skillDef.color, 0.3);
    graphics.beginPath();
    graphics.moveTo(player.x, player.y);
    graphics.arc(player.x, player.y, skillDef.range, result.angle - halfAngle, result.angle + halfAngle, false);
    graphics.closePath();
    graphics.fillPath();

    // Fade out
    this.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 400,
      onComplete: () => graphics.destroy(),
    });

    // Particles along the cone
    this._spawnParticleBurst(
      player.x + Math.cos(result.angle) * skillDef.range * 0.5,
      player.y + Math.sin(result.angle) * skillDef.range * 0.5,
      skillDef.particleColor, 8
    );

    // Hit check: all enemies in cone
    const targets = this._getTargetsInCone(player.x, player.y, result.angle, halfAngle, skillDef.range);
    const damage = Math.round(calculateDamage(player.stats.attack, 0, skillDef.damage) * player.getDamageMultiplier());

    for (const target of targets) {
      const actual = target.takeDamage(damage);
      DamageText.show(this, target.x, target.y - 16, actual, skillDef.color);

      if (skillDef.effect && target.active) {
        const effectData = {};
        if (skillDef.effect === 'burn') {
          effectData.damage = skillDef.effectDamage || 5;
          effectData.tickRate = 0.5;
        }
        target.applyStatusEffect(skillDef.effect, skillDef.effectDuration, effectData);
      }
    }
  }

  // ── Chain skill (e.g. Lightning) ──
  _executeChainSkill(player, result) {
    const { skillDef } = result;
    const damage = Math.round(calculateDamage(player.stats.attack, 0, skillDef.damage) * player.getDamageMultiplier());

    // Find initial target: nearest enemy to mouse click
    const allTargets = this._getAllAliveTargets();
    let current = this._findClosestTo(result.targetX, result.targetY, allTargets);

    if (!current) return;

    const hit = new Set();
    const chainSequence = [current];
    hit.add(current);

    // Build chain
    for (let i = 1; i < skillDef.chainCount; i++) {
      const candidates = allTargets.filter(t =>
        !hit.has(t) && t.active &&
        Phaser.Math.Distance.Between(current.x, current.y, t.x, t.y) <= skillDef.chainRange
      );
      if (candidates.length === 0) break;
      const next = candidates.reduce((a, b) =>
        Phaser.Math.Distance.Between(current.x, current.y, a.x, a.y) <
        Phaser.Math.Distance.Between(current.x, current.y, b.x, b.y) ? a : b
      );
      chainSequence.push(next);
      hit.add(next);
      current = next;
    }

    // Execute chain with staggered timing
    let prevX = player.x;
    let prevY = player.y;

    chainSequence.forEach((target, idx) => {
      this.time.delayedCall(idx * 100, () => {
        if (!target.active) return;

        // Draw lightning bolt line
        const graphics = this.add.graphics();
        graphics.setDepth(6);
        this._drawLightningBolt(graphics, prevX, prevY, target.x, target.y, skillDef.color);
        this.tweens.add({
          targets: graphics,
          alpha: 0,
          duration: 250,
          onComplete: () => graphics.destroy(),
        });

        const actual = target.takeDamage(damage);
        DamageText.show(this, target.x, target.y - 16, actual, skillDef.color);

        if (skillDef.effect && target.active) {
          target.applyStatusEffect(skillDef.effect, skillDef.effectDuration);
        }

        this._spawnParticleBurst(target.x, target.y, skillDef.particleColor, 5);

        prevX = target.x;
        prevY = target.y;
      });
    });
  }

  // ── Melee Arc skill (e.g. Heavy Blade) ──
  _executeMeleeArcSkill(player, result) {
    const { skillDef } = result;
    const halfAngle = Phaser.Math.DegToRad(skillDef.arcAngle / 2);
    const damage = Math.round(calculateDamage(player.stats.attack, 0, skillDef.damage) * player.getDamageMultiplier());

    // Visual: sweeping arc
    const graphics = this.add.graphics();
    graphics.setDepth(5);
    graphics.fillStyle(skillDef.color, 0.4);
    graphics.beginPath();
    graphics.moveTo(player.x, player.y);
    graphics.arc(player.x, player.y, skillDef.range, result.angle - halfAngle, result.angle + halfAngle, false);
    graphics.closePath();
    graphics.fillPath();

    // Slash line effect
    graphics.lineStyle(4, skillDef.color, 0.8);
    graphics.beginPath();
    graphics.arc(player.x, player.y, skillDef.range * 0.8, result.angle - halfAngle, result.angle + halfAngle, false);
    graphics.strokePath();

    this.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 300,
      onComplete: () => graphics.destroy(),
    });

    // Hit check
    const targets = this._getTargetsInCone(player.x, player.y, result.angle, halfAngle, skillDef.range);

    for (const target of targets) {
      const actual = target.takeDamage(damage);
      DamageText.show(this, target.x, target.y - 16, actual, skillDef.color);

      // Knockback
      if (skillDef.knockback && target.applyKnockback) {
        const kbAngle = Phaser.Math.Angle.Between(player.x, player.y, target.x, target.y);
        target.applyKnockback(kbAngle, skillDef.knockback);
      }
    }

    // Screen shake for heavy hit
    if (targets.length > 0) {
      this.cameras.main.shake(100, 0.008);
    }

    this._spawnParticleBurst(
      player.x + Math.cos(result.angle) * skillDef.range * 0.6,
      player.y + Math.sin(result.angle) * skillDef.range * 0.6,
      skillDef.particleColor, 6
    );
  }

  // ── Self Buff skill (e.g. Enrage, Stealth Attack) ──
  _executeSelfBuffSkill(player, result) {
    const { skillDef } = result;

    // Visual: glow / color pulse
    const glowColor = skillDef.color;
    const circle = this.add.circle(player.x, player.y, 30, glowColor, 0.4);
    circle.setDepth(4);

    this.tweens.add({
      targets: circle,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 500,
      onComplete: () => circle.destroy(),
    });

    this._spawnParticleBurst(player.x, player.y, skillDef.particleColor, 10);

    // Buff is already applied by player.useSkill -> _applySelfBuff
  }

  // ── Wave skill (e.g. Cross Cut) ──
  _executeWaveSkill(player, result) {
    const { skillDef } = result;
    const damage = Math.round(calculateDamage(player.stats.attack, 0, skillDef.damage) * player.getDamageMultiplier());

    for (const dir of result.directions) {
      const proj = new Projectile(this, player.x, player.y, 'projectile', {
        damage,
        range: skillDef.range,
        source: 'player',
        color: skillDef.color,
        skillDef,
      });
      this.playerProjectiles.add(proj);
      proj.body.setVelocity(dir.x * skillDef.speed, dir.y * skillDef.speed);

      // Wider visual for wave projectiles
      proj.setScale(1.2, 0.6);
      const waveAngle = Phaser.Math.RadToDeg(Math.atan2(dir.y, dir.x));
      proj.setAngle(waveAngle);
    }

    this._spawnParticleBurst(player.x, player.y, skillDef.particleColor, 6);
  }

  // ── Wave Fire skill (Cross Cut - warrior ultimate wave) ──
  _executeWaveFireSkill(player, result) {
    const { skillDef } = result;
    const damage = Math.round(calculateDamage(player.stats.attack, 0, skillDef.damage) * player.getDamageMultiplier());

    // Screen shake on cast
    this.cameras.main.shake(200, 0.012);
    this._flashVignette(0xff4400, 200);

    // Dramatic ground slash at player position
    const slashGfx = this.add.graphics().setDepth(6);
    const slashLen = 60;
    for (const dir of result.directions) {
      const angle = Math.atan2(dir.y, dir.x);
      slashGfx.lineStyle(5, 0xffcc44, 0.9);
      slashGfx.lineBetween(
        player.x - Math.cos(angle) * slashLen * 0.3,
        player.y - Math.sin(angle) * slashLen * 0.3,
        player.x + Math.cos(angle) * slashLen,
        player.y + Math.sin(angle) * slashLen
      );
      slashGfx.lineStyle(2, 0xffffff, 0.8);
      slashGfx.lineBetween(
        player.x,
        player.y,
        player.x + Math.cos(angle) * slashLen * 0.7,
        player.y + Math.sin(angle) * slashLen * 0.7
      );
    }
    this.tweens.add({
      targets: slashGfx,
      alpha: 0,
      duration: 400,
      onComplete: () => slashGfx.destroy(),
    });

    // Cast burst particles
    this._spawnParticleBurst(player.x, player.y, 0xffaa44, 12);
    this._spawnParticleBurst(player.x, player.y, 0xff4400, 8);

    for (const dir of result.directions) {
      const proj = new Projectile(this, player.x, player.y, 'proj_fire_wave', {
        damage,
        range: skillDef.range,
        source: 'player',
        color: skillDef.color,
        piercing: true,
        skillDef,
      });

      // Tag for fire trail
      proj._fireWave = true;
      proj._fireDuration = skillDef.fireDuration;
      proj._fireDamage = skillDef.fireDamage;
      proj._trailPositions = [];
      proj._trailTimer = 0;
      proj.trail = true;

      proj.setScale(2.5, 1.2);
      const waveAngle = Phaser.Math.RadToDeg(Math.atan2(dir.y, dir.x));
      proj.setAngle(waveAngle);

      this.playerProjectiles.add(proj);
      proj.body.setVelocity(dir.x * skillDef.speed, dir.y * skillDef.speed);
    }
  }

  _spawnFireTrail(positions, duration, damagePerSecond) {
    if (!positions || positions.length === 0) return;

    const trailContainer = this.add.container(0, 0).setDepth(2);
    const trailGraphics = this.add.graphics().setDepth(2);
    trailContainer.add(trailGraphics);

    // Draw fire path
    for (const pos of positions) {
      // Ground scar (dark burn mark)
      const scar = this.add.rectangle(pos.x, pos.y, 18, 18, 0x331100, 0.4).setDepth(1);
      trailContainer.add(scar);

      // Fire on top
      const fire = this.add.rectangle(pos.x, pos.y, 14, 14, 0xff4400, 0.5).setDepth(2);
      trailContainer.add(fire);

      // Animate fire flickering
      this.tweens.add({
        targets: fire,
        scaleX: { from: 0.8, to: 1.3 },
        scaleY: { from: 1.2, to: 0.7 },
        alpha: { from: 0.4, to: 0.6 },
        duration: 200 + Math.random() * 200,
        yoyo: true,
        repeat: -1,
      });
    }

    // Damage tick + slow
    let elapsed = 0;
    let tickAccumulator = 0;
    const tickRate = 0.5;

    const fireEvent = this.time.addEvent({
      delay: 100,
      repeat: Math.floor(duration * 10) - 1,
      callback: () => {
        elapsed += 0.1;
        tickAccumulator += 0.1;

        // Random ember particles
        if (Math.random() < 0.25) {
          const rp = positions[Math.floor(Math.random() * positions.length)];
          const ember = this.add.circle(
            rp.x + (Math.random() - 0.5) * 12,
            rp.y + (Math.random() - 0.5) * 12,
            2, 0xff8822, 0.7
          ).setDepth(4);
          this.tweens.add({
            targets: ember,
            y: ember.y - 8 - Math.random() * 8,
            alpha: 0,
            duration: 250,
            onComplete: () => ember.destroy(),
          });
        }

        // Damage + slow enemies in trail
        if (tickAccumulator >= tickRate) {
          tickAccumulator -= tickRate;
          for (const pos of positions) {
            const targets = this._getTargetsInRadius(pos.x, pos.y, 16);
            for (const target of targets) {
              const dmg = Math.round(damagePerSecond * tickRate);
              const actual = target.takeDamage(dmg);
              DamageText.show(this, target.x, target.y - 16, actual, 0xff6600);
              // Apply slow
              if (target.applyStatusEffect) {
                target.applyStatusEffect('slow', 0.6);
              }
            }
          }
          // Also check boss
          if (this.boss && this.boss.active) {
            for (const pos of positions) {
              const dist = Phaser.Math.Distance.Between(pos.x, pos.y, this.boss.x, this.boss.y);
              if (dist <= 24) {
                const dmg = Math.round(damagePerSecond * tickRate);
                const actual = this.boss.takeDamage(dmg);
                DamageText.show(this, this.boss.x, this.boss.y - 32, actual, 0xff6600);
                if (this.boss.applyStatusEffect) {
                  this.boss.applyStatusEffect('slow', 0.6);
                }
                break;
              }
            }
          }
        }

        // Fade out in last second
        if (elapsed > duration - 1) {
          trailContainer.setAlpha(duration - elapsed);
        }

        if (elapsed >= duration) {
          fireEvent.destroy();
          trailContainer.destroy();
        }
      },
    });
  }

  // ── Area skill (e.g. Arrow Shower) ──
  _executeAreaSkill(player, result) {
    const { skillDef } = result;
    const damage = Math.round(calculateDamage(player.stats.attack, 0, skillDef.damage) * player.getDamageMultiplier());

    // Show target circle
    const targetCircle = this.add.circle(result.targetX, result.targetY, skillDef.radius, skillDef.color, 0.15);
    targetCircle.setStrokeStyle(2, skillDef.color, 0.5);
    targetCircle.setDepth(4);

    // Rain projectiles with delay
    for (let i = 0; i < skillDef.hitCount; i++) {
      this.time.delayedCall(i * skillDef.hitDelay, () => {
        // Random position within circle
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * skillDef.radius;
        const hx = result.targetX + Math.cos(angle) * dist;
        const hy = result.targetY + Math.sin(angle) * dist;

        // Small impact flash
        const impact = this.add.circle(hx, hy, 8, skillDef.color, 0.6);
        impact.setDepth(5);
        this.tweens.add({
          targets: impact,
          alpha: 0,
          scaleX: 2,
          scaleY: 2,
          duration: 200,
          onComplete: () => impact.destroy(),
        });

        // Damage enemies in small radius of each hit
        const hitTargets = this._getTargetsInRadius(hx, hy, 30);
        for (const target of hitTargets) {
          const actual = target.takeDamage(damage);
          DamageText.show(this, target.x, target.y - 16, actual, skillDef.color);
        }
      });
    }

    // Remove target circle after all hits
    this.time.delayedCall(skillDef.hitCount * skillDef.hitDelay + 200, () => {
      this.tweens.add({
        targets: targetCircle,
        alpha: 0,
        duration: 300,
        onComplete: () => targetCircle.destroy(),
      });
    });
  }

  // ── Trap skill (e.g. Trap Bomb) ──
  _executeTrapSkill(player, result) {
    const { skillDef } = result;

    // Clamp target to arena
    const tx = Phaser.Math.Clamp(result.targetX, ARENA_X + TILE * 2, ARENA_X + ARENA_W - TILE * 2);
    const ty = Phaser.Math.Clamp(result.targetY, ARENA_Y + TILE * 2, ARENA_Y + ARENA_H - TILE * 2);

    const trap = new Trap(this, tx, ty, {
      damage: Math.round(calculateDamage(player.stats.attack, 0, skillDef.damage) * player.getDamageMultiplier()),
      triggerRadius: skillDef.triggerRadius,
      explosionRadius: skillDef.explosionRadius,
      lifetime: skillDef.lifetime,
      color: skillDef.color,
      skillDef,
    });

    this.traps.add(trap);
    this._spawnParticleBurst(tx, ty, skillDef.particleColor, 4);
  }

  // ── Multi Projectile skill (e.g. Quick Shivs) ──
  _executeMultiProjectileSkill(player, result) {
    const { skillDef } = result;
    const damage = Math.round(calculateDamage(player.stats.attack, 0, skillDef.damage) * player.getDamageMultiplier());

    for (const dir of result.directions) {
      const proj = new Projectile(this, player.x, player.y, 'proj_shiv', {
        damage,
        range: skillDef.range,
        source: 'player',
        color: skillDef.color,
        skillDef,
      });
      proj.setScale(1.4);
      this.playerProjectiles.add(proj);
      proj.body.setVelocity(dir.x * skillDef.speed, dir.y * skillDef.speed);

      const projAngle = Phaser.Math.RadToDeg(Math.atan2(dir.y, dir.x));
      proj.setAngle(projAngle);
    }

    this._spawnParticleBurst(player.x, player.y, skillDef.particleColor, 6);
  }

  // ── Projectile AoE skill (e.g. Grenade Launch) ──
  _executeProjectileAoeSkill(player, result) {
    const { skillDef } = result;
    const damage = Math.round(calculateDamage(player.stats.attack, 0, skillDef.damage) * player.getDamageMultiplier());

    const proj = new Projectile(this, player.x, player.y, 'proj_grenade', {
      damage,
      range: skillDef.range,
      source: 'player',
      explosionRadius: skillDef.explosionRadius,
      color: skillDef.color,
      skillDef,
    });
    proj.setScale(1.6);
    this.playerProjectiles.add(proj);
    proj.body.setVelocity(result.directionX * skillDef.speed, result.directionY * skillDef.speed);

    this._spawnParticleBurst(player.x, player.y, skillDef.particleColor, 4);
  }

  // ── Projectile Lava skill (Fire - fireball that leaves lava pool) ──
  _executeProjectileLavaSkill(player, result) {
    const { skillDef } = result;
    const damage = Math.round(calculateDamage(player.stats.attack, 0, skillDef.damage) * player.getDamageMultiplier());

    const proj = new Projectile(this, player.x, player.y, 'proj_fireball', {
      damage,
      range: skillDef.range,
      source: 'player',
      explosionRadius: skillDef.explosionRadius,
      color: skillDef.color,
      skillDef,
    });

    // Override the default explosion behavior - we'll handle it manually
    proj._lavaSkill = true;
    proj._lavaDuration = skillDef.lavaDuration;
    proj._lavaDamage = skillDef.lavaDamage;
    proj._explosionRadius = skillDef.explosionRadius;
    proj._ownerAttack = player.stats.attack;

    proj.setScale(2.0);
    proj.trail = true;

    this.playerProjectiles.add(proj);
    proj.body.setVelocity(result.directionX * skillDef.speed, result.directionY * skillDef.speed);

    this._spawnParticleBurst(player.x, player.y, skillDef.particleColor, 6);
  }

  _spawnLavaPool(x, y, radius, duration, damagePerSecond, color) {
    // Clamp to arena
    const lx = Phaser.Math.Clamp(x, ARENA_X + TILE * 2, ARENA_X + ARENA_W - TILE * 2);
    const ly = Phaser.Math.Clamp(y, ARENA_Y + TILE * 2, ARENA_Y + ARENA_H - TILE * 2);

    // Lava pool visual - layered circles for a molten look
    const poolContainer = this.add.container(lx, ly).setDepth(3);

    // Outer glow
    const outerGlow = this.add.circle(0, 0, radius + 8, 0xff2200, 0.15);
    poolContainer.add(outerGlow);

    // Main lava body
    const lavaBase = this.add.circle(0, 0, radius, 0xcc2200, 0.5);
    poolContainer.add(lavaBase);

    // Inner hot core
    const lavaCore = this.add.circle(0, 0, radius * 0.6, 0xff4400, 0.4);
    poolContainer.add(lavaCore);

    // Bright center
    const lavaBright = this.add.circle(0, 0, radius * 0.3, 0xff8800, 0.35);
    poolContainer.add(lavaBright);

    // Bubbling animation
    this.tweens.add({
      targets: lavaCore,
      scaleX: { from: 0.9, to: 1.1 },
      scaleY: { from: 1.1, to: 0.9 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: lavaBright,
      scaleX: { from: 1.1, to: 0.8 },
      scaleY: { from: 0.8, to: 1.1 },
      alpha: { from: 0.35, to: 0.5 },
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Damage tick timer
    let elapsed = 0;
    const tickRate = 0.5; // check every 0.5s
    let tickAccumulator = 0;

    const lavaEvent = this.time.addEvent({
      delay: 100,
      repeat: Math.floor(duration * 10) - 1,
      callback: () => {
        elapsed += 0.1;
        tickAccumulator += 0.1;

        // Spawn random bubble particles
        if (Math.random() < 0.3) {
          const bx = lx + (Math.random() - 0.5) * radius * 1.4;
          const by = ly + (Math.random() - 0.5) * radius * 1.4;
          const bubble = this.add.circle(bx, by, 2 + Math.random() * 3, 0xff6600, 0.7).setDepth(4);
          this.tweens.add({
            targets: bubble,
            y: by - 10 - Math.random() * 10,
            alpha: 0,
            scaleX: 0.3,
            scaleY: 0.3,
            duration: 300 + Math.random() * 200,
            onComplete: () => bubble.destroy(),
          });
        }

        // Damage enemies in radius every tickRate seconds
        if (tickAccumulator >= tickRate) {
          tickAccumulator -= tickRate;
          const targets = this._getTargetsInRadius(lx, ly, radius);
          for (const target of targets) {
            const dmg = Math.round(damagePerSecond * tickRate);
            const actual = target.takeDamage(dmg);
            DamageText.show(this, target.x, target.y - 16, actual, 0xff6600);
          }
          // Also check boss
          if (this.boss && this.boss.active) {
            const dist = Phaser.Math.Distance.Between(lx, ly, this.boss.x, this.boss.y);
            if (dist <= radius) {
              const dmg = Math.round(damagePerSecond * tickRate);
              const actual = this.boss.takeDamage(dmg);
              DamageText.show(this, this.boss.x, this.boss.y - 32, actual, 0xff6600);
            }
          }
        }

        // Fade out in last second
        if (elapsed > duration - 1) {
          const fadeT = (duration - elapsed);
          poolContainer.setAlpha(fadeT);
        }

        if (elapsed >= duration) {
          lavaEvent.destroy();
          poolContainer.destroy();
        }
      },
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  Melee Basic Attack
  // ══════════════════════════════════════════════════════════════

  _executeMeleeAttack(data) {
    const range = data.range;
    const halfAngle = Phaser.Math.DegToRad(45); // 90-degree arc for basic melee

    // Visual slash arc
    const graphics = this.add.graphics();
    graphics.setDepth(5);
    const charColor = CHARACTERS[this.characterType].accent;
    graphics.fillStyle(charColor, 0.3);
    graphics.beginPath();
    graphics.moveTo(this.player.x, this.player.y);
    graphics.arc(this.player.x, this.player.y, range, data.angle - halfAngle, data.angle + halfAngle, false);
    graphics.closePath();
    graphics.fillPath();

    this.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 200,
      onComplete: () => graphics.destroy(),
    });

    // Hit check
    const targets = this._getTargetsInCone(this.player.x, this.player.y, data.angle, halfAngle, range);

    for (const target of targets) {
      const actual = target.takeDamage(data.damage);
      const isCrit = data.fromStealth;
      DamageText.show(this, target.x, target.y - 16, actual, isCrit ? 0xffff00 : 0xffffff, isCrit);

      if (actual > 20) {
        this.cameras.main.shake(60, 0.004);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  Projectile Creation
  // ══════════════════════════════════════════════════════════════

  _createPlayerProjectile(data) {
    const charData = CHARACTERS[this.characterType];
    const isMage = this.characterType === 'mage';
    const texKey = isMage ? 'proj_magic_bolt' : (data.projectile ? `proj_${data.projectile}` : 'particle_white');

    const proj = new Projectile(this, data.x, data.y, texKey, {
      damage: data.damage,
      range: data.range,
      source: 'player',
      color: charData.accent,
    });

    if (isMage) {
      proj.setScale(1.8);
      proj.setTint(0xaa88ff);
      proj.trail = true;
    }

    this.playerProjectiles.add(proj);
    const vx = Math.cos(data.angle) * data.speed;
    const vy = Math.sin(data.angle) * data.speed;
    proj.body.setVelocity(vx, vy);
    proj.setAngle(Phaser.Math.RadToDeg(data.angle));
  }

  _createEnemyProjectile(data) {
    // Pick texture based on enemy type
    let texKey = 'proj_enemy_melee';
    const etype = data.enemy.enemyType;
    if (etype === 'goblin_archer') texKey = 'proj_enemy_arrow';
    else if (etype === 'witch') texKey = 'proj_enemy_magic';

    const proj = new Projectile(this, data.enemy.x, data.enemy.y, texKey, {
      damage: data.damage,
      range: 500,
      source: 'enemy',
      color: data.enemy.enemyData.color,
    });
    proj.setScale(1.2);

    this.enemyProjectiles.add(proj);
    const vx = Math.cos(data.angle) * data.speed;
    const vy = Math.sin(data.angle) * data.speed;
    proj.body.setVelocity(vx, vy);
    proj.setAngle(Phaser.Math.RadToDeg(data.angle));
  }

  // ══════════════════════════════════════════════════════════════
  //  Trap Detonation
  // ══════════════════════════════════════════════════════════════

  _detonateTrap(trap, triggerEnemy) {
    const tx = trap.x;
    const ty = trap.y;
    const damage = trap.damage;
    const radius = trap.explosionRadius;
    const color = trap.color;

    trap.kill();

    this._createExplosion(tx, ty, radius, damage, color);
  }

  _detonateTrapOnBoss(trap, boss) {
    if (!boss || typeof boss.takeDamage !== 'function') return;
    const tx = trap.x;
    const ty = trap.y;
    const damage = trap.damage;
    const radius = trap.explosionRadius;
    const color = trap.color;

    trap.kill();

    // Damage boss
    const dist = Phaser.Math.Distance.Between(tx, ty, boss.x, boss.y);
    if (dist <= radius && boss.active) {
      const actual = boss.takeDamage(damage);
      DamageText.show(this, boss.x, boss.y - 32, actual, color);
    }

    // Also damage nearby enemies
    this._createExplosion(tx, ty, radius, damage, color);
  }

  _createExplosion(x, y, radius, damage, color) {
    sound.play('explosion', { minGap: 0.06 });

    // Visual explosion
    const circle = this.add.circle(x, y, radius, color, 0.4);
    circle.setDepth(5);

    this.tweens.add({
      targets: circle,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 350,
      onComplete: () => circle.destroy(),
    });

    this._spawnParticleBurst(x, y, color, 10);
    this.cameras.main.shake(100, 0.008);

    // Damage all enemies in radius
    const targets = this._getTargetsInRadius(x, y, radius);
    for (const target of targets) {
      const actual = target.takeDamage(damage);
      DamageText.show(this, target.x, target.y - 16, actual, color);
    }

    // Also check boss
    if (this.boss && this.boss.active) {
      const dist = Phaser.Math.Distance.Between(x, y, this.boss.x, this.boss.y);
      if (dist <= radius) {
        const actual = this.boss.takeDamage(damage);
        DamageText.show(this, this.boss.x, this.boss.y - 32, actual, color);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  Spatial Helpers
  // ══════════════════════════════════════════════════════════════

  _getTargetsInCone(originX, originY, angle, halfAngle, range) {
    const results = [];

    const check = (target) => {
      if (!target || !target.active) return;
      const dist = Phaser.Math.Distance.Between(originX, originY, target.x, target.y);
      if (dist > range) return;
      const angleToTarget = Phaser.Math.Angle.Between(originX, originY, target.x, target.y);
      const angleDiff = Phaser.Math.Angle.Wrap(angleToTarget - angle);
      if (Math.abs(angleDiff) <= halfAngle) {
        results.push(target);
      }
    };

    this.enemies.getChildren().forEach(check);
    if (this.boss && this.boss.active) check(this.boss);

    return results;
  }

  _getTargetsInRadius(x, y, radius) {
    const results = [];

    const check = (target) => {
      if (!target || !target.active) return;
      const dist = Phaser.Math.Distance.Between(x, y, target.x, target.y);
      if (dist <= radius) {
        results.push(target);
      }
    };

    this.enemies.getChildren().forEach(check);
    if (this.boss && this.boss.active) check(this.boss);

    return results;
  }

  _getAllAliveTargets() {
    const targets = this.enemies.getChildren().filter(e => e && e.active);
    if (this.boss && this.boss.active) targets.push(this.boss);
    return targets;
  }

  _findClosestTo(x, y, targets) {
    let closest = null;
    let minDist = Infinity;
    for (const t of targets) {
      if (!t || !t.active) continue;
      const d = Phaser.Math.Distance.Between(x, y, t.x, t.y);
      if (d < minDist) {
        minDist = d;
        closest = t;
      }
    }
    return closest;
  }

  _randomEdgePosition() {
    // Random position along arena edges, at least 100px from player
    const innerX1 = ARENA_X + TILE * 2;
    const innerX2 = ARENA_X + ARENA_W - TILE * 2;
    const innerY1 = ARENA_Y + TILE * 2;
    const innerY2 = ARENA_Y + ARENA_H - TILE * 2;

    let x, y;
    let attempts = 0;

    do {
      const edge = Math.floor(Math.random() * 4);
      switch (edge) {
        case 0: // top
          x = Phaser.Math.Between(innerX1, innerX2);
          y = innerY1 + 10;
          break;
        case 1: // bottom
          x = Phaser.Math.Between(innerX1, innerX2);
          y = innerY2 - 10;
          break;
        case 2: // left
          x = innerX1 + 10;
          y = Phaser.Math.Between(innerY1, innerY2);
          break;
        case 3: // right
          x = innerX2 - 10;
          y = Phaser.Math.Between(innerY1, innerY2);
          break;
      }
      attempts++;
    } while (
      attempts < 20 &&
      this.player &&
      Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 100
    );

    return { x, y };
  }

  // ══════════════════════════════════════════════════════════════
  //  Visual Effects
  // ══════════════════════════════════════════════════════════════

  _spawnParticleBurst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 80;
      const size = 2 + Math.random() * 4;

      const particle = this.add.circle(
        x, y, size, color, 0.8
      ).setDepth(10);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 300 + Math.random() * 200,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  _spawnDeathParticles(x, y, color) {
    this._spawnParticleBurst(x, y, color, 8);

    // Soul particle floats up
    const soul = this.add.circle(x, y, 4, 0xcc88ff, 0.8).setDepth(10);
    this.tweens.add({
      targets: soul,
      y: y - 60,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => soul.destroy(),
    });
  }

  _drawLightningBolt(graphics, x1, y1, x2, y2, color) {
    const segments = 6;
    const dx = (x2 - x1) / segments;
    const dy = (y2 - y1) / segments;
    const jitter = 12;

    graphics.lineStyle(3, color, 0.9);
    graphics.beginPath();
    graphics.moveTo(x1, y1);

    let cx = x1;
    let cy = y1;

    for (let i = 1; i < segments; i++) {
      cx = x1 + dx * i + (Math.random() - 0.5) * jitter * 2;
      cy = y1 + dy * i + (Math.random() - 0.5) * jitter * 2;
      graphics.lineTo(cx, cy);
    }

    graphics.lineTo(x2, y2);
    graphics.strokePath();

    // Thinner bright core
    graphics.lineStyle(1, 0xffffff, 0.7);
    graphics.beginPath();
    graphics.moveTo(x1, y1);
    graphics.lineTo(x2, y2);
    graphics.strokePath();
  }

  _flashVignette(color, duration) {
    const vignette = this.add.rectangle(
      GAME.WIDTH / 2, GAME.HEIGHT / 2,
      GAME.WIDTH, GAME.HEIGHT,
      color, 0.15
    ).setDepth(4000).setScrollFactor(0);

    this.tweens.add({
      targets: vignette,
      alpha: 0,
      duration,
      onComplete: () => vignette.destroy(),
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  Ultimate Abilities
  // ══════════════════════════════════════════════════════════════

  _executeUltimate(result) {
    this.cameras.main.shake(300, 0.015);
    this._flashVignette(result.color || 0xffffff, 300);

    // Ultimate SFX — universal dramatic swell + type-specific layer
    sound.play('ult_cast');
    const ultSfx = {
      blackhole: 'ult_blackhole',
      whirlwind: 'ult_whirlwind',
      wolf: 'ult_wolf',
      poison_storm: 'ult_poison',
    }[result.type];
    if (ultSfx) sound.play(ultSfx);

    switch (result.type) {
      case 'blackhole':   this._ultBlackHole(result); break;
      case 'whirlwind':   this._ultWhirlwind(result); break;
      case 'wolf':        this._ultWolf(result); break;
      case 'poison_storm': this._ultPoisonStorm(result); break;
    }

    // Safety net: force-clear ultActive after max possible duration
    const safetyDuration = (result.duration || 15) * 1000 + 2000;
    this.time.delayedCall(safetyDuration, () => {
      if (this.player && this.player.ultActive) {
        this.player.ultActive = false;
      }
    });
  }

  // ── Mage: Black Hole ──
  _ultBlackHole(ult) {
    const pointer = this.input.activePointer;
    const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const bx = Phaser.Math.Clamp(wp.x, ARENA_X + TILE * 2, ARENA_X + ARENA_W - TILE * 2);
    const by = Phaser.Math.Clamp(wp.y, ARENA_Y + TILE * 2, ARENA_Y + ARENA_H - TILE * 2);

    // Visual: dark pulsing circle with layered effect
    const outerGlow = this.add.circle(bx, by, ult.radius, 0x220044, 0.1).setDepth(3);
    const hole = this.add.circle(bx, by, 10, 0x000000, 0.95).setDepth(4);
    const ring1 = this.add.circle(bx, by, ult.radius * 0.8, 0x000000, 0).setStrokeStyle(2, 0x6622cc, 0.6).setDepth(4);
    const ring2 = this.add.circle(bx, by, ult.radius * 0.5, 0x000000, 0).setStrokeStyle(1, 0x8844ee, 0.4).setDepth(4);
    const glow = this.add.circle(bx, by, 25, 0x4400aa, 0.4).setDepth(4);

    // Expand black hole core
    this.tweens.add({ targets: hole, scaleX: 3, scaleY: 3, duration: 800, ease: 'Power2' });
    this.tweens.add({ targets: glow, scaleX: 2.5, scaleY: 2.5, alpha: 0.2, duration: 1000 });

    // Stun all enemies in radius immediately so AI can't fight the pull
    const caughtTargets = new Set();

    let elapsed = 0;
    let exploded = false;
    const pullEvent = this.time.addEvent({
      delay: 50,
      repeat: Math.floor(ult.duration * 20) + 5, // extra ticks to ensure explosion fires
      callback: () => {
        if (exploded) return;
        elapsed += 0.05;

        // Rotating rings
        ring1.setAngle(elapsed * 60);
        ring2.setAngle(-elapsed * 90);
        ring1.setAlpha(0.4 + Math.sin(elapsed * 6) * 0.2);
        outerGlow.setAlpha(0.08 + Math.sin(elapsed * 4) * 0.04);

        // Pull ALL enemies on screen toward center using direct position lerp
        const allTargets = this._getAllAliveTargets();
        for (const target of allTargets) {
          const dist = Phaser.Math.Distance.Between(bx, by, target.x, target.y);
          if (dist <= ult.radius * 1.5) {
            // Stun the enemy so its AI doesn't fight back
            if (!caughtTargets.has(target)) {
              caughtTargets.add(target);
              target.applyStatusEffect('stun', ult.duration + 0.5);
            }

            // Directly move position toward center (can't be overridden by AI)
            if (dist > 10) {
              const pullSpeed = 3.0; // lerp factor per tick
              const angle = Phaser.Math.Angle.Between(target.x, target.y, bx, by);
              const moveAmount = Math.min(dist * 0.08, pullSpeed);
              target.x += Math.cos(angle) * moveAmount * (1 + elapsed * 0.3);
              target.y += Math.sin(angle) * moveAmount * (1 + elapsed * 0.3);
              if (target.body) target.body.setVelocity(0, 0);
            }
          }
        }

        // Swirling particles (more frequent and dramatic)
        if (Math.random() < 0.6) {
          const pa = Math.random() * Math.PI * 2;
          const pr = 15 + Math.random() * ult.radius;
          const particleX = bx + Math.cos(pa) * pr;
          const particleY = by + Math.sin(pa) * pr;
          const p = this.add.circle(particleX, particleY, 2 + Math.random() * 2, 0x8844ff, 0.7).setDepth(5);
          this.tweens.add({
            targets: p, x: bx, y: by, alpha: 0, scaleX: 0.1, scaleY: 0.1,
            duration: 300 + Math.random() * 400, onComplete: () => p.destroy(),
          });
        }

        // Dark matter particles spiraling
        if (Math.random() < 0.3) {
          const da = elapsed * 3 + Math.random() * Math.PI * 2;
          const dr = 5 + Math.random() * 15;
          const dp = this.add.circle(bx + Math.cos(da) * dr, by + Math.sin(da) * dr, 1, 0x220044, 0.8).setDepth(5);
          this.tweens.add({
            targets: dp, alpha: 0, duration: 200, onComplete: () => dp.destroy(),
          });
        }

        // ── EXPLOSION at end ──
        if (elapsed >= ult.duration && !exploded) {
          exploded = true;
          pullEvent.destroy();

          // Massive screen shake
          this.cameras.main.shake(600, 0.04);
          this._flashVignette(0xff4400, 500);

          // Explosion ring 1 - purple
          const ring3 = this.add.circle(bx, by, 10, 0x000000, 0).setStrokeStyle(5, 0xcc66ff, 0.9).setDepth(6);
          this.tweens.add({
            targets: ring3, scaleX: 50, scaleY: 50, alpha: 0,
            duration: 800, ease: 'Power2', onComplete: () => ring3.destroy(),
          });

          // Explosion ring 2 - fire
          const ring4 = this.add.circle(bx, by, 10, 0x000000, 0).setStrokeStyle(3, 0xff6622, 0.8).setDepth(6);
          this.tweens.add({
            targets: ring4, scaleX: 40, scaleY: 40, alpha: 0,
            duration: 600, delay: 100, ease: 'Power2', onComplete: () => ring4.destroy(),
          });

          // Inner flash
          const flash = this.add.circle(bx, by, 40, 0xff4400, 0.8).setDepth(7);
          this.tweens.add({
            targets: flash, scaleX: 8, scaleY: 8, alpha: 0,
            duration: 500, onComplete: () => flash.destroy(),
          });

          // White core flash
          const coreFlash = this.add.circle(bx, by, 20, 0xffffff, 0.9).setDepth(8);
          this.tweens.add({
            targets: coreFlash, scaleX: 4, scaleY: 4, alpha: 0,
            duration: 300, onComplete: () => coreFlash.destroy(),
          });

          // Massive particle burst
          this._spawnParticleBurst(bx, by, 0xaa44ff, 30);
          this._spawnParticleBurst(bx, by, 0xff4400, 20);
          this._spawnParticleBurst(bx, by, 0xffcc00, 10);

          // Damage ALL enemies on the map + apply burn
          const damage = calculateDamage(this.player.stats.attack, 0, ult.damage);
          const allEnemies = this.enemies.getChildren().filter(e => e && e.active);
          for (const t of allEnemies) {
            const actual = t.takeDamage(damage);
            DamageText.show(this, t.x, t.y - 16, actual, 0xff4400);
            // Apply burn: 20 damage per second for 5 seconds
            if (t.active && t.applyStatusEffect) {
              t.applyStatusEffect('burn', 5, { damage: 20, tickRate: 0.5 });
            }
          }
          // Also damage boss
          if (this.boss && this.boss.active) {
            const actual = this.boss.takeDamage(damage);
            DamageText.show(this, this.boss.x, this.boss.y - 32, actual, 0xff4400);
            if (this.boss.active && this.boss.applyStatusEffect) {
              this.boss.applyStatusEffect('burn', 5, { damage: 20, tickRate: 0.5 });
            }
          }

          // Clean up visuals
          outerGlow.destroy();
          hole.destroy();
          ring1.destroy();
          ring2.destroy();
          glow.destroy();
          this.player.ultActive = false;
        }
      },
    });
  }

  // ── Warrior: Whirlwind ──
  _ultWhirlwind(ult) {
    let elapsed = 0;
    let tickAcc = 0;
    const tickRate = 0.3;

    // Visual spinning indicator around player
    const spinGfx = this.add.graphics().setDepth(6);

    // Cleanup function - idempotent, always resets state
    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      if (spinEvent) spinEvent.remove(false);
      if (spinGfx && spinGfx.scene) spinGfx.destroy();
      if (this.player) this.player.ultActive = false;
    };

    const spinEvent = this.time.addEvent({
      delay: 50,
      repeat: Math.floor(ult.duration * 20) + 5, // extra ticks as safety margin
      callback: () => {
        if (cleanedUp) return;
        elapsed += 0.05;
        tickAcc += 0.05;

        // Check player is alive and scene is active
        if (!this.player || !this.player.active || this.playerDead || this.mapCleared) {
          cleanup();
          return;
        }

        // Draw spinning arc
        spinGfx.clear();
        const spinAngle = elapsed * 12;
        spinGfx.lineStyle(4, 0xff6644, 0.7);
        spinGfx.beginPath();
        spinGfx.arc(this.player.x, this.player.y, ult.radius, spinAngle, spinAngle + Math.PI * 1.2, false);
        spinGfx.strokePath();
        spinGfx.lineStyle(2, 0xffaa66, 0.5);
        spinGfx.beginPath();
        spinGfx.arc(this.player.x, this.player.y, ult.radius * 0.6, spinAngle + Math.PI, spinAngle + Math.PI * 2, false);
        spinGfx.strokePath();

        // Spark particles on edge
        if (Math.random() < 0.3) {
          const sa = spinAngle + Math.random() * Math.PI * 2;
          const sp = this.add.circle(
            this.player.x + Math.cos(sa) * ult.radius,
            this.player.y + Math.sin(sa) * ult.radius,
            3, 0xffaa44, 0.7
          ).setDepth(7);
          this.tweens.add({
            targets: sp, alpha: 0, scaleX: 0.2, scaleY: 0.2,
            duration: 200, onComplete: () => sp.destroy(),
          });
        }

        // Damage + knockback every tickRate
        if (tickAcc >= tickRate) {
          tickAcc -= tickRate;
          const damage = calculateDamage(this.player.stats.attack, 0, Math.round(ult.damage * tickRate));
          const targets = this._getTargetsInRadius(this.player.x, this.player.y, ult.radius);
          for (const t of targets) {
            const actual = t.takeDamage(damage);
            DamageText.show(this, t.x, t.y - 16, actual, 0xff6644);
            if (t.applyKnockback) {
              const kbAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, t.x, t.y);
              t.applyKnockback(kbAngle, ult.knockback);
            }
          }
          if (this.boss && this.boss.active && typeof this.boss.takeDamage === 'function') {
            const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.boss.x, this.boss.y);
            if (d <= ult.radius) {
              const actual = this.boss.takeDamage(damage);
              DamageText.show(this, this.boss.x, this.boss.y - 32, actual, 0xff6644);
            }
          }
          this.cameras.main.shake(50, 0.003);
        }
      },
    });

    // GUARANTEED cleanup after exact duration — independent of the tick loop
    this.time.delayedCall(ult.duration * 1000, cleanup);
  }

  // ── Archer: Wolf Companion ──
  _ultWolf(ult) {
    const wx = this.player.x + 40;
    const wy = this.player.y + 20;

    // Create wolf sprite
    const wolf = this.add.image(wx, wy, 'wolf_companion').setDepth(100).setScale(1.3);
    const wolfContainer = this.add.container(0, 0, [wolf]).setDepth(100);

    const wolfHpBar = new HealthBar(this, wx, wy - 18, 30, 4, ult.hp, 0x88aa44);
    let wolfHp = ult.hp;
    let wolfAttackTimer = 0;
    let wolfTarget = null;
    let wolfAlive = true;

    // Enable wolf as physics body for enemy targeting
    this.physics.add.existing(wolf);
    wolf.body.setSize(24, 18);
    wolf.body.setCollideWorldBounds(true);
    wolf.body.setImmovable(false);

    // Wolf AI loop
    const wolfEvent = this.time.addEvent({
      delay: 50,
      repeat: Math.floor(ult.duration * 20) - 1,
      callback: () => {
        if (!wolfAlive) return;
        wolfAttackTimer -= 0.05;

        // Find nearest enemy
        const targets = this._getAllAliveTargets();
        let nearest = null;
        let nearDist = Infinity;
        for (const t of targets) {
          const d = Phaser.Math.Distance.Between(wolf.x, wolf.y, t.x, t.y);
          if (d < nearDist) { nearest = t; nearDist = d; }
        }
        wolfTarget = nearest;

        if (wolfTarget) {
          const angle = Phaser.Math.Angle.Between(wolf.x, wolf.y, wolfTarget.x, wolfTarget.y);
          if (nearDist > 40) {
            // Move toward target
            const speed = 180;
            wolf.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
          } else {
            wolf.body.setVelocity(0, 0);
            // Attack
            if (wolfAttackTimer <= 0) {
              wolfAttackTimer = ult.attackSpeed;
              const damage = calculateDamage(ult.damage, 0);
              const actual = wolfTarget.takeDamage(damage);
              DamageText.show(this, wolfTarget.x, wolfTarget.y - 16, actual, 0x88aa44);
              // Bite flash
              this._spawnParticleBurst(wolfTarget.x, wolfTarget.y, 0xaacc66, 4);
            }
          }
          // Face target
          wolf.setFlipX(wolfTarget.x < wolf.x);
        } else {
          // Follow player
          const dist = Phaser.Math.Distance.Between(wolf.x, wolf.y, this.player.x, this.player.y);
          if (dist > 60) {
            const angle = Phaser.Math.Angle.Between(wolf.x, wolf.y, this.player.x, this.player.y);
            wolf.body.setVelocity(Math.cos(angle) * 120, Math.sin(angle) * 120);
          } else {
            wolf.body.setVelocity(0, 0);
          }
        }

        // Update wolf HP bar position
        wolfHpBar.setPosition(wolf.x, wolf.y - 18);
        wolfHpBar.setValue(wolfHp, ult.hp);

        // Wolf draws aggro: enemies target wolf sometimes
        // (handled by proximity - enemies naturally target nearest player/wolf)
      },
    });

    // Wolf takes damage from enemy contact
    const wolfDmgCheck = this.time.addEvent({
      delay: 500,
      repeat: Math.floor(ult.duration * 2) - 1,
      callback: () => {
        if (!wolfAlive) return;
        const enemies = this.enemies.getChildren();
        for (const e of enemies) {
          if (!e || !e.active) continue;
          const d = Phaser.Math.Distance.Between(wolf.x, wolf.y, e.x, e.y);
          if (d < 35) {
            wolfHp -= e.stats.attack * 0.5;
            if (wolfHp <= 0) {
              wolfAlive = false;
              this._spawnParticleBurst(wolf.x, wolf.y, 0x88aa44, 10);
              wolfContainer.destroy();
              wolfHpBar.destroy();
              if (wolf.body) wolf.body.enable = false;
              wolfEvent.destroy();
              wolfDmgCheck.destroy();
              this.player.ultActive = false;
              return;
            }
          }
        }
      },
    });

    // Wolf expires
    this.time.delayedCall(ult.duration * 1000, () => {
      if (wolfAlive) {
        wolfAlive = false;
        wolfContainer.destroy();
        wolfHpBar.destroy();
        if (wolf.body) wolf.body.enable = false;
        wolfEvent.destroy();
        wolfDmgCheck.destroy();
        this.player.ultActive = false;
      }
    });
  }

  // ── Rogue: Poison Storm ──
  _ultPoisonStorm(ult) {
    let elapsed = 0;
    let attackAcc = 0;
    const attackRate = 0.35; // throw poison shivs rapidly

    // Damage boost buff
    this.player.activeBuffs.push({
      id: 'poison_storm',
      remaining: ult.duration,
      buffs: { attack: ult.damageBoost },
      debuffs: {},
    });

    // Visual: green aura
    const aura = this.add.circle(this.player.x, this.player.y, 20, 0x44cc44, 0.2).setDepth(4);

    const stormEvent = this.time.addEvent({
      delay: 50,
      repeat: Math.floor(ult.duration * 20) - 1,
      callback: () => {
        elapsed += 0.05;
        attackAcc += 0.05;

        // Follow player
        aura.setPosition(this.player.x, this.player.y);
        aura.setScale(1 + Math.sin(elapsed * 6) * 0.15);

        // Auto-throw poison shivs at nearest enemies
        if (attackAcc >= attackRate) {
          attackAcc -= attackRate;

          const targets = this._getAllAliveTargets();
          if (targets.length > 0) {
            // Pick 2-3 random targets
            const count = Math.min(targets.length, 2 + Math.floor(Math.random() * 2));
            const shuffled = targets.sort(() => Math.random() - 0.5).slice(0, count);

            for (const t of shuffled) {
              const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, t.x, t.y);
              const proj = new Projectile(this, this.player.x, this.player.y, 'proj_shiv', {
                damage: calculateDamage(this.player.stats.attack, 0, 8),
                range: ult.range,
                source: 'player',
                color: 0x44cc44,
                effect: 'poison',
                effectDuration: ult.poisonDuration,
                effectDamage: ult.poisonDamage,
              });
              proj.setScale(1.2);
              proj.setTint(0x44cc44);
              this.playerProjectiles.add(proj);
              proj.body.setVelocity(Math.cos(angle) * ult.projectileSpeed, Math.sin(angle) * ult.projectileSpeed);
              proj.setAngle(Phaser.Math.RadToDeg(angle));
            }
          }
        }

        if (elapsed >= ult.duration) {
          stormEvent.destroy();
          aura.destroy();
          this.player.ultActive = false;
        }
      },
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  Pause Menu
  // ══════════════════════════════════════════════════════════════

  _pauseGame() {
    this.isPaused = true;
    this.physics.pause();

    const cx = GAME.WIDTH / 2;
    const cy = GAME.HEIGHT / 2;
    const depth = 6000;
    const els = [];

    // Overlay
    const overlay = this.add.rectangle(cx, cy, GAME.WIDTH, GAME.HEIGHT, 0x000000, 0.7)
      .setDepth(depth).setScrollFactor(0);
    els.push(overlay);

    // Panel
    const panelW = 340;
    const panelH = 280;
    const panel = this.add.rectangle(cx, cy, panelW, panelH, 0x111118, 0.95)
      .setStrokeStyle(2, 0x4444aa).setDepth(depth + 1).setScrollFactor(0);
    els.push(panel);

    // Inner border
    const inner = this.add.rectangle(cx, cy, panelW - 12, panelH - 12)
      .setStrokeStyle(1, 0x333366, 0.5).setFillStyle().setDepth(depth + 1).setScrollFactor(0);
    els.push(inner);

    // Title
    const title = this.add.text(cx, cy - 90, 'PAUSED', {
      fontSize: '32px', fontFamily: 'monospace', color: '#aaaaff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(depth + 2).setScrollFactor(0);
    els.push(title);

    // Current run info
    const info = this.add.text(cx, cy - 50, `Map ${this.currentMap}/8  |  Souls: ${this.souls + this.soulsEarned}`, {
      fontSize: '12px', fontFamily: 'monospace', color: '#777799',
    }).setOrigin(0.5).setDepth(depth + 2).setScrollFactor(0);
    els.push(info);

    // Divider
    const div = this.add.rectangle(cx, cy - 35, panelW - 60, 1, 0x333366)
      .setDepth(depth + 2).setScrollFactor(0);
    els.push(div);

    // Resume button
    const resumeBtnY = cy - 5;
    const btnW = 240;
    const btnH = 44;

    const resumeBg = this.add.rectangle(cx, resumeBtnY, btnW, btnH, 0x222244, 0.9)
      .setStrokeStyle(2, 0x4444aa).setDepth(depth + 2).setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    els.push(resumeBg);

    const resumeText = this.add.text(cx, resumeBtnY, 'RESUME', {
      fontSize: '18px', fontFamily: 'monospace', color: '#aaaaff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(depth + 3).setScrollFactor(0);
    els.push(resumeText);

    resumeBg.on('pointerover', () => {
      resumeBg.setFillStyle(0x333366, 1);
      resumeBg.setStrokeStyle(2, 0x6666cc);
      resumeText.setColor('#ccccff');
    });
    resumeBg.on('pointerout', () => {
      resumeBg.setFillStyle(0x222244, 0.9);
      resumeBg.setStrokeStyle(2, 0x4444aa);
      resumeText.setColor('#aaaaff');
    });
    resumeBg.on('pointerdown', () => {
      this._resumeGame();
    });

    // Abandon Run button
    const abandonBtnY = cy + 55;

    const abandonBg = this.add.rectangle(cx, abandonBtnY, btnW, btnH, 0x331111, 0.9)
      .setStrokeStyle(2, 0x882222).setDepth(depth + 2).setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    els.push(abandonBg);

    const abandonText = this.add.text(cx, abandonBtnY, 'ABANDON RUN', {
      fontSize: '18px', fontFamily: 'monospace', color: '#ff8888', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(depth + 3).setScrollFactor(0);
    els.push(abandonText);

    const abandonHint = this.add.text(cx, abandonBtnY + 28, `You will keep your ${this.souls + this.soulsEarned} souls`, {
      fontSize: '10px', fontFamily: 'monospace', color: '#886666',
    }).setOrigin(0.5).setDepth(depth + 2).setScrollFactor(0);
    els.push(abandonHint);

    abandonBg.on('pointerover', () => {
      abandonBg.setFillStyle(0x552222, 1);
      abandonBg.setStrokeStyle(2, 0xcc4444);
      abandonText.setColor('#ffcccc');
    });
    abandonBg.on('pointerout', () => {
      abandonBg.setFillStyle(0x331111, 0.9);
      abandonBg.setStrokeStyle(2, 0x882222);
      abandonText.setColor('#ff8888');
    });
    abandonBg.on('pointerdown', () => {
      this._saveSouls();
      this.scene.start('Lobby', {
        character: this.characterType,
        souls: this.souls + this.soulsEarned,
        upgrades: this.upgrades,
      });
    });

    // Esc hint
    const escHint = this.add.text(cx, cy + panelH / 2 - 20, 'Press ESC to resume', {
      fontSize: '10px', fontFamily: 'monospace', color: '#555577',
    }).setOrigin(0.5).setDepth(depth + 2).setScrollFactor(0);
    els.push(escHint);

    this.pauseElements = els;
  }

  _resumeGame() {
    this.isPaused = false;
    this.physics.resume();

    for (const el of this.pauseElements) {
      el.destroy();
    }
    this.pauseElements = [];
  }

  // ══════════════════════════════════════════════════════════════
  //  Dash Execution
  // ══════════════════════════════════════════════════════════════

  _executeDash(result) {
    const { type, fromX, fromY, toX, toY } = result;
    const charColor = CHARACTERS[this.characterType].accent;

    // Brief invulnerability during dash (handled by iframe timer)
    this.player.isInvulnerable = true;
    this.player._iframeTimer = 200;

    switch (type) {
      case 'teleport': {
        // Mage blink: flash at origin, appear at destination
        const flash1 = this.add.circle(fromX, fromY, 20, 0xaa88ff, 0.6).setDepth(10);
        const flash2 = this.add.circle(toX, toY, 20, 0xaa88ff, 0.6).setDepth(10);
        this.tweens.add({ targets: flash1, alpha: 0, scaleX: 2, scaleY: 2, duration: 300, onComplete: () => flash1.destroy() });
        this.tweens.add({ targets: flash2, alpha: 0, scaleX: 0.3, scaleY: 0.3, duration: 300, onComplete: () => flash2.destroy() });
        this._spawnParticleBurst(fromX, fromY, 0xaa88ff, 8);
        this._spawnParticleBurst(toX, toY, 0xaa88ff, 8);
        break;
      }
      case 'leap': {
        // Warrior jump: trail + ground impact
        const trail = this.add.graphics().setDepth(5);
        trail.lineStyle(4, charColor, 0.5);
        trail.lineBetween(fromX, fromY, toX, toY);
        this.tweens.add({ targets: trail, alpha: 0, duration: 300, onComplete: () => trail.destroy() });
        const impact = this.add.circle(toX, toY, 30, charColor, 0.3).setDepth(5);
        this.tweens.add({ targets: impact, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 400, onComplete: () => impact.destroy() });
        this.cameras.main.shake(80, 0.005);
        this._spawnParticleBurst(toX, toY, charColor, 6);
        break;
      }
      case 'dash': {
        // Rogue dash: speed trail
        const segments = 4;
        for (let i = 0; i < segments; i++) {
          const t = i / segments;
          const sx = Phaser.Math.Linear(fromX, toX, t);
          const sy = Phaser.Math.Linear(fromY, toY, t);
          const afterimage = this.add.circle(sx, sy, 8, 0x888888, 0.4 - t * 0.1).setDepth(5);
          this.tweens.add({ targets: afterimage, alpha: 0, duration: 250, delay: i * 30, onComplete: () => afterimage.destroy() });
        }
        this._spawnParticleBurst(fromX, fromY, 0x888888, 4);
        break;
      }
      case 'backflip': {
        // Archer backflip: arc trail
        const midX = (fromX + toX) / 2;
        const midY = Math.min(fromY, toY) - 30;
        for (let i = 0; i < 5; i++) {
          const t = i / 4;
          const bx = (1 - t) * (1 - t) * fromX + 2 * (1 - t) * t * midX + t * t * toX;
          const by = (1 - t) * (1 - t) * fromY + 2 * (1 - t) * t * midY + t * t * toY;
          const dot = this.add.circle(bx, by, 3, charColor, 0.5).setDepth(5);
          this.tweens.add({ targets: dot, alpha: 0, duration: 300, delay: i * 40, onComplete: () => dot.destroy() });
        }
        this._spawnParticleBurst(toX, toY, charColor, 5);
        break;
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  Persistence
  // ══════════════════════════════════════════════════════════════

  _saveSouls() {
    const totalSouls = this.souls + this.soulsEarned;
    localStorage.setItem('soulbound_souls', totalSouls.toString());
  }

  // ── Cleanup ──

  shutdown() {
    this.events.removeAllListeners();
    this.input.removeAllListeners();
  }
}
