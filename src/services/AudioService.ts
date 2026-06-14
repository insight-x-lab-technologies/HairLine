import type { AudioCue } from '../systems/AudioCues';
import { Rng } from './Rng';
import { SfxPolicy } from './SfxPolicy';
import { getAudioConfig } from '../content';
import type { LayerGains } from './MusicDirector';

/**
 * AudioService — síntese procedural de SFX + trilha via Web Audio (Fase 2,
 * evoluído na Fase 5). Sem assets: cada som é um envelope de osciladores +
 * ruído, o que combina com a estética neon e evita pipeline de áudio
 * (docs/01 §4.3, TD-09).
 *
 * Fase 5:
 *  - Trilha em CAMADAS (P5-04-01): base-pad + rítmica + tensão + perigo, cada
 *    uma com seu `GainNode`; a `GameScene` aplica ganhos-alvo via
 *    `setLayerTargets` (ramps suaves). A decisão é do `MusicDirector` (puro).
 *  - SFX em camadas (P5-04-02): ruído pré-gerado uma vez, variação sutil de
 *    pitch/ganho por disparo (Rng decorativo), polifonia/prioridade via
 *    `SfxPolicy` (puro) e ducking da trilha em eventos grandes.
 *
 * Backend de APRESENTAÇÃO: nunca é tocado pela simulação. Resiliente a
 * ambientes sem Web Audio (no-op) e só inicia após um gesto do usuário.
 * Singleton via getAudio().
 */
const MUTE_KEY = 'hairline.muted';

type CtxLike = AudioContext;

/**
 * Presets de trilha (cosméticos `music` — P6-01-02). Variação só de síntese:
 * frequência da base, oscilador/andamento da rítmica. NÃO afeta jogabilidade.
 * `default` reproduz a trilha histórica; novos presets entram aqui (o catálogo
 * em `cosmetics.json` referencia pela chave).
 */
interface MusicPreset {
  readonly baseHz: readonly number[];
  readonly rhythmType: OscillatorType;
  readonly rhythmHz: number;
  readonly pulseHz: number;
}
const MUSIC_PRESETS: Readonly<Record<string, MusicPreset>> = {
  default: { baseHz: [55, 82.5, 110], rhythmType: 'sawtooth', rhythmHz: 110, pulseHz: 2.4 },
  pulse: { baseHz: [55, 73.42, 110], rhythmType: 'square', rhythmHz: 146.83, pulseHz: 3.6 },
};

class AudioService {
  private ctx: CtxLike | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  /** Ganho-base da trilha (alvo do ducking quando recupera). */
  private musicBaseGain = 0.12;
  private musicNodes: AudioScheduledSourceNode[] = [];
  /** Buses de cada camada musical (P5-04-01). */
  private layerGains: Partial<Record<keyof LayerGains, GainNode>> = {};
  /** Alvos correntes por camada — escolhe ramp de entrada/saída. */
  private layerCurrent: { base: number; rhythm: number; tension: number; danger: number } = {
    base: 0,
    rhythm: 0,
    tension: 0,
    danger: 0,
  };
  /** Buffer de ruído branco pré-gerado uma vez (P5-04-02). */
  private noiseBuffer: AudioBuffer | null = null;
  private policy: SfxPolicy | null = null;
  private muted = false;
  private started = false;
  /** Preset de trilha corrente (cosmético `music` — P6-01-02). */
  private musicPreset = 'default';

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
    this.musicGain.gain.value = this.musicBaseGain;
    this.musicGain.connect(this.master);
    this.buildNoiseBuffer();
    this.policy = new SfxPolicy(getAudioConfig().sfx);
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

  // ---- Trilha em camadas (P5-04-01) --------------------------------------

  /**
   * Define o preset de trilha (cosmético `music` — P6-01-02). Chame ANTES de
   * `startMusic`; preset desconhecido cai em `default`. Não rebuilda trilha já
   * tocando (a `GameScene` define antes de iniciar; o preview para e reinicia).
   */
  setMusicPreset(preset: string): void {
    this.musicPreset = preset in MUSIC_PRESETS ? preset : 'default';
  }

