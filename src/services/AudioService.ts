import type { AudioCue } from '../systems/AudioCues';

/**
 * AudioService — síntese procedural de SFX + trilha simples via Web Audio
 * (Fase 2). Sem assets: cada som é um envelope de osciladores, o que combina
 * com a estética neon e evita pipeline de áudio (docs/01 §4.3).
 *
 * Backend de APRESENTAÇÃO: nunca é tocado pela simulação. É resiliente a
 * ambientes sem Web Audio (no-op) e só inicia após um gesto do usuário
 * (políticas de autoplay). Singleton via getAudio().
 */
const MUTE_KEY = 'hairline.muted';

type CtxLike = AudioContext;

class AudioService {
  private ctx: CtxLike | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicNodes: OscillatorNode[] = [];
  private muted = false;
  private started = false;
  /** Último tempo (s) em que cada cue tocou — para throttle (ex.: graze). */
  private lastPlayed: Partial<Record<AudioCue, number>> = {};

  constructor() {
    try {
      this.muted = globalThis.localStorage?.getItem(MUTE_KEY) === '1';
    } catch {
      this.muted = false;
    }
  }

  /** Inicia o contexto (chamar a partir de um gesto do usuário). Idempotente. */
  start(): void {
    if (this.started) return;
    const Ctor =
      typeof window !== 'undefined'
        ? (window.AudioContext ??
          (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
        : undefined;
    if (!Ctor) return; // ambiente sem Web Audio → no-op
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.12;
    this.musicGain.connect(this.master);
    // Pode iniciar suspenso; retomar dentro do gesto do usuário.
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    this.started = true;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setMuted(value: boolean): void {
    this.muted = value;
    if (this.master && this.ctx) {
      this.master.gain.setValueAtTime(value ? 0 : 0.9, this.ctx.currentTime);
    }
    try {
      globalThis.localStorage?.setItem(MUTE_KEY, value ? '1' : '0');
    } catch {
      /* ignora indisponibilidade de storage */
    }
  }

  /** Inicia uma trilha-pad procedural suave em loop. Idempotente. */
  startMusic(): void {
    if (!this.started || !this.ctx || !this.musicGain || this.musicNodes.length > 0) return;
    const ctx = this.ctx;
    // Acorde-pad grave (A1/E2/A2) com leve detune — textura ambiente.
    for (const f of [55, 82.5, 110]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.detune.value = (f % 7) - 3;
      osc.connect(this.musicGain);
      osc.start();
      this.musicNodes.push(osc);
    }
    // LFO lento que faz o pad "respirar".
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain).connect(this.musicGain.gain);
    lfo.start();
    this.musicNodes.push(lfo);
  }

  /** Para a trilha. */
  stopMusic(): void {
    for (const n of this.musicNodes) {
      try {
        n.stop();
      } catch {
        /* já parado */
      }
    }
    this.musicNodes = [];
  }

  /** Toca um cue de jogo. Sem efeito se mudo/sem contexto. */
  play(cue: AudioCue): void {
    if (!this.started || this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    // Throttle de sons muito frequentes (graze).
    const minGap = cue === 'graze' ? 0.06 : 0.0;
    if (minGap > 0 && now - (this.lastPlayed[cue] ?? -1) < minGap) return;
    this.lastPlayed[cue] = now;

    switch (cue) {
      case 'graze':
        this.blip(1400, 0.05, 'triangle', 0.25);
        break;
      case 'kill':
        this.blip(320, 0.12, 'square', 0.3, 120);
        break;
      case 'hit':
        this.blip(140, 0.28, 'sawtooth', 0.5, -60);
        break;
      case 'pulse':
        this.sweep(900, 180, 0.4, 0.45);
        break;
      case 'gameover':
        this.sweep(440, 70, 0.9, 0.5);
        break;
      case 'victory':
        this.arp([523, 659, 784, 1046], 0.12, 0.4);
        break;
      case 'bossshield':
        // Quebra de escudo: varredura metálica descendente.
        this.sweep(1200, 220, 0.3, 0.4);
        break;
      case 'bossteleport':
        // Aviso de teleporte: bipe agudo ascendente.
        this.blip(620, 0.14, 'sine', 0.3, 320);
        break;
      case 'bossentry':
        // Entrada do chefe de estágio: sting grave/decidido (anuncia o perigo).
        this.sweep(160, 320, 0.5, 0.45);
        break;
    }
  }

  // ---- Síntese -----------------------------------------------------------

  /** Bipe simples com envelope; `glide` desloca a frequência ao longo do som. */
  private blip(freq: number, dur: number, type: OscillatorType, gain: number, glide = 0): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glide) osc.frequency.linearRampToValueAtTime(Math.max(40, freq + glide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /** Varredura de frequência (whoosh) de `from` a `to`. */
  private sweep(from: number, to: number, dur: number, gain: number): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /** Arpejo curto (jingle de vitória). */
  private arp(freqs: number[], step: number, gain: number): void {
    freqs.forEach((f, i) => {
      const ctx = this.ctx!;
      const t = ctx.currentTime + i * step;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + step * 1.2);
      osc.connect(g).connect(this.master!);
      osc.start(t);
      osc.stop(t + step * 1.3);
    });
  }
}

let instance: AudioService | null = null;

/** Singleton do serviço de áudio (persiste entre cenas). */
export function getAudio(): AudioService {
  if (!instance) instance = new AudioService();
  return instance;
}
