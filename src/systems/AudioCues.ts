import type { Simulation } from '../sim/Simulation';

/**
 * AudioCues — decide QUAIS sons tocar comparando dois instantâneos do estado
 * (Fase 2). Lógica pura e determinística: não toca nada e não depende de Web
 * Audio. O render captura snapshots por frame e toca os cues no AudioService.
 *
 * Manter isto separado do backend de áudio o torna testável e mantém a
 * simulação 100% headless (áudio é apresentação, nunca afeta o jogo).
 */
export type AudioCue =
  | 'hit'
  | 'kill'
  | 'graze'
  | 'pulse'
  | 'gameover'
  | 'victory'
  | 'bossshield'
  | 'bossteleport'
  /** Entrada do chefe de estágio (P4-04b-02) — disparado pela cena, não por diff. */
  | 'bossentry';

export interface AudioSnapshot {
  readonly score: number;
  readonly lives: number;
  readonly kills: number;
  readonly grazeCount: number;
  /** Tick do último pulso refletor (-1 se nenhum) — detecta novo pulso. */
  readonly reflectTick: number;
  readonly gameOver: boolean;
  readonly won: boolean;
  /** Escudo do chefe ativo? (P4-02b-02) — quebra = borda de descida. */
  readonly bossShieldActive?: boolean;
  /** Telegraph de teleporte do chefe ativo? (P4-02b-05) — borda de subida. */
  readonly bossTelegraph?: boolean;
}

/** Captura um instantâneo de áudio a partir da simulação. */
export function snapshotOf(sim: Simulation): AudioSnapshot {
  const s = sim.state;
  const sys = sim.activeBossSystem;
  const bossAlive = sys?.boss.alive ?? false;
  return {
    score: s.score,
    lives: s.lives,
    kills: s.kills,
    grazeCount: s.grazeCount,
    reflectTick: sim.lastReflect?.tick ?? -1,
    gameOver: s.gameOver,
    won: s.won,
    bossShieldActive: bossAlive ? (sys?.shieldActive ?? false) : false,
    bossTelegraph: bossAlive ? (sys?.telegraphActive ?? false) : false,
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
  // Escudo quebrou (estava ativo, agora não) — borda de descida.
  if (prev.bossShieldActive && !cur.bossShieldActive) cues.push('bossshield');
  // Telegraph de teleporte começou — borda de subida (aviso ao jogador).
  if (!prev.bossTelegraph && cur.bossTelegraph) cues.push('bossteleport');
  return cues;
}
