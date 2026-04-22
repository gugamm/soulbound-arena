// ══════════════════════════════════════════════════════════════
//  SOULBOUND ARENA — Main Entry Point
// ══════════════════════════════════════════════════════════════
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import CharacterSelectScene from './scenes/CharacterSelectScene.js';
import LobbyScene from './scenes/LobbyScene.js';
import CombatScene from './scenes/CombatScene.js';
import SoulShopScene from './scenes/SoulShopScene.js';

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#0a0a0f',
  pixelArt: true,
  roundPixels: true,
  input: {
    keyboard: {
      target: window,
    },
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, CharacterSelectScene, LobbyScene, CombatScene, SoulShopScene],
};

const game = new Phaser.Game(config);
window.__GAME = game;
