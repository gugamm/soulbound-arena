import { ENEMIES, BOSSES, calculateDamage } from '/shared/gameData.js';

// ══════════════════════════════════════════════════════════════
//  Enemy — Standard enemy entity for Soulbound Arena
// ══════════════════════════════════════════════════════════════

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, enemyType) {
    super(scene, x, y, `enemy_${enemyType}`);

    scene.add.existing(this);
    scene.physics.world.enable(this);

    this.body.setSize(20, 20);
    this.body.setCollideWorldBounds(true);

    this.enemyType = enemyType;
    this.enemyData = ENEMIES[enemyType];

    this.maxHp = this.enemyData.stats.hp;
    this.currentHp = this.maxHp;
    this.stats = { ...this.enemyData.stats };

    this.attackTimer = 0;
    this.target = null;
    this.state = 'idle';
    this.statusEffects = [];
    this.knockbackVelocity = { x: 0, y: 0 };

    // Idle wander direction
    this._wanderAngle = Math.random() * Math.PI * 2;
    this._wanderTimer = 0;

    // Debuff slow tracking
    this._slowDebuffTimer = 0;
  }

  // ── Update loop ──

  update(time, delta, players) {
    const dt = delta / 1000; // convert ms to seconds

    // Process status effects
    this._processStatusEffects(dt);

    // If frozen or stunned, halt movement and skip AI
    if (this.state === 'frozen' || this.state === 'stunned') {
      this.body.setVelocity(0, 0);
      return;
    }

    // Decrement attack timer
    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
    }

    // Find nearest alive player
    this.target = this._findNearestPlayer(players);

    if (!this.target) {
      // Idle: wander slowly
      this.state = 'idle';
      this._wander(dt);
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
    const attackRange = this.enemyData.attackRange;
    const isRanged = this.enemyType === 'goblin_archer' || this.enemyType === 'witch';
    const effectiveAgility = this._getEffectiveAgility();
    const moveSpeed = effectiveAgility * 28;

    if (isRanged) {
      const stopRange = attackRange * 0.8;

      if (dist > attackRange) {
        // Chase toward target
        this.state = 'chase';
        this._moveToward(this.target.x, this.target.y, moveSpeed);
      } else if (dist <= stopRange) {
        // Too close, back up slightly
        this.state = 'chase';
        this._moveAway(this.target.x, this.target.y, moveSpeed * 0.5);
      } else {
        // In sweet spot range, stop and shoot
        this.body.setVelocity(0, 0);
        this.state = 'attack';
        if (this.attackTimer <= 0) {
          this.attack(this.target);
        }
      }

      // Witch special: debuff_slow
      if (this.enemyType === 'witch' && this.enemyData.specialAbility === 'debuff_slow') {
        this._slowDebuffTimer -= dt;
        if (this._slowDebuffTimer <= 0 && dist <= attackRange) {
          this._slowDebuffTimer = 5; // apply slow every 5 seconds
          this.scene.events.emit('enemy-debuff', {
            enemy: this,
            target: this.target,
            type: 'slow',
            duration: 2,
          });
        }
      }
    } else {
      // Melee enemy
      if (dist > attackRange) {
        this.state = 'chase';
        this._moveToward(this.target.x, this.target.y, moveSpeed);
      } else {
        // In range: stop and attack
        this.body.setVelocity(0, 0);
        this.state = 'attack';
        if (this.attackTimer <= 0) {
          this.attack(this.target);
        }
      }
    }
  }

  // ── Combat ──

  attack(target) {
    this.attackTimer = this.enemyData.attackCooldown;

    if (this.enemyData.attackType === 'melee') {
      this.scene.events.emit('enemy-attack', {
        enemy: this,
        target,
        damage: this.stats.attack,
        type: 'melee',
      });
    } else {
      // Ranged
      const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
      this.scene.events.emit('enemy-shoot', {
        enemy: this,
        target,
        angle,
        damage: this.stats.attack,
        speed: 200,
      });
    }
  }

  takeDamage(amount, attackerStats) {
    const actualDamage = calculateDamage(amount, this.stats.defense);
    this.currentHp -= actualDamage;

    // Flash white tint
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (this.active) {
        this.clearTint();
        // Re-apply status effect tints if needed
        this._reapplyStatusTint();
      }
    });

    this.scene.events.emit('enemy-hit', {
      enemy: this,
      damage: actualDamage,
    });

    if (this.currentHp <= 0) {
      this.currentHp = 0;
      this.die();
    }

    return actualDamage;
  }

  die() {
    this.state = 'idle';
    this.body.setVelocity(0, 0);
    this.body.enable = false;

    this.scene.events.emit('enemy-died', {
      enemy: this,
      xpValue: this.enemyData.xpValue,
      soulValue: this.enemyData.soulValue,
      x: this.x,
      y: this.y,
    });

    // Death animation: fade out + scale down over 300ms
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0,
      scaleY: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.destroy();
      },
    });
  }

  // ── Status Effects ──

  applyStatusEffect(type, duration, data = {}) {
    // Poison stacks - don't remove existing
    if (data.stacking) {
      this.statusEffects.push({ type, remaining: duration, data: { ...data, _tickAcc: 0 } });
    } else {
      // Remove existing effect of the same type (refresh)
      this.statusEffects = this.statusEffects.filter((e) => e.type !== type);
      this.statusEffects.push({ type, remaining: duration, data });
    }

    if (type === 'freeze') {
      this.state = 'frozen';
      this.setTint(0x88ccff);
      if (this.body) this.body.setVelocity(0, 0);
    } else if (type === 'stun') {
      this.state = 'stunned';
      this.setTint(0xffff44);
      if (this.body) this.body.setVelocity(0, 0);
    } else if (type === 'burn') {
      this.setTint(0xff6600);
    } else if (type === 'poison') {
      this.setTint(0x44cc44);
    } else if (type === 'slow') {
      this.setTint(0x8888ff);
    }
  }

  applyKnockback(angle, force) {
    const vx = Math.cos(angle) * force;
    const vy = Math.sin(angle) * force;

    this.body.setVelocity(vx, vy);
    this.knockbackVelocity = { x: vx, y: vy };

    // Reset velocity after a brief moment
    this.scene.time.delayedCall(150, () => {
      if (this.active) {
        this.knockbackVelocity = { x: 0, y: 0 };
      }
    });
  }

  // ── Internal helpers ──

  _processStatusEffects(dt) {
    for (let i = this.statusEffects.length - 1; i >= 0; i--) {
      const effect = this.statusEffects[i];
      effect.remaining -= dt;

      // Burn / Poison tick damage
      if (effect.type === 'burn' || effect.type === 'poison') {
        if (!effect.data._tickAcc) effect.data._tickAcc = 0;
        effect.data._tickAcc += dt;
        const tickInterval = effect.data.tickRate || 0.5;
        if (effect.data._tickAcc >= tickInterval) {
          effect.data._tickAcc -= tickInterval;
          const dmg = effect.data.damage || 5;
          this.currentHp -= dmg;
          this.scene.events.emit('enemy-hit', { enemy: this, damage: dmg });
          if (this.currentHp <= 0) {
            this.currentHp = 0;
            this.die();
            return;
          }
        }
      }

      // Remove expired
      if (effect.remaining <= 0) {
        this.statusEffects.splice(i, 1);

        // Reset state if the controlling effect expired
        if (effect.type === 'freeze' || effect.type === 'stun') {
          this.state = 'idle';
        }
      }
    }

    // Reapply tints based on remaining effects
    if (this.statusEffects.length === 0 && this.active) {
      this.clearTint();
    } else {
      this._reapplyStatusTint();
    }
  }

  _reapplyStatusTint() {
    if (!this.active) return;
    const freeze = this.statusEffects.find((e) => e.type === 'freeze');
    const stun = this.statusEffects.find((e) => e.type === 'stun');
    const burn = this.statusEffects.find((e) => e.type === 'burn');
    const poison = this.statusEffects.find((e) => e.type === 'poison');
    const slow = this.statusEffects.find((e) => e.type === 'slow');

    if (freeze) this.setTint(0x88ccff);
    else if (stun) this.setTint(0xffff44);
    else if (burn) this.setTint(0xff6600);
    else if (poison) this.setTint(0x44cc44);
    else if (slow) this.setTint(0x8888ff);
    else this.clearTint();
  }

  _getEffectiveAgility() {
    let agility = this.stats.agility;
    const slow = this.statusEffects.find((e) => e.type === 'slow');
    if (slow) {
      const factor = slow.data.factor || 0.5;
      agility *= factor;
    }
    return agility;
  }

  _findNearestPlayer(players) {
    if (!players || players.length === 0) return null;

    let nearest = null;
    let nearestDist = Infinity;

    for (const player of players) {
      if (!player || !player.active || player.currentHp <= 0) continue;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = player;
      }
    }

    return nearest;
  }

  _moveToward(tx, ty, speed) {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, tx, ty);
    this.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  _moveAway(tx, ty, speed) {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, tx, ty);
    this.body.setVelocity(-Math.cos(angle) * speed, -Math.sin(angle) * speed);
  }

  _wander(dt) {
    this._wanderTimer -= dt;
    if (this._wanderTimer <= 0) {
      this._wanderAngle = Math.random() * Math.PI * 2;
      this._wanderTimer = 1 + Math.random() * 2;
    }
    const wanderSpeed = 20;
    this.body.setVelocity(
      Math.cos(this._wanderAngle) * wanderSpeed,
      Math.sin(this._wanderAngle) * wanderSpeed
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  Boss — Boss enemy entity for Soulbound Arena
// ══════════════════════════════════════════════════════════════

class Boss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, bossType) {
    super(scene, x, y, `boss_${bossType}`);

    scene.add.existing(this);
    scene.physics.world.enable(this);

    this.body.setSize(48, 48);
    this.body.setCollideWorldBounds(true);

    this.bossType = bossType;
    this.bossData = BOSSES[bossType];

    this.setScale(this.bossData.size);

    this.maxHp = this.bossData.stats.hp;
    this.currentHp = this.maxHp;
    this.stats = { ...this.bossData.stats };

    this.currentPhase = 0;
    this.attackQueue = [...this.bossData.phases[0].attacks];
    this.attackCooldowns = {};
    for (const attackName of Object.keys(this.bossData.attackPatterns)) {
      this.attackCooldowns[attackName] = 0;
    }

    this.target = null;
    this.state = 'idle';
    this.minionSpawnTimer = 0;
    this.statusEffects = [];

    this._lastAttackUsed = null;
    this._isExecutingAttack = false;
  }

  // ── Update loop ──

  update(time, delta, players) {
    const dt = delta / 1000;

    this._processStatusEffects(dt);

    if (this.state === 'frozen' || this.state === 'stunned') {
      this.body.setVelocity(0, 0);
      return;
    }

    if (this._isExecutingAttack) return;

    // Determine current phase based on hp percentage
    const hpRatio = this.currentHp / this.maxHp;
    let newPhase = 0;
    for (let i = this.bossData.phases.length - 1; i >= 0; i--) {
      if (hpRatio <= this.bossData.phases[i].hpThreshold) {
        newPhase = i;
      }
    }

    if (newPhase !== this.currentPhase) {
      const oldPhase = this.currentPhase;
      this.currentPhase = newPhase;
      const phaseData = this.bossData.phases[this.currentPhase];
      this.attackQueue = [...phaseData.attacks];

      // Spawn minions on phase transition
      if (phaseData.spawnMinions && newPhase > oldPhase) {
        this.spawnMinions(phaseData.minionType, phaseData.minionCount);
      }
    }

    // Tick down cooldowns
    for (const name of Object.keys(this.attackCooldowns)) {
      if (this.attackCooldowns[name] > 0) {
        this.attackCooldowns[name] -= dt;
      }
    }

    // Minion spawn timer
    if (this.minionSpawnTimer > 0) {
      this.minionSpawnTimer -= dt;
    }

    // Find nearest player
    this.target = this._findNearestPlayer(players);
    if (!this.target) {
      this.state = 'idle';
      this.body.setVelocity(0, 0);
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

    // Choose an available attack off cooldown (prefer variety)
    let chosenAttack = null;
    const available = this.attackQueue.filter(
      (name) => this.attackCooldowns[name] <= 0 && name !== this._lastAttackUsed
    );

    if (available.length > 0) {
      chosenAttack = available[Math.floor(Math.random() * available.length)];
    } else {
      // If nothing except the last used is off cooldown, allow it
      const fallback = this.attackQueue.filter((name) => this.attackCooldowns[name] <= 0);
      if (fallback.length > 0) {
        chosenAttack = fallback[Math.floor(Math.random() * fallback.length)];
      }
    }

    if (chosenAttack) {
      const pattern = this.bossData.attackPatterns[chosenAttack];
      const attackRange = pattern.range || 150;

      if (dist <= attackRange) {
        this.body.setVelocity(0, 0);
        this.executeAttack(chosenAttack, this.target);
      } else {
        // Move toward target
        this.state = 'idle';
        const moveSpeed = this.stats.agility * 28;
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
        this.body.setVelocity(Math.cos(angle) * moveSpeed, Math.sin(angle) * moveSpeed);
      }
    } else {
      // All attacks on cooldown, move toward target
      const moveSpeed = this.stats.agility * 28;
      const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
      this.body.setVelocity(Math.cos(angle) * moveSpeed, Math.sin(angle) * moveSpeed);
    }
  }

  // ── Attack Execution ──

  executeAttack(attackName, target) {
    const pattern = this.bossData.attackPatterns[attackName];
    this.attackCooldowns[attackName] = pattern.cooldown;
    this._lastAttackUsed = attackName;
    this._isExecutingAttack = true;
    this.state = 'attacking';

    switch (pattern.type) {
      case 'dash':
        this._executeDash(attackName, pattern, target);
        break;
      case 'cone_dot':
        this._executeConeDot(attackName, pattern, target);
        break;
      case 'aoe':
        this._executeAoe(attackName, pattern, target);
        break;
      case 'radial':
        this._executeRadial(attackName, pattern, target);
        break;
      default:
        this._isExecutingAttack = false;
        this.state = 'idle';
        break;
    }
  }

  _executeDash(attackName, pattern, target) {
    const targetX = target.x;
    const targetY = target.y;

    // Telegraph: flash for 0.5s
    this.setTint(0xffffff);
    this.state = 'charging';

    this.scene.time.delayedCall(500, () => {
      if (!this.active) return;
      this.clearTint();
      this._reapplyStatusTint();

      // Dash rapidly toward target position
      const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
      const dashSpeed = pattern.speed;
      this.body.setVelocity(Math.cos(angle) * dashSpeed, Math.sin(angle) * dashSpeed);

      this.scene.events.emit('boss-attack', {
        boss: this,
        attackName,
        type: 'dash',
        damage: pattern.damage,
        angle,
        speed: dashSpeed,
        startX: this.x,
        startY: this.y,
        targetX,
        targetY,
      });

      // Stop after reaching approximate distance
      const dist = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
      const dashDuration = Math.min((dist / dashSpeed) * 1000, 800);

      this.scene.time.delayedCall(dashDuration, () => {
        if (!this.active) return;
        this.body.setVelocity(0, 0);
        this._isExecutingAttack = false;
        this.state = 'idle';
      });
    });
  }

  _executeConeDot(attackName, pattern, target) {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);

    this.scene.events.emit('boss-attack', {
      boss: this,
      attackName,
      type: 'cone_dot',
      damage: pattern.damage,
      angle,
      coneAngle: pattern.coneAngle,
      range: pattern.range,
      duration: pattern.duration,
      tickRate: pattern.tickRate,
      x: this.x,
      y: this.y,
    });

    // Boss stays still during breath
    this.body.setVelocity(0, 0);

    this.scene.time.delayedCall(pattern.duration * 1000, () => {
      if (!this.active) return;
      this._isExecutingAttack = false;
      this.state = 'idle';
    });
  }

  _executeAoe(attackName, pattern, target) {
    // Telegraph circle for 0.8s
    const targetX = target.x;
    const targetY = target.y;

    this.scene.events.emit('boss-attack-telegraph', {
      boss: this,
      attackName,
      type: 'aoe',
      x: targetX,
      y: targetY,
      radius: pattern.radius,
      duration: 800,
    });

    this.body.setVelocity(0, 0);

    this.scene.time.delayedCall(800, () => {
      if (!this.active) return;

      this.scene.events.emit('boss-attack', {
        boss: this,
        attackName,
        type: 'aoe',
        damage: pattern.damage,
        x: targetX,
        y: targetY,
        radius: pattern.radius,
      });

      this._isExecutingAttack = false;
      this.state = 'idle';
    });
  }

  _executeRadial(attackName, pattern, target) {
    const count = pattern.projectileCount;
    const angleStep = (Math.PI * 2) / count;

    const projectiles = [];
    for (let i = 0; i < count; i++) {
      projectiles.push({
        angle: angleStep * i,
        speed: pattern.speed,
        damage: pattern.damage,
      });
    }

    this.scene.events.emit('boss-attack', {
      boss: this,
      attackName,
      type: 'radial',
      projectiles,
      x: this.x,
      y: this.y,
    });

    this.body.setVelocity(0, 0);

    // Brief pause after radial attack
    this.scene.time.delayedCall(600, () => {
      if (!this.active) return;
      this._isExecutingAttack = false;
      this.state = 'idle';
    });
  }

  // ── Minion Spawning ──

  spawnMinions(minionType, count) {
    const positions = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 80 + Math.random() * 60;
      positions.push({
        x: this.x + Math.cos(angle) * dist,
        y: this.y + Math.sin(angle) * dist,
      });
    }

    this.scene.events.emit('boss-spawn-minions', {
      type: minionType,
      count,
      positions,
    });
  }

  // ── Damage & Death ──

  takeDamage(amount, attackerStats) {
    const actualDamage = calculateDamage(amount, this.stats.defense);
    this.currentHp -= actualDamage;

    // Flash red briefly
    this.setTintFill(0xff0000);
    this.scene.time.delayedCall(100, () => {
      if (this.active) {
        this.clearTint();
        this._reapplyStatusTint();
      }
    });

    this.scene.events.emit('enemy-hit', {
      enemy: this,
      damage: actualDamage,
    });

    if (this.currentHp <= 0) {
      this.currentHp = 0;
      this.die();
    }

    return actualDamage;
  }

  die() {
    this.state = 'idle';
    this.body.setVelocity(0, 0);
    this.body.enable = false;

    this.scene.events.emit('boss-died', {
      boss: this,
      soulValue: this.bossData.soulValue,
      x: this.x,
      y: this.y,
    });

    // Dramatic death: shake screen, expand, flash, fade over 1.5s
    if (this.scene.cameras && this.scene.cameras.main) {
      this.scene.cameras.main.shake(400, 0.02);
    }

    this.scene.tweens.add({
      targets: this,
      scaleX: this.bossData.size * 1.5,
      scaleY: this.bossData.size * 1.5,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onUpdate: (tween) => {
        // Flash effect during death
        const progress = tween.progress;
        if (Math.floor(progress * 10) % 2 === 0) {
          this.setTintFill(0xffffff);
        } else {
          this.clearTint();
        }
      },
      onComplete: () => {
        this.destroy();
      },
    });
  }

  // ── Status Effects ──

  applyStatusEffect(type, duration, data = {}) {
    // Boss has 50% reduced duration on all effects
    const reducedDuration = duration * 0.5;

    // Remove existing effect of the same type (refresh)
    this.statusEffects = this.statusEffects.filter((e) => e.type !== type);

    this.statusEffects.push({ type, remaining: reducedDuration, data });

    if (type === 'freeze') {
      this.state = 'frozen';
      this.setTint(0x88ccff);
      this.body.setVelocity(0, 0);
    } else if (type === 'stun') {
      this.state = 'stunned';
      this.setTint(0xffff44);
      this.body.setVelocity(0, 0);
    } else if (type === 'burn') {
      this.setTint(0xff6600);
    } else if (type === 'slow') {
      this.setTint(0x8888ff);
    }
  }

  applyKnockback(angle, force) {
    // Boss receives reduced knockback
    const reducedForce = force * 0.3;
    const vx = Math.cos(angle) * reducedForce;
    const vy = Math.sin(angle) * reducedForce;

    this.body.setVelocity(vx, vy);

    this.scene.time.delayedCall(150, () => {
      if (this.active && !this._isExecutingAttack) {
        this.body.setVelocity(0, 0);
      }
    });
  }

  // ── Internal helpers ──

  _processStatusEffects(dt) {
    for (let i = this.statusEffects.length - 1; i >= 0; i--) {
      const effect = this.statusEffects[i];
      effect.remaining -= dt;

      // Burn / Poison tick damage
      if (effect.type === 'burn' || effect.type === 'poison') {
        if (!effect.data._tickAcc) effect.data._tickAcc = 0;
        effect.data._tickAcc += dt;
        const tickInterval = effect.data.tickRate || 0.5;
        if (effect.data._tickAcc >= tickInterval) {
          effect.data._tickAcc -= tickInterval;
          const dmg = effect.data.damage || 5;
          this.currentHp -= dmg;
          this.scene.events.emit('enemy-hit', { enemy: this, damage: dmg });
          if (this.currentHp <= 0) {
            this.currentHp = 0;
            this.die();
            return;
          }
        }
      }

      // Remove expired
      if (effect.remaining <= 0) {
        this.statusEffects.splice(i, 1);
        if (effect.type === 'freeze' || effect.type === 'stun') {
          this.state = 'idle';
        }
      }
    }

    if (this.statusEffects.length === 0 && this.active) {
      this.clearTint();
    } else {
      this._reapplyStatusTint();
    }
  }

  _reapplyStatusTint() {
    if (!this.active) return;
    const freeze = this.statusEffects.find((e) => e.type === 'freeze');
    const stun = this.statusEffects.find((e) => e.type === 'stun');
    const burn = this.statusEffects.find((e) => e.type === 'burn');
    const slow = this.statusEffects.find((e) => e.type === 'slow');

    if (freeze) this.setTint(0x88ccff);
    else if (stun) this.setTint(0xffff44);
    else if (burn) this.setTint(0xff6600);
    else if (slow) this.setTint(0x8888ff);
    else this.clearTint();
  }

  _findNearestPlayer(players) {
    if (!players || players.length === 0) return null;

    let nearest = null;
    let nearestDist = Infinity;

    for (const player of players) {
      if (!player || !player.active || player.currentHp <= 0) continue;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = player;
      }
    }

    return nearest;
  }
}

export { Boss };
