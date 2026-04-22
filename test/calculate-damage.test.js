import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateDamage } from '../shared/gameData.js';

test('calculateDamage floors at 1 damage', () => {
  assert.equal(calculateDamage(1, 9999), 1);
  assert.equal(calculateDamage(0, 0), 1);
});

test('calculateDamage returns full damage when defense is 0', () => {
  assert.equal(calculateDamage(20, 0), 20);
});

test('calculateDamage applies diminishing returns from defense', () => {
  // formula: baseDamage * (1 - def / (def + 20))
  // atk=50, def=20 -> 50 * (1 - 20/40) = 25
  assert.equal(calculateDamage(50, 20), 25);
  // atk=50, def=80 -> 50 * (1 - 80/100) = 10
  assert.equal(calculateDamage(50, 80), 10);
});

test('calculateDamage adds skill damage on top of attacker attack', () => {
  // atk=20, def=0, skill=30 -> 50
  assert.equal(calculateDamage(20, 0, 30), 50);
});

test('calculateDamage is monotonic in defense (more defense => less damage)', () => {
  let prev = Infinity;
  for (let def = 0; def <= 100; def += 10) {
    const d = calculateDamage(100, def);
    assert.ok(d <= prev, `damage should be non-increasing in defense (def=${def}, d=${d}, prev=${prev})`);
    prev = d;
  }
});
