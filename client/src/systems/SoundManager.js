// ══════════════════════════════════════════════════════════════
//  SoundManager — Procedural Web Audio sound effects & music
//  All sounds synthesized at runtime (no external assets).
// ══════════════════════════════════════════════════════════════

class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.currentMusic = null;
    this.musicVolume = 0.25;
    this.sfxVolume = 0.45;
    this.enabled = true;
    this._sfxCooldown = new Map();
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch (e) {
      return;
    }
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.enabled ? 1 : 0;
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.masterGain);
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  // ── SFX ──

  play(name, opts = {}) {
    this.init();
    if (!this.ctx || !this.enabled) return;
    this.resume();

    // Rate-limit identical SFX to avoid stacking
    const minGap = opts.minGap || 0;
    if (minGap > 0) {
      const last = this._sfxCooldown.get(name) || 0;
      const now = this.ctx.currentTime;
      if (now - last < minGap) return;
      this._sfxCooldown.set(name, now);
    }

    const fn = SFX[name];
    if (fn) fn(this);
  }

  _tone({ freq, type = 'sine', duration = 0.15, attack = 0.005, gain = 0.3, slideTo = null, delay = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + duration);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g).connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  _noise({ duration = 0.2, filterFreq = 2000, filterQ = 1, filterType = 'lowpass', gain = 0.3, slideTo = null, delay = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, t);
    if (slideTo !== null) filter.frequency.exponentialRampToValueAtTime(Math.max(50, slideTo), t + duration);
    filter.Q.value = filterQ;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter).connect(g).connect(this.sfxGain);
    src.start(t);
    src.stop(t + duration + 0.02);
  }

  // ── Music ──

  playMusic(name) {
    this.init();
    if (!this.ctx) return;
    this.resume();
    if (this.currentMusic && this.currentMusic.name === name) return;
    this.stopMusic();
    const fn = MUSIC[name];
    if (!fn) return;
    const stop = fn(this);
    this.currentMusic = { name, stop };
  }

  stopMusic() {
    if (this.currentMusic) {
      try { this.currentMusic.stop(); } catch (e) { /* ignore */ }
      this.currentMusic = null;
    }
  }

  _scheduleNote({ freq, type = 'triangle', start, duration, gain = 0.1, attack = 0.03 }) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gain, start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(g).connect(this.musicGain);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  _startLoop({ tempo, bass, lead, leadType = 'sine', bassType = 'triangle', bassGain = 0.14, leadGain = 0.07 }) {
    const beatDur = 60 / tempo;
    let stopped = false;
    let bIdx = 0;
    let lIdx = 0;
    const lookAhead = 0.2; // seconds before the note that we schedule it

    const tick = (nextBeatTime) => {
      if (stopped || !this.ctx) return;

      // Schedule bass note
      const bassNote = bass[bIdx % bass.length];
      bIdx++;
      this._scheduleNote({
        freq: bassNote.freq,
        type: bassType,
        start: nextBeatTime,
        duration: bassNote.dur * beatDur * 0.95,
        gain: bassGain,
        attack: 0.05,
      });

      // Schedule lead notes (subdivide into quarters of bass note duration)
      const subs = Math.max(1, Math.round(bassNote.dur * 2));
      const subDur = (bassNote.dur * beatDur) / subs;
      for (let i = 0; i < subs; i++) {
        const leadFreq = lead[lIdx % lead.length];
        lIdx++;
        if (leadFreq > 0) {
          this._scheduleNote({
            freq: leadFreq,
            type: leadType,
            start: nextBeatTime + i * subDur,
            duration: subDur * 0.8,
            gain: leadGain,
            attack: 0.02,
          });
        }
      }

      const nextTime = nextBeatTime + bassNote.dur * beatDur;
      const msUntilNext = Math.max(20, (nextTime - this.ctx.currentTime - lookAhead) * 1000);
      setTimeout(() => tick(nextTime), msUntilNext);
    };

    tick(this.ctx.currentTime + 0.1);
    return () => { stopped = true; };
  }

  // ── Volume/toggle ──

  setMusicVolume(v) {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicGain) this.musicGain.gain.value = this.musicVolume;
  }

  setSfxVolume(v) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
  }

  toggleMute() {
    this.enabled = !this.enabled;
    if (this.masterGain) this.masterGain.gain.value = this.enabled ? 1 : 0;
    return this.enabled;
  }
}

// ══════════════════════════════════════════════════════════════
//  SFX bank
// ══════════════════════════════════════════════════════════════

