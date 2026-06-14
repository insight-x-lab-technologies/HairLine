import type { AudioConfig } from '../content/types';

/**
 * MusicDirector — decide os ganhos-alvo de cada camada musical a partir de um
 * snapshot de estado (P5-04-01). Lógica PURA (sem Web Audio): determinística,
 * sem estado escondido. O `AudioService` aplica os alvos com ramps suaves; aqui
 * a decisão é instantânea. Mesmo padrão de "estado → apresentação" das
 * `AudioCues` (TD-09): a simulação não sabe que música existe.
 */
export interface MusicSnapshot {
  /** Nível de dificuldade atual (0-based, como `Simulation.level`). */
  readonly level: number;
  /** Há chefe ativo? */
  readonly bossActive: boolean;
  readonly lives: number;
  readonly gameOver: boolean;
}

export interface LayerGains {
  readonly base: number;
  readonly rhythm: number;
  readonly tension: number;
  readonly danger: number;
}

/**
 * Ganhos-alvo por camada. Regras (monotônicas em nível: subir nível nunca
 * *remove* uma camada):
 *  - game over ⇒ tudo a zero (a música esvazia);
 *  - base sempre presente (o pad ambiente);
 *  - rítmica entra a partir de `rhythmLevel`;
 *  - tensão entra com chefe ativo;
 *  - perigo entra quando as vidas caem a `dangerLives` ou menos.
 */
export function musicTargets(snap: MusicSnapshot, cfg: AudioConfig['music']): LayerGains {
  if (snap.gameOver) return { base: 0, rhythm: 0, tension: 0, danger: 0 };
  return {
    base: cfg.layers.base,
    rhythm: snap.level >= cfg.rhythmLevel ? cfg.layers.rhythm : 0,
    tension: snap.bossActive ? cfg.layers.tension : 0,
    danger: snap.lives <= cfg.dangerLives ? cfg.layers.danger : 0,
  };
}
