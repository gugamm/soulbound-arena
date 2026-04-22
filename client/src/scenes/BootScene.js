// ══════════════════════════════════════════════════════════════
//  SOULBOUND ARENA — Boot Scene
// ══════════════════════════════════════════════════════════════

import generateAssets from '../AssetGenerator.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // Dark background
    this.cameras.main.setBackgroundColor(0x0a0a14);

    // Title text
    const title = this.add.text(cx, cy - 40, 'SOULBOUND ARENA', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '52px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);

    // Loading text
    const loading = this.add.text(cx, cy + 30, 'Loading...', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#8888cc',
    }).setOrigin(0.5).setAlpha(0);

    // Loading bar background
    const barWidth = 300;
    const barHeight = 8;
    const barX = cx - barWidth / 2;
    const barY = cy + 65;

    const barBg = this.add.graphics();
    barBg.fillStyle(0x222233, 1);
    barBg.fillRoundedRect(barX, barY, barWidth, barHeight, 4);
    barBg.setAlpha(0);

    const barFill = this.add.graphics();
    barFill.setAlpha(0);

    // Fade in elements
    this.tweens.add({
      targets: [title, loading, barBg, barFill],
      alpha: 1,
      duration: 400,
      ease: 'Sine.easeOut',
    });

    // Animate a pulsing loading bar while assets generate
    let progress = 0;
    const progressTimer = this.time.addEvent({
      delay: 30,
      loop: true,
      callback: () => {
        progress = Math.min(progress + 0.02 + Math.random() * 0.015, 0.85);
        barFill.clear();
        barFill.fillStyle(0x6644cc, 1);
        barFill.fillRoundedRect(barX, barY, barWidth * progress, barHeight, 4);
      },
    });

    // Generate all procedural assets
    this.time.delayedCall(100, () => {
      generateAssets(this);

      // Complete the bar
      progressTimer.remove();
      barFill.clear();
      barFill.fillStyle(0x8866ff, 1);
      barFill.fillRoundedRect(barX, barY, barWidth, barHeight, 4);

      loading.setText('Ready');
      loading.setColor('#aaaaff');

      // Brief delay then transition to Menu
      this.time.delayedCall(500, () => {
        this.tweens.add({
          targets: [title, loading, barBg, barFill],
          alpha: 0,
          duration: 300,
          ease: 'Sine.easeIn',
          onComplete: () => {
            this.scene.start('Menu');
          },
        });
      });
    });
  }
}
