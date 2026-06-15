import type { AudioCue } from '../systems/AudioCues';
import { Rng } from './Rng';
import { SfxPolicy } from './SfxPolicy';
import { getAudioConfig } from '../content';
import type { LayerGains } from './MusicDirector';
import type { AudioBackend, AudioTheme } from './audio/AudioTheme';
import { createAudioTheme, DEFAULT_AUDIO_THEME_ID } from './audio/createAudioTheme';

/**
 * AudioService — FACHADA estável de áudio (P10-03). Concentra o que é
 * **transversal** a qualquer tema e nunca se duplica por tema: contexto Web
 * Audio, master gain, **mute** (persistido), **ducking** da trilha, `SfxPolicy`
 * (polifonia/prioridade), buffer de ruído pré-gerado e a política de
 * autoplay/gesto. Delega a **síntese/apresentação** ao `AudioTheme` ativo —
 * como cada cue soa e como a trilha em camadas é construída/dirigida.
 *
 * A interface de consumo (`play`, `startMusic`, `setLayerTargets`,
 * `setMusicPreset`, `previewMusic`, `toggleMute`, `isMuted`) é estável: a
 * `GameScene`/cenas não sabem que existe um tema por trás (TD-29).
 *
 * Backend de APRESENTAÇÃO: nunca é tocado pela simulação (determinismo
 * intacto). Resiliente a ambientes sem Web Audio (no-op) e só inicia após um
 * gesto do usuário. Singleton via getAudio().
 *
 * O tema ativo é resolvido do registro (`config/themes`) via `useAudioTheme`
 * (P10-04): hoje só o `synth` (= áudio histórico, sem mudança audível); o tema
 * por samples é P10-12. Ver TD-09 (síntese) e TD-29 (abstração de tema).
 */
const MUTE_KEY = 'hairline.muted';

type CtxLike = AudioContext;

export class AudioService {
  private ctx: CtxLike | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  /** Ganho-base da trilha (alvo do ducking quando recupera). */
  private musicBaseGain = 0.12;
  /** Buffer de ruído branco pré-gerado uma vez (P5-04-02); provido ao tema. */
  private noiseBuffer: AudioBuffer | null = null;
  private policy: SfxPolicy | null = null;
  private muted = false;
  private started = false;
  /** Tema de áudio ativo (síntese/trilha/preset). `useAudioTheme` o troca. */
  private theme: AudioTheme;
  /** Id do tema de áudio ativo (P10-04): troca só ocorre quando muda de fato. */
  private activeAudioThemeId = DEFAULT_AUDIO_THEME_ID;

  constructor(theme: AudioTheme = createAudioTheme(DEFAULT_AUDIO_THEME_ID)) {
    this.theme = theme;
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

  // ---- Tema de áudio ativo (P10-04) --------------------------------------

  /**
   * Ativa o tema de áudio do tema de apresentação escolhido (resolve o
   * `audioThemeId` do registro). No-op quando já é o tema ativo — preserva a
   * trilha do menu sem reconstruir. Ao trocar de fato, **para a trilha** e
   * substitui o backend de síntese com disciplina (o chamador reaplica preset/
   * `startMusic`). Presentation-only: nada disto toca a simulação.
   */
  useAudioTheme(audioThemeId: string): void {
    if (audioThemeId === this.activeAudioThemeId) return;
    this.stopMusic();
    this.theme = createAudioTheme(audioThemeId);
    this.activeAudioThemeId = audioThemeId;
  }

  // ---- Trilha (delegada ao tema ativo) -----------------------------------

  /**
   * Define o preset de trilha (cosmético `music` — P6-01-02). Chame ANTES de
   * `startMusic`; preset desconhecido cai em `default`. Preset é por-tema (o
   * synth tem os históricos; o de samples definirá os seus em P10-12).
   */
  setMusicPreset(preset: string): void {
    this.theme.setMusicPreset(preset);
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

  /** Inicia a trilha procedural em camadas (delega ao tema). Idempotente. */
  startMusic(): void {
    const backend = this.backend();
    if (!backend) return;
    this.theme.startMusic(backend);
  }

  /** Aplica os ganhos-alvo por camada com ramps suaves (delega ao tema). */
  setLayerTargets(targets: LayerGains): void {
    const backend = this.backend();
    if (!backend) return;
    this.theme.setLayerTargets(backend, targets);
  }

  /** Para a trilha (delega ao tema). */
  stopMusic(): void {
    this.theme.stopMusic();
  }

  // ---- SFX (transversal: mute/policy/ducking centralizados) --------------

  /** Toca um cue de jogo. Sem efeito se mudo/sem contexto ou se a política negar. */
  play(cue: AudioCue): void {
    if (this.muted) return;
    const backend = this.backend();
    if (!backend) return;
    const now = backend.ctx.currentTime;
    const policy = this.policy;
    if (policy && !policy.request(cue, now * 1000)) return;
    const pf = policy ? policy.pitchFactor() : 1;
    const gf = policy ? policy.gainFactor() : 1;

    this.theme.playCue(cue, backend, pf, gf);

    if (policy?.shouldDuck(cue)) this.duckMusic();
  }

  // ---- Recursos transversais ---------------------------------------------

  /**
   * Empacota os recursos transversais entregues ao tema. Retorna `null` quando
   * não há contexto (ambiente sem Web Audio / antes do gesto) — garante o no-op
   * silencioso de toda operação que depende de áudio.
   */
  private backend(): AudioBackend | null {
    if (!this.started || !this.ctx || !this.master || !this.musicGain) return null;
    return {
      ctx: this.ctx,
      master: this.master,
      musicGain: this.musicGain,
      noiseBuffer: this.noiseBuffer,
    };
  }

  /** Abaixa a trilha por ~`durationMs` e recupera (P5-04-02). Transversal. */
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
