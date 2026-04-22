import test from 'node:test';
import assert from 'node:assert/strict';

import { createFakeScene } from './helpers/phaser-stub.js';
import Player from '../client/src/entities/Player.js';
import { calculateDamage } from '../shared/gameData.js';

function makePlayer(characterType = 'warrior') {
  const scene = createFakeScene();
  const player = new Player(scene, 0, 0, characterType, /* isLocal */ false);
  return { player, scene };
}

test('takeDamage reduces HP by calculateDamage(amount, defense)', () => {
  const { player } = makePlayer('warrior');
  const startHp = player.currentHp;
  const expected = calculateDamage(50, player.stats.defense);

  const applied = player.takeDamage(50);

  assert.equal(applied, expected, 'returned damage should match formula');
  assert.equal(player.currentHp, startHp - expected, 'HP should drop by the formula result');
});

test('player stays visible after taking damage (regression: invisible-on-hit bug)', () => {
  // The observed bug is that the player sprite becomes invisible when hit by an
  // enemy projectile. The contract of takeDamage is that it should only change
  // HP / invulnerability state and emit events. It must NEVER alter alpha or
  // visibility — those belong to stealth/death flows, not damage.
  const { player } = makePlayer('warrior');

  const alphaBefore = player.alpha;
  const visibleBefore = player.visible;

  player.takeDamage(20);

  assert.equal(player.alpha, alphaBefore, 'alpha must not change when taking damage');
  assert.equal(player.visible, visibleBefore, 'visible must not change when taking damage');
});

test('takeDamage grants brief invulnerability when the hit is survived', () => {
  const { player } = makePlayer('warrior');

  player.takeDamage(5);

  assert.equal(player.isInvulnerable, true);
  assert.ok(player._iframeTimer > 0, 'iframe timer should be armed');
});

test('takeDamage is a no-op while the player is invulnerable', () => {
  const { player } = makePlayer('warrior');
  player.isInvulnerable = true;
  const hpBefore = player.currentHp;

  const applied = player.takeDamage(50);

  assert.equal(applied, 0);
  assert.equal(player.currentHp, hpBefore);
});

test('takeDamage is a no-op once the player is already dead', () => {
  const { player } = makePlayer('warrior');
  player.currentHp = 0;

  const applied = player.takeDamage(10);

  assert.equal(applied, 0);
  assert.equal(player.currentHp, 0);
});

test('takeDamage emits player-damaged with damage and remaining HP', () => {
  const { player, scene } = makePlayer('warrior');
  const events = [];
  scene.events.on('player-damaged', (data) => events.push(data));

  const applied = player.takeDamage(30);

  assert.equal(events.length, 1);
  assert.equal(events[0].damage, applied);
  assert.equal(events[0].remainingHp, player.currentHp);
  assert.equal(events[0].player, player);
});

test('takeDamage emits player-died once HP hits zero', () => {
  const { player, scene } = makePlayer('warrior');
  const damagedEvents = [];
  const diedEvents = [];
  scene.events.on('player-damaged', (d) => damagedEvents.push(d));
  scene.events.on('player-died', (d) => diedEvents.push(d));

  player.takeDamage(99999);

  assert.equal(player.currentHp, 0);
  assert.equal(damagedEvents.length, 1);
  assert.equal(diedEvents.length, 1);
  assert.equal(diedEvents[0].player, player);
  assert.equal(player.isInvulnerable, true, 'dead player should be marked invulnerable');
});

test('fatal hit does not tint the corpse (tint is reserved for live iframes)', () => {
  const { player } = makePlayer('warrior');

  player.takeDamage(99999);

  assert.equal(player.tint, null, 'no iframe tint should be applied to a dead player');
});

test('surviving a hit applies the red hit-flash tint', () => {
  const { player } = makePlayer('warrior');

  player.takeDamage(5);

  assert.equal(player.tint, 0xff4444);
});
