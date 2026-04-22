import { CHARACTERS, SKILLS, GAME, SOUL_UPGRADES, calculateDamage } from '/shared/gameData.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, characterType, isLocal = true) {
    super(scene, x, y, `char_${characterType}`);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Physics body setup
    this.body.setSize(24, 24);
    this.body.setOffset(
      (this.width - 24) / 2,
      (this.height - 24) / 2
    );

    // Core identity
    this.characterType = characterType;
    this.charData = CHARACTERS[characterType];
    this.isLocal = isLocal;

    // Health and mana
    this.maxHp = this.charData.stats.hp;
    this.currentHp = this.maxHp;
    this.maxMana = this.charData.stats.mana;
    this.currentMana = this.maxMana;

    // Stats (mutable copy)
    this.stats = { ...this.charData.stats };

    // Equipment
    this.items = [];

    // Skill cooldowns (ms remaining)
    this.skillCooldowns = {};
    for (const skillId of this.charData.skills) {
      this.skillCooldowns[skillId] = 0;
    }

    // Buffs and status effects
    this.activeBuffs = [];
    this.statusEffects = [];

    // Combat state
    this.isInvulnerable = false;
    this.facing = 0;
    this.attackCooldown = 0;
    this.soulsCollected = 0;
    this.isStealthed = false;

    // Dash state
    const dashDef = this.charData.dash || {};
    this.dashCooldown = 0;
    this.dashMaxCharges = dashDef.maxCharges || 1;
    this.dashCharges = this.dashMaxCharges;
    this.dashRechargeTimer = 0;

    // Ultimate state
    this.ultCharge = 0;
    this.ultChargeNeeded = (this.charData.ultimate && this.charData.ultimate.chargeNeeded) || 1200;
    this.ultActive = false;
    this.ultTimer = 0;

    // Input keys (local player only)
    if (this.isLocal) {
      this.keys = scene.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
      });
    }

    // Apply soul upgrades immediately so they take effect from map 1
    this.recalculateStats();
    // After applying upgrades, fill HP/mana to new max
    this.currentHp = this.maxHp;
    this.currentMana = this.maxMana;
  }

  // ── Main Update Loop ──

  update(time, delta) {
    if (!this.body || !this.active || !this.scene) return;
    const dt = delta / 1000;

    // Tick down skill cooldowns
    for (const skillId of this.charData.skills) {
      if (this.skillCooldowns[skillId] > 0) {
        this.skillCooldowns[skillId] = Math.max(0, this.skillCooldowns[skillId] - delta);
      }
    }

    // Tick down active buffs, remove expired
    for (let i = this.activeBuffs.length - 1; i >= 0; i--) {
      this.activeBuffs[i].remaining -= dt;
      if (this.activeBuffs[i].remaining <= 0) {
        this._removeBuff(i);
      }
    }

    // Process status effects
    this._processStatusEffects(dt);

    // Mana regeneration
    if (this.currentMana < this.maxMana) {
      this.currentMana = Math.min(
        this.maxMana,
        this.currentMana + GAME.MANA_REGEN_RATE * dt
      );
    }

    // Attack cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    }

    // Invulnerability iframe timer (replaces delayedCall to prevent stuck states)
    if (this._iframeTimer > 0) {
      this._iframeTimer -= delta;
      if (this._iframeTimer <= 0) {
        this._iframeTimer = 0;
        if (this.currentHp > 0) {
          this.isInvulnerable = false;
          if (!this.isStealthed) this.clearTint();
        }
      }
    }

    // Dash cooldown / charge recharge
    if (this.dashCooldown > 0) {
      this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    }
    if (this.dashCharges < this.dashMaxCharges && this.dashCooldown <= 0) {
      this.dashRechargeTimer += dt;
      const dashDef = this.charData.dash || {};
      if (this.dashRechargeTimer >= (dashDef.cooldown || 5)) {
        this.dashCharges = Math.min(this.dashMaxCharges, this.dashCharges + 1);
        this.dashRechargeTimer = 0;
      }
    }

    // Check movement-blocking effects
    const isFrozen = this.statusEffects.some(e => e.type === 'freeze');
    const isStunned = this.statusEffects.some(e => e.type === 'stun');

    if (isFrozen || isStunned) {
      this.setVelocity(0, 0);
    } else if (this.isLocal) {
      this._handleMovement();
    }

    // Update facing toward mouse
    if (this.isLocal && this.scene && this.scene.input) {
      const pointer = this.scene.input.activePointer;
      const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.facing = Phaser.Math.Angle.Between(this.x, this.y, worldPoint.x, worldPoint.y);
    }

    // Flip sprite based on facing
    this.setFlipX(Math.abs(this.facing) > Math.PI / 2);

    // Keep aura(s) glued to player
    this._updateAuras();
  }

  // ── Movement ──

  _handleMovement() {
    const moveMultiplier = this.charData.moveSpeed || 1.0;
    const speed = this.stats.agility * 30 * moveMultiplier;
    const isSlowed = this.statusEffects.some(e => e.type === 'slow');
    const moveSpeed = isSlowed ? speed * 0.5 : speed;

    let vx = 0;
    let vy = 0;

    if (this.keys.left.isDown) vx -= 1;
    if (this.keys.right.isDown) vx += 1;
    if (this.keys.up.isDown) vy -= 1;
    if (this.keys.down.isDown) vy += 1;

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx /= len;
      vy /= len;
    }

    this.setVelocity(vx * moveSpeed, vy * moveSpeed);
  }

  // ── Basic Attack ──

  basicAttack() {
    if (!this.active || !this.scene || !this.body) return null;

    // Check stun
    if (this.statusEffects.some(e => e.type === 'stun')) return null;

    // Check cooldown
    if (this.attackCooldown > 0) return null;

    // Set cooldown based on agility
    this.attackCooldown = 1 / (this.stats.agility * 0.15);

    let damage = this.getAttackDamage();

    // Stealth bonus (rogue)
    let fromStealth = false;
    if (this.isStealthed) {
      const stealthBuff = this.activeBuffs.find(b => b.buffs && b.buffs.nextAttackMultiplier);
      const multiplier = stealthBuff ? stealthBuff.buffs.nextAttackMultiplier : 3;
      damage = Math.round(damage * multiplier);
      fromStealth = true;
      this._removeStealthState();
    }

    const attackData = {
      damage,
      x: this.x,
      y: this.y,
      angle: this.facing,
      fromStealth,
    };

    if (this.charData.attackType === 'melee') {
      attackData.type = 'melee';
      attackData.range = this.charData.attackRange;
      this.scene.events.emit('player-melee', attackData);
    } else {
      attackData.type = 'ranged';
      attackData.projectile = this.charData.attackProjectile;
      attackData.speed = 400;
      attackData.range = this.charData.attackRange;
      this.scene.events.emit('player-shoot', attackData);
    }

    return attackData;
  }

  // ── Dash / Movement Ability ──

  dash() {
    if (!this.active || !this.scene) return null;
    const dashDef = this.charData.dash;
    if (!dashDef) return null;

    // Check charges (for rogue) or cooldown (for others)
    if (this.dashMaxCharges > 1) {
      if (this.dashCharges <= 0) return null;
      this.dashCharges--;
      if (this.dashCharges === this.dashMaxCharges - 1) {
        this.dashRechargeTimer = 0; // start recharging
      }
    } else {
      if (this.dashCooldown > 0) return null;
      this.dashCooldown = dashDef.cooldown;
    }

    const pointer = this.scene.input.activePointer;
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, worldPoint.x, worldPoint.y);

    const result = { type: dashDef.type, fromX: this.x, fromY: this.y, angle };

    // Get world bounds for clamping
    const bounds = this.scene.physics.world.bounds;
    const margin = 10;
    const clampX = (v) => Phaser.Math.Clamp(v, bounds.x + margin, bounds.x + bounds.width - margin);
    const clampY = (v) => Phaser.Math.Clamp(v, bounds.y + margin, bounds.y + bounds.height - margin);

    switch (dashDef.type) {
      case 'teleport': {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, worldPoint.x, worldPoint.y);
        const clampedDist = Math.min(dist, dashDef.range);
        result.toX = clampX(this.x + Math.cos(angle) * clampedDist);
        result.toY = clampY(this.y + Math.sin(angle) * clampedDist);
        break;
      }
      case 'leap': {
        result.toX = clampX(this.x + Math.cos(angle) * dashDef.distance);
        result.toY = clampY(this.y + Math.sin(angle) * dashDef.distance);
        break;
      }
      case 'dash': {
        result.toX = clampX(this.x + Math.cos(angle) * dashDef.distance);
        result.toY = clampY(this.y + Math.sin(angle) * dashDef.distance);
        break;
      }
      case 'backflip': {
        const backAngle = angle + Math.PI;
        result.toX = clampX(this.x + Math.cos(backAngle) * dashDef.distance);
        result.toY = clampY(this.y + Math.sin(backAngle) * dashDef.distance);
        result.angle = backAngle;
        break;
      }
    }

    // Apply position safely through physics body
    this.body.reset(result.toX, result.toY);

    return result;
  }

  getDashInfo() {
    const dashDef = this.charData.dash;
    if (!dashDef) return null;
    if (this.dashMaxCharges > 1) {
      return { charges: this.dashCharges, maxCharges: this.dashMaxCharges, cooldown: this.dashRechargeTimer, maxCooldown: dashDef.cooldown };
    }
    return { charges: this.dashCooldown <= 0 ? 1 : 0, maxCharges: 1, cooldown: this.dashCooldown, maxCooldown: dashDef.cooldown };
  }

  // ── Skill Usage ──

  useSkill(index) {
    if (!this.active || !this.scene) return null;
    if (index < 0 || index >= this.charData.skills.length) return null;

    // Check stun
    if (this.statusEffects.some(e => e.type === 'stun')) return null;

    const skillId = this.charData.skills[index];
    const skillDef = this.getEffectiveSkill(skillId);

    // Check cooldown
    if (this.skillCooldowns[skillId] > 0) return null;

    // Check mana
    if (this.currentMana < skillDef.manaCost) return null;

    // Deduct mana and set cooldown
    this.currentMana -= skillDef.manaCost;
    this.skillCooldowns[skillId] = skillDef.cooldown * 1000;

    const pointer = this.scene.input.activePointer;
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, worldPoint.x, worldPoint.y);

    const result = {
      skillId,
      skillDef,
      casterX: this.x,
      casterY: this.y,
      angle,
    };

    switch (skillDef.type) {
      case 'projectile':
        result.directionX = Math.cos(angle);
        result.directionY = Math.sin(angle);
        result.speed = skillDef.speed;
        result.damage = skillDef.damage;
        result.range = skillDef.range;
        break;

      case 'cone':
        result.range = skillDef.range;
        result.coneAngle = skillDef.coneAngle;
        break;

      case 'chain':
        result.targetX = worldPoint.x;
        result.targetY = worldPoint.y;
        result.range = skillDef.range;
        result.chainCount = skillDef.chainCount;
        result.chainRange = skillDef.chainRange;
        break;

      case 'melee_arc':
        result.arcAngle = skillDef.arcAngle;
        result.range = skillDef.range;
        result.knockback = skillDef.knockback;
        break;

      case 'self_buff':
        this._applySelfBuff(skillId, skillDef);
        break;

      case 'wave':
      case 'wave_fire':
        result.speed = skillDef.speed;
        result.range = skillDef.range;
        result.waveCount = skillDef.waveCount;
        result.waveAngle = skillDef.waveAngle;
        result.fireDuration = skillDef.fireDuration || 0;
        result.fireDamage = skillDef.fireDamage || 0;
        result.directions = [];
        for (let i = 0; i < skillDef.waveCount; i++) {
          const offset = ((i - (skillDef.waveCount - 1) / 2) * Phaser.Math.DegToRad(skillDef.waveAngle));
          const waveAngle = angle + offset;
          result.directions.push({
            x: Math.cos(waveAngle),
            y: Math.sin(waveAngle),
          });
        }
        break;

      case 'area':
        result.targetX = worldPoint.x;
        result.targetY = worldPoint.y;
        result.radius = skillDef.radius;
        result.hitCount = skillDef.hitCount;
        result.hitDelay = skillDef.hitDelay;
        break;

      case 'trap':
        result.targetX = worldPoint.x;
        result.targetY = worldPoint.y;
        result.triggerRadius = skillDef.triggerRadius;
        result.explosionRadius = skillDef.explosionRadius;
        result.lifetime = skillDef.lifetime;
        break;

      case 'multi_projectile':
        result.speed = skillDef.speed;
        result.range = skillDef.range;
        result.projectileCount = skillDef.projectileCount;
        result.directions = [];
        for (let i = 0; i < skillDef.projectileCount; i++) {
          const offset = ((i - (skillDef.projectileCount - 1) / 2)
            * Phaser.Math.DegToRad(skillDef.spreadAngle / (skillDef.projectileCount - 1)));
          const projAngle = angle + offset;
          result.directions.push({
            x: Math.cos(projAngle),
            y: Math.sin(projAngle),
          });
        }
        break;

      case 'projectile_aoe':
        result.directionX = Math.cos(angle);
        result.directionY = Math.sin(angle);
        result.speed = skillDef.speed;
        result.damage = skillDef.damage;
        result.range = skillDef.range;
        result.explosionRadius = skillDef.explosionRadius;
        break;

      case 'projectile_lava':
        result.directionX = Math.cos(angle);
        result.directionY = Math.sin(angle);
        result.speed = skillDef.speed;
        result.damage = skillDef.damage;
        result.range = skillDef.range;
        result.explosionRadius = skillDef.explosionRadius;
        result.lavaDuration = skillDef.lavaDuration;
        result.lavaDamage = skillDef.lavaDamage;
        break;
    }

    return result;
  }

  // ── Damage and Healing ──

  takeDamage(amount) {
    if (!this.scene || !this.active) return 0;
    if (this.isInvulnerable) return 0;
    if (this.currentHp <= 0) return 0;

    // Apply defense debuffs
    let effectiveDefense = this.stats.defense;
    for (const buff of this.activeBuffs) {
      if (buff.debuffs && buff.debuffs.defense) {
        effectiveDefense = Math.round(effectiveDefense * buff.debuffs.defense);
      }
    }

    const actualDamage = calculateDamage(amount, effectiveDefense);

    this.currentHp = Math.max(0, this.currentHp - actualDamage);

    // Brief invulnerability (unless dead)
    if (this.currentHp > 0) {
      this.isInvulnerable = true;
      this.setTint(0xff4444);
      // Use a tracked timer instead of delayedCall to prevent stuck states
      this._iframeTimer = 200;
    }

    if (this.scene && this.scene.events) {
      this.scene.events.emit('player-damaged', {
        player: this,
        damage: actualDamage,
        remainingHp: this.currentHp,
      });

      if (this.currentHp <= 0) {
        this.isInvulnerable = true;
        this.scene.events.emit('player-died', { player: this });
      }
    }

    return actualDamage;
  }

  heal(amount) {
    this.currentHp = Math.min(this.maxHp, this.currentHp + amount);

    // Flash green
    this.setTint(0x44ff44);
    this.scene.time.delayedCall(200, () => {
      this.clearTint();
    });
  }

  // ── Status Effects ──

  applyStatusEffect(type, duration, data = {}) {
    this.statusEffects.push({ type, remaining: duration, data });

    // Visual indicator
    const tints = {
      freeze: 0x88ccff,
      stun: 0xffff44,
      burn: 0xff6600,
      slow: 0x8844aa,
    };
    if (tints[type]) {
      this.setTint(tints[type]);
    }
  }

  _processStatusEffects(dt) {
    for (let i = this.statusEffects.length - 1; i >= 0; i--) {
      const effect = this.statusEffects[i];
      effect.remaining -= dt;

      // Burn/poison damage over time (use tick system like enemies)
      if (effect.type === 'burn' || effect.type === 'poison') {
        const dmgPerTick = effect.data.damage || effect.data.damagePerSecond || 0;
        if (dmgPerTick > 0) {
          if (!effect.data._tickAcc) effect.data._tickAcc = 0;
          effect.data._tickAcc += dt;
          const tickInterval = effect.data.tickRate || 0.5;
          if (effect.data._tickAcc >= tickInterval) {
            effect.data._tickAcc -= tickInterval;
            // Use takeDamage so it goes through proper flow (but bypass invuln for DoT)
            const wasInvuln = this.isInvulnerable;
            this.isInvulnerable = false;
            this.takeDamage(dmgPerTick);
            if (this.currentHp > 0) this.isInvulnerable = wasInvuln;
          }
        }
      }

      if (effect.remaining <= 0) {
        this.statusEffects.splice(i, 1);
      }
    }

    // Clear tint if no effects remain
    if (this.statusEffects.length === 0 && !this.isInvulnerable && !this.isStealthed) {
      this.clearTint();
    }
  }

  // ── Equipment ──

  equipItem(item) {
    if (!item || this.items.length >= GAME.MAX_ITEMS) return false;
    this.items.push(item);
    try { this.recalculateStats(); } catch (e) { /* scene may be gone */ }
    return true;
  }

  unequipItem(index) {
    if (index < 0 || index >= this.items.length) return null;
    const removed = this.items.splice(index, 1)[0];
    try { this.recalculateStats(); } catch (e) { /* scene may be gone */ }
    return removed;
  }

  recalculateStats() {
    // Start from base stats
    const base = { ...this.charData.stats };

    // Add item boosts
    for (const item of this.items) {
      if (item.statBoosts) {
        for (const [key, value] of Object.entries(item.statBoosts)) {
          if (key !== 'skillBoost' && typeof value === 'number') {
            base[key] = (base[key] || 0) + value;
          }
        }
      }
      // Subtract negatives
      if (item.negatives) {
        for (const [key, value] of Object.entries(item.negatives)) {
          if (typeof value === 'number') {
            base[key] = (base[key] || 0) + value;
          }
        }
      }
    }

    // Apply soul upgrades from scene registry
    const soulUpgrades = (this.scene && this.scene.registry) ? this.scene.registry.get('soulUpgrades') : this._cachedSoulUpgrades;
    if (soulUpgrades) {
      this._cachedSoulUpgrades = soulUpgrades;
      for (const [upgradeId, level] of Object.entries(soulUpgrades)) {
        const upgradeDef = this._getSoulUpgrade(upgradeId);
        if (upgradeDef && upgradeDef.stat && base[upgradeDef.stat] !== undefined) {
          base[upgradeDef.stat] += upgradeDef.perLevel * level;
        }
      }
    }

    this.stats = base;

    // Update max HP/mana and clamp current values
    this.maxHp = this.stats.hp;
    this.maxMana = this.stats.mana;
    this.currentHp = Math.min(this.currentHp, this.maxHp);
    this.currentMana = Math.min(this.currentMana, this.maxMana);
  }

  _getSoulUpgrade(upgradeId) {
    return SOUL_UPGRADES[upgradeId] || null;
  }

  // ── Skill / Damage Helpers ──

  getEffectiveSkill(skillId) {
    const base = { ...SKILLS[skillId] };

    // Apply item skill boosts
    for (const item of this.items) {
      if (item.statBoosts && item.statBoosts.skillBoost && item.statBoosts.skillBoost[skillId]) {
        const boosts = item.statBoosts.skillBoost[skillId];
        for (const [key, value] of Object.entries(boosts)) {
          if (typeof value === 'number' && typeof base[key] === 'number') {
            base[key] += value;
          } else {
            base[key] = value;
          }
        }
      }
    }

    return base;
  }

  getAttackDamage() {
    let damage = this.stats.attack;

    // Apply buff multipliers
    for (const buff of this.activeBuffs) {
      if (buff.buffs && buff.buffs.attack && typeof buff.buffs.attack === 'number') {
        damage = damage * buff.buffs.attack;
      }
    }

    return Math.round(damage * this.getDamageMultiplier());
  }

  // Universal damage multiplier that applies to both basic attacks and skills
  // (e.g. Enrage grants damageMultiplier: 1.2 for +20% to everything).
  getDamageMultiplier() {
    let mult = 1;
    for (const buff of this.activeBuffs) {
      if (buff.buffs && typeof buff.buffs.damageMultiplier === 'number') {
        mult *= buff.buffs.damageMultiplier;
      }
    }
    return mult;
  }

  // ── Buff Helpers ──

  _applySelfBuff(skillId, skillDef) {
    const buff = {
      id: skillId,
      remaining: skillDef.duration,
      buffs: skillDef.buffs || {},
      debuffs: skillDef.debuffs || {},
    };

    this.activeBuffs.push(buff);

    // Handle stealth specifically
    if (skillDef.buffs && skillDef.buffs.invisible) {
      this.isStealthed = true;
      this.isInvulnerable = true;
      this.setAlpha(0.3);
    }

    // Visual aura (e.g. Enrage)
    if (skillDef.auraColor !== undefined && this.scene) {
      this._createAura(skillDef.auraColor, skillId);
      buff._auraId = skillId;
    }
  }

  _createAura(color, buffId) {
    if (!this.scene) return;
    // Clean up any existing aura for this buff id
    this._removeAura(buffId);

    const aura = this.scene.add.circle(this.x, this.y, 28, color, 0.18);
    aura.setStrokeStyle(2, color, 0.8);
    aura.setDepth((this.depth || 0) - 1);
    aura._buffId = buffId;

    const tween = this.scene.tweens.add({
      targets: aura,
      scale: { from: 1, to: 1.35 },
      alpha: { from: 0.45, to: 0.15 },
      duration: 550,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    aura._tween = tween;

    if (!this._auras) this._auras = [];
    this._auras.push(aura);
  }

  _removeAura(buffId) {
    if (!this._auras) return;
    for (let i = this._auras.length - 1; i >= 0; i--) {
      const aura = this._auras[i];
      if (aura && aura._buffId === buffId) {
        if (aura._tween) aura._tween.remove();
        if (aura.scene) aura.destroy();
        this._auras.splice(i, 1);
      }
    }
  }

  _updateAuras() {
    if (!this._auras || this._auras.length === 0) return;
    for (let i = this._auras.length - 1; i >= 0; i--) {
      const aura = this._auras[i];
      if (!aura || !aura.scene) {
        this._auras.splice(i, 1);
        continue;
      }
      aura.setPosition(this.x, this.y);
    }
  }

  _removeBuff(index) {
    const buff = this.activeBuffs[index];

    // Clean up stealth if this was a stealth buff
    if (buff.buffs && buff.buffs.invisible) {
      this._removeStealthState();
    }

    // Clean up aura if any
    if (buff._auraId) {
      this._removeAura(buff._auraId);
    }

    this.activeBuffs.splice(index, 1);
  }

  _removeStealthState() {
    this.isStealthed = false;
    this.isInvulnerable = false;
    this.setAlpha(1);

    // Also remove the stealth buff from activeBuffs if still present
    const stealthIndex = this.activeBuffs.findIndex(b => b.buffs && b.buffs.invisible);
    if (stealthIndex !== -1) {
      this.activeBuffs.splice(stealthIndex, 1);
    }
  }

  // ── Ultimate ──

  addUltCharge(damage) {
    if (this.ultActive) return;
    this.ultCharge = Math.min(this.ultChargeNeeded, this.ultCharge + damage);
  }

  isUltReady() {
    return !this.ultActive && this.ultCharge >= this.ultChargeNeeded;
  }

  useUlt() {
    if (!this.isUltReady()) return null;
    this.ultCharge = 0;
    this.ultActive = true;
    const ultDef = this.charData.ultimate;
    this.ultTimer = ultDef.duration;
    return { type: ultDef.type, ...ultDef, casterX: this.x, casterY: this.y };
  }

  getUltInfo() {
    const ultDef = this.charData.ultimate;
    if (!ultDef) return null;
    return {
      name: ultDef.name,
      charge: this.ultCharge,
      chargeNeeded: this.ultChargeNeeded,
      ready: this.isUltReady(),
      active: this.ultActive,
      timer: this.ultTimer,
    };
  }

  // ── Network Sync ──

  setPosition(x, y) {
    super.setPosition(x, y);
    return this;
  }
}
