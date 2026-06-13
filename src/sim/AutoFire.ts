import type { BulletPool } from '../entities/BulletPool';

/**
 * AutoFire — tiro automático da nave (docs/01 §4.2: não se toca para atirar).
 *
 * Cadência medida em TICKS (não segundos) para ser perfeitamente determinística
 * em qualquer FPS de render (docs/02 §3.1). Lógica pura: spawna no pool de
 * tiros do jogador a partir da origem fornecida (posição atual da nave).
 *
 * Tuning vem de dados (`src/data/player.json#autoFire`), nunca hardcoded.
 */
export interface AutoFireConfig {
  /** Intervalo entre disparos, em ticks lógicos. */
  readonly intervalTicks: number;
  /** Velocidade do projétil para cima, em px/s. */
  readonly speedPxPerSec: number;
  /** Raio de colisão do projétil. */
  readonly radiusPx: number;
}

export class AutoFire {
  /** Ticks restantes até o próximo disparo permitido (0 = pronto). */
  private cooldown = 0;

  constructor(private readonly cfg: AutoFireConfig) {}

  /**
   * Avança um tick. Se a arma está pronta, dispara um projétil para cima a
   * partir de (x, y) e reinicia o cooldown.
   */
  tick(pool: BulletPool, x: number, y: number): void {
    if (this.cooldown <= 0) {
      pool.spawn(x, y, 0, -this.cfg.speedPxPerSec, this.cfg.radiusPx);
      this.cooldown = this.cfg.intervalTicks;
    }
    this.cooldown--;
  }

  /** Zera o cooldown (ex.: início de run). */
  reset(): void {
    this.cooldown = 0;
  }
}
