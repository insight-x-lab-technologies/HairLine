import type { SimInput } from './types';

/**
 * Player — estado e movimento da nave, na simulação headless (Fase 1).
 *
 * Lógica pura e determinística (docs/02 §3.1): sem Phaser, sem DOM, sem
 * Math.random. A posição é integrada em passos fixos a partir da intenção
 * abstrata do jogador (SimInput). O render apenas lê `x`/`y`.
 *
 * Convenções do gênero:
 *  - A nave PERSEGUE o alvo do dedo, limitada por uma velocidade máxima — isso
 *    mantém o movimento determinístico e dentro do campo.
 *  - Modo Foco reduz a velocidade (precisão) — docs/01 §4.2.
 *  - A HITBOX lógica é pequena, muito menor que o sprite (docs/02 §3.5).
 *
 * Tuning vem de dados (`src/data/player.json`), nunca hardcoded (docs/02 §3.2).
 */
export interface PlayerConfig {
  readonly maxSpeedPxPerSec: number;
  readonly focusSpeedFactor: number;
  readonly hitboxRadiusPx: number;
  /** Margem mínima entre o centro da nave e a borda do campo jogável. */
  readonly marginPx: number;
  readonly startXPx: number;
  readonly startYPx: number;
}

/** Dimensões do campo de jogo virtual (retrato). */
export interface Bounds {
  readonly w: number;
  readonly h: number;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export class Player {
  x: number;
  y: number;
  readonly hitboxRadius: number;
  private readonly cfg: PlayerConfig;

  constructor(cfg: PlayerConfig) {
    this.cfg = cfg;
    this.x = cfg.startXPx;
    this.y = cfg.startYPx;
    this.hitboxRadius = cfg.hitboxRadiusPx;
  }

  /**
   * Avança um passo lógico fixo. `input.moveX/Y` é o alvo absoluto desejado
   * em coordenadas do mundo virtual; é clampado à área jogável antes de mover.
   */
  step(dtSec: number, input: SimInput, bounds: Bounds): void {
    const m = this.cfg.marginPx;
    const targetX = clamp(input.moveX, m, bounds.w - m);
    const targetY = clamp(input.moveY, m, bounds.h - m);

    const speed = this.cfg.maxSpeedPxPerSec * (input.focus ? this.cfg.focusSpeedFactor : 1);
    const maxStep = speed * dtSec;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist === 0 || dist <= maxStep) {
      // Alcança o alvo sem ultrapassar.
      this.x = targetX;
      this.y = targetY;
      return;
    }

    const k = maxStep / dist;
    this.x += dx * k;
    this.y += dy * k;
  }
}
