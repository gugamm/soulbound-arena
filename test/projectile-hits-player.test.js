// TDD failing-test suite for the observed bug:
//
// When a monster's projectile hits the player, the player sprite becomes
// invisible (alpha stays fine but `visible` flips to false, or the sprite is
// torn down). The game keeps running — the player can still move and attack —
// but the user can no longer see their character on screen.
//
// Hypothesis pinpointed by reading CombatScene._setupColliders:
//
//   this.physics.add.overlap(this.enemyProjectiles, this.player, (proj, player) => {
//     this._onEnemyProjectileHitPlayer(proj);
//   });
//
// This assumes Phaser always delivers callback args in the declared order
// `(proj, player)`. It doesn't — the very next collider block on the SAME file
// (boss collider at lines 757-762) has the defensive comment
// "Phaser may swap argument order - figure out which is the projectile"
// and handles both orderings. The enemy-projectile-vs-player block has no
// such protection. When Phaser delivers `(player, proj)` instead, the handler
// treats the player as the projectile and its cleanup code runs on the player:
//
//     proj._killed = true;
//     if (proj.body) proj.body.enable = false;
//     proj.setActive(false);
//     proj.setVisible(false);        // ← player goes invisible
//     this.time.delayedCall(0, () => proj.destroy());
//
// These tests invoke the registered overlap callback with BOTH arg orderings
// and assert the player's visibility is preserved either way. They fail today
// and will pass once the handler is made order-agnostic (e.g. mirror the
// boss-collider pattern, or add an early-return guard when `proj === this.player`).

import test from 'node:test';
import assert from 'node:assert/strict';

import { createFakeScene } from './helpers/phaser-stub.js';
import Player from '../client/src/entities/Player.js';
import CombatScene from '../client/src/scenes/CombatScene.js';

// Minimal CombatScene harness: we can't run the real create() because it builds
// an arena, spawns a player, wires UI, etc. Instead we bypass the constructor
// with Object.create and wire only what _setupColliders needs.
function buildHarness() {
  const fakeScene = createFakeScene();

  // Augment the fake scene with the surface _onEnemyProjectileHitPlayer touches.
  fakeScene.add.text = () => ({
    setOrigin: function () { return this; },
    setDepth: function () { return this; },
    setScrollFactor: function () { return this; },
    destroy: () => {},
  });
  fakeScene.cameras.main.shake = () => {};

  const player = new Player(fakeScene, 400, 300, 'warrior', /* isLocal */ false);

  // Make a fake projectile — just an object with the fields the handler touches.
  const projectile = {
    active: true,
    visible: true,
    damage: 5,
    body: { enable: true },
    setActive(v) { this.active = !!v; return this; },
    setVisible(v) { this.visible = !!v; return this; },
    destroy() { this.active = false; },
  };

  // Instantiate the scene without running the real constructor / create().
  const scene = Object.create(CombatScene.prototype);
  scene.player = player;
  scene.enemyProjectiles = { contains: (obj) => obj === projectile };
  scene.playerProjectiles = {};
  scene.enemies = {};
  scene.walls = {};
  scene.traps = {};
  scene.cameras = fakeScene.cameras;
  scene.time = fakeScene.time;
  scene.events = fakeScene.events;
  scene.add = fakeScene.add;
  scene.tweens = fakeScene.tweens;

  // Capture the callback registered for (enemyProjectiles, player).
  let capturedCallback = null;
  scene.physics = {
    add: {
      overlap: (objA, objB, cb) => {
        if (objA === scene.enemyProjectiles && objB === scene.player) {
          capturedCallback = cb;
        }
      },
      collider: () => {},
    },
  };

  scene._setupColliders();

  assert.ok(capturedCallback, 'enemy-projectile-vs-player overlap callback must be registered');

  return { scene, player, projectile, fire: (a, b) => capturedCallback(a, b) };
}

test('enemy projectile hitting player keeps the player visible — declared arg order (proj, player)', () => {
  const { player, projectile, fire } = buildHarness();

  fire(projectile, player); // "normal" order — Phaser callback sig as declared

  assert.equal(player.visible, true, 'player must stay visible after a projectile hit');
  assert.equal(player.active, true, 'player must stay active after a projectile hit');
  assert.equal(player.body.enable, true, 'player physics body must remain enabled');
  assert.ok(projectile.active === false || projectile.visible === false,
    'projectile should be deactivated/hidden by the hit');
});

test('enemy projectile hitting player keeps the player visible — swapped arg order (player, proj)', () => {
  // This is the failing case. Phaser may invoke the overlap callback with args
  // swapped depending on internal collision iteration. The handler must still
  // preserve player visibility — the bug is that it currently does not.
  const { player, projectile, fire } = buildHarness();

  fire(player, projectile);

  assert.equal(player.visible, true, 'player must stay visible even when Phaser swaps callback args');
  assert.equal(player.active, true, 'player must stay active even when Phaser swaps callback args');
  assert.equal(player.body.enable, true, 'player physics body must remain enabled');
});

test('enemy projectile hit does not destroy the player sprite', () => {
  // Stronger guard: even if the handler mistakes the player for a projectile,
  // the deferred destroy() must never fire on the player.
  const { scene, player, projectile, fire } = buildHarness();

  const deferred = [];
  scene.time.delayedCall = (_ms, fn) => { deferred.push(fn); return { remove: () => {} }; };

  fire(player, projectile); // swapped case
  for (const fn of deferred) fn();

  assert.notEqual(player.scene, null, 'player.scene must not be nulled (destroy was called on the player)');
  assert.equal(player.active, true, 'player must still be active after deferred callbacks run');
});
