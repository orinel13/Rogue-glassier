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
  hit: 45,
  break: 70,
  coreHit: 90,
};

export class AudioManager {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.ambientGain = null;
    this.buffers = new Map();
    this.lastPlayed = new Map();
    this.muted = false;
    this.unlocked = false;
    this.ambientNodes = [];
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
    this.startAmbient();
  }

  async ensureContext() {
    if (this.context) return this.context;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    this.context = new AudioContextClass();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.72;
    this.masterGain.connect(this.context.destination);

    this.ambientGain = this.context.createGain();
    this.ambientGain.gain.value = 0.055;
    this.ambientGain.connect(this.masterGain);

    return this.context;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.72, this.context.currentTime, 0.03);
    }
    return this.muted;
  }

  async play(name) {
    if (this.muted) return;

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
    gain.gain.value = name === "victory" || name === "multiplier" ? 0.9 : 0.62;
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();
  }

  startAmbient() {
    if (!this.context || this.ambientNodes.length > 0) return;

    const base = this.context.createOscillator();
    const shimmer = this.context.createOscillator();
    const lfo = this.context.createOscillator();
    const lfoGain = this.context.createGain();
    const filter = this.context.createBiquadFilter();

    base.type = "sine";
    base.frequency.value = 55;
    shimmer.type = "triangle";
    shimmer.frequency.value = 110.4;
    lfo.type = "sine";
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 180;
    filter.type = "lowpass";
    filter.frequency.value = 640;
    filter.Q.value = 4;

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    base.connect(filter);
    shimmer.connect(filter);
    filter.connect(this.ambientGain);

    base.start();
    shimmer.start();
    lfo.start();
    this.ambientNodes.push(base, shimmer, lfo, filter, lfoGain);
  }

  playSynth(name) {
    const map = {
      launch: () => this.whoosh(0.18, 260, 740),
      hit: () => this.noiseBurst(0.045, 900, 0.18),
      break: () => this.noiseBurst(0.16, 2400, 0.34),
      multiplier: () => this.arpeggio([520, 690, 920, 1240], 0.07, 0.28),
      upgrade: () => this.arpeggio([420, 630, 840], 0.06, 0.2),
      coreHit: () => this.thump(0.22, 82),
      victory: () => this.arpeggio([330, 495, 660, 990, 1320], 0.11, 0.44),
      uiClick: () => this.tone(620, 0.035, 0.12, "square"),
      denied: () => this.arpeggio([210, 170], 0.08, 0.18),
    };

    map[name]?.();
  }

  tone(frequency, duration, volume, type = "sine", delay = 0) {
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const start = this.context.currentTime + delay;
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  whoosh(duration, from, to) {
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const start = this.context.currentTime;
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(to, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.22, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(start);
    osc.stop(start + duration + 0.04);
  }

  thump(duration, frequency) {
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const start = this.context.currentTime;
    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, start);
    osc.frequency.exponentialRampToValueAtTime(34, start + duration);
    gain.gain.setValueAtTime(0.36, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(start);
    osc.stop(start + duration + 0.04);
  }

  arpeggio(notes, step, volume) {
    notes.forEach((note, index) => {
      this.tone(note, step * 1.8, volume, "triangle", index * step);
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
    gain.connect(this.masterGain);
    source.start();
  }
}
