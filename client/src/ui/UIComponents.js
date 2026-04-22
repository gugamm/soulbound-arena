// ══════════════════════════════════════════════════════════════
//  SOULBOUND ARENA — UI Components
// ══════════════════════════════════════════════════════════════

import { GAME, SKILLS, RARITY, RARITY_ORDER, SOUL_UPGRADES } from '/shared/gameData.js';

// ── Common Text Styles ──
const STYLE_TITLE = { fontSize: '24px', fontFamily: 'monospace', color: '#ffffff' };
const STYLE_BODY  = { fontSize: '14px', fontFamily: 'monospace', color: '#cccccc' };
const STYLE_SMALL = { fontSize: '11px', fontFamily: 'monospace', color: '#cccccc' };

const UI_DEPTH = 1000;

// ── Helper: convert 0xRRGGBB int to '#rrggbb' string ──
function colorToString(color) {
  return '#' + color.toString(16).padStart(6, '0');
}

// ══════════════════════════════════════════════════════════════
//  1. HealthBar
// ══════════════════════════════════════════════════════════════

class HealthBar extends Phaser.GameObjects.Container {
  constructor(scene, x, y, width, height, maxValue, color = 0xff0000) {
    super(scene, x, y);
    scene.add.existing(this);

    this.barWidth = width;
    this.barHeight = height;
    this.maxValue = maxValue;
    this.fillColor = color;

    // Background
    this.bg = scene.add.rectangle(0, 0, width, height, 0x222222);
    this.bg.setOrigin(0.5, 0.5);

    // Fill
    this.fill = scene.add.rectangle(0, 0, width, height, color);
    this.fill.setOrigin(0.5, 0.5);

    // Border
    this.border = scene.add.rectangle(0, 0, width, height);
    this.border.setOrigin(0.5, 0.5);
    this.border.setStrokeStyle(1, 0xffffff, 0.6);
    this.border.setFillStyle();

    // Value text
    this.valueText = scene.add.text(0, 0, `${maxValue}/${maxValue}`, {
      fontSize: '10px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5, 0.5);

    this.add([this.bg, this.fill, this.border, this.valueText]);
    this.setDepth(UI_DEPTH);
  }

  setValue(current, max) {
    this.maxValue = max;
    const clamped = Math.max(0, current);
    const ratio = Phaser.Math.Clamp(clamped / max, 0, 1);
    this.fill.width = this.barWidth * ratio;
    // Keep fill left-aligned with background
    this.fill.x = -(this.barWidth * (1 - ratio)) / 2;
    this.valueText.setText(`${Math.ceil(clamped)}/${Math.ceil(max)}`);
  }

  setPosition(x, y) {
    super.setPosition(x, y);
    return this;
  }
}

// ══════════════════════════════════════════════════════════════
//  2. ManaBar
// ══════════════════════════════════════════════════════════════

class ManaBar extends HealthBar {
  constructor(scene, x, y, width, height, maxValue, color = 0x4488ff) {
    super(scene, x, y, width, height, maxValue, color);
  }
}

// ══════════════════════════════════════════════════════════════
//  3. SkillBar
// ══════════════════════════════════════════════════════════════

class SkillBar extends Phaser.GameObjects.Container {
  constructor(scene, skills) {
    super(scene, 0, 0);
    scene.add.existing(this);

    this.slots = [];
    this.skillIds = skills;

    const slotSize = 48;
    const gap = 8;
    const totalWidth = slotSize * 3 + gap * 2;
    const startX = (GAME.WIDTH - totalWidth) / 2 + slotSize / 2;
    const posY = GAME.HEIGHT - slotSize - 16;

    for (let i = 0; i < 3; i++) {
      const slotX = startX + i * (slotSize + gap);
      const slot = this._createSlot(scene, slotX, posY, slotSize, skills[i], i);
      this.slots.push(slot);
    }

    // Dash slot (to the right of skill slots)
    this.dashSlot = null;
    this._slotSize = slotSize;
    this._lastSlotX = startX + 2 * (slotSize + gap);
    this._posY = posY;
    this._gap = gap;

    this.setScrollFactor(0);
    this.setDepth(UI_DEPTH + 10);
  }

  createDashSlot(scene, dashType) {
    const size = this._slotSize;
    const x = this._lastSlotX + size + this._gap + 16; // 16px extra separator
    const y = this._posY;

    const dashNames = { teleport: 'Blink', leap: 'Leap', dash: 'Dash', backflip: 'Backflip' };
    const dashColors = { teleport: 0x8866ff, leap: 0xff6644, dash: 0x888888, backflip: 0x44dd66 };
    const color = dashColors[dashType] || 0x888888;

    const slot = {};

    // Separator line
    const sepX = this._lastSlotX + size / 2 + this._gap / 2 + 8;
    slot.separator = scene.add.rectangle(sepX, y, 2, size, 0x555555, 0.5);
    slot.separator.setScrollFactor(0).setDepth(UI_DEPTH + 10);

    // Background
    slot.bg = scene.add.rectangle(x, y, size, size, 0x222233, 0.85);
    slot.bg.setStrokeStyle(2, color);
    slot.bg.setScrollFactor(0).setDepth(UI_DEPTH + 10);

    // Icon - simple dash symbol
    const iconGfx = scene.add.graphics().setScrollFactor(0).setDepth(UI_DEPTH + 11);
    iconGfx.fillStyle(color, 0.7);
    // Draw a simple arrow/movement icon
    if (dashType === 'teleport') {
      // Sparkle/blink
      iconGfx.fillCircle(x, y, 8);
      iconGfx.fillStyle(0xffffff, 0.6);
      iconGfx.fillCircle(x, y, 4);
      iconGfx.fillRect(x - 1, y - 12, 2, 6);
      iconGfx.fillRect(x - 1, y + 6, 2, 6);
      iconGfx.fillRect(x - 12, y - 1, 6, 2);
      iconGfx.fillRect(x + 6, y - 1, 6, 2);
    } else if (dashType === 'leap') {
      // Upward arc
      iconGfx.fillTriangle(x - 8, y + 8, x, y - 10, x + 8, y + 8);
      iconGfx.fillStyle(0x222233, 1);
      iconGfx.fillTriangle(x - 4, y + 8, x, y - 2, x + 4, y + 8);
    } else if (dashType === 'dash') {
      // Speed lines
      iconGfx.fillRect(x - 10, y - 2, 14, 4);
      iconGfx.fillTriangle(x + 4, y - 8, x + 14, y, x + 4, y + 8);
      iconGfx.fillStyle(color, 0.3);
      iconGfx.fillRect(x - 14, y - 6, 4, 2);
      iconGfx.fillRect(x - 14, y + 4, 4, 2);
      iconGfx.fillRect(x - 12, y - 1, 4, 2);
    } else if (dashType === 'backflip') {
      // Backward arrow
      iconGfx.fillRect(x - 4, y - 2, 14, 4);
      iconGfx.fillTriangle(x - 4, y - 8, x - 14, y, x - 4, y + 8);
    }
    slot.icon = iconGfx;

    // Key label
    slot.keyLabel = scene.add.text(x - size / 2 + 4, y - size / 2 + 2, 'SPC', {
      fontSize: '8px', fontFamily: 'monospace', color: '#88aaff',
    }).setScrollFactor(0).setDepth(UI_DEPTH + 13);

    // Name below
    slot.nameText = scene.add.text(x, y + size / 2 + 8, dashNames[dashType] || 'Dash', {
      fontSize: '9px', fontFamily: 'monospace', color: colorToString(color),
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(UI_DEPTH + 12);

    // Cooldown overlay
    slot.cdOverlay = scene.add.rectangle(x, y + size / 2, size, 0, 0x000000, 0.7);
    slot.cdOverlay.setOrigin(0.5, 1);
    slot.cdOverlay.setScrollFactor(0).setDepth(UI_DEPTH + 14);

    // Cooldown text
    slot.cdText = scene.add.text(x, y, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(UI_DEPTH + 15);
    slot.cdText.setVisible(false);

    // Charge dots (for rogue)
    slot.chargeText = scene.add.text(x, y + size / 2 + 20, '', {
      fontSize: '10px', fontFamily: 'monospace', color: '#88aaff',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(UI_DEPTH + 12);

    this.add([slot.separator, slot.bg, slot.icon, slot.keyLabel, slot.nameText, slot.cdOverlay, slot.cdText, slot.chargeText]);
    this.dashSlot = slot;
    this.dashSlot._size = size;
    this.dashSlot._color = color;
  }

  updateDash(info) {
    if (!this.dashSlot || !info) return;
    const slot = this.dashSlot;
    const size = slot._size;

    if (info.maxCharges > 1) {
      // Charge-based (rogue)
      const dots = '●'.repeat(info.charges) + '○'.repeat(info.maxCharges - info.charges);
      slot.chargeText.setText(dots);

      if (info.charges > 0) {
        slot.cdOverlay.height = 0;
        slot.cdText.setVisible(false);
        slot.bg.setStrokeStyle(2, slot._color);
        slot.icon.setAlpha(1);
      } else {
        const ratio = info.cooldown / info.maxCooldown;
        slot.cdOverlay.height = size * ratio;
        slot.cdText.setText(info.cooldown.toFixed(1));
        slot.cdText.setVisible(true);
        slot.bg.setStrokeStyle(2, 0x444444);
        slot.icon.setAlpha(0.4);
      }
    } else {
      // Single-cooldown (mage/warrior/archer)
      slot.chargeText.setText('');

      if (info.charges > 0) {
        slot.cdOverlay.height = 0;
        slot.cdText.setVisible(false);
        slot.bg.setStrokeStyle(2, slot._color);
        slot.icon.setAlpha(1);
      } else {
        const ratio = info.cooldown / info.maxCooldown;
        slot.cdOverlay.height = size * ratio;
        slot.cdText.setText(Math.ceil(info.cooldown).toString());
        slot.cdText.setVisible(true);
        slot.bg.setStrokeStyle(2, 0x444444);
        slot.icon.setAlpha(0.4);
      }
    }
  }

  _createSlot(scene, x, y, size, skillId, index) {
    const skillDef = SKILLS[skillId];
    const slot = {};

    // Background frame
    slot.bg = scene.add.rectangle(x, y, size, size, 0x333333, 0.85);
    slot.bg.setStrokeStyle(2, 0x888888);
    slot.bg.setScrollFactor(0);
    slot.bg.setDepth(UI_DEPTH + 10);

    // Skill icon
    slot.icon = scene.add.image(x, y, `skill_${skillId}`);
    slot.icon.setDisplaySize(size - 8, size - 8);
    slot.icon.setScrollFactor(0);
    slot.icon.setDepth(UI_DEPTH + 11);

    // Key label in top-left corner
    slot.keyLabel = scene.add.text(x - size / 2 + 4, y - size / 2 + 2, `${index + 1}`, {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffff00',
    }).setScrollFactor(0).setDepth(UI_DEPTH + 13);

    // Mana cost text below slot
    const manaCost = skillDef ? skillDef.manaCost : 0;
    slot.manaText = scene.add.text(x, y + size / 2 + 8, `${manaCost}`, {
      fontSize: '10px', fontFamily: 'monospace', color: '#4488ff',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(UI_DEPTH + 12);

    // Cooldown overlay (dark semi-transparent rect, starts hidden)
    slot.cdOverlay = scene.add.rectangle(x, y + size / 2, size, 0, 0x000000, 0.7);
    slot.cdOverlay.setOrigin(0.5, 1);
    slot.cdOverlay.setScrollFactor(0);
    slot.cdOverlay.setDepth(UI_DEPTH + 14);

    // Cooldown text
    slot.cdText = scene.add.text(x, y, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(UI_DEPTH + 15);
    slot.cdText.setVisible(false);

    this.add([slot.bg, slot.icon, slot.keyLabel, slot.manaText, slot.cdOverlay, slot.cdText]);

    return slot;
  }

  updateCooldown(index, remaining, total) {
    const slot = this.slots[index];
    if (!slot) return;

    if (remaining <= 0) {
      slot.cdOverlay.height = 0;
      slot.cdText.setVisible(false);
      slot.icon.setAlpha(1);
    } else {
      const ratio = remaining / total;
      slot.cdOverlay.height = 48 * ratio;
      slot.cdText.setText(Math.ceil(remaining).toString());
      slot.cdText.setVisible(true);
      slot.icon.setAlpha(0.5);
    }
  }

  setManaAvailable(index, hasEnoughMana) {
    const slot = this.slots[index];
    if (!slot) return;

    if (hasEnoughMana) {
      slot.icon.setTint(0xffffff);
      slot.manaText.setColor('#4488ff');
    } else {
      slot.icon.setTint(0x555555);
      slot.manaText.setColor('#ff4444');
    }
  }

  highlightSkill(index) {
    const slot = this.slots[index];
    if (!slot) return;

    slot.bg.setStrokeStyle(3, 0xffff00);
    this.scene.time.delayedCall(200, () => {
      slot.bg.setStrokeStyle(2, 0x888888);
    });
  }
}

// ══════════════════════════════════════════════════════════════
//  4. InventoryPanel
// ══════════════════════════════════════════════════════════════

class InventoryPanel extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, 0, 0);
    scene.add.existing(this);

    this.panelWidth = 300;
    this.panelHeight = 400;
    this.panelX = GAME.WIDTH - this.panelWidth / 2 - 16;
    this.panelY = GAME.HEIGHT / 2;
    this.itemSlots = [];
    this.items = [];

    // Background
    this.bg = scene.add.rectangle(this.panelX, this.panelY, this.panelWidth, this.panelHeight, 0x111111, 0.9);
    this.bg.setStrokeStyle(2, 0x555555);
    this.bg.setScrollFactor(0);

    // Title
    this.title = scene.add.text(this.panelX, this.panelY - this.panelHeight / 2 + 20, 'Inventory', STYLE_TITLE)
      .setOrigin(0.5, 0.5).setScrollFactor(0);

    // Close button
    this.closeBtn = scene.add.text(
      this.panelX + this.panelWidth / 2 - 12,
      this.panelY - this.panelHeight / 2 + 12,
      'X', { fontSize: '16px', fontFamily: 'monospace', color: '#ff4444' }
    ).setOrigin(0.5, 0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });
    this.closeBtn.on('pointerdown', () => this.hide());

    this.add([this.bg, this.title, this.closeBtn]);

    // Create 6 slots in a 2x3 grid
    const slotSize = 48;
    const gridCols = 2;
    const gridRows = 3;
    const gapX = 20;
    const gapY = 16;
    const gridStartX = this.panelX - (gridCols * slotSize + (gridCols - 1) * gapX) / 2 + slotSize / 2;
    const gridStartY = this.panelY - this.panelHeight / 2 + 60;

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const sx = gridStartX + col * (slotSize + gapX + 80);
        const sy = gridStartY + row * (slotSize + gapY + 40);
        const slot = this._createItemSlot(scene, sx, sy, slotSize);
        this.itemSlots.push(slot);
      }
    }

    this.setDepth(UI_DEPTH + 20);
    this.setVisible(false);
  }

  _createItemSlot(scene, x, y, size) {
    const slot = {};

    // Slot background
    slot.bg = scene.add.rectangle(x, y, size, size, 0x222222, 0.8);
    slot.bg.setStrokeStyle(2, 0x666666);
    slot.bg.setScrollFactor(0);

    // Item icon placeholder
    slot.icon = scene.add.rectangle(x, y, size - 8, size - 8, 0x444444, 0.5);
    slot.icon.setScrollFactor(0);
    slot.icon.setVisible(false);

    // Item name (right of slot)
    slot.nameText = scene.add.text(x + size / 2 + 8, y - 12, '', {
      fontSize: '11px', fontFamily: 'monospace', color: '#ffffff',
      wordWrap: { width: 100 },
    }).setScrollFactor(0);

    // Stat boosts text (green)
    slot.statsText = scene.add.text(x + size / 2 + 8, y + 4, '', {
      fontSize: '10px', fontFamily: 'monospace', color: '#44ff44',
      wordWrap: { width: 100 },
    }).setScrollFactor(0);

    // Negatives text (red)
    slot.negText = scene.add.text(x + size / 2 + 8, y + 18, '', {
      fontSize: '10px', fontFamily: 'monospace', color: '#ff4444',
      wordWrap: { width: 100 },
    }).setScrollFactor(0);

    slot.x = x;
    slot.y = y;
    slot.size = size;

    this.add([slot.bg, slot.icon, slot.nameText, slot.statsText, slot.negText]);

    return slot;
  }

  setItems(items) {
    this.items = items || [];

    for (let i = 0; i < this.itemSlots.length; i++) {
      const slot = this.itemSlots[i];
      const item = this.items[i];

      if (item) {
        const rarityColor = item.rarityDef ? item.rarityDef.color : 0xaaaaaa;
        slot.bg.setStrokeStyle(2, rarityColor);
        slot.icon.setFillStyle(rarityColor, 0.6);
        slot.icon.setVisible(true);
        slot.nameText.setText(item.name || '');
        slot.nameText.setColor(colorToString(rarityColor));

        // Build stat text
        const statLines = [];
        if (item.statBoosts) {
          for (const [key, val] of Object.entries(item.statBoosts)) {
            if (key === 'skillBoost') continue;
            statLines.push(`+${val} ${key}`);
          }
        }
        slot.statsText.setText(statLines.join('\n'));

        // Build negatives text
        const negLines = [];
        if (item.negatives) {
          for (const [key, val] of Object.entries(item.negatives)) {
            negLines.push(`${val} ${key}`);
          }
        }
        slot.negText.setText(negLines.join('\n'));
      } else {
        slot.bg.setStrokeStyle(2, 0x666666);
        slot.icon.setVisible(false);
        slot.nameText.setText('');
        slot.statsText.setText('');
        slot.negText.setText('');
      }
    }
  }

  show() {
    this.setVisible(true);
  }

  hide() {
    this.setVisible(false);
  }

  toggle() {
    this.setVisible(!this.visible);
  }

  getSlotAtPointer(pointer) {
    for (let i = 0; i < this.itemSlots.length; i++) {
      const slot = this.itemSlots[i];
      const halfSize = slot.size / 2;
      if (
        pointer.x >= slot.x - halfSize && pointer.x <= slot.x + halfSize &&
        pointer.y >= slot.y - halfSize && pointer.y <= slot.y + halfSize
      ) {
        return i;
      }
    }
    return -1;
  }
}

// ══════════════════════════════════════════════════════════════
//  5. DamageText
// ══════════════════════════════════════════════════════════════

class DamageText {
  static show(scene, x, y, amount, color = 0xffffff, isCrit = false) {
    const offsetX = Phaser.Math.Between(-20, 20);
    const text = isCrit ? `CRIT! ${Math.round(amount)}` : `${Math.round(amount)}`;
    const fontSize = isCrit ? '20px' : '14px';
    const colorStr = colorToString(color);

    const dmgText = scene.add.text(x + offsetX, y, text, {
      fontSize,
      fontFamily: 'monospace',
      color: colorStr,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setDepth(UI_DEPTH + 50);

    scene.tweens.add({
      targets: dmgText,
      y: y - 40,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        dmgText.destroy();
      },
    });
  }

  static showHeal(scene, x, y, amount) {
    const offsetX = Phaser.Math.Between(-15, 15);
    const text = `+${Math.round(amount)}`;

    const healText = scene.add.text(x + offsetX, y, text, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#44ff44',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setDepth(UI_DEPTH + 50);

    scene.tweens.add({
      targets: healText,
      y: y - 40,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        healText.destroy();
      },
    });
  }
}

// ══════════════════════════════════════════════════════════════
//  6. RewardPanel
// ══════════════════════════════════════════════════════════════

class RewardPanel extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, 0, 0);
    scene.add.existing(this);

    this._resolveChoice = null;
    this.cards = [];

    // Full-screen dark overlay
    this.overlay = scene.add.rectangle(
      GAME.WIDTH / 2, GAME.HEIGHT / 2,
      GAME.WIDTH, GAME.HEIGHT,
      0x000000, 0.75
    ).setScrollFactor(0);

    // Title
    this.titleText = scene.add.text(GAME.WIDTH / 2, 60, 'Choose Your Reward', {
      fontSize: '28px', fontFamily: 'monospace', color: '#ffcc00', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setScrollFactor(0);

    this.add([this.overlay, this.titleText]);

    // Create 3 cards
    const cardW = 200;
    const cardH = 280;
    const gap = 30;
    const totalW = cardW * 3 + gap * 2;
    const startX = (GAME.WIDTH - totalW) / 2 + cardW / 2;
    const cardY = GAME.HEIGHT / 2 + 10;

    const cardTypes = ['item', 'heal', 'boost'];
    for (let i = 0; i < 3; i++) {
      const cx = startX + i * (cardW + gap);
      const card = this._createCard(scene, cx, cardY, cardW, cardH, cardTypes[i]);
      this.cards.push(card);
    }

    this.setDepth(UI_DEPTH + 100);
    this.setVisible(false);
  }

  _createCard(scene, x, y, w, h, type) {
    const card = { type, x, y, w, h };

    // Card background
    card.bg = scene.add.rectangle(x, y, w, h, 0x1a1a2e, 0.95);
    card.bg.setStrokeStyle(2, 0x555555);
    card.bg.setScrollFactor(0);
    card.bg.setInteractive({ useHandCursor: true });

    // Card title
    card.titleText = scene.add.text(x, y - h / 2 + 24, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setScrollFactor(0);

    // Card body (multi-line description)
    card.bodyText = scene.add.text(x, y + 10, '', {
      ...STYLE_BODY,
      wordWrap: { width: w - 24 },
      align: 'center',
    }).setOrigin(0.5, 0.5).setScrollFactor(0);

    // Card sub text (stats, etc.)
    card.subText = scene.add.text(x, y + h / 2 - 40, '', {
      ...STYLE_SMALL,
      wordWrap: { width: w - 24 },
      align: 'center',
    }).setOrigin(0.5, 0.5).setScrollFactor(0);

    // Hover effects
    card.bg.on('pointerover', () => {
      card.bg.setStrokeStyle(3, 0xffcc00);
      scene.tweens.add({
        targets: [card.bg, card.titleText, card.bodyText, card.subText],
        scaleX: 1.05, scaleY: 1.05,
        duration: 100,
        ease: 'Power1',
      });
    });

    card.bg.on('pointerout', () => {
      card.bg.setStrokeStyle(2, 0x555555);
      scene.tweens.add({
        targets: [card.bg, card.titleText, card.bodyText, card.subText],
        scaleX: 1, scaleY: 1,
        duration: 100,
        ease: 'Power1',
      });
    });

    card.bg.on('pointerdown', () => {
      if (this._resolveChoice) {
        this._resolveChoice({ type: card.type, data: card.data });
        this._resolveChoice = null;
        this.hide();
      }
    });

    this.add([card.bg, card.titleText, card.bodyText, card.subText]);

    return card;
  }

  showRewards(choices) {
    // Populate item card
    const itemCard = this.cards[0];
    const item = choices.item;
    itemCard.data = item;
    const rarityColor = item.rarityDef ? colorToString(item.rarityDef.color) : '#aaaaaa';
    itemCard.titleText.setText(item.name || 'Item');
    itemCard.titleText.setColor(rarityColor);
    itemCard.bg.setStrokeStyle(2, item.rarityDef ? item.rarityDef.color : 0x555555);

    const itemStats = [];
    if (item.statBoosts) {
      for (const [key, val] of Object.entries(item.statBoosts)) {
        if (key === 'skillBoost') continue;
        itemStats.push(`+${val} ${key}`);
      }
    }
    let itemBody = item.description || '';
    if (item.rarityDef) itemBody = `[${item.rarityDef.name}]\n${itemBody}`;
    itemCard.bodyText.setText(itemBody);

    const negLines = [];
    if (item.negatives) {
      for (const [key, val] of Object.entries(item.negatives)) {
        negLines.push(`${val} ${key}`);
      }
    }
    const allStats = itemStats.concat(negLines.map(n => `\u001b[31m${n}`));
    itemCard.subText.setText(itemStats.join('\n') + (negLines.length ? '\n' + negLines.join('\n') : ''));

    // Populate heal card
    const healCard = this.cards[1];
    healCard.data = choices.heal;
    healCard.titleText.setText('Heal');
    healCard.titleText.setColor('#44ff44');
    const healPercent = Math.round((choices.heal.amount || 0.4) * 100);
    healCard.bodyText.setText(`Restore ${healPercent}% HP`);
    healCard.subText.setText('');

    // Populate boost card
    const boostCard = this.cards[2];
    boostCard.data = choices.boost;
    boostCard.titleText.setText('Stat Boost');
    boostCard.titleText.setColor('#88ccff');
    const boost = choices.boost;
    boostCard.bodyText.setText(`+${boost.amount} ${boost.stat}`);
    boostCard.subText.setText('Permanent for this run');

    this.setVisible(true);

    return new Promise((resolve) => {
      this._resolveChoice = resolve;
    });
  }

  hide() {
    this.setVisible(false);
  }
}

// ══════════════════════════════════════════════════════════════
//  7. SoulShopPanel
// ══════════════════════════════════════════════════════════════

class SoulShopPanel extends Phaser.GameObjects.Container {
  constructor(scene, soulData) {
    super(scene, 0, 0);
    scene.add.existing(this);

    this.soulData = soulData || { souls: 0, upgrades: {} };
    this.upgradeRows = {};

    const panelW = 500;
    const panelH = 480;
    const panelX = GAME.WIDTH / 2;
    const panelY = GAME.HEIGHT / 2;

    // Background
    this.bg = scene.add.rectangle(panelX, panelY, panelW, panelH, 0x111122, 0.95);
    this.bg.setStrokeStyle(2, 0x6644cc);
    this.bg.setScrollFactor(0);

    // Title
    this.titleText = scene.add.text(panelX, panelY - panelH / 2 + 28, 'Soul Forge', {
      fontSize: '26px', fontFamily: 'monospace', color: '#cc88ff', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setScrollFactor(0);

    // Souls display
    this.soulsText = scene.add.text(panelX, panelY - panelH / 2 + 58, `Souls: ${this.soulData.souls}`, {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffcc00',
    }).setOrigin(0.5, 0.5).setScrollFactor(0);

    this.add([this.bg, this.titleText, this.soulsText]);

    // Create upgrade rows
    const upgradeKeys = Object.keys(SOUL_UPGRADES);
    const rowStartY = panelY - panelH / 2 + 100;
    const rowH = 56;

    upgradeKeys.forEach((upgradeId, idx) => {
      const upgrade = SOUL_UPGRADES[upgradeId];
      const ry = rowStartY + idx * rowH;
      const row = this._createUpgradeRow(scene, panelX, ry, panelW - 40, upgrade, upgradeId);
      this.upgradeRows[upgradeId] = row;
    });

    this.setDepth(UI_DEPTH + 80);
    this.setVisible(false);
  }

  _createUpgradeRow(scene, x, y, width, upgrade, upgradeId) {
    const row = {};
    const currentLevel = (this.soulData.upgrades && this.soulData.upgrades[upgradeId]) || 0;
    const cost = upgrade.costBase + upgrade.costScale * currentLevel;
    const isMaxed = currentLevel >= upgrade.maxLevel;

    // Row background
    row.bg = scene.add.rectangle(x, y, width, 48, 0x1a1a2e, 0.8);
    row.bg.setStrokeStyle(1, 0x333355);
    row.bg.setScrollFactor(0);

    // Name + description
    row.nameText = scene.add.text(x - width / 2 + 12, y - 12, upgrade.name, {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setScrollFactor(0);

    row.descText = scene.add.text(x - width / 2 + 12, y + 6, upgrade.description, {
      fontSize: '10px', fontFamily: 'monospace', color: '#999999',
    }).setScrollFactor(0);

    // Level display
    row.levelText = scene.add.text(x + width / 2 - 140, y, `Lv ${currentLevel}/${upgrade.maxLevel}`, {
      fontSize: '13px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0, 0.5).setScrollFactor(0);

    // Buy button
    const btnColor = isMaxed ? 0x333333 : (this.soulData.souls >= cost ? 0x4444aa : 0x333333);
    const btnText = isMaxed ? 'MAX' : `${cost} souls`;
    row.btn = scene.add.rectangle(x + width / 2 - 50, y, 90, 32, btnColor, 0.9);
    row.btn.setStrokeStyle(1, 0x6666aa);
    row.btn.setScrollFactor(0);
    row.btn.setInteractive({ useHandCursor: true });

    row.btnText = scene.add.text(x + width / 2 - 50, y, btnText, {
      fontSize: '11px', fontFamily: 'monospace', color: isMaxed ? '#666666' : '#ffffff',
    }).setOrigin(0.5, 0.5).setScrollFactor(0);

    row.btn.on('pointerover', () => {
      if (!row._disabled) row.btn.setStrokeStyle(2, 0xffcc00);
    });
    row.btn.on('pointerout', () => {
      row.btn.setStrokeStyle(1, 0x6666aa);
    });

    row.btn.on('pointerdown', () => {
      if (row._disabled) return;
      const lvl = (this.soulData.upgrades && this.soulData.upgrades[upgradeId]) || 0;
      const currentCost = upgrade.costBase + upgrade.costScale * lvl;
      if (lvl >= upgrade.maxLevel || this.soulData.souls < currentCost) return;
      this.emit('soul-purchase', { upgradeId, cost: currentCost });
    });

    row._disabled = isMaxed || this.soulData.souls < cost;
    row.upgradeId = upgradeId;

    this.add([row.bg, row.nameText, row.descText, row.levelText, row.btn, row.btnText]);

    return row;
  }

  updateSouls(amount) {
    this.soulData.souls = amount;
    this.soulsText.setText(`Souls: ${amount}`);
    this._refreshButtons();
  }

  updateUpgrade(upgradeId, newLevel) {
    if (!this.soulData.upgrades) this.soulData.upgrades = {};
    this.soulData.upgrades[upgradeId] = newLevel;

    const row = this.upgradeRows[upgradeId];
    if (!row) return;

    const upgrade = SOUL_UPGRADES[upgradeId];
    const isMaxed = newLevel >= upgrade.maxLevel;
    const cost = upgrade.costBase + upgrade.costScale * newLevel;

    row.levelText.setText(`Lv ${newLevel}/${upgrade.maxLevel}`);

    if (isMaxed) {
      row.btnText.setText('MAX');
      row.btnText.setColor('#666666');
      row.btn.setFillStyle(0x333333, 0.9);
      row._disabled = true;
    } else {
      row.btnText.setText(`${cost} souls`);
      row._disabled = this.soulData.souls < cost;
      row.btn.setFillStyle(row._disabled ? 0x333333 : 0x4444aa, 0.9);
      row.btnText.setColor(row._disabled ? '#666666' : '#ffffff');
    }
  }

  _refreshButtons() {
    for (const [upgradeId, row] of Object.entries(this.upgradeRows)) {
      const upgrade = SOUL_UPGRADES[upgradeId];
      const lvl = (this.soulData.upgrades && this.soulData.upgrades[upgradeId]) || 0;
      const isMaxed = lvl >= upgrade.maxLevel;
      const cost = upgrade.costBase + upgrade.costScale * lvl;

      if (isMaxed) {
        row._disabled = true;
        row.btn.setFillStyle(0x333333, 0.9);
        row.btnText.setColor('#666666');
      } else {
        row._disabled = this.soulData.souls < cost;
        row.btn.setFillStyle(row._disabled ? 0x333333 : 0x4444aa, 0.9);
        row.btnText.setColor(row._disabled ? '#666666' : '#ffffff');
      }
    }
  }

  show() {
    this.setVisible(true);
  }

  hide() {
    this.setVisible(false);
  }
}

// ══════════════════════════════════════════════════════════════
//  Exports
// ══════════════════════════════════════════════════════════════

export { HealthBar, ManaBar, SkillBar, InventoryPanel, DamageText, RewardPanel, SoulShopPanel };
