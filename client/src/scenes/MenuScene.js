// ══════════════════════════════════════════════════════════════
//  SOULBOUND ARENA — Menu Scene
// ══════════════════════════════════════════════════════════════

import { GAME } from '/shared/gameData.js';
import sound from '../systems/SoundManager.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
    this.buttons = [];
    this.roomCodeInput = null;
  }

  create() {
    const cx = GAME.WIDTH / 2;
    const cy = GAME.HEIGHT / 2;

    this.cameras.main.setBackgroundColor(0x08080f);

    // Audio: resume on first interaction (browsers block until user gesture) + menu music
    this.input.once('pointerdown', () => sound.resume());
    this.input.keyboard.once('keydown', () => sound.resume());
    sound.playMusic('menu');

    // ── Atmospheric Background ──
    this._drawBackground(cx, cy);

    // ── Soul Particles ──
    this._createSoulParticles();

    // ── Title ──
    const title = this.add.text(cx, 80, 'SOULBOUND ARENA', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '56px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#1a1a2e',
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);

    // Title glow pulse
    this.tweens.add({
      targets: title,
      alpha: { from: 0.85, to: 1 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Fade title in
    this.tweens.add({
      targets: title,
      alpha: 1,
      duration: 800,
      ease: 'Sine.easeOut',
    });

    const subtitle = this.add.text(cx, 135, 'A Roguelite Co-op Adventure', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#7766aa',
      fontStyle: 'italic',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: subtitle,
      alpha: 1,
      duration: 800,
      delay: 200,
      ease: 'Sine.easeOut',
    });

    // ── Menu Buttons ──
    const buttonStartY = 240;
    const buttonGap = 62;
    const buttonDefs = [
      { label: 'SINGLE PLAYER', action: () => this._startGame('single') },
      { label: 'CREATE ROOM',   action: () => this._startGame('host') },
      { label: 'JOIN ROOM',     action: () => this._showRoomCodeInput() },
      { label: 'SOUL FORGE',    action: () => this.scene.start('SoulShop') },
    ];

    buttonDefs.forEach((def, i) => {
      this._createButton(cx, buttonStartY + i * buttonGap, 280, 50, def.label, def.action, i);
    });

    // ── Controls footer ──
    const controls = this.add.text(cx, GAME.HEIGHT - 35,
      'Controls: WASD Move | Mouse Aim | Click Attack | 1-2-3 Skills | Tab Inventory', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        color: '#555577',
      }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: controls,
      alpha: 1,
      duration: 600,
      delay: 600,
      ease: 'Sine.easeOut',
    });

    // ── Room code input state ──
    this.roomCodeInput = null;
    this.roomCodeText = '';
  }

  // ─────────────────────────────────────────
  //  Background
  // ─────────────────────────────────────────
  _drawBackground(cx, cy) {
    const g = this.add.graphics();

    // Gradient background - dark blue to near-black
    const steps = 32;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.floor(Phaser.Math.Linear(8, 16, t));
      const gr = Math.floor(Phaser.Math.Linear(8, 10, t));
      const b = Math.floor(Phaser.Math.Linear(15, 30, t));
      const color = (r << 16) | (gr << 8) | b;
      const y = (GAME.HEIGHT / steps) * i;
      g.fillStyle(color, 1);
      g.fillRect(0, y, GAME.WIDTH, GAME.HEIGHT / steps + 1);
    }

    // Subtle starfield dots
    const seed = 42;
    for (let i = 0; i < 80; i++) {
      const hash = Math.sin(seed + i * 127.1) * 43758.5453;
      const sx = (hash - Math.floor(hash)) * GAME.WIDTH;
      const hash2 = Math.sin(seed + i * 269.5) * 43758.5453;
      const sy = (hash2 - Math.floor(hash2)) * GAME.HEIGHT;
      const hash3 = Math.sin(seed + i * 419.2) * 43758.5453;
      const brightness = 0.1 + (hash3 - Math.floor(hash3)) * 0.25;
      const size = 1 + Math.floor((hash3 - Math.floor(hash3)) * 2);

      g.fillStyle(0x8888cc, brightness);
      g.fillCircle(sx, sy, size);
    }

    // Vignette overlay
    const vignette = this.add.graphics();
    vignette.fillStyle(0x000000, 0.4);
    vignette.fillRect(0, 0, GAME.WIDTH, 40);
    vignette.fillRect(0, GAME.HEIGHT - 40, GAME.WIDTH, 40);
    vignette.fillStyle(0x000000, 0.2);
    vignette.fillRect(0, 40, GAME.WIDTH, 30);
    vignette.fillRect(0, GAME.HEIGHT - 70, GAME.WIDTH, 30);
  }

  // ─────────────────────────────────────────
  //  Soul Particles
  // ─────────────────────────────────────────
  _createSoulParticles() {
    const emitter = this.add.particles(0, 0, 'particle_white', {
      x: { min: 0, max: GAME.WIDTH },
      y: { min: 0, max: GAME.HEIGHT },
      lifespan: { min: 4000, max: 8000 },
      speed: { min: 5, max: 20 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.6, end: 0, ease: 'Sine.easeIn' },
      alpha: { start: 0, end: 0.35, ease: 'Sine.easeInOut' },
      tint: [0x8866ff, 0x6644cc, 0xaa88ff, 0x5533aa],
      frequency: 250,
      quantity: 1,
      blendMode: 'ADD',
    });
    emitter.setDepth(0);
  }

  // ─────────────────────────────────────────
  //  Button Factory
  // ─────────────────────────────────────────
  _createButton(x, y, w, h, label, callback, index) {
    const container = this.add.container(x, y);
    container.setAlpha(0);

    // Button background
    const bg = this.add.graphics();
    const normalColor = 0x1a1a2e;
    const hoverColor = 0x2a2a44;
    const pressColor = 0x111122;
    const borderColor = 0x4433aa;

    const drawBtn = (fillColor, borderAlpha) => {
      bg.clear();
      bg.lineStyle(1.5, borderColor, borderAlpha);
      bg.fillStyle(fillColor, 0.9);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    };

    drawBtn(normalColor, 0.5);

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ccccee',
    }).setOrigin(0.5);

    container.add([bg, text]);

    // Hit area
    const hitZone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });

    hitZone.on('pointerover', () => {
      sound.play('button_hover');
      drawBtn(hoverColor, 0.9);
      text.setColor('#ffffff');
      this.tweens.add({
        targets: container,
        scaleX: 1.03,
        scaleY: 1.03,
        duration: 100,
        ease: 'Sine.easeOut',
      });
    });

    hitZone.on('pointerout', () => {
      drawBtn(normalColor, 0.5);
      text.setColor('#ccccee');
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: 'Sine.easeOut',
      });
    });

    hitZone.on('pointerdown', () => {
      drawBtn(pressColor, 1);
      text.setColor('#aaaacc');
      container.setScale(0.97);
    });

    hitZone.on('pointerup', () => {
      sound.play('button_click');
      drawBtn(hoverColor, 0.9);
      text.setColor('#ffffff');
      container.setScale(1.03);
      callback();
    });

    // Staggered entrance animation
    this.tweens.add({
      targets: container,
      alpha: 1,
      y: { from: y + 20, to: y },
      duration: 400,
      delay: 300 + index * 80,
      ease: 'Back.easeOut',
    });

    // Store reference so we can disable during input
    this.buttons.push({ container, hitZone, drawBtn, text });
  }

  // ─────────────────────────────────────────
  //  Start Game
  // ─────────────────────────────────────────
  _startGame(mode, roomCode) {
    this.registry.set('gameMode', mode);
    if (roomCode) {
      this.registry.set('roomCode', roomCode);
    }
    this.scene.start('CharacterSelect', { mode, roomCode });
  }

  // ─────────────────────────────────────────
  //  Room Code Input Overlay
  // ─────────────────────────────────────────
  _showRoomCodeInput() {
    if (this.roomCodeInput) return;

    this.roomCodeText = '';

    const cx = GAME.WIDTH / 2;
    const cy = GAME.HEIGHT / 2;

    // Dim overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
    overlay.setDepth(10);

    // Panel background
    const panel = this.add.graphics();
    panel.setDepth(11);
    panel.fillStyle(0x12121e, 0.95);
    panel.fillRoundedRect(cx - 180, cy - 100, 360, 200, 12);
    panel.lineStyle(2, 0x4433aa, 0.8);
    panel.strokeRoundedRect(cx - 180, cy - 100, 360, 200, 12);

    // Prompt label
    const prompt = this.add.text(cx, cy - 65, 'Enter Room Code', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ccccee',
    }).setOrigin(0.5).setDepth(12);

    // Input field background
    const inputBg = this.add.graphics();
    inputBg.setDepth(11);
    const fieldX = cx - 110;
    const fieldY = cy - 25;
    const fieldW = 220;
    const fieldH = 44;

    const drawField = (borderColor) => {
      inputBg.clear();
      inputBg.fillStyle(0x0a0a16, 1);
      inputBg.fillRoundedRect(fieldX, fieldY, fieldW, fieldH, 6);
      inputBg.lineStyle(1.5, borderColor, 1);
      inputBg.strokeRoundedRect(fieldX, fieldY, fieldW, fieldH, 6);
    };
    drawField(0x4433aa);

    // Code display text
    const codeDisplay = this.add.text(cx, fieldY + fieldH / 2, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffffff',
      letterSpacing: 12,
    }).setOrigin(0.5).setDepth(12);

    // Placeholder slots (5 underscores)
    const placeholder = this.add.text(cx, fieldY + fieldH / 2, '_ _ _ _ _', {
      fontFamily: '"Courier New", monospace',
      fontSize: '24px',
      color: '#444466',
    }).setOrigin(0.5).setDepth(12);

    // Hint text
    const hint = this.add.text(cx, cy + 35, 'Type 5-character code, Enter to join', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      color: '#666688',
    }).setOrigin(0.5).setDepth(12);

    // Escape hint
    const escHint = this.add.text(cx, cy + 70, 'ESC to cancel', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#555566',
    }).setOrigin(0.5).setDepth(12);

    // Blinking cursor
    const cursor = this.add.text(cx, fieldY + fieldH / 2, '|', {
      fontFamily: '"Courier New", monospace',
      fontSize: '28px',
      color: '#8866ff',
    }).setOrigin(0.5).setDepth(12);

    this.tweens.add({
      targets: cursor,
      alpha: { from: 1, to: 0 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Store references for cleanup
    const elements = [overlay, panel, prompt, inputBg, codeDisplay, placeholder, hint, escHint, cursor];

    const cleanup = () => {
      this.input.keyboard.off('keydown', keyHandler);
      elements.forEach(el => el.destroy());
      this.roomCodeInput = null;
      this.roomCodeText = '';
    };

    const updateDisplay = () => {
      const spaced = this.roomCodeText.split('').join(' ');
      codeDisplay.setText(spaced);

      // Update placeholder to show remaining slots
      const remaining = 5 - this.roomCodeText.length;
      if (remaining <= 0) {
        placeholder.setText('');
      } else {
        const filled = this.roomCodeText.length;
        const placeholderParts = [];
        for (let i = 0; i < 5; i++) {
          placeholderParts.push(i < filled ? ' ' : '_');
        }
        placeholder.setText(placeholderParts.join(' '));
      }

      // Position cursor after last character
      const textWidth = codeDisplay.width;
      cursor.setX(cx + textWidth / 2 + 10);

      // Change border color when full
      drawField(this.roomCodeText.length >= 5 ? 0x66ff66 : 0x4433aa);
    };

    const keyHandler = (event) => {
      if (event.key === 'Escape') {
        cleanup();
        return;
      }

      if (event.key === 'Enter') {
        if (this.roomCodeText.length === 5) {
          const code = this.roomCodeText.toUpperCase();
          cleanup();
          this._startGame('join', code);
        } else {
          // Flash red border briefly
          drawField(0xff4444);
          this.time.delayedCall(300, () => {
            if (this.roomCodeInput) {
              drawField(0x4433aa);
            }
          });
        }
        return;
      }

      if (event.key === 'Backspace') {
        if (this.roomCodeText.length > 0) {
          this.roomCodeText = this.roomCodeText.slice(0, -1);
          updateDisplay();
        }
        return;
      }

      // Accept alphanumeric characters only
      if (/^[a-zA-Z0-9]$/.test(event.key) && this.roomCodeText.length < 5) {
        this.roomCodeText += event.key.toUpperCase();
        updateDisplay();
      }
    };

    this.input.keyboard.on('keydown', keyHandler);
    this.roomCodeInput = { cleanup };

    // Entrance animation
    const inputElements = [panel, prompt, inputBg, codeDisplay, placeholder, hint, escHint, cursor];
    inputElements.forEach(el => {
      el.setAlpha(0);
    });
    overlay.setAlpha(0);

    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 200,
    });

    this.tweens.add({
      targets: inputElements,
      alpha: 1,
      duration: 250,
      delay: 100,
      ease: 'Sine.easeOut',
    });
  }
}
