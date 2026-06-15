import type { AudioCue } from '../../systems/AudioCues';
import type { LayerGains } from '../MusicDirector';
import { getAudioConfig } from '../../content';
import type { AudioBackend, AudioTheme } from './AudioTheme';

/**
 * SynthAudioTheme — síntese procedural via Web Audio (P10-03). É o áudio
 * **histórico** do jogo (Fase 2 + Fase 5) apenas realocado atrás da interface
 * `AudioTheme`, **sem alteração audível**: cada som é um envelope de
 * osciladores + ruído (combina com a estética neon, sem pipeline de áudio —
 * TD-09) e a trilha são quatro camadas (base/rítmica/tensão/perigo).
 *
 * Estado próprio do tema: o preset de trilha e os nodes da trilha em andamento
 * (osciladores, ganhos por camada). O transversal (contexto, master, mute,
 * ducking, `SfxPolicy`, ruído pré-gerado) vem da fachada via `AudioBackend`.
 */

/**
 * Presets de trilha (cosméticos `music` — P6-01-02). Variação só de síntese:
 * frequência da base, oscilador/andamento da rítmica. NÃO afeta jogabilidade.
 * `default` reproduz a trilha histórica; novos presets entram aqui (o catálogo
 * em `cosmetics.json` referencia pela chave). Outros temas de áudio (samples,
 * P10-12) definirão os seus próprios presets — preset é por-tema.
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

export class SynthAudioTheme implements AudioTheme {
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
  /** Preset de trilha corrente (cosmético `music` — P6-01-02). */
  private musicPreset = 'default';

  setMusicPreset(preset: string): void {
    this.musicPreset = preset in MUSIC_PRESETS ? preset : 'default';
  }

  // ---- Trilha em camadas (P5-04-01) --------------------------------------

  /** Inicia a trilha procedural em camadas (todas em 0 exceto base). Idempotente. */
  startMusic(backend: AudioBackend): void {
    if (this.musicNodes.length > 0) return;
    const { ctx, musicGain } = backend;
    const mk = (initial: number): GainNode => {
      const g = ctx.createGain();
      g.gain.value = initial;
      g.connect(musicGain);
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
  setLayerTargets(backend: AudioBackend, targets: LayerGains): void {
    const { ctx } = backend;
    const cfg = getAudioConfig().music.rampMs;
    const now = ctx.currentTime;
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

  /**
   * Toca um cue de jogo. A fachada já garantiu contexto + não-mudo e consultou
   * a `SfxPolicy`; `pf`/`gf` são os fatores de pitch/ganho do disparo.
   */
  playCue(cue: AudioCue, backend: AudioBackend, pf: number, gf: number): void {
    switch (cue) {
      case 'graze':
        this.blip(backend, 1400 * pf, 0.05, 'triangle', 0.25 * gf);
        break;
      case 'kill':
        this.blip(backend, 320 * pf, 0.12, 'square', 0.3 * gf, 120);
        this.noiseBurst(backend, 0.08, 0.18 * gf, 1800);
        break;
      case 'hit':
        this.blip(backend, 140 * pf, 0.28, 'sawtooth', 0.5 * gf, -60);
        this.noiseBurst(backend, 0.16, 0.3 * gf, 600);
        break;
      case 'pulse':
        this.sweep(backend, 900 * pf, 180, 0.4, 0.45 * gf);
        this.noiseBurst(backend, 0.18, 0.12 * gf, 2600);
        break;
      case 'gameover':
        this.sweep(backend, 440, 70, 0.9, 0.5 * gf);
        this.noiseBurst(backend, 0.4, 0.2 * gf, 400);
        break;
      case 'victory':
        this.arp(backend, [523, 659, 784, 1046], 0.12, 0.4 * gf);
        break;
      case 'bossshield':
        this.sweep(backend, 1200 * pf, 220, 0.3, 0.4 * gf);
        this.noiseBurst(backend, 0.1, 0.16 * gf, 3200);
        break;
      case 'bossteleport':
        this.blip(backend, 620 * pf, 0.14, 'sine', 0.3 * gf, 320);
        break;
      case 'bossentry':
        this.sweep(backend, 160, 320, 0.5, 0.45 * gf);
        break;
      case 'focusready':
        // Prontidão do pulso (P5-02-03): bipe duplo ascendente, convidativo.
        this.blip(backend, 660 * pf, 0.1, 'triangle', 0.32 * gf, 220);
        break;
      case 'achievement':
        // Desbloqueio (P6-02-02): arpejo curto e brilhante, distinto da vitória.
        this.arp(backend, [784, 988, 1318], 0.1, 0.34 * gf);
        break;
    }
  }

  // ---- Síntese -----------------------------------------------------------

  /** Bipe simples com envelope; `glide` desloca a frequência ao longo do som. */
  private blip(
    backend: AudioBackend,
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    glide = 0,
  ): void {
    const { ctx, master } = backend;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glide) osc.frequency.linearRampToValueAtTime(Math.max(40, freq + glide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /** Varredura de frequência (whoosh) de `from` a `to`. */
  private sweep(backend: AudioBackend, from: number, to: number, dur: number, gain: number): void {
    const { ctx, master } = backend;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /** Arpejo curto (jingle de vitória). */
  private arp(backend: AudioBackend, freqs: number[], step: number, gain: number): void {
    const { ctx, master } = backend;
    freqs.forEach((f, i) => {
      const t = ctx.currentTime + i * step;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + step * 1.2);
      osc.connect(g).connect(master);
      osc.start(t);
      osc.stop(t + step * 1.3);
    });
  }

  /**
   * Camada de ruído filtrado (impacto/explosão) a partir do buffer pré-gerado
   * pela fachada. Um `AudioBufferSourceNode` novo por disparo (descartável;
   * nunca reusar um source já tocado — iOS/Safari re-trigger).
   */
  private noiseBurst(backend: AudioBackend, dur: number, gain: number, filterHz: number): void {
    const { ctx, master, noiseBuffer } = backend;
    if (!noiseBuffer) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterHz;
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.0002, gain), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
}
