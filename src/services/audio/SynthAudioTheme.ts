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
    const sy = getAudioConfig().synth;
    const preset = MUSIC_PRESETS[this.musicPreset] ?? MUSIC_PRESETS.default!;
    const base = mk(cfg.layers.base);
    const rhythm = mk(0);
    const tension = mk(0);
    const danger = mk(0);
    this.layerGains = { base, rhythm, tension, danger };
    this.layerCurrent = { base: cfg.layers.base, rhythm: 0, tension: 0, danger: 0 };

    // Base: acorde-pad grave (do preset) por um lowpass para calor, com as vozes
    // destoadas em leque (`padDetuneCents`) + LFO de "respiração" (P10-08: pad
    // mais largo/quente, menos "bip cru").
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 520;
    padFilter.connect(base);
    const voices = preset.baseHz.length;
    preset.baseHz.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.detune.value = (i - (voices - 1) / 2) * sy.padDetuneCents;
      osc.connect(padFilter);
      osc.start();
      this.musicNodes.push(osc);
    });
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain).connect(base.gain);
    lfo.start();
    this.musicNodes.push(lfo);

    // Rítmica: osc pulsado por um LFO quadrado (entra com o nível), por um
    // lowpass (`rhythmCutoffHz`) que tira a aspereza do osc cru — menos "Atari",
    // mais corpo (P10-08). O preset varia timbre/andamento (cosmético `music`).
    const rOsc = ctx.createOscillator();
    rOsc.type = preset.rhythmType;
    rOsc.frequency.value = preset.rhythmHz;
    const rFilter = ctx.createBiquadFilter();
    rFilter.type = 'lowpass';
    rFilter.frequency.value = sy.rhythmCutoffHz;
    const rPulse = ctx.createGain();
    rPulse.gain.value = 0.5;
    rOsc.connect(rFilter).connect(rPulse).connect(rhythm);
    const rLfo = ctx.createOscillator();
    rLfo.type = 'square';
    rLfo.frequency.value = preset.pulseHz;
    const rLfoGain = ctx.createGain();
    rLfoGain.gain.value = 0.5;
    rLfo.connect(rLfoGain).connect(rPulse.gain);
    rOsc.start();
    rLfo.start();
    this.musicNodes.push(rOsc, rLfo);

    // Tensão: intervalo dissonante (trítono) com leve VIBRATO (LFO no detune) —
    // dá movimento/ameaça à camada de chefe sem subir de volume (P10-08).
    const tVibrato = ctx.createOscillator();
    tVibrato.frequency.value = 5.2;
    const tVibratoGain = ctx.createGain();
    tVibratoGain.gain.value = 5; // cents de oscilação
    tVibrato.connect(tVibratoGain);
    for (const f of [138.59, 196.0]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      tVibratoGain.connect(osc.detune);
      osc.connect(tension);
      osc.start();
      this.musicNodes.push(osc);
    }
    tVibrato.start();
    this.musicNodes.push(tVibrato);

    // Perigo: oitava brilhante (vida baixa) + quinta destoada para shimmer —
    // mais "alarme" sem dissonância dura (P10-08).
    for (const [f, det] of [
      [220, 0],
      [330, 6],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.detune.value = det;
      osc.connect(danger);
      osc.start();
      this.musicNodes.push(osc);
    }
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
    const sy = getAudioConfig().synth;
    switch (cue) {
      case 'graze':
        this.blip(backend, 1400 * pf, 0.05, 'triangle', 0.25 * gf);
        break;
      case 'kill':
        // Explosão (P10-08): transiente brilhante (punch) + corpo grave caindo
        // (boom) + cauda de ruído com lowpass descendente (debris). Estilizado,
        // não realista — mantém a estética "arcade".
        this.blip(backend, 440 * pf, 0.06, 'square', 0.22 * gf, -200);
        this.thump(backend, sy.killSubHz * pf, sy.killSubHz * 0.5, 0.22, 0.34 * gf);
        this.noiseBurst(backend, 0.26, 0.22 * gf, sy.impactNoiseHz, sy.impactNoiseHz * 0.22);
        break;
      case 'hit':
        // Dano (P10-08): thump grave (peso) + corpo serrilhado + cauda de ruído
        // filtrada caindo. Mais encorpado que o sawtooth+ruído de antes.
        this.thump(backend, sy.hitSubHz * pf, sy.hitSubHz * 0.6, 0.3, 0.45 * gf);
        this.blip(backend, 150 * pf, 0.26, 'sawtooth', 0.4 * gf, -70);
        this.noiseBurst(backend, 0.2, 0.28 * gf, 760, 220);
        break;
      case 'pulse':
        // Pulso refletor (P10-08): varredura principal + harmônico "shimmer"
        // destoado por cima + ruído filtrado descendente — mais energia/largura.
        this.sweep(backend, 900 * pf, 180, 0.4, 0.42 * gf);
        this.sweep(backend, 1350 * pf, 240, 0.34, 0.18 * gf);
        this.noiseBurst(backend, 0.2, 0.12 * gf, sy.pulseShimmerHz, sy.pulseShimmerHz * 0.4);
        break;
      case 'gameover':
        this.sweep(backend, 440, 70, 0.9, 0.5 * gf);
        this.thump(backend, 120, 46, 0.7, 0.3 * gf);
        this.noiseBurst(backend, 0.4, 0.2 * gf, 400, 120);
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
        // Chegada do chefe (P10-08): varredura ascendente + thump grave de peso.
        this.sweep(backend, 160, 320, 0.5, 0.45 * gf);
        this.thump(backend, 90, 58, 0.5, 0.28 * gf);
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

  /**
   * Corpo grave com queda de pitch (P10-08): o "boom"/peso dos impactos. Sine
   * caindo de `from` a `to` com envelope curto — soma graves que os blips/sweeps
   * sozinhos não têm, sem virar realista. Ramps suaves evitam cliques.
   */
  private thump(
    backend: AudioBackend,
    from: number,
    to: number,
    dur: number,
    gain: number,
  ): void {
    const { ctx, master } = backend;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.006);
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
   *
   * P10-08: o lowpass pode VARRER de `filterHz` a `endHz` ao longo do som (cauda
   * "abafando" — sensação de debris/explosão); ausente ⇒ filtro fixo. Pequeno
   * ataque (5 ms) evita o clique de começar no ganho cheio. Leve ressonância (Q)
   * dá corpo sem soar realista.
   */
  private noiseBurst(
    backend: AudioBackend,
    dur: number,
    gain: number,
    filterHz: number,
    endHz = filterHz,
  ): void {
    const { ctx, master, noiseBuffer } = backend;
    if (!noiseBuffer) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(filterHz, t);
    if (endHz !== filterHz) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(60, endHz), t + dur);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
}
