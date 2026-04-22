import { CHARACTERS, SKILLS } from '/shared/gameData.js';

export default class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super('CharacterSelect');
  }

  create() {
    this.selectedCharacter = null;
    this.cards = [];
    this.cardContainers = [];
    this.glowBorder = null;
    this.pulseTimer = null;

    const { width, height } = this.cameras.main;

    // -- Background --
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a14);
    this._createParticles();

    // -- Title --
    this.titleText = this.add.text(width / 2, 40, 'CHOOSE YOUR CHAMPION', {
      fontFamily: 'monospace',
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0);

    // -- Compute max stats for normalization --
    const charTypes = Object.keys(CHARACTERS);
    const statKeys = ['hp', 'mana', 'defense', 'agility', 'attack'];
    this.maxStats = {};
    for (const key of statKeys) {
      this.maxStats[key] = Math.max(...charTypes.map(t => CHARACTERS[t].stats[key]));
    }

    // -- Create character cards --
    const cardWidth = 220;
    const cardHeight = 390;
    const totalWidth = charTypes.length * cardWidth + (charTypes.length - 1) * 20;
    const startX = (width - totalWidth) / 2 + cardWidth / 2;
    const cardY = height / 2 - 10;

    charTypes.forEach((type, i) => {
      const x = startX + i * (cardWidth + 20);
      this._createCard(type, x, cardY, cardWidth, cardHeight, i);
    });

    // -- Enter button --
    this.enterBtn = this._createButton(width / 2, height - 50, 'ENTER THE ARENA', 260, 50);
    this.enterBtn.setAlpha(0.4);
    this.enterBtnActive = false;

    this.enterBtn.on('pointerdown', () => {
      if (this.enterBtnActive && this.selectedCharacter) {
        this.scene.start('Lobby', { character: this.selectedCharacter });
      }
    });

    // -- Slide-in animation --
    this.cardContainers.forEach((container, i) => {
      const targetY = container.y;
      container.y = height + cardHeight;
      this.tweens.add({
        targets: container,
        y: targetY,
        duration: 500,
        delay: i * 100,
        ease: 'Back.easeOut',
      });
    });
  }

  _createParticles() {
    const { width, height } = this.cameras.main;
    const particles = [];
    for (let i = 0; i < 40; i++) {
      const p = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(1, 3),
        0x4444aa,
        Phaser.Math.FloatBetween(0.1, 0.3)
      );
      particles.push(p);
      this.tweens.add({
        targets: p,
        y: p.y - Phaser.Math.Between(30, 80),
        alpha: 0,
        duration: Phaser.Math.Between(3000, 6000),
        repeat: -1,
        yoyo: true,
        delay: Phaser.Math.Between(0, 3000),
      });
    }
  }

  _createCard(type, x, y, w, h, index) {
    const char = CHARACTERS[type];
    const container = this.add.container(x, y);

    // Card background
    const bg = this.add.rectangle(0, 0, w, h, 0x1a1a2e, 0.9);
    bg.setStrokeStyle(2, 0x333355);
    container.add(bg);

    // Border (for selection glow)
    const border = this.add.rectangle(0, 0, w + 6, h + 6);
    border.setStrokeStyle(3, char.accent);
    border.setFillStyle(0x000000, 0);
    border.setVisible(false);
    container.add(border);

    // Character sprite
    const sprite = this.add.image(0, -h / 2 + 60, `char_${type}`).setScale(3);
    container.add(sprite);

    // Character name
    const nameText = this.add.text(0, -h / 2 + 110, char.name.toUpperCase(), {
      fontFamily: 'monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#' + char.accent.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);
    container.add(nameText);

    // Description
    const descText = this.add.text(0, -h / 2 + 133, char.description, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#aaaaaa',
      wordWrap: { width: w - 20 },
      align: 'center',
    }).setOrigin(0.5, 0);
    container.add(descText);

    // Stat bars
    const statColors = {
      hp: 0xff4444,
      mana: 0x4488ff,
      defense: 0x888888,
      agility: 0x44cc44,
      attack: 0xff8844,
    };
    const statLabels = {
      hp: 'HP',
      mana: 'MNA',
      defense: 'DEF',
      agility: 'AGI',
      attack: 'ATK',
    };
    const statKeys = ['hp', 'mana', 'defense', 'agility', 'attack'];
    const barStartY = -h / 2 + 175;
    const barHeight = 8;
    const barMaxWidth = 100;
    const barX = -w / 2 + 42;

    statKeys.forEach((stat, si) => {
      const sy = barStartY + si * 18;

      // Label
      const label = this.add.text(barX - 4, sy, statLabels[stat], {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#888888',
      }).setOrigin(1, 0.5);
      container.add(label);

      // Bar background
      const barBg = this.add.rectangle(barX + barMaxWidth / 2, sy, barMaxWidth, barHeight, 0x222233);
      container.add(barBg);

      // Bar fill
      const ratio = char.stats[stat] / this.maxStats[stat];
      const fillWidth = Math.round(barMaxWidth * ratio);
      const barFill = this.add.rectangle(
        barX + fillWidth / 2, sy,
        fillWidth, barHeight,
        statColors[stat]
      );
      container.add(barFill);

      // Value text
      const valText = this.add.text(barX + barMaxWidth + 6, sy, `${char.stats[stat]}`, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#cccccc',
      }).setOrigin(0, 0.5);
      container.add(valText);
    });

    // Skill icons
    const skillY = barStartY + statKeys.length * 18 + 20;
    const skillSpacing = 60;
    const skillStartX = -(char.skills.length - 1) * skillSpacing / 2;

    char.skills.forEach((skillId, si) => {
      const skill = SKILLS[skillId];
      const sx = skillStartX + si * skillSpacing;

      const skillIcon = this.add.image(sx, skillY, `skill_${skillId}`).setScale(1.2);
      skillIcon.setDisplaySize(32, 32);
      container.add(skillIcon);

      const skillName = this.add.text(sx, skillY + 24, skill.name, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#' + (skill.color || 0xffffff).toString(16).padStart(6, '0'),
        align: 'center',
      }).setOrigin(0.5, 0);
      container.add(skillName);
    });

    // Ultimate ability
    if (char.ultimate) {
      const ultY = skillY + 44;
      const ultDef = char.ultimate;
      const ultIconKeys = { blackhole: 'ult_blackhole', whirlwind: 'ult_whirlwind', wolf: 'ult_wolf', poison_storm: 'ult_poison_storm' };
      const ultTexKey = ultIconKeys[ultDef.type] || 'ult_blackhole';

      // Divider
      const divLine = this.add.rectangle(0, ultY - 6, w - 30, 1, 0x444466, 0.5);
      container.add(divLine);

      // "R" label
      const rLabel = this.add.text(-w / 2 + 14, ultY + 4, 'R', {
        fontFamily: 'monospace', fontSize: '10px', color: '#ffcc00', fontStyle: 'bold',
      }).setOrigin(0, 0.5);
      container.add(rLabel);

      // Icon
      const ultIcon = this.add.image(-w / 2 + 36, ultY + 4, ultTexKey);
      ultIcon.setDisplaySize(22, 22);
      container.add(ultIcon);

      // Name
      const ultName = this.add.text(-w / 2 + 52, ultY - 2, ultDef.name, {
        fontFamily: 'monospace', fontSize: '9px', fontStyle: 'bold',
        color: '#' + (ultDef.color || 0xffffff).toString(16).padStart(6, '0'),
      });
      container.add(ultName);

      // Description
      const ultDescs = {
        blackhole: 'Pulls all enemies in and explodes',
        whirlwind: 'Spin dealing damage all around',
        wolf: 'Summon a wolf ally to fight',
        poison_storm: 'Ranged poison shivs for 15s',
      };
      const ultDesc = this.add.text(-w / 2 + 52, ultY + 9, ultDescs[ultDef.type] || '', {
        fontFamily: 'monospace', fontSize: '7px', color: '#888899',
        wordWrap: { width: w - 75 },
      });
      container.add(ultDesc);
    }

    // Make interactive
    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerover', () => {
      if (this.selectedCharacter !== type) {
        this.tweens.add({
          targets: container,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 150,
          ease: 'Sine.easeOut',
        });
        bg.setFillStyle(0x222244, 0.95);
      }
    });

    bg.on('pointerout', () => {
      if (this.selectedCharacter !== type) {
        this.tweens.add({
          targets: container,
          scaleX: 1,
          scaleY: 1,
          duration: 150,
          ease: 'Sine.easeOut',
        });
        bg.setFillStyle(0x1a1a2e, 0.9);
      }
    });

    bg.on('pointerdown', () => {
      this._selectCharacter(type, index);
    });

    container.setSize(w, h);
    this.cardContainers.push(container);
    this.cards.push({ type, container, bg, border });
  }

  _selectCharacter(type, index) {
    this.selectedCharacter = type;
    const char = CHARACTERS[type];

    // Reset all cards
    this.cards.forEach((card) => {
      card.border.setVisible(false);
      card.bg.setFillStyle(0x1a1a2e, 0.9);
      this.tweens.killTweensOf(card.border);
      card.border.setAlpha(1);
      this.tweens.add({
        targets: card.container,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Sine.easeOut',
      });
    });

    // Highlight selected card
    const selected = this.cards[index];
    selected.border.setVisible(true);
    selected.bg.setFillStyle(0x222244, 0.95);

    // Scale selected card up
    this.tweens.add({
      targets: selected.container,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 200,
      ease: 'Sine.easeOut',
    });

    // Pulsing glow on selected border
    if (this.pulseTimer) {
      this.pulseTimer.remove();
    }
    this.tweens.add({
      targets: selected.border,
      alpha: { from: 1, to: 0.4 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Activate enter button
    this.enterBtn.setAlpha(1);
    this.enterBtnActive = true;
  }

  _createButton(x, y, label, w, h) {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, w, h, 0x228844, 1);
    bg.setStrokeStyle(2, 0x44cc66);
    container.add(bg);

    const text = this.add.text(0, 0, label, {
      fontFamily: 'monospace',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    container.add(text);

    container.setSize(w, h);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      if (this.enterBtnActive) {
        bg.setFillStyle(0x33aa55);
      }
    });

    container.on('pointerout', () => {
      if (this.enterBtnActive) {
        bg.setFillStyle(0x228844);
      }
    });

    return container;
  }
}