const SFX = {
  // Player basic attacks
  attack_melee: (s) => {
    s._noise({ duration: 0.1, filterFreq: 3500, filterQ: 1, filterType: 'highpass', gain: 0.2, slideTo: 600 });
    s._tone({ freq: 220, type: 'square', duration: 0.06, gain: 0.1, slideTo: 120 });
  },
  attack_shoot: (s) => {
    s._tone({ freq: 900, type: 'triangle', duration: 0.1, gain: 0.2, slideTo: 300 });
    s._noise({ duration: 0.06, filterFreq: 2500, filterQ: 2, gain: 0.1 });
  },

  // Hits
  hit_enemy: (s) => {
    s._noise({ duration: 0.1, filterFreq: 900, filterQ: 4, gain: 0.3, slideTo: 300 });
    s._tone({ freq: 180, type: 'square', duration: 0.07, gain: 0.12, slideTo: 90 });
  },
  hit_crit: (s) => {
    s._noise({ duration: 0.15, filterFreq: 1500, filterQ: 3, gain: 0.35, slideTo: 400 });
    s._tone({ freq: 330, type: 'square', duration: 0.12, gain: 0.18, slideTo: 150 });
    s._tone({ freq: 660, type: 'triangle', duration: 0.1, gain: 0.12, delay: 0.03 });
  },
  hit_player: (s) => {
    s._tone({ freq: 280, type: 'sawtooth', duration: 0.2, gain: 0.28, slideTo: 110 });
    s._noise({ duration: 0.18, filterFreq: 1400, filterQ: 2, gain: 0.18, slideTo: 400 });
  },

  // Deaths
  death_enemy: (s) => {
    s._noise({ duration: 0.3, filterFreq: 700, filterQ: 1, gain: 0.3, slideTo: 150 });
    s._tone({ freq: 240, type: 'triangle', duration: 0.28, gain: 0.18, slideTo: 80 });
  },
  death_player: (s) => {
    s._tone({ freq: 260, type: 'sawtooth', duration: 0.8, gain: 0.3, slideTo: 70, attack: 0.02 });
    s._tone({ freq: 195, type: 'triangle', duration: 0.8, gain: 0.22, slideTo: 55, attack: 0.05 });
    s._noise({ duration: 0.6, filterFreq: 600, filterQ: 1, gain: 0.18, slideTo: 120, delay: 0.1 });
  },
  death_boss: (s) => {
    s._tone({ freq: 180, type: 'sawtooth', duration: 1.4, gain: 0.35, slideTo: 50 });
    s._tone({ freq: 90, type: 'square', duration: 1.4, gain: 0.28, slideTo: 30 });
    s._noise({ duration: 1.2, filterFreq: 1500, filterQ: 1, gain: 0.3, slideTo: 200, delay: 0.05 });
    s._tone({ freq: 660, type: 'triangle', duration: 0.5, gain: 0.2, slideTo: 180, delay: 0.3 });
  },

  // Skills (generic variants)
  skill_cast: (s) => {
    s._tone({ freq: 440, type: 'sawtooth', duration: 0.25, gain: 0.2, slideTo: 880 });
    s._tone({ freq: 660, type: 'triangle', duration: 0.2, gain: 0.15, delay: 0.02 });
  },
  skill_fire: (s) => {
    s._noise({ duration: 0.4, filterFreq: 1800, filterQ: 2, gain: 0.3, slideTo: 400 });
    s._tone({ freq: 180, type: 'sawtooth', duration: 0.3, gain: 0.22, slideTo: 70 });
  },
  skill_ice: (s) => {
    s._tone({ freq: 1200, type: 'triangle', duration: 0.35, gain: 0.2, slideTo: 500 });
    s._noise({ duration: 0.3, filterFreq: 5000, filterQ: 4, filterType: 'highpass', gain: 0.18, slideTo: 2000 });
  },
  skill_lightning: (s) => {
    s._noise({ duration: 0.18, filterFreq: 6000, filterQ: 2, filterType: 'highpass', gain: 0.35, slideTo: 3000 });
    s._tone({ freq: 1800, type: 'square', duration: 0.1, gain: 0.18, slideTo: 900 });
  },
  skill_buff: (s) => {
    s._tone({ freq: 330, type: 'triangle', duration: 0.35, gain: 0.22, slideTo: 660 });
    s._tone({ freq: 495, type: 'sine', duration: 0.3, gain: 0.18, slideTo: 880, delay: 0.05 });
  },
  skill_slash: (s) => {
    s._noise({ duration: 0.18, filterFreq: 4500, filterQ: 2, filterType: 'highpass', gain: 0.3, slideTo: 800 });
    s._tone({ freq: 280, type: 'square', duration: 0.1, gain: 0.15, slideTo: 140 });
  },
  skill_heavy: (s) => {
    s._tone({ freq: 120, type: 'sawtooth', duration: 0.3, gain: 0.35, slideTo: 50 });
    s._noise({ duration: 0.25, filterFreq: 1200, filterQ: 1, gain: 0.25, slideTo: 300 });
  },
  skill_arrow: (s) => {
    s._tone({ freq: 1400, type: 'triangle', duration: 0.2, gain: 0.22, slideTo: 500 });
    s._noise({ duration: 0.1, filterFreq: 3000, filterQ: 2, gain: 0.12 });
  },
  skill_poison: (s) => {
    s._tone({ freq: 220, type: 'sawtooth', duration: 0.35, gain: 0.22, slideTo: 440 });
    s._noise({ duration: 0.3, filterFreq: 800, filterQ: 3, gain: 0.18 });
  },
  skill_trap: (s) => {
    s._tone({ freq: 440, type: 'square', duration: 0.08, gain: 0.18 });
    s._tone({ freq: 660, type: 'square', duration: 0.08, gain: 0.18, delay: 0.09 });
  },
  skill_stealth: (s) => {
    s._tone({ freq: 880, type: 'sine', duration: 0.4, gain: 0.22, slideTo: 220 });
    s._noise({ duration: 0.3, filterFreq: 400, filterQ: 2, gain: 0.12 });
  },

  // Ultimates
  ult_cast: (s) => {
    // Dramatic rising swell with low rumble
    s._tone({ freq: 55, type: 'sawtooth', duration: 1.4, gain: 0.35, attack: 0.1 });
    s._tone({ freq: 110, type: 'square', duration: 1.4, gain: 0.22, attack: 0.15 });
    s._tone({ freq: 220, type: 'triangle', duration: 1.2, gain: 0.2, slideTo: 660, delay: 0.1 });
    s._tone({ freq: 330, type: 'sine', duration: 1.0, gain: 0.18, slideTo: 990, delay: 0.2 });
    s._noise({ duration: 0.8, filterFreq: 400, filterQ: 1, gain: 0.3, slideTo: 3500, delay: 0.1 });
  },
  ult_blackhole: (s) => {
    s._tone({ freq: 90, type: 'sawtooth', duration: 1.5, gain: 0.4, slideTo: 30, attack: 0.2 });
    s._tone({ freq: 140, type: 'square', duration: 1.5, gain: 0.25, slideTo: 50, attack: 0.2 });
    s._noise({ duration: 1.2, filterFreq: 2000, filterQ: 3, gain: 0.3, slideTo: 200 });
  },
  ult_whirlwind: (s) => {
    s._tone({ freq: 160, type: 'sawtooth', duration: 1.2, gain: 0.3 });
    s._noise({ duration: 1.0, filterFreq: 800, filterQ: 6, gain: 0.35 });
    s._tone({ freq: 320, type: 'triangle', duration: 0.8, gain: 0.2, slideTo: 440, delay: 0.1 });
  },
  ult_wolf: (s) => {
    // Howl
    s._tone({ freq: 220, type: 'sawtooth', duration: 1.2, gain: 0.35, slideTo: 880, attack: 0.15 });
    s._tone({ freq: 165, type: 'triangle', duration: 1.2, gain: 0.2, slideTo: 660, attack: 0.2 });
    s._noise({ duration: 0.4, filterFreq: 2000, filterQ: 3, gain: 0.15 });
  },
  ult_poison: (s) => {
    s._tone({ freq: 110, type: 'square', duration: 1.2, gain: 0.3, slideTo: 55 });
    s._tone({ freq: 440, type: 'sawtooth', duration: 0.8, gain: 0.22, slideTo: 220, delay: 0.1 });
    s._noise({ duration: 1.0, filterFreq: 1200, filterQ: 4, gain: 0.3 });
  },

  // Misc
  explosion: (s) => {
    s._noise({ duration: 0.5, filterFreq: 1500, filterQ: 1, gain: 0.4, slideTo: 200 });
    s._tone({ freq: 80, type: 'sawtooth', duration: 0.4, gain: 0.3, slideTo: 40 });
  },
  heal: (s) => {
    s._tone({ freq: 523, type: 'sine', duration: 0.18, gain: 0.2 });
    s._tone({ freq: 784, type: 'sine', duration: 0.18, gain: 0.2, delay: 0.08 });
    s._tone({ freq: 1046, type: 'sine', duration: 0.2, gain: 0.18, delay: 0.16 });
  },
  dash: (s) => {
    s._noise({ duration: 0.15, filterFreq: 3000, filterQ: 2, filterType: 'highpass', gain: 0.2, slideTo: 500 });
    s._tone({ freq: 440, type: 'triangle', duration: 0.1, gain: 0.15, slideTo: 880 });
  },
  pickup_item: (s) => {
    s._tone({ freq: 880, type: 'triangle', duration: 0.1, gain: 0.22 });
    s._tone({ freq: 1320, type: 'triangle', duration: 0.12, gain: 0.2, delay: 0.06 });
  },
  soul_gain: (s) => {
    s._tone({ freq: 660, type: 'sine', duration: 0.15, gain: 0.18 });
    s._tone({ freq: 990, type: 'sine', duration: 0.15, gain: 0.18, delay: 0.08 });
  },
  button_click: (s) => {
    s._tone({ freq: 660, type: 'square', duration: 0.05, gain: 0.15 });
  },
  button_hover: (s) => {
    s._tone({ freq: 880, type: 'sine', duration: 0.04, gain: 0.08 });
  },
  level_complete: (s) => {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => s._tone({ freq: f, type: 'triangle', duration: 0.22, gain: 0.22, delay: i * 0.1 }));
  },
  level_start: (s) => {
    s._tone({ freq: 220, type: 'sawtooth', duration: 0.3, gain: 0.25, slideTo: 440 });
    s._tone({ freq: 330, type: 'triangle', duration: 0.25, gain: 0.2, slideTo: 660, delay: 0.1 });
  },
};

