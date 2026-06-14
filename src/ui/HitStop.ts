import type { FxEventType } from '../sim/FxEvents';

/**
 * HitStop — congelamento breve do avanço da simulação em momentos de alto
 * impacto (P5-01-04). Lógica PURA e testável (sem Phaser): decide quanto tempo
 * congelar e como descontar o relógio, sem nunca acumular "dívida" de ticks.
 *
 * Determinismo é preservado por construção: hit-stop = a cena **não alimentar**
 * `loop.advance()` por N ms. A sequência de ticks/inputs fica idêntica; o replay
 * e o `verifyReplay` (re-simulação por tick) não veem o congelamento. Por isso
 * isto vive no driver do loop (cena), nunca em `src/sim/`.
 */
export interface HitStopConfig {
  readonly enabled: boolean;
  readonly maxMs: number;
  readonly durations: Readonly<Record<string, number>>;
}

/** Duração de hit-stop para um tipo de evento de FX (0 = sem congelamento). */
export function hitStopDurationFor(type: FxEventType, cfg: HitStopConfig): number {
  if (!cfg.enabled) return 0;
  const d = cfg.durations[type];
  return typeof d === 'number' && d > 0 ? d : 0;
}

/**
 * Aplica um novo disparo de hit-stop ao tempo restante. Política: NÃO soma —
 * vale `max(restante, novo)`, limitado pelo teto global `maxMs`. Isso evita que
 * uma cadeia de eventos (morrer no mesmo instante em que o chefe troca de fase)
 * congele além do teto.
 */
export function applyHitStop(remainingMs: number, addMs: number, maxMs: number): number {
  return Math.min(maxMs, Math.max(remainingMs, addMs));
}

/** Desconta `deltaMs` do tempo congelado (nunca abaixo de 0). */
export function tickHitStop(remainingMs: number, deltaMs: number): number {
  return Math.max(0, remainingMs - deltaMs);
}

/** Há congelamento ativo? (Enquanto true, a cena pula `loop.advance`.) */
export function isFrozen(remainingMs: number): boolean {
  return remainingMs > 0;
}
