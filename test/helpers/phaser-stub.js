// Minimal Phaser stub covering only what the game's core logic touches.
// Installs `globalThis.Phaser` so modules that `extends Phaser.Physics.Arcade.Sprite`
// can be loaded and exercised under Node for testing.

class FakeGameObject {
  constructor() {
    this.scene = null;
    this.x = 0;
    this.y = 0;
    this.width = 48;
    this.height = 48;
    this.active = true;
    this.visible = true;
    this.alpha = 1;
    this.depth = 0;
    this.tint = null;
    this.flipX = false;
  }
  setTint(t) { this.tint = t; return this; }
  setTintFill(t) { this.tint = t; return this; }
  clearTint() { this.tint = null; return this; }
  setAlpha(a) { this.alpha = a; return this; }
  setVisible(v) { this.visible = v; return this; }
  setVelocity() { return this; }
  setFlipX(v) { this.flipX = !!v; return this; }
  setActive(v) { this.active = !!v; return this; }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setDepth(d) { this.depth = d; return this; }
  setOrigin() { return this; }
  setScale() { return this; }
  setAngle() { return this; }
  setScrollFactor() { return this; }
  setStrokeStyle() { return this; }
  destroy() { this.active = false; this.scene = null; }
}

class FakeSprite extends FakeGameObject {
  constructor(scene, x, y, texture) {
    super();
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.texture = texture;
    this.body = {
      enable: true,
      setSize: () => this.body,
      setOffset: () => this.body,
      setAllowGravity: () => this.body,
      setImmovable: () => this.body,
      setCollideWorldBounds: () => this.body,
      setVelocity: () => this.body,
      reset: (x, y) => { this.x = x; this.y = y; return this.body; },
    };
  }
}

class FakeContainer extends FakeGameObject {
  constructor(scene, x = 0, y = 0) {
    super();
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.list = [];
  }
  add(child) {
    if (Array.isArray(child)) this.list.push(...child);
    else this.list.push(child);
    return this;
  }
  remove(child) {
    const i = this.list.indexOf(child);
    if (i !== -1) this.list.splice(i, 1);
    return this;
  }
  removeAll() { this.list = []; return this; }
  setSize(w, h) { this.width = w; this.height = h; return this; }
}

class FakeScene {
  constructor() {}
}

globalThis.Phaser = {
  Scene: FakeScene,
  Physics: { Arcade: { Sprite: FakeSprite } },
  GameObjects: { Container: FakeContainer },
  Input: { Keyboard: { KeyCodes: { W: 87, A: 65, S: 83, D: 68 } } },
  Math: {
    Angle: {
      Between: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),
      Wrap: (a) => {
        const TWO_PI = Math.PI * 2;
        return ((a + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI;
      },
    },
    Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) },
    Clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
    DegToRad: (d) => (d * Math.PI) / 180,
    RadToDeg: (r) => (r * 180) / Math.PI,
    Between: (min, max) => min + Math.floor(Math.random() * (max - min + 1)),
  },
};

export function createFakeScene() {
  const listeners = new Map();
  return {
    add: {
      existing: () => {},
      circle: () => ({
        setStrokeStyle: () => ({}),
        setDepth: () => ({}),
        setPosition: () => ({}),
        destroy: () => {},
      }),
    },
    physics: {
      add: { existing: () => {} },
      world: { bounds: { x: 0, y: 0, width: 1280, height: 720 } },
    },
    events: {
      on(name, fn) {
        if (!listeners.has(name)) listeners.set(name, []);
        listeners.get(name).push(fn);
      },
      emit(name, data) {
        for (const fn of listeners.get(name) || []) fn(data);
      },
    },
    time: { delayedCall: () => ({ remove: () => {} }) },
    registry: { get: () => null },
    input: {
      keyboard: { addKeys: () => ({}) },
      activePointer: { x: 0, y: 0 },
    },
    cameras: { main: { getWorldPoint: (x, y) => ({ x, y }) } },
    tweens: { add: () => ({ remove: () => {} }), killTweensOf: () => {} },
  };
}
