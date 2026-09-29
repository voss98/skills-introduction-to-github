/**
 * Chiptune sound effects and a looping soundtrack, generated with WebAudio
 * (square/triangle oscillators, no audio files). The melody is original.
 */
import { loadSettings, saveSettings, type Settings } from './settings';

export type Sfx = 'blip' | 'select' | 'jump' | 'coin' | 'good' | 'bad' | 'door' | 'levelup' | 'error';

type Note = [freq: number, start: number, dur: number, wave?: OscillatorType, vol?: number];

const n = (semi: number) => 440 * 2 ** ((semi - 9) / 12); // semitone offset from C4

const SFX: Record<Sfx, Note[]> = {
  blip: [[n(24), 0, 0.03, 'square', 0.4]],
  select: [[n(19), 0, 0.04, 'square'], [n(24), 0.04, 0.06, 'square']],
  jump: [[n(12), 0, 0.05, 'square', 0.5], [n(19), 0.04, 0.06, 'square', 0.5]],
  coin: [[n(23), 0, 0.06, 'square'], [n(28), 0.06, 0.18, 'square']],
  good: [[n(16), 0, 0.06, 'square'], [n(19), 0.06, 0.06, 'square'], [n(24), 0.12, 0.12, 'square']],
  bad: [[n(7), 0, 0.1, 'square'], [n(3), 0.1, 0.2, 'square']],
  door: [[n(0), 0, 0.08, 'triangle', 0.8], [n(7), 0.08, 0.12, 'triangle', 0.8]],
  levelup: [[n(12), 0, 0.08, 'square'], [n(16), 0.08, 0.08, 'square'], [n(19), 0.16, 0.08, 'square'], [n(24), 0.24, 0.25, 'square']],
  error: [[n(2), 0, 0.12, 'square', 0.5]],
};

// Soundtrack: 8 bars of 8 eighth-notes. Melody (square) over a walking bass (triangle).
// null = rest. Semitones relative to C4.
const MELODY: (number | null)[] = [
  12, null, 16, 19, 21, 19, 16, null, 14, null, 17, 21, 19, null, 17, 14,
  12, null, 16, 19, 24, 23, 21, 19, 17, 16, 14, 12, 14, null, null, null,
  9, null, 12, 16, 17, 16, 12, null, 11, null, 14, 17, 19, 17, 14, 11,
  12, 14, 16, 17, 19, null, 21, 23, 24, null, 19, null, 12, null, null, null,
];
const BASS: number[] = [0, 7, 0, 7, 2, 9, 2, 9, 0, 7, 5, 4, 2, 7, 2, 7, -3, 4, -3, 4, -1, 7, -1, 7, 0, 4, 5, 7, 0, 7, 0, 7];
const STEP = 60 / 132 / 2; // eighth note at 132 bpm

class SoundSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private settings: Settings = loadSettings();
  private musicOn = false;
  private step = 0;
  private nextTime = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  get current(): Settings {
    return this.settings;
  }

  /** Browsers only allow audio after a user gesture: call this from the first key/tap. */
  unlock(): void {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  update(patch: Partial<Settings>): void {
    this.settings = { ...this.settings, ...patch };
    saveSettings(this.settings);
    this.applyVolumes();
  }

  toggleMute(): boolean {
    this.update({ muted: !this.settings.muted });
    return this.settings.muted;
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.master || !this.sfxBus || !this.musicBus) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.settings.muted ? 0 : 0.25, t, 0.02);
    this.sfxBus.gain.setTargetAtTime(this.settings.sfxVolume / 10, t, 0.02);
    this.musicBus.gain.setTargetAtTime((this.settings.musicVolume / 10) * 0.5, t, 0.02);
  }

  private tone(bus: GainNode, freq: number, start: number, dur: number, wave: OscillatorType = 'square', vol = 1): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(0.3 * vol, start + 0.005);
    env.gain.setValueAtTime(0.3 * vol, start + dur * 0.7);
    env.gain.linearRampToValueAtTime(0, start + dur);
    osc.connect(env).connect(bus);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  play(name: Sfx): void {
    if (!this.ctx || !this.sfxBus || this.settings.muted) return;
    const t = this.ctx.currentTime + 0.01;
    for (const [f, s, d, w, v] of SFX[name]) this.tone(this.sfxBus, f, t + s, d, w, v);
  }

  /** Start the looping soundtrack (no-op until audio is unlocked). */
  startMusic(): void {
    if (this.musicOn) return;
    this.musicOn = true;
    this.step = 0;
    this.nextTime = 0;
    // A small look-ahead scheduler keeps timing steady even if frames drop.
    this.timer = setInterval(() => this.schedule(), 50);
  }

  stopMusic(): void {
    this.musicOn = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private schedule(): void {
    if (!this.ctx || !this.musicBus || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (this.nextTime < now) this.nextTime = now + 0.05;
    while (this.nextTime < now + 0.2) {
      const i = this.step % MELODY.length;
      const m = MELODY[i];
      if (m !== null) this.tone(this.musicBus, n(m), this.nextTime, STEP * 0.9, 'square', 0.5);
      if (i % 2 === 0) this.tone(this.musicBus, n(BASS[(i / 2) % BASS.length] - 12), this.nextTime, STEP * 1.8, 'triangle', 0.9);
      this.nextTime += STEP;
      this.step++;
    }
  }
}

export const sound = new SoundSystem();
