import type { BulletPool } from '../entities/BulletPool';
import type { EnemyPool } from '../entities/EnemyPool';
import type { Boss } from './BossSystem';
import type { GameState } from '../sim/GameState';

/**
 * CollisionSystem — colisões por HITBOX lógica, não por bounding box de sprite
 * (docs/02 §3.5). Tudo por círculos (distância² ≤ (r1+r2)²), determinístico.
 *
 * São dois resolvedores independentes, chamados em ordem fixa na simulação.
 */

/** Alvo de colisão da nave: só o que importa para a hitbox (não o sprite). */
export interface PlayerHitbox {
  readonly x: number;
  readonly y: number;
  readonly hitboxRadius: number;
}

/** Tiros do jogador × inimigos: dano, consumo do tiro e morte/score. */
export function resolveShotsVsEnemies(
  shots: BulletPool,
  enemies: EnemyPool,
  state: GameState,
): void {
  shots.forEachActive((shot) => {
    let consumed = false;
    enemies.forEachActive((enemy) => {
      if (consumed) return;
      const rr = shot.radius + enemy.radius;
      const dx = shot.x - enemy.x;
      const dy = shot.y - enemy.y;
      if (dx * dx + dy * dy <= rr * rr) {
        enemy.hp -= 1;
        shots.despawn(shot);
        consumed = true;
        if (enemy.hp <= 0) {
          enemies.killAndRecycle(enemy);
          state.addKill();
        }
      }
    });
  });
}

/**
 * Tiros do jogador × chefe: cada tiro que acerta causa 1 de dano e é consumido.
 * Retorna true se o chefe foi derrotado neste tick.
 */
export function resolveShotsVsBoss(shots: BulletPool, boss: Boss): boolean {
  if (!boss.alive) return false;
  let defeated = false;
  shots.forEachActive((shot) => {
    if (defeated) return;
    const rr = shot.radius + boss.radius;
    const dx = shot.x - boss.x;
    const dy = shot.y - boss.y;
    if (dx * dx + dy * dy <= rr * rr) {
      shots.despawn(shot);
      if (boss.onHit(1)) defeated = true;
    }
  });
  return defeated;
}

/** Balas inimigas × nave: no máximo um dano por tick (depois fica invulnerável). */
export function resolvePlayerVsBullets(
  player: PlayerHitbox,
  enemyBullets: BulletPool,
  state: GameState,
): void {
  if (state.gameOver || state.invulnerable) return;
  let hit = false;
  enemyBullets.forEachActive((b) => {
    if (hit) return;
    const rr = player.hitboxRadius + b.radius;
    const dx = b.x - player.x;
    const dy = b.y - player.y;
    if (dx * dx + dy * dy <= rr * rr) {
      enemyBullets.despawn(b);
      state.hitPlayer();
      hit = true;
    }
  });
}
