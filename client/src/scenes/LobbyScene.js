// ══════════════════════════════════════════════════════════════
//  SOULBOUND ARENA — Lobby Scene
//  The cozy hub area: train, upgrade, and prepare for battle.
// ══════════════════════════════════════════════════════════════

import { GAME, CHARACTERS, SKILLS, SOUL_UPGRADES } from '/shared/gameData.js';
import Player from '../entities/Player.js';
import { HealthBar, ManaBar, SkillBar, InventoryPanel, DamageText, SoulShopPanel } from '../ui/UIComponents.js';
import sound from '../systems/SoundManager.js';

// ── Constants ──
const MAP_W = 1600;
const MAP_H = 900;
const TILE = GAME.TILE_SIZE;       // 48
const UI_DEPTH = 1000;

// ══════════════════════════════════════════════════════════════
//  Training Dummy
// ══════════════════════════════════════════════════════════════

class TrainingDummy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'training_dummy');

    scene.add.existing(this);
    scene.physics.add.existing(this, false);

    this.body.setImmovable(true);
    this.body.setSize(24, 32);
    this.body.setOffset(4, 12);

    this.maxHp = 9999;
    this.currentHp = this.maxHp;
    this._resetTimer = null;

    // Small health bar (optional visual)
    this.hpBar = new HealthBar(scene, x, y - 34, 36, 4, this.maxHp, 0xcc4444);
    this.hpBar.setDepth(UI_DEPTH - 1);
  }

  takeDamage(amount, isCrit = false) {
    if (amount <= 0) return;

    this.currentHp = Math.max(0, this.currentHp - amount);
    this.hpBar.setValue(this.currentHp, this.maxHp);

    // Show floating damage number
    const color = isCrit ? 0xffcc00 : 0xff4444;
    DamageText.show(this.scene, this.x, this.y - 20, amount, color, isCrit);

    // Flash white
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => {
      this.clearTint();
    });

    // Shake slightly
    const origX = this.x;
    this.scene.tweens.add({
      targets: this,
      x: origX + Phaser.Math.Between(-3, 3),
      duration: 40,
      yoyo: true,
      repeat: 1,
      onComplete: () => { this.x = origX; },
    });

    // Reset HP after 3s of no hits
    if (this._resetTimer) this._resetTimer.remove();
    this._resetTimer = this.scene.time.delayedCall(3000, () => {
      this.currentHp = this.maxHp;
      this.hpBar.setValue(this.currentHp, this.maxHp);
    });
  }

  update() {
    // Keep bar above dummy
    this.hpBar.setPosition(this.x, this.y - 34);
  }
}

// ══════════════════════════════════════════════════════════════
//  Lobby Scene
// ══════════════════════════════════════════════════════════════

export default class LobbyScene extends Phaser.Scene {
  constructor() {
    super('Lobby');
  }

  // ── Init (receives data from CharacterSelect) ──

  init(data) {
    this.characterType = data.character || 'mage';
    this.mode = data.mode || 'solo';        // 'solo' | 'host' | 'join'
    this.roomCode = data.roomCode || null;
  }

  // ── Create ──

