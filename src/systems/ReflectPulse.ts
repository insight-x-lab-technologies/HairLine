import type { BulletPool } from '../entities/BulletPool';
import type { GameState } from '../sim/GameState';
import type { PlayerHitbox } from './CollisionSystem';

/**
 * ReflectPulse — o pagamento do graze (docs/01 §4.1): gasta o Foco acumulado
 * para emitir um pulso que limpa as balas inimigas próximas (devolvendo-as como
 * pontos) e abre espaço na tela. É o que recompensa a bravura de chegar perto.
 *
 * Determinístico: gasta Foco via GameState e varre o pool em ordem estável.
 */
export interface ReflectConfig {
  /** Foco necessário para ativar o pulso. */
  readonly pulseCost: number;
  /** Raio de limpeza ao redor da nave. */
  readonly pulseRadiusPx: number;
  /** Pontos por bala refletida. */
  readonly scorePerReflected: number;
}

/**
 * Tenta ativar o pulso. Retorna o número de balas limpas (>= 0) se ativou, ou
 * -1 se não havia Foco suficiente.
 */
export function tryReflectPulse(
  player: PlayerHitbox,
  enemyBullets: BulletPool,
  state: GameState,
  cfg: ReflectConfig,
): number {
  if (!state.spendFocus(cfg.pulseCost)) return -1;
  const r2 = cfg.pulseRadiusPx * cfg.pulseRadiusPx;
  let cleared = 0;
  enemyBullets.forEachActive((b) => {
    const dx = b.x - player.x;
    const dy = b.y - player.y;
    if (dx * dx + dy * dy <= r2) {
      enemyBullets.despawn(b);
      cleared++;
    }
  });
  state.addScore(cleared * cfg.scorePerReflected);
  return cleared;
}
