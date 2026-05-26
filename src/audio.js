const SOUND_NAMES = [
  "launch",
  "hit",
  "break",
  "multiplier",
  "upgrade",
  "coreHit",
  "victory",
  "uiClick",
  "denied",
];

const THROTTLE_MS = {
  hit: 35,
  break: 45,
  coreHit: 80,
};

export class AudioManager {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.buffers = new Map();
    this.lastPlayed = new Map();
    this.muted = false;
    this.unlocked = false;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.musicTimer = null;
    this.nextBassAt = 0;
    this.nextBellAt = 0;
    this.scale = [196, 233.08, 261.63, 293.66, 349.23, 392, 466.16, 523.25];
    this.loadPromise = this.loadFiles();
  }

  async loadFiles() {
    await Promise.all(SOUND_NAMES.map((name) => this.loadSound(name)));
  }

  async loadSound(name) {
    for (const extension of ["ogg", "mp3"]) {
      try {
        const response = await fetch(`/audio/${name}.${extension}`);
        if (!response.ok) continue;

        const data = await response.arrayBuffer();
        const context = await this.ensureContext();
        if (!context) return;
        const buffer = await context.decodeAudioData(data);
        this.buffers.set(name, buffer);
        return;
      } catch {
        this.buffers.delete(name);
      }
    }
  }

  async unlock() {
    await this.ensureContext();
    if (!this.context) return;
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
    this.unlocked = true;
    this.startMusic();
  }

  async ensureContext() {
    if (this.context) return this.context;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    this.context = new AudioContextClass();

    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.72;
    this.masterGain.connect(this.context.destination);

    this.sfxGain = this.context.createGain();
    this.sfxGain.gain.value = 0.78;
    this.sfxGain.connect(this.masterGain);

    this.musicGain = this.context.createGain();
    this.musicGain.gain.value = 0.075;
    this.musicGain.connect(this.masterGain);

    return this.context;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.72, this.context.currentTime, 0.04);
    }
    return this.muted;
  }

  startMusic() {
    if (!this.context || this.musicTimer || !this.musicEnabled) return;

    const now = this.context.currentTime;
    this.nextBassAt = now + 0.3;
    this.nextBellAt = now + 0.75;
    this.musicTimer = window.setInterval(() => this.scheduleAmbientLoop(), 180);
  }

  stopMusic() {
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  scheduleAmbientLoop() {
    if (!this.context || this.muted || !this.musicEnabled) return;

    const now = this.context.currentTime;
    const lookAhead = 0.75;

    while (this.nextBassAt < now + lookAhead) {
      this.musicBassPulse(this.nextBassAt);
      this.nextBassAt += 1.25 + Math.random() * 0.8;
    }

    while (this.nextBellAt < now + lookAhead) {
      const note = this.scale[Math.floor(Math.random() * this.scale.length)] * (Math.random() < 0.35 ? 2 : 1);
      this.musicBell(note, this.nextBellAt, 0.075 + Math.random() * 0.035);
      if (Math.random() < 0.32) {
        this.musicBell(note * 1.5, this.nextBellAt + 0.16, 0.045);
      }
      this.nextBellAt += 0.8 + Math.random() * 1.7;
    }
  }

  async play(name) {
    if (this.muted || !this.sfxEnabled) return;

    const now = performance.now();
    const throttle = THROTTLE_MS[name] || 0;
    if (throttle && now - (this.lastPlayed.get(name) || 0) < throttle) return;
    this.lastPlayed.set(name, now);

    const context = await this.ensureContext();
    if (!context) return;
    if (context.state === "suspended") await context.resume();

    const buffer = this.buffers.get(name);
    if (buffer) {
      this.playBuffer(buffer, name);
      return;
    }

    this.playSynth(name);
  }

  playBuffer(buffer, name) {
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = buffer;
    gain.gain.value = this.getSfxVolume(name);
    source.connect(gain);
    gain.connect(this.sfxGain);
    source.start();
  }

  getSfxVolume(name) {
    const volumes = {
      hit: 0.18,
      break: 0.34,
      multiplier: 0.42,
      victory: 0.46,
      denied: 0.12,
      launch: 0.28,
      upgrade: 0.26,
      coreHit: 0.36,
      uiClick: 0.11,
    };
    return volumes[name] || 0.24;
  }

  playSynth(name) {
    const map = {
      launch: () => this.whoosh(0.17, 260, 720, 0.16),
      hit: () => this.noiseBurst(0.04, 1100, 0.1),
      break: () => this.noiseBurst(0.14, 2600, 0.22),
      multiplier: () => this.arpeggio([523.25, 659.25, 783.99, 1046.5], 0.06, 0.18),
      upgrade: () => this.arpeggio([392, 587.33, 783.99], 0.06, 0.14),
      coreHit: () => this.thump(0.2, 78, 0.22),
      victory: () => this.arpeggio([261.63, 392, 523.25, 659.25, 783.99], 0.1, 0.22),
      uiClick: () => this.tone(620, 0.035, 0.06, "square"),
      denied: () => this.arpeggio([196, 164.81], 0.07, 0.07),
    };

    map[name]?.();
  }

  musicBassPulse(start) {
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(73.42, start);
    osc.frequency.exponentialRampToValueAtTime(49, start + 0.55);
    filter.type = "lowpass";
    filter.frequency.value = 180;
    filter.Q.value = 0.8;

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.16, start + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.72);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(start);
    osc.stop(start + 0.8);
  }

  musicBell(frequency, start, volume) {
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.value = frequency;
    filter.type = "lowpass";
    filter.frequency.value = 1350;
    filter.Q.value = 2.2;

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.045);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(start);
    osc.stop(start + 1.0);
  }

  tone(frequency, duration, volume, type = "sine", delay = 0) {
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const start = this.context.currentTime + delay;
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  whoosh(duration, from, to, volume) {
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    const start = this.context.currentTime;
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(to, start + duration);
    filter.type = "lowpass";
    filter.frequency.value = 1200;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(start);
    osc.stop(start + duration + 0.04);
  }

  thump(duration, frequency, volume) {
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const start = this.context.currentTime;
    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, start);
    osc.frequency.exponentialRampToValueAtTime(34, start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(start);
    osc.stop(start + duration + 0.04);
  }

  arpeggio(notes, step, volume) {
    notes.forEach((note, index) => {
      this.tone(note, step * 1.75, volume, "triangle", index * step);
    });
  }

  noiseBurst(duration, filterFrequency, volume) {
    const sampleRate = this.context.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = this.context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }

    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    filter.type = "highpass";
    filter.frequency.value = filterFrequency;
    gain.gain.value = volume;
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start();
  }
}