  create() {
    // ─── Music ───
    sound.playMusic('lobby');

    // ─── Load soul data from localStorage ───
    this.souls = parseInt(localStorage.getItem('soulbound_souls') || '0', 10);
    this.upgrades = JSON.parse(localStorage.getItem('soulbound_upgrades') || '{}');

    // Store upgrades in registry so Player.recalculateStats can read them
    this.registry.set('soulUpgrades', this.upgrades);

    // ─── World bounds ───
    this.physics.world.setBounds(0, 0, MAP_W, MAP_H);

    // ─── Build the map ───
    this._buildMap();

    // ─── Decorations ───
    this._buildDecorations();

    // ─── Training dummies (left side) ───
    this.dummies = this.physics.add.group({ classType: TrainingDummy, runChildUpdate: true });
    const dummyPositions = [
      { x: 280, y: 300 },
      { x: 380, y: 420 },
      { x: 200, y: 480 },
      { x: 340, y: 560 },
    ];
    for (const pos of dummyPositions) {
      const dummy = new TrainingDummy(this, pos.x, pos.y);
      this.dummies.add(dummy);
    }

    // ─── Projectiles group ───
    this.projectiles = this.physics.add.group();

    // ─── Player ───
    this.player = new Player(this, MAP_W / 2, MAP_H / 2, this.characterType, true);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(100);

    // Collide player with walls and dummies
    this.physics.add.collider(this.player, this.wallGroup);
    this.physics.add.collider(this.player, this.dummies);

    // Overlap projectiles with dummies
    this.physics.add.overlap(this.projectiles, this.dummies, this._onProjectileHitDummy, null, this);

    // ─── Soul Forge zone (right side) ───
    this.soulForgeZone = this.add.zone(1300, 450, 120, 120);
    this.physics.add.existing(this.soulForgeZone, true);
    this._buildSoulForge(1300, 450);

    // ─── Portal zone (top center) ───
    this.portalZone = this.add.zone(MAP_W / 2, 100, 140, 100);
    this.physics.add.existing(this.portalZone, true);
    this._buildPortal(MAP_W / 2, 100);

    // ─── Camera ───
    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBackgroundColor(0x1a1210);

    // ─── HUD: Health & Mana bars (follow player, above head) ───
    this.playerHpBar = new HealthBar(this, 0, 0, 48, 5, this.player.maxHp, 0xff4444);
    this.playerManaBar = new ManaBar(this, 0, 0, 48, 4, this.player.maxMana, 0x4488ff);

    // ─── HUD: Skill bar (fixed to camera) ───
    this.skillBar = new SkillBar(this, CHARACTERS[this.characterType].skills);

    // ─── HUD: Inventory ───
    this.inventoryPanel = new InventoryPanel(this);

    // ─── HUD: Soul counter (top-right, fixed) ───
    this.soulCounterText = this.add.text(GAME.WIDTH - 16, 16, '', {
      fontSize: '18px', fontFamily: 'monospace', color: '#ffcc00', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(UI_DEPTH + 5);
    this._updateSoulCounter();

    // ─── HUD: Room code (top-left, multiplayer) ───
    if (this.mode !== 'solo' && this.roomCode) {
      this.add.text(16, 16, `Room: ${this.roomCode}`, {
        fontSize: '16px', fontFamily: 'monospace', color: '#aaaaff', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 3,
      }).setScrollFactor(0).setDepth(UI_DEPTH + 5);
    }

    // ─── Prompt texts (world-space, initially hidden) ───
    this.forgePrompt = this.add.text(1300, 390, 'Press E to open Soul Forge', {
      fontSize: '13px', fontFamily: 'monospace', color: '#cc88ff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(UI_DEPTH - 5).setVisible(false);

    const portalLabel = (this.mode !== 'solo')
      ? 'Press E to Ready Up'
      : 'Press E to Enter Act 1';
    this.portalPrompt = this.add.text(MAP_W / 2, 160, portalLabel, {
      fontSize: '13px', fontFamily: 'monospace', color: '#88ccff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(UI_DEPTH - 5).setVisible(false);

    // ─── Soul Shop panel ───
    this.soulShop = new SoulShopPanel(this, { souls: this.souls, upgrades: this.upgrades });
    this.soulShop.on('soul-purchase', this._onSoulPurchase, this);

    // ─── Input ───
    this._setupInput();

    // ─── Attack event listeners ───
    this.events.on('player-melee', this._handleMelee, this);
    this.events.on('player-shoot', this._handleShoot, this);

    // ─── Controls HUD (bottom-left, fixed) ───
    const controlLines = [
      'WASD  Move',
      'Mouse Aim',
      'Click Attack',
      '1-2-3 Skills',
      'Space Dash',
      'Tab   Items',
      'E     Interact',
    ];
    this.add.text(16, GAME.HEIGHT - 16, controlLines.join('\n'), {
      fontSize: '10px', fontFamily: 'monospace', color: '#666688', lineSpacing: 3,
    }).setOrigin(0, 1).setScrollFactor(0).setDepth(UI_DEPTH + 5).setAlpha(0.7);

    // ─── Proximity flags ───
    this.nearForge = false;
    this.nearPortal = false;
    this.isReady = false;
  }

  // ── Update loop ──

  update(time, delta) {
    // Player update
    this.player.update(time, delta);

    // Position HP/Mana bars above player
    this.playerHpBar.setPosition(this.player.x, this.player.y - 28);
    this.playerManaBar.setPosition(this.player.x, this.player.y - 22);
    this.playerHpBar.setValue(this.player.currentHp, this.player.maxHp);
    this.playerManaBar.setValue(this.player.currentMana, this.player.maxMana);

    // Update skill bar cooldowns
    const charSkills = CHARACTERS[this.characterType].skills;
    for (let i = 0; i < charSkills.length; i++) {
      const skillId = charSkills[i];
      const skillDef = SKILLS[skillId];
      const remaining = this.player.skillCooldowns[skillId] / 1000;
      this.skillBar.updateCooldown(i, remaining, skillDef.cooldown);
      this.skillBar.setManaAvailable(i, this.player.currentMana >= skillDef.manaCost);
    }

    // Inventory sync
    this.inventoryPanel.setItems(this.player.items);

    // Proximity checks
    this.nearForge = this._isPlayerNear(this.soulForgeZone, 80);
    this.nearPortal = this._isPlayerNear(this.portalZone, 90);
    this.forgePrompt.setVisible(this.nearForge && !this.soulShop.visible);
    this.portalPrompt.setVisible(this.nearPortal);

    // Clean up dead projectiles
    this.projectiles.getChildren().forEach(p => {
      if (p.active && p._distanceTravelled !== undefined) {
        const dist = Phaser.Math.Distance.Between(p._originX, p._originY, p.x, p.y);
        if (dist >= p._maxRange) {
          p.destroy();
        }
      }
    });

    // Animate portal glow
    if (this._portalGlow) {
      const s = 0.95 + Math.sin(time / 400) * 0.08;
      this._portalGlow.setScale(s);
      this._portalGlow.setAlpha(0.35 + Math.sin(time / 300) * 0.15);
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  Map Building
  // ══════════════════════════════════════════════════════════════

  _buildMap() {
    const cols = Math.ceil(MAP_W / TILE);
    const rows = Math.ceil(MAP_H / TILE);
    const wallThickness = 1; // tiles

    this.wallGroup = this.physics.add.staticGroup();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * TILE + TILE / 2;
        const y = r * TILE + TILE / 2;

        const isWall = (r < wallThickness || r >= rows - wallThickness ||
                        c < wallThickness || c >= cols - wallThickness);

        // Leave gap for portal at top center
        const portalGapMin = Math.floor(cols / 2) - 2;
        const portalGapMax = Math.floor(cols / 2) + 2;
        const isPortalGap = r < wallThickness && c >= portalGapMin && c <= portalGapMax;

        if (isWall && !isPortalGap) {
          this.add.image(x, y, 'lobby_wall').setDepth(1);
          const wallBody = this.wallGroup.create(x, y, 'lobby_wall');
          wallBody.body.setSize(TILE, TILE);
          wallBody.setVisible(false);
          wallBody.refreshBody();
        } else {
          this.add.image(x, y, 'lobby_floor').setDepth(0);
        }
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  Decorations (rugs, torches, ambiance)
  // ══════════════════════════════════════════════════════════════

  _buildDecorations() {
    // ─── Center rug (warm rectangle with ornate border) ───
    const rugX = MAP_W / 2;
    const rugY = MAP_H / 2;
    const rugW = 240;
    const rugH = 160;

    // Rug base
    const rug = this.add.rectangle(rugX, rugY, rugW, rugH, 0x8B2020, 0.6).setDepth(0.5);
    // Rug border
    this.add.rectangle(rugX, rugY, rugW, rugH)
      .setStrokeStyle(3, 0xccaa44, 0.5).setFillStyle().setDepth(0.6);
    // Inner border
    this.add.rectangle(rugX, rugY, rugW - 16, rugH - 16)
      .setStrokeStyle(1, 0xccaa44, 0.3).setFillStyle().setDepth(0.6);
    // Diamond pattern in center
    const diamond = this.add.graphics().setDepth(0.7);
    diamond.fillStyle(0xcc9944, 0.25);
    diamond.fillTriangle(rugX, rugY - 30, rugX - 30, rugY, rugX, rugY + 30);
    diamond.fillTriangle(rugX, rugY - 30, rugX + 30, rugY, rugX, rugY + 30);

    // ─── Wall torches (glowing circles on walls) ───
    const torchPositions = [
      { x: 120, y: 60 }, { x: 360, y: 60 }, { x: 600, y: 60 },
      { x: 840, y: 60 }, { x: 1080, y: 60 }, { x: 1320, y: 60 },
      { x: 60, y: 250 }, { x: 60, y: 500 }, { x: 60, y: 700 },
      { x: MAP_W - 60, y: 250 }, { x: MAP_W - 60, y: 500 }, { x: MAP_W - 60, y: 700 },
      { x: 120, y: MAP_H - 60 }, { x: 400, y: MAP_H - 60 },
      { x: 800, y: MAP_H - 60 }, { x: 1100, y: MAP_H - 60 }, { x: 1400, y: MAP_H - 60 },
    ];

    for (const tp of torchPositions) {
      // Outer glow
      const glow = this.add.circle(tp.x, tp.y, 24, 0xff8844, 0.1).setDepth(2);
      // Inner glow
      this.add.circle(tp.x, tp.y, 10, 0xffaa44, 0.2).setDepth(2);
      // Core flame
      this.add.circle(tp.x, tp.y, 4, 0xffdd88, 0.6).setDepth(3);

      // Flickering animation
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.08, to: 0.18 },
        scaleX: { from: 0.9, to: 1.1 },
        scaleY: { from: 0.9, to: 1.1 },
        duration: 600 + Math.random() * 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // ─── Training area label ───
    this.add.text(290, 220, 'Training Grounds', {
      fontSize: '14px', fontFamily: 'monospace', color: '#aa8866',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(2);

    // ─── Training area floor accent (lighter patch) ───
    this.add.rectangle(290, 420, 260, 320, 0x9a7b4d, 0.15).setDepth(0.3);
  }

  // ══════════════════════════════════════════════════════════════
  //  Soul Forge (pedestal with glow)
  // ══════════════════════════════════════════════════════════════

  _buildSoulForge(x, y) {
    // Pedestal base
    this.add.rectangle(x, y + 20, 60, 12, 0x555555).setDepth(5);
    this.add.rectangle(x, y + 10, 48, 24, 0x444444).setDepth(5);

    // Crystal on top
    const crystal = this.add.graphics().setDepth(6);
    crystal.fillStyle(0x8844cc, 0.9);
    crystal.fillTriangle(x - 10, y + 4, x + 10, y + 4, x, y - 18);
    crystal.fillStyle(0xaa66ee, 0.6);
    crystal.fillTriangle(x - 6, y + 2, x + 6, y + 2, x, y - 14);

    // Glowing aura
    const forgeGlow = this.add.circle(x, y - 4, 40, 0x8844cc, 0.12).setDepth(4);
    this.tweens.add({
      targets: forgeGlow,
      alpha: { from: 0.08, to: 0.22 },
      scaleX: { from: 0.85, to: 1.15 },
      scaleY: { from: 0.85, to: 1.15 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Label
    this.add.text(x, y - 40, 'Soul Forge', {
      fontSize: '13px', fontFamily: 'monospace', color: '#cc88ff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(UI_DEPTH - 10);

    // Particle-like sparkles around forge
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const sparkle = this.add.circle(
        x + Math.cos(angle) * 30,
        y + Math.sin(angle) * 20 - 4,
        2, 0xcc88ff, 0.5
      ).setDepth(5);

      this.tweens.add({
        targets: sparkle,
        alpha: { from: 0.2, to: 0.7 },
        y: sparkle.y - 8,
        duration: 1200 + i * 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  Portal (magical gate at top center)
  // ══════════════════════════════════════════════════════════════

  _buildPortal(x, y) {
    // Portal arch frame
    const arch = this.add.graphics().setDepth(5);
    arch.fillStyle(0x334466, 1);
    // Left pillar
    arch.fillRect(x - 60, y - 30, 16, 70);
    // Right pillar
    arch.fillRect(x + 44, y - 30, 16, 70);
    // Arch top
    arch.fillRect(x - 60, y - 38, 120, 16);
    // Pillar detail
    arch.fillStyle(0x445577, 1);
    arch.fillRect(x - 58, y - 28, 12, 66);
    arch.fillRect(x + 46, y - 28, 12, 66);

    // Inner portal glow
    this._portalGlow = this.add.ellipse(x, y, 80, 60, 0x4488ff, 0.4).setDepth(6);

    // Brighter inner core
    const core = this.add.ellipse(x, y, 50, 36, 0x88ccff, 0.3).setDepth(7);
    this.tweens.add({
      targets: core,
      alpha: { from: 0.2, to: 0.5 },
      scaleX: { from: 0.9, to: 1.05 },
      scaleY: { from: 0.9, to: 1.05 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Particle ring around portal
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const px = x + Math.cos(angle) * 38;
      const py = y + Math.sin(angle) * 26;
      const dot = this.add.circle(px, py, 2, 0x88ccff, 0.5).setDepth(8);

      this.tweens.add({
        targets: dot,
        alpha: { from: 0.2, to: 0.8 },
        duration: 500 + i * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: i * 100,
      });
    }

    // Floating particles that drift upward from portal
    this.time.addEvent({
      delay: 300,
      loop: true,
      callback: () => {
        const px = x + Phaser.Math.Between(-30, 30);
        const py = y + Phaser.Math.Between(-10, 10);
        const p = this.add.circle(px, py, Phaser.Math.Between(1, 3), 0x88ccff, 0.6).setDepth(8);
        this.tweens.add({
          targets: p,
          y: py - Phaser.Math.Between(30, 60),
          alpha: 0,
          duration: Phaser.Math.Between(800, 1400),
          ease: 'Power2',
          onComplete: () => p.destroy(),
        });
      },
    });

    // Portal label
    this.add.text(x, y - 55, 'The Breach', {
      fontSize: '14px', fontFamily: 'monospace', color: '#88ccff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(UI_DEPTH - 10);
  }

  // ══════════════════════════════════════════════════════════════
  //  Input Setup
  // ══════════════════════════════════════════════════════════════

  _setupInput() {
    // Left click — basic attack
    this.input.on('pointerdown', (pointer) => {
      if (pointer.leftButtonDown() && !this.soulShop.visible && !this.inventoryPanel.visible) {
        this.player.basicAttack();
      }
    });

    // Skill keys: 1, 2, 3
    this.input.keyboard.on('keydown-ONE', () => this._trySkill(0));
    this.input.keyboard.on('keydown-TWO', () => this._trySkill(1));
    this.input.keyboard.on('keydown-THREE', () => this._trySkill(2));

    // Tab — toggle inventory
    this.input.keyboard.on('keydown-TAB', (event) => {
      event.preventDefault();
      if (!this.soulShop.visible) {
        this.inventoryPanel.toggle();
      }
    });

    // Space — dash
    this.input.keyboard.on('keydown-SPACE', (event) => {
      event.preventDefault();
      if (this.soulShop.visible || this.inventoryPanel.visible) return;
      const result = this.player.dash();
      if (result) {
        // Simple visual: particle burst at start and end
        const charColor = CHARACTERS[this.characterType].accent;
        for (let i = 0; i < 6; i++) {
          const angle = Math.random() * Math.PI * 2;
          const p = this.add.circle(result.fromX + Math.cos(angle) * 10, result.fromY + Math.sin(angle) * 10, 3, charColor, 0.5).setDepth(200);
          this.tweens.add({ targets: p, alpha: 0, duration: 300, onComplete: () => p.destroy() });
        }
      }
    });

    // E — interact (soul forge or portal)
    this.input.keyboard.on('keydown-E', () => {
      this._handleInteract();
    });

    // Escape — close panels
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.soulShop.visible) this.soulShop.hide();
      if (this.inventoryPanel.visible) this.inventoryPanel.hide();
    });
  }

  _trySkill(index) {
    if (this.soulShop.visible || this.inventoryPanel.visible) return;
    const result = this.player.useSkill(index);
    if (result) {
      this.skillBar.highlightSkill(index);
      this._executeSkill(result);
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  Interaction (E key)
  // ══════════════════════════════════════════════════════════════

  _handleInteract() {
    // Soul Forge
    if (this.nearForge && !this.soulShop.visible) {
      this.soulShop.updateSouls(this.souls);
      this.soulShop.show();
      return;
    }

    // Close forge if open
    if (this.soulShop.visible) {
      this.soulShop.hide();
      return;
    }

    // Portal — start run
    if (this.nearPortal) {
      if (this.mode === 'solo') {
        this._startRun();
      } else {
        this.isReady = !this.isReady;
        this.portalPrompt.setText(this.isReady ? 'Ready!' : 'Press E to Ready Up');
        this.portalPrompt.setColor(this.isReady ? '#44ff44' : '#88ccff');
        // In a real multiplayer scenario, broadcast ready state and check all players
      }
    }
  }

  _startRun() {
    // Fade out then start Combat scene
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Combat', {
        character: this.characterType,
        souls: this.souls,
        upgrades: this.upgrades,
      });
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  Soul Purchase
  // ══════════════════════════════════════════════════════════════

  _onSoulPurchase({ upgradeId, cost }) {
    if (this.souls < cost) return;

    this.souls -= cost;
    const currentLevel = this.upgrades[upgradeId] || 0;
    this.upgrades[upgradeId] = currentLevel + 1;

    // Persist
    localStorage.setItem('soulbound_souls', JSON.stringify(this.souls));
    localStorage.setItem('soulbound_upgrades', JSON.stringify(this.upgrades));

    // Update registry so player stats recalculate
    this.registry.set('soulUpgrades', this.upgrades);
    this.player.recalculateStats();

    // Update UI
    this.soulShop.updateSouls(this.souls);
    this.soulShop.updateUpgrade(upgradeId, this.upgrades[upgradeId]);
    this._updateSoulCounter();
  }

  _updateSoulCounter() {
    this.soulCounterText.setText(`Souls: ${this.souls}`);
  }

  // ══════════════════════════════════════════════════════════════
  //  Attack Handling
  // ══════════════════════════════════════════════════════════════

  _handleMelee(attackData) {
    const { x, y, angle, range, damage } = attackData;

    // Visual: melee arc slash
    this._showMeleeArc(x, y, angle, range);

    // Check each dummy
    this.dummies.getChildren().forEach(dummy => {
      const dist = Phaser.Math.Distance.Between(x, y, dummy.x, dummy.y);
      if (dist > range + 16) return;

      const angleToDummy = Phaser.Math.Angle.Between(x, y, dummy.x, dummy.y);
      const diff = Phaser.Math.Angle.Wrap(angleToDummy - angle);
      if (Math.abs(diff) < Math.PI / 3) {
        dummy.takeDamage(damage, attackData.fromStealth);
      }
    });
  }

  _showMeleeArc(x, y, angle, range) {
    const arc = this.add.graphics().setDepth(150);
    const color = CHARACTERS[this.characterType].accent;
    arc.fillStyle(color, 0.35);
    arc.slice(
      x, y, range,
      angle - Math.PI / 4,
      angle + Math.PI / 4,
      false
    );
    arc.fillPath();

    this.tweens.add({
      targets: arc,
      alpha: 0,
      duration: 200,
      onComplete: () => arc.destroy(),
    });
  }

  _handleShoot(attackData) {
    const { x, y, angle, speed, range, damage } = attackData;
    const texKey = attackData.projectile ? `proj_${attackData.projectile}` : 'proj_magic_bolt';

    this._spawnProjectile(x, y, angle, speed, range, damage, texKey);
  }

  // ══════════════════════════════════════════════════════════════
  //  Skill Execution
  // ══════════════════════════════════════════════════════════════

  _executeSkill(result) {
    const { skillId, skillDef } = result;

    switch (skillDef.type) {
      case 'projectile':
        this._spawnProjectile(
          result.casterX, result.casterY,
          result.angle,
          result.speed, result.range,
          skillDef.damage + this.player.stats.attack,
          `proj_fireball`,
          skillDef.color
        );
        break;

      case 'cone':
        this._executeConeDamage(result);
        break;

      case 'chain':
        this._executeChainDamage(result);
        break;

      case 'melee_arc':
        this._executeMeleeArc(result);
        break;

      case 'self_buff':
        this._showBuffEffect(result);
        break;

      case 'wave':
      case 'wave_fire':
        for (const dir of result.directions) {
          const angle = Math.atan2(dir.y, dir.x);
          const texKey = skillDef.type === 'wave_fire' ? 'proj_fire_wave' : 'proj_wave';
          this._spawnProjectile(
            result.casterX, result.casterY,
            angle,
            skillDef.speed, skillDef.range,
            skillDef.damage + this.player.stats.attack,
            texKey,
            skillDef.color
          );
        }
        if (skillDef.type === 'wave_fire') {
          this.cameras.main.shake(150, 0.008);
        }
        break;

      case 'area':
        this._executeAreaDamage(result);
        break;

      case 'trap':
        this._placeTrap(result);
        break;

      case 'multi_projectile':
        for (const dir of result.directions) {
          const angle = Math.atan2(dir.y, dir.x);
          this._spawnProjectile(
            result.casterX, result.casterY,
            angle,
            skillDef.speed, skillDef.range,
            skillDef.damage + this.player.stats.attack,
            'proj_shiv',
            skillDef.color
          );
        }
        break;

      case 'projectile_aoe':
        this._spawnAoeProjectile(result);
        break;

      case 'projectile_lava':
        this._spawnProjectile(
          result.casterX, result.casterY,
          result.angle,
          result.speed, result.range,
          skillDef.damage + this.player.stats.attack,
          'proj_fireball',
          skillDef.color
        );
        break;
    }
  }

  // ── Cone damage (frost) ──

  _executeConeDamage(result) {
    const { casterX, casterY, angle, skillDef } = result;
    const range = skillDef.range;
    const halfCone = Phaser.Math.DegToRad(skillDef.coneAngle / 2);

    // Visual cone
    const coneGfx = this.add.graphics().setDepth(150);
    coneGfx.fillStyle(skillDef.color, 0.3);
    coneGfx.slice(casterX, casterY, range, angle - halfCone, angle + halfCone, false);
    coneGfx.fillPath();
    this.tweens.add({
      targets: coneGfx,
      alpha: 0,
      duration: 400,
      onComplete: () => coneGfx.destroy(),
    });

    // Check dummies in cone
    this.dummies.getChildren().forEach(dummy => {
      const dist = Phaser.Math.Distance.Between(casterX, casterY, dummy.x, dummy.y);
      if (dist > range) return;
      const angleTo = Phaser.Math.Angle.Between(casterX, casterY, dummy.x, dummy.y);
      const diff = Phaser.Math.Angle.Wrap(angleTo - angle);
      if (Math.abs(diff) <= halfCone) {
        const dmg = skillDef.damage + this.player.stats.attack;
        dummy.takeDamage(dmg);
      }
    });
  }

  // ── Chain damage (lightning) ──

  _executeChainDamage(result) {
    const { casterX, casterY, skillDef } = result;
    const dummyArr = this.dummies.getChildren().slice();

    // Find nearest dummy within range
    let current = { x: casterX, y: casterY };
    const hit = new Set();
    let chains = skillDef.chainCount;

    const doChain = () => {
      if (chains <= 0) return;

      let nearest = null;
      let nearDist = Infinity;
      for (const d of dummyArr) {
        if (hit.has(d)) continue;
        const dist = Phaser.Math.Distance.Between(current.x, current.y, d.x, d.y);
        if (dist < nearDist && dist <= (hit.size === 0 ? skillDef.range : skillDef.chainRange)) {
          nearest = d;
          nearDist = dist;
        }
      }
      if (!nearest) return;

      // Draw lightning line
      const line = this.add.graphics().setDepth(150);
      line.lineStyle(3, skillDef.color, 0.8);
      line.beginPath();
      line.moveTo(current.x, current.y);

      // Zigzag effect
      const steps = 4;
      const dx = (nearest.x - current.x) / steps;
      const dy = (nearest.y - current.y) / steps;
      for (let i = 1; i < steps; i++) {
        const jx = current.x + dx * i + Phaser.Math.Between(-8, 8);
        const jy = current.y + dy * i + Phaser.Math.Between(-8, 8);
        line.lineTo(jx, jy);
      }
      line.lineTo(nearest.x, nearest.y);
      line.strokePath();

      this.tweens.add({
        targets: line,
        alpha: 0,
        duration: 300,
        onComplete: () => line.destroy(),
      });

      hit.add(nearest);
      const dmg = skillDef.damage + this.player.stats.attack;
      nearest.takeDamage(dmg);

      current = { x: nearest.x, y: nearest.y };
      chains--;

      // Chain to next after short delay
      this.time.delayedCall(100, doChain);
    };

    doChain();
  }

  // ── Melee arc (heavy blade) ──

  _executeMeleeArc(result) {
    const { casterX, casterY, angle, skillDef } = result;
    const halfArc = Phaser.Math.DegToRad(skillDef.arcAngle / 2);

    // Visual arc
    const arcGfx = this.add.graphics().setDepth(150);
    arcGfx.fillStyle(skillDef.color, 0.4);
    arcGfx.slice(casterX, casterY, skillDef.range, angle - halfArc, angle + halfArc, false);
    arcGfx.fillPath();
    this.tweens.add({
      targets: arcGfx,
      alpha: 0,
      duration: 300,
      onComplete: () => arcGfx.destroy(),
    });

    // Check dummies
    this.dummies.getChildren().forEach(dummy => {
      const dist = Phaser.Math.Distance.Between(casterX, casterY, dummy.x, dummy.y);
      if (dist > skillDef.range + 16) return;
      const angleTo = Phaser.Math.Angle.Between(casterX, casterY, dummy.x, dummy.y);
      const diff = Phaser.Math.Angle.Wrap(angleTo - angle);
      if (Math.abs(diff) <= halfArc) {
        const dmg = skillDef.damage + this.player.stats.attack;
        dummy.takeDamage(dmg);
      }
    });
  }

  // ── Area damage (arrow shower) ──

  _executeAreaDamage(result) {
    const { targetX, targetY, radius, hitCount, hitDelay, skillDef } = result;

    // Visual: area circle
    const areaCircle = this.add.circle(targetX, targetY, radius, skillDef.color, 0.15).setDepth(150);
    this.add.circle(targetX, targetY, radius)
      .setStrokeStyle(2, skillDef.color, 0.5).setFillStyle().setDepth(151);

    let hitsRemaining = hitCount;
    const hitTimer = this.time.addEvent({
      delay: hitDelay,
      repeat: hitCount - 1,
      callback: () => {
        // Impact visual
        const ix = targetX + Phaser.Math.Between(-radius * 0.7, radius * 0.7);
        const iy = targetY + Phaser.Math.Between(-radius * 0.7, radius * 0.7);
        const impact = this.add.circle(ix, iy, 6, skillDef.color, 0.6).setDepth(152);
        this.tweens.add({
          targets: impact,
          alpha: 0,
          scaleX: 2,
          scaleY: 2,
          duration: 200,
          onComplete: () => impact.destroy(),
        });

        // Damage dummies in area
        this.dummies.getChildren().forEach(dummy => {
          const dist = Phaser.Math.Distance.Between(targetX, targetY, dummy.x, dummy.y);
          if (dist <= radius + 16) {
            const dmg = skillDef.damage + this.player.stats.attack;
            dummy.takeDamage(dmg);
          }
        });

        hitsRemaining--;
        if (hitsRemaining <= 0) {
          this.tweens.add({
            targets: areaCircle,
            alpha: 0,
            duration: 300,
            onComplete: () => areaCircle.destroy(),
          });
        }
      },
    });
  }

  // ── Trap (trap bomb) ──

  _placeTrap(result) {
    const { targetX, targetY, explosionRadius, skillDef } = result;

    // Trap visual
    const trap = this.add.circle(targetX, targetY, 8, skillDef.color, 0.7).setDepth(5);
    const trapRing = this.add.circle(targetX, targetY, skillDef.triggerRadius, skillDef.color, 0.1)
      .setDepth(4);

    // Pulsing
    this.tweens.add({
      targets: trapRing,
      alpha: { from: 0.05, to: 0.2 },
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    // In lobby, trap explodes after 2s automatically for testing
    this.time.delayedCall(2000, () => {
      // Explosion visual
      const explosion = this.add.circle(targetX, targetY, explosionRadius, skillDef.color, 0.4).setDepth(152);
      this.tweens.add({
        targets: explosion,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 400,
        onComplete: () => explosion.destroy(),
      });

      // Damage dummies
      this.dummies.getChildren().forEach(dummy => {
        const dist = Phaser.Math.Distance.Between(targetX, targetY, dummy.x, dummy.y);
        if (dist <= explosionRadius + 16) {
          const dmg = skillDef.damage + this.player.stats.attack;
          dummy.takeDamage(dmg);
        }
      });

      trap.destroy();
      trapRing.destroy();
    });
  }

  // ── AoE projectile (grenade) ──

  _spawnAoeProjectile(result) {
    const { casterX, casterY, angle, skillDef } = result;

    const proj = this.physics.add.sprite(casterX, casterY, 'proj_grenade').setDepth(120);
    proj.setTint(skillDef.color);

    const vx = Math.cos(angle) * skillDef.speed;
    const vy = Math.sin(angle) * skillDef.speed;
    proj.setVelocity(vx, vy);

    proj._originX = casterX;
    proj._originY = casterY;
    proj._maxRange = skillDef.range;
    proj._isAoe = true;
    proj._explosionRadius = skillDef.explosionRadius;
    proj._damage = skillDef.damage + this.player.stats.attack;
    proj._color = skillDef.color;

    this.projectiles.add(proj);

    // Range check — explode at max range
    const rangeCheck = this.time.addEvent({
      delay: 30,
      loop: true,
      callback: () => {
        if (!proj.active) { rangeCheck.remove(); return; }
        const dist = Phaser.Math.Distance.Between(casterX, casterY, proj.x, proj.y);
        if (dist >= skillDef.range) {
          this._explodeAoeProjectile(proj);
          rangeCheck.remove();
        }
      },
    });
  }

  _explodeAoeProjectile(proj) {
    const explosion = this.add.circle(proj.x, proj.y, proj._explosionRadius, proj._color, 0.4)
      .setDepth(152);
    this.tweens.add({
      targets: explosion,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 400,
      onComplete: () => explosion.destroy(),
    });

    this.dummies.getChildren().forEach(dummy => {
      const dist = Phaser.Math.Distance.Between(proj.x, proj.y, dummy.x, dummy.y);
      if (dist <= proj._explosionRadius + 16) {
        dummy.takeDamage(proj._damage);
      }
    });

    proj.destroy();
  }

  // ── Buff visual ──

  _showBuffEffect(result) {
    const { casterX, casterY, skillDef } = result;

    // Ring expanding from player
    const ring = this.add.circle(casterX, casterY, 10, skillDef.color, 0.5).setDepth(150);
    this.tweens.add({
      targets: ring,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 400,
      onComplete: () => ring.destroy(),
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  Projectile System
  // ══════════════════════════════════════════════════════════════

  _spawnProjectile(x, y, angle, speed, maxRange, damage, textureKey, tintColor) {
    const proj = this.physics.add.sprite(x, y, textureKey).setDepth(120);
    if (tintColor) proj.setTint(tintColor);

    proj.rotation = angle;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    proj.setVelocity(vx, vy);

    proj._originX = x;
    proj._originY = y;
    proj._maxRange = maxRange;
    proj._damage = damage;
    proj._distanceTravelled = 0;

    this.projectiles.add(proj);

    // Safety: destroy after timeout (range / speed * 1000 + buffer)
    const lifetime = (maxRange / speed) * 1000 + 500;
    this.time.delayedCall(lifetime, () => {
      if (proj.active) proj.destroy();
    });

    return proj;
  }

  _onProjectileHitDummy(proj, dummy) {
    if (!proj.active) return;

    const damage = proj._damage || 10;

    if (proj._isAoe) {
      this._explodeAoeProjectile(proj);
    } else {
      dummy.takeDamage(damage);
      proj.destroy();
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  Utility
  // ══════════════════════════════════════════════════════════════

  _isPlayerNear(zone, radius) {
    return Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      zone.x, zone.y
    ) < radius;
  }
}