  /**
   * Toca uma amostra audível do preset (Hangar — P6-01-02): para qualquer
   * trilha corrente, reinicia com o preset e sobe base+rítmica. O chamador é
   * responsável por `stopMusic()` ao sair da cena (disciplina dos listeners).
   */
  previewMusic(preset: string): void {
    this.start();
    if (!this.started) return;
    this.stopMusic();
    this.setMusicPreset(preset);
    this.startMusic();
    const layers = getAudioConfig().music.layers;
    this.setLayerTargets({ base: layers.base, rhythm: layers.rhythm, tension: 0, danger: 0 });
  }

  /** Inicia a trilha procedural em camadas (todas em 0 exceto base). Idempotente. */
  startMusic(): void {
    if (!this.started || !this.ctx || !this.musicGain || this.musicNodes.length > 0) return;
    const ctx = this.ctx;
    const mk = (initial: number): GainNode => {
      const g = ctx.createGain();
      g.gain.value = initial;
      g.connect(this.musicGain!);
      return g;
    };
    const cfg = getAudioConfig().music;
    const preset = MUSIC_PRESETS[this.musicPreset] ?? MUSIC_PRESETS.default!;
    const base = mk(cfg.layers.base);
    const rhythm = mk(0);
    const tension = mk(0);
    const danger = mk(0);
    this.layerGains = { base, rhythm, tension, danger };
    this.layerCurrent = { base: cfg.layers.base, rhythm: 0, tension: 0, danger: 0 };

    // Base: acorde-pad grave (do preset) com leve detune + LFO de "respiração".
    for (const f of preset.baseHz) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.detune.value = (f % 7) - 3;
      osc.connect(base);
      osc.start();
      this.musicNodes.push(osc);
    }
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain).connect(base.gain);
    lfo.start();
    this.musicNodes.push(lfo);

    // Rítmica: osc pulsado por um LFO quadrado (entra com o nível). O preset
    // varia timbre/andamento (cosmético `music` — P6-01-02).
    const rOsc = ctx.createOscillator();
    rOsc.type = preset.rhythmType;
    rOsc.frequency.value = preset.rhythmHz;
    const rPulse = ctx.createGain();
    rPulse.gain.value = 0.5;
    rOsc.connect(rPulse).connect(rhythm);
    const rLfo = ctx.createOscillator();
    rLfo.type = 'square';
    rLfo.frequency.value = preset.pulseHz;
    const rLfoGain = ctx.createGain();
    rLfoGain.gain.value = 0.5;
    rLfo.connect(rLfoGain).connect(rPulse.gain);
    rOsc.start();
    rLfo.start();
    this.musicNodes.push(rOsc, rLfo);

    // Tensão: intervalo dissonante (trítono) com leve tremolo — para chefe.
    for (const f of [138.59, 196.0]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      osc.connect(tension);
      osc.start();
      this.musicNodes.push(osc);
    }

    // Perigo: oitava brilhante (vida baixa) — sine agudo.
    const dOsc = ctx.createOscillator();
    dOsc.type = 'sine';
    dOsc.frequency.value = 220;
    dOsc.connect(danger);
    dOsc.start();
    this.musicNodes.push(dOsc);
  }

  /**
   * Aplica os ganhos-alvo por camada com ramps suaves (P5-04-01). Sobe rápido
   * (`rampMs.in`), desce devagar (`rampMs.out`) para evitar liga-desliga no
   * limiar. Sem cliques: sempre `linearRampToValueAtTime`.
   */
  setLayerTargets(targets: LayerGains): void {
    if (!this.started || !this.ctx) return;
    const cfg = getAudioConfig().music.rampMs;
    const now = this.ctx.currentTime;
    (Object.keys(targets) as (keyof LayerGains)[]).forEach((k) => {
      const g = this.layerGains[k];
      if (!g) return;
      const target = targets[k];
      const rising = target > this.layerCurrent[k];
      const ms = rising ? cfg.in : cfg.out;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(target, now + ms / 1000);
      this.layerCurrent[k] = target;
    });
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
    this.layerGains = {};
    this.layerCurrent = { base: 0, rhythm: 0, tension: 0, danger: 0 };
  }

  // ---- SFX (P5-04-02) ----------------------------------------------------

  /** Toca um cue de jogo. Sem efeito se mudo/sem contexto ou se a política negar. */
  play(cue: AudioCue): void {
    if (!this.started || this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const policy = this.policy;
    if (policy && !policy.request(cue, now * 1000)) return;
    const pf = policy ? policy.pitchFactor() : 1;
    const gf = policy ? policy.gainFactor() : 1;

    switch (cue) {
      case 'graze':
        this.blip(1400 * pf, 0.05, 'triangle', 0.25 * gf);
        break;
      case 'kill':
        this.blip(320 * pf, 0.12, 'square', 0.3 * gf, 120);
        this.noiseBurst(0.08, 0.18 * gf, 1800);
        break;
      case 'hit':
        this.blip(140 * pf, 0.28, 'sawtooth', 0.5 * gf, -60);
        this.noiseBurst(0.16, 0.3 * gf, 600);
        break;
      case 'pulse':
        this.sweep(900 * pf, 180, 0.4, 0.45 * gf);
        this.noiseBurst(0.18, 0.12 * gf, 2600);
        break;
      case 'gameover':
        this.sweep(440, 70, 0.9, 0.5 * gf);
        this.noiseBurst(0.4, 0.2 * gf, 400);
        break;
      case 'victory':
        this.arp([523, 659, 784, 1046], 0.12, 0.4 * gf);
        break;
      case 'bossshield':
        this.sweep(1200 * pf, 220, 0.3, 0.4 * gf);
        this.noiseBurst(0.1, 0.16 * gf, 3200);
        break;
      case 'bossteleport':
        this.blip(620 * pf, 0.14, 'sine', 0.3 * gf, 320);
        break;
      case 'bossentry':
        this.sweep(160, 320, 0.5, 0.45 * gf);
        break;
      case 'focusready':
        // Prontidão do pulso (P5-02-03): bipe duplo ascendente, convidativo.
        this.blip(660 * pf, 0.1, 'triangle', 0.32 * gf, 220);
        break;
      case 'achievement':
        // Desbloqueio (P6-02-02): arpejo curto e brilhante, distinto da vitória.
        this.arp([784, 988, 1318], 0.1, 0.34 * gf);
        break;
    }

    if (policy?.shouldDuck(cue)) this.duckMusic();
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
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.005);
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
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.02);
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
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + step * 1.2);
      osc.connect(g).connect(this.master!);
      osc.start(t);
      osc.stop(t + step * 1.3);
    });
  }

  /**
   * Camada de ruído filtrado (impacto/explosão) a partir do buffer pré-gerado.
   * Um `AudioBufferSourceNode` novo por disparo (descartável; nunca reusar um
   * source já tocado — iOS/Safari re-trigger).
   */
  private noiseBurst(dur: number, gain: number, filterHz: number): void {
    const ctx = this.ctx!;
    if (!this.noiseBuffer) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterHz;
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.0002, gain), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(this.master!);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  /** Abaixa a trilha por ~`durationMs` e recupera (P5-04-02). */
  private duckMusic(): void {
    const ctx = this.ctx;
    const mg = this.musicGain;
    if (!ctx || !mg) return;
    const { amount, durationMs } = getAudioConfig().sfx.duck;
    const t = ctx.currentTime;
    const reduced = this.musicBaseGain * (1 - amount);
    mg.gain.cancelScheduledValues(t);
    mg.gain.setValueAtTime(mg.gain.value, t);
    mg.gain.linearRampToValueAtTime(reduced, t + 0.02);
    mg.gain.linearRampToValueAtTime(this.musicBaseGain, t + durationMs / 1000);
  }

  /** Gera ~1s de ruído branco uma vez (Rng local decorativo, sem Math.random). */
  private buildNoiseBuffer(): void {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * 1);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    const rng = new Rng(0xc0ffee);
    for (let i = 0; i < len; i++) data[i] = rng.next() * 2 - 1;
    this.noiseBuffer = buf;
  }
}

let instance: AudioService | null = null;

/** Singleton do serviço de áudio (persiste entre cenas). */
export function getAudio(): AudioService {
  if (!instance) instance = new AudioService();
  return instance;
}
