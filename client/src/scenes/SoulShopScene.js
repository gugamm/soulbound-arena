// ══════════════════════════════════════════════════════════════
//  SoulShopScene — Standalone soul forge for the menu
// ══════════════════════════════════════════════════════════════
import { SOUL_UPGRADES, GAME } from '/shared/gameData.js';

export default class SoulShopScene extends Phaser.Scene {
  constructor() {
    super('SoulShop');
  }

  create() {
    this.souls = parseInt(localStorage.getItem('soulbound_souls') || '0');
    this.upgrades = JSON.parse(localStorage.getItem('soulbound_upgrades') || '{}');

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a1a, 1);
    bg.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);

    // Decorative border
    bg.lineStyle(2, 0x6644aa, 0.5);
    bg.strokeRect(40, 40, GAME.WIDTH - 80, GAME.HEIGHT - 80);

    // Title
    this.add.text(GAME.WIDTH / 2, 70, 'SOUL FORGE', {
      fontSize: '36px', fontFamily: 'monospace', color: '#cc88ff',
      stroke: '#440066', strokeThickness: 4,
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(GAME.WIDTH / 2, 110, 'Spend souls to permanently empower your champions', {
      fontSize: '14px', fontFamily: 'monospace', color: '#8866aa',
    }).setOrigin(0.5);

    // Soul counter
    this.soulText = this.add.text(GAME.WIDTH / 2, 150, '', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffcc00',
    }).setOrigin(0.5);
    this._updateSoulText();

    // Upgrade rows
    const startY = 200;
    const rowHeight = 72;
    this.upgradeRows = {};

    const upgradeKeys = Object.keys(SOUL_UPGRADES);
    upgradeKeys.forEach((key, i) => {
      const upgrade = SOUL_UPGRADES[key];
      const y = startY + i * rowHeight;
      const currentLevel = this.upgrades[key] || 0;
      const isMaxed = currentLevel >= upgrade.maxLevel;
      const cost = upgrade.costBase + upgrade.costScale * currentLevel;

      // Row background
      const rowBg = this.add.graphics();
      rowBg.fillStyle(0x1a1a2e, 0.8);
      rowBg.fillRoundedRect(120, y - 10, GAME.WIDTH - 240, 60, 8);
      rowBg.lineStyle(1, 0x332266, 0.6);
      rowBg.strokeRoundedRect(120, y - 10, GAME.WIDTH - 240, 60, 8);

      // Name
      this.add.text(150, y + 2, upgrade.name, {
        fontSize: '18px', fontFamily: 'monospace', color: '#ffffff',
      });

      // Description
      this.add.text(150, y + 24, upgrade.description, {
        fontSize: '12px', fontFamily: 'monospace', color: '#888899',
      });

      // Level
      const levelText = this.add.text(650, y + 10, `Lv ${currentLevel}/${upgrade.maxLevel}`, {
        fontSize: '16px', fontFamily: 'monospace', color: '#aaaacc',
      });

      // Level bar
      const barBg = this.add.graphics();
      barBg.fillStyle(0x222233, 1);
      barBg.fillRect(750, y + 8, 150, 16);
      const barFill = this.add.graphics();
      const fillWidth = (currentLevel / upgrade.maxLevel) * 148;
      barFill.fillStyle(0x8844cc, 1);
      barFill.fillRect(751, y + 9, fillWidth, 14);
      barBg.lineStyle(1, 0x444466, 1);
      barBg.strokeRect(750, y + 8, 150, 16);

      // Buy button
      const btnX = 950;
      const btnW = 130;
      const btnH = 36;
      const btnBg = this.add.graphics();
      const canAfford = this.souls >= cost && !isMaxed;

      btnBg.fillStyle(canAfford ? 0x4422aa : 0x222233, 1);
      btnBg.fillRoundedRect(btnX, y + 2, btnW, btnH, 6);
      btnBg.lineStyle(1, canAfford ? 0x6644cc : 0x333344, 1);
      btnBg.strokeRoundedRect(btnX, y + 2, btnW, btnH, 6);

      const btnText = this.add.text(btnX + btnW / 2, y + 20, isMaxed ? 'MAXED' : `${cost} souls`, {
        fontSize: '13px', fontFamily: 'monospace',
        color: isMaxed ? '#666666' : (canAfford ? '#ffcc00' : '#664444'),
      }).setOrigin(0.5);

      // Make button interactive
      const hitZone = this.add.zone(btnX + btnW / 2, y + 20, btnW, btnH).setInteractive({ useHandCursor: true });

      hitZone.on('pointerover', () => {
        if (this.souls >= cost && !isMaxed) {
          btnBg.clear();
          btnBg.fillStyle(0x5533bb, 1);
          btnBg.fillRoundedRect(btnX, y + 2, btnW, btnH, 6);
          btnBg.lineStyle(1, 0x7755dd, 1);
          btnBg.strokeRoundedRect(btnX, y + 2, btnW, btnH, 6);
        }
      });

      hitZone.on('pointerout', () => {
        const ca = this.souls >= cost && !isMaxed;
        btnBg.clear();
        btnBg.fillStyle(ca ? 0x4422aa : 0x222233, 1);
        btnBg.fillRoundedRect(btnX, y + 2, btnW, btnH, 6);
        btnBg.lineStyle(1, ca ? 0x6644cc : 0x333344, 1);
        btnBg.strokeRoundedRect(btnX, y + 2, btnW, btnH, 6);
      });

      hitZone.on('pointerdown', () => {
        this._buyUpgrade(key);
      });

      this.upgradeRows[key] = { levelText, barFill, barBg, btnBg, btnText, hitZone, y };
    });

    // Back button
    const backBg = this.add.graphics();
    backBg.fillStyle(0x332222, 1);
    backBg.fillRoundedRect(GAME.WIDTH / 2 - 80, GAME.HEIGHT - 80, 160, 44, 8);
    backBg.lineStyle(1, 0x664444, 1);
    backBg.strokeRoundedRect(GAME.WIDTH / 2 - 80, GAME.HEIGHT - 80, 160, 44, 8);

    this.add.text(GAME.WIDTH / 2, GAME.HEIGHT - 58, 'BACK', {
      fontSize: '20px', fontFamily: 'monospace', color: '#cc8888',
    }).setOrigin(0.5);

    const backZone = this.add.zone(GAME.WIDTH / 2, GAME.HEIGHT - 58, 160, 44).setInteractive({ useHandCursor: true });
    backZone.on('pointerdown', () => {
      this.scene.start('Menu');
    });
    backZone.on('pointerover', () => {
      backBg.clear();
      backBg.fillStyle(0x443333, 1);
      backBg.fillRoundedRect(GAME.WIDTH / 2 - 80, GAME.HEIGHT - 80, 160, 44, 8);
      backBg.lineStyle(1, 0x886666, 1);
      backBg.strokeRoundedRect(GAME.WIDTH / 2 - 80, GAME.HEIGHT - 80, 160, 44, 8);
    });
    backZone.on('pointerout', () => {
      backBg.clear();
      backBg.fillStyle(0x332222, 1);
      backBg.fillRoundedRect(GAME.WIDTH / 2 - 80, GAME.HEIGHT - 80, 160, 44, 8);
      backBg.lineStyle(1, 0x664444, 1);
      backBg.strokeRoundedRect(GAME.WIDTH / 2 - 80, GAME.HEIGHT - 80, 160, 44, 8);
    });
  }

  _buyUpgrade(key) {
    const upgrade = SOUL_UPGRADES[key];
    const currentLevel = this.upgrades[key] || 0;
    if (currentLevel >= upgrade.maxLevel) return;
    const cost = upgrade.costBase + upgrade.costScale * currentLevel;
    if (this.souls < cost) return;

    this.souls -= cost;
    this.upgrades[key] = currentLevel + 1;

    localStorage.setItem('soulbound_souls', this.souls.toString());
    localStorage.setItem('soulbound_upgrades', JSON.stringify(this.upgrades));

    this._updateSoulText();
    this._refreshRow(key);

    // Purchase flash
    const flash = this.add.rectangle(GAME.WIDTH / 2, GAME.HEIGHT / 2, GAME.WIDTH, GAME.HEIGHT, 0xcc88ff, 0.1);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 300,
      onComplete: () => flash.destroy(),
    });
  }

  _updateSoulText() {
    this.soulText.setText(`Souls: ${this.souls}`);
  }

  _refreshRow(key) {
    const row = this.upgradeRows[key];
    if (!row) return;
    const upgrade = SOUL_UPGRADES[key];
    const currentLevel = this.upgrades[key] || 0;
    const isMaxed = currentLevel >= upgrade.maxLevel;
    const cost = upgrade.costBase + upgrade.costScale * currentLevel;
    const canAfford = this.souls >= cost && !isMaxed;

    row.levelText.setText(`Lv ${currentLevel}/${upgrade.maxLevel}`);

    row.barFill.clear();
    const fillWidth = (currentLevel / upgrade.maxLevel) * 148;
    row.barFill.fillStyle(0x8844cc, 1);
    row.barFill.fillRect(751, row.y + 9, fillWidth, 14);

    row.btnText.setText(isMaxed ? 'MAXED' : `${cost} souls`);
    row.btnText.setColor(isMaxed ? '#666666' : (canAfford ? '#ffcc00' : '#664444'));

    row.btnBg.clear();
    row.btnBg.fillStyle(canAfford ? 0x4422aa : 0x222233, 1);
    row.btnBg.fillRoundedRect(950, row.y + 2, 130, 36, 6);
    row.btnBg.lineStyle(1, canAfford ? 0x6644cc : 0x333344, 1);
    row.btnBg.strokeRoundedRect(950, row.y + 2, 130, 36, 6);

    // Refresh all other rows (affordability may have changed)
    Object.keys(this.upgradeRows).forEach(k => {
      if (k !== key) {
        const r = this.upgradeRows[k];
        const u = SOUL_UPGRADES[k];
        const lvl = this.upgrades[k] || 0;
        const mx = lvl >= u.maxLevel;
        const c = u.costBase + u.costScale * lvl;
        const ca = this.souls >= c && !mx;
        r.btnText.setColor(mx ? '#666666' : (ca ? '#ffcc00' : '#664444'));
        r.btnBg.clear();
        r.btnBg.fillStyle(ca ? 0x4422aa : 0x222233, 1);
        r.btnBg.fillRoundedRect(950, r.y + 2, 130, 36, 6);
        r.btnBg.lineStyle(1, ca ? 0x6644cc : 0x333344, 1);
        r.btnBg.strokeRoundedRect(950, r.y + 2, 130, 36, 6);
      }
    });
  }
}
