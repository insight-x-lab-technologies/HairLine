import type { Simulation } from '../sim/Simulation';

/**
 * AudioCues — decide QUAIS sons tocar comparando dois instantâneos do estado
 * (Fase 2). Lógica pura e determinística: não toca nada e não depende de Web
 * Audio. O render captura snapshots por frame e toca os cues no AudioService.
 *
 * Manter isto separado do backend de áudio o torna testável e mantém a
 * simulação 100% headless (áudio é apresentação, nunca afeta o jogo).
 */
export type AudioCue = 'hit' | 'kill' | 'graze' | 'pulse' | 'gameover' | 'victory';

export interface AudioSnapshot {
  readonly score: number;
  readonly lives: number;
  readonly kills: number;
  readonly grazeCount: number;
  /** Tick do último pulso refletor (-1 se nenhum) — detecta novo pulso. */
  readonly reflectTick: number;
  readonly gameOver: boolean;
  readonly won: boolean;
}

/** Captura um instantâneo de áudio a partir da simulação. */
export function snapshotOf(sim: Simulation): AudioSnapshot {
  const s = sim.state;
  return {
    score: s.score,
    lives: s.lives,
    kills: s.kills,
    grazeCount: s.grazeCount,
    reflectTick: sim.lastReflect?.tick ?? -1,
    gameOver: s.gameOver,
    won: s.won,
  };
}

/** Lista de cues a tocar na transição prev → cur (ordem estável). */
export function diffCues(prev: AudioSnapshot, cur: AudioSnapshot): AudioCue[] {
  const cues: AudioCue[] = [];
  if (cur.lives < prev.lives) cues.push('hit');
  if (cur.kills > prev.kills) cues.push('kill');
  if (cur.grazeCount > prev.grazeCount) cues.push('graze');
  if (cur.reflectTick !== prev.reflectTick) cues.push('pulse');
  if (cur.gameOver && !prev.gameOver) cues.push(cur.won ? 'victory' : 'gameover');
  return cues;
}