// ══════════════════════════════════════════════════════════════
//  Music bank — generative loops
// ══════════════════════════════════════════════════════════════
//  Notes are { freq, dur } where dur is in beats.
//  A-minor leaning, fits dark fantasy vibe.

const MUSIC = {
  menu: (s) => s._startLoop({
    tempo: 72,
    bassType: 'triangle',
    leadType: 'sine',
    bassGain: 0.14,
    leadGain: 0.06,
    bass: [
      { freq: 110.00, dur: 2 }, // A2
      { freq: 164.81, dur: 2 }, // E3
      { freq: 146.83, dur: 2 }, // D3
      { freq: 130.81, dur: 2 }, // C3
    ],
    lead: [
      440, 523, 659, 523,  659, 784, 880, 784,
      587, 698, 880, 698,  523, 659, 784, 659,
    ],
  }),

  lobby: (s) => s._startLoop({
    tempo: 68,
    bassType: 'sine',
    leadType: 'triangle',
    bassGain: 0.15,
    leadGain: 0.05,
    bass: [
      { freq: 146.83, dur: 3 }, // D3
      { freq: 220.00, dur: 3 }, // A3
      { freq: 174.61, dur: 3 }, // F3
      { freq: 196.00, dur: 3 }, // G3
    ],
    lead: [
      293, 440, 587, 440, 523, 440,
      440, 659, 880, 659, 784, 659,
      349, 523, 698, 523, 659, 523,
      392, 587, 784, 587, 698, 587,
    ],
  }),

  combat: (s) => s._startLoop({
    tempo: 118,
    bassType: 'square',
    leadType: 'triangle',
    bassGain: 0.13,
    leadGain: 0.07,
    bass: [
      { freq: 110.00, dur: 1 }, // A2
      { freq: 110.00, dur: 1 },
      { freq: 130.81, dur: 1 }, // C3
      { freq: 146.83, dur: 1 }, // D3
      { freq: 110.00, dur: 1 },
      { freq: 110.00, dur: 1 },
      { freq: 164.81, dur: 1 }, // E3
      { freq: 146.83, dur: 1 }, // D3
    ],
    lead: [
      440, 523, 440, 659,
      440, 523, 440, 587,
      523, 659, 523, 784,
      587, 698, 587, 880,
      440, 523, 440, 659,
      440, 523, 440, 587,
      659, 784, 659, 440,
      587, 523, 440, 330,
    ],
  }),

  boss: (s) => s._startLoop({
    tempo: 132,
    bassType: 'sawtooth',
    leadType: 'square',
    bassGain: 0.16,
    leadGain: 0.07,
    bass: [
      { freq: 82.41, dur: 0.5 },  // E2
      { freq: 82.41, dur: 0.5 },
      { freq: 87.31, dur: 0.5 },  // F2
      { freq: 82.41, dur: 0.5 },
      { freq: 98.00, dur: 0.5 },  // G2
      { freq: 87.31, dur: 0.5 },  // F2
      { freq: 82.41, dur: 1 },    // E2
    ],
    lead: [
      164, 196, 164, 247, 220, 247, 294,
      164, 196, 164, 247, 220, 247, 294,
      175, 207, 175, 262, 247, 262, 330,
      164, 196, 164, 247, 220, 247, 294,
    ],
  }),
};

// ══════════════════════════════════════════════════════════════
//  Export singleton
// ══════════════════════════════════════════════════════════════

const sound = new SoundManager();
export default sound;
