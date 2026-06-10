// audio.js — Audio de terror 100 % procedural con WebAudio (sin archivos).
export class HorrorAudio {
  constructor() {
    this.ctx = null;
    this.threat = 0;        // 0..1 cercanía del enemigo
    this.hbTimer = 0;
    this.whisperTimer = 12;
    this.stepFlip = false;
  }

  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(ctx.destination);

    // Búfer de ruido blanco reutilizable
    const len = ctx.sampleRate * 2;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    // ---- Drone grave permanente ----
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.05;
    droneGain.connect(this.master);
    for (const f of [48, 48.7, 96.3]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      o.connect(droneGain);
      o.start();
    }
    // LFO que hace respirar el drone
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.025;
    lfo.connect(lfoGain).connect(droneGain.gain);
    lfo.start();

    // ---- Viento / aire en los conductos ----
    const wind = ctx.createBufferSource();
    wind.buffer = this.noiseBuf;
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 320;
    windFilter.Q.value = 1.6;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.025;
    wind.connect(windFilter).connect(windGain).connect(this.master);
    wind.start();
    const windLfo = ctx.createOscillator();
    windLfo.frequency.value = 0.11;
    const windLfoG = ctx.createGain();
    windLfoG.gain.value = 0.015;
    windLfo.connect(windLfoG).connect(windGain.gain);
    windLfo.start();

    // Ganancia de tensión (sube con la amenaza): zumbido agudo disonante
    this.tensionGain = ctx.createGain();
    this.tensionGain.gain.value = 0;
    this.tensionGain.connect(this.master);
    for (const f of [620, 633]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(this.tensionGain);
      o.start();
    }
  }

  // Ráfaga de ruido filtrado — base de pasos y golpes
  _noiseBurst({ freq = 400, q = 1, gain = 0.2, dur = 0.12, type = 'lowpass', pan = 0 }) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    src.connect(filter).connect(g).connect(p).connect(this.master);
    src.start();
    src.stop(ctx.currentTime + dur + 0.05);
  }

  footstep(running) {
    if (!this.ctx) return;
    this.stepFlip = !this.stepFlip;
    this._noiseBurst({
      freq: 280 + (this.stepFlip ? 60 : 0) + Math.random() * 60,
      gain: running ? 0.3 : 0.16,
      dur: 0.1
    });
  }

  _thump(t, vol) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(58, t);
    o.frequency.exponentialRampToValueAtTime(34, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.3);
  }

  pickup(isFuse) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    for (const [f, dt] of isFuse ? [[520, 0], [780, 0.09]] : [[392, 0], [524, 0.08]]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.12, t + dt);
      g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.4);
      o.connect(g).connect(this.master);
      o.start(t + dt);
      o.stop(t + dt + 0.5);
    }
  }

  doorCreak() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(95, t);
    o.frequency.linearRampToValueAtTime(60, t + 1.4);
    const vib = ctx.createOscillator();
    vib.frequency.value = 7;
    const vibG = ctx.createGain();
    vibG.gain.value = 9;
    vib.connect(vibG).connect(o.frequency);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
    o.connect(f).connect(g).connect(this.master);
    o.start(t); vib.start(t);
    o.stop(t + 1.7); vib.stop(t + 1.7);
  }

  jumpscare() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    // Racimo disonante de sierras
    for (const f of [180, 187, 261, 415, 622]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, t);
      o.frequency.linearRampToValueAtTime(f * 0.7, t + 1.4);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
      o.connect(g).connect(this.master);
      o.start(t);
      o.stop(t + 1.6);
    }
    // "Grito": barrido de ruido por paso de banda
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 6;
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(2400, t + 0.35);
    f.frequency.exponentialRampToValueAtTime(600, t + 1.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 1.5);
  }

  whisper() {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    src.playbackRate.value = 0.5;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 9;
    // Barridos que imitan formantes de un susurro
    f.frequency.setValueAtTime(900, t);
    f.frequency.linearRampToValueAtTime(420, t + 0.5);
    f.frequency.linearRampToValueAtTime(760, t + 1.0);
    f.frequency.linearRampToValueAtTime(300, t + 1.7);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    const p = ctx.createStereoPanner();
    p.pan.value = Math.random() * 2 - 1;
    src.connect(f).connect(g).connect(p).connect(this.master);
    src.start(t);
    src.stop(t + 2);
  }

  update(dt, threat) {
    if (!this.ctx) return;
    this.threat = threat;

    // Zumbido de tensión proporcional a la amenaza
    const target = threat > 0.35 ? (threat - 0.35) * 0.05 : 0;
    this.tensionGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.4);

    // Latidos: más rápidos y fuertes cuanto más cerca está
    if (threat > 0.15) {
      this.hbTimer -= dt;
      if (this.hbTimer <= 0) {
        const period = 1.25 - threat * 0.75; // 1.25 s → 0.5 s
        this.hbTimer = period;
        const vol = 0.1 + threat * 0.3;
        const t = this.ctx.currentTime;
        this._thump(t, vol);
        this._thump(t + period * 0.3, vol * 0.7);
      }
    }

    // Susurros aleatorios cuando hay calma (para que nunca te relajes)
    this.whisperTimer -= dt;
    if (this.whisperTimer <= 0) {
      this.whisperTimer = 18 + Math.random() * 25;
      if (threat < 0.6) this.whisper();
    }
  }
}
