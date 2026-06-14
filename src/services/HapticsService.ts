import type { AudioCue } from '../systems/AudioCues';
import { getEffects } from '../content';
import { getSave } from './SaveService';

/**
 * HapticsService — vibração tátil por evento (P5-04-03), mobile-first. Pega
 * carona nas cues que a `GameScene` já consome (`hit`, `pulse`, `gameover`,
 * `victory`). É APRESENTAÇÃO pura: nunca toca a simulação/replay.
 *
 * Resiliente: `navigator.vibrate` existe no Android (Chrome/Firefox) mas NÃO no
 * iOS Safari — ali o serviço é no-op gracioso (feature-detect, sem try/catch
 * como fluxo). Preferência ligar/desligar persistida (padrão do mute). Padrões
 * por cue vêm de `effects.json` (seção `haptics`), nunca hardcoded.
 *
 * `graze` e `kill` comum NÃO vibram (decisão de design: alta frequência
 * dessensibiliza e drena bateria — o canal é reservado para momentos fortes).
 */
export interface HapticsStore {
  getHapticsEnabled(): boolean;
  setHapticsEnabled(value: boolean): void;
}

type VibrateFn = (pattern: number | number[]) => boolean;

export class HapticsService {
  private readonly vibrateFn: VibrateFn | null;
  private enabled: boolean;
  /** Tempo (ms) da última vibração — para throttle global. */
  private lastVibrateMs = -Infinity;
  /** Relógio injetável (testes). */
  private readonly now: () => number;

  constructor(
    private readonly store: HapticsStore,
    nav: { vibrate?: VibrateFn } | undefined = typeof navigator !== 'undefined'
      ? navigator
      : undefined,
    now: () => number = () => Date.now(),
  ) {
    this.vibrateFn = typeof nav?.vibrate === 'function' ? nav.vibrate.bind(nav) : null;
    this.enabled = store.getHapticsEnabled();
    this.now = now;
  }

  /** A API existe neste ambiente? (iOS Safari ⇒ false) */
  get isSupported(): boolean {
    return this.vibrateFn !== null;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Alterna e persiste a preferência. Retorna o novo estado. */
  toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    this.store.setHapticsEnabled(value);
  }

  /**
   * Vibra conforme o padrão da cue (de `effects.json`). No-op se: API ausente,
   * desabilitado, cue sem padrão, ou dentro da janela de throttle global.
   */
  vibrate(cue: AudioCue): void {
    if (!this.vibrateFn || !this.enabled) return;
    const pattern = getEffects().haptics.patterns[cue];
    if (!pattern || pattern.length === 0) return;
    const t = this.now();
    if (t - this.lastVibrateMs < getEffects().haptics.throttleMs) return;
    this.lastVibrateMs = t;
    this.vibrateFn(pattern.length === 1 ? pattern[0]! : [...pattern]);
  }
}

let instance: HapticsService | null = null;

/** Singleton do serviço de haptics. `store` só é usado na 1ª criação. */
export function getHaptics(store?: HapticsStore): HapticsService {
  if (!instance) instance = new HapticsService(store ?? getSave());
  return instance;
}

/** Para testes: redefine o singleton. */
export function resetHapticsForTest(): void {
  instance = null;
}
