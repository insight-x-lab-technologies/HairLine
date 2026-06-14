import type { BulletPool } from '../entities/BulletPool';
import type { EnemyPool } from '../entities/EnemyPool';
import type { Boss, BossSystem } from './BossSystem';
import type { GameState } from '../sim/GameState';
import type { FxEmitter } from '../sim/FxEvents';

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
  fx?: FxEmitter,
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
          // Explosão na cor/forma do inimigo (P5-01-03): posição e cor no tick.
          fx?.emit('kill', enemy.x, enemy.y, enemy.color, enemy.radius);
          enemies.killAndRecycle(enemy);
          state.addKill();
        } else {
          // Faísca de impacto enquanto o inimigo sobrevive.
          fx?.emit('shotHit', enemy.x, enemy.y, enemy.color);
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

/**
 * Tiros do jogador × chefe COM mecânicas (P4-02b): ordem fixa e determinística
 * por tiro — (1) partes destrutíveis (índice crescente), (2) escudo ativo, (3)
 * núcleo. Enquanto houver parte viva o núcleo é invulnerável; com escudo ativo o
 * dano vai ao escudo, não ao núcleo. Cada tiro acerta no máximo um alvo.
 * Retorna true se o chefe foi derrotado neste tick.
 */
export function resolveShotsVsBossSystem(
  shots: BulletPool,
  sys: BossSystem,
  state: GameState,
  fx?: FxEmitter,
): boolean {
  const boss = sys.boss;
  if (!boss.alive) return false;
  let defeated = false;
  const parts = sys.parts;
  const coreVulnerable = sys.coreVulnerable;

  shots.forEachActive((shot) => {
    if (defeated) return;

    // (1) Partes destrutíveis primeiro (ordem de índice).
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      if (!part.alive) continue;
      const rr = shot.radius + part.radius;
      const dx = shot.x - part.x;
      const dy = shot.y - part.y;
      if (dx * dx + dy * dy <= rr * rr) {
        part.hp -= 1;
        shots.despawn(shot);
        if (part.hp <= 0) {
          part.hp = 0;
          part.alive = false;
          fx?.emit('kill', part.x, part.y, undefined, part.radius);
          if (part.scorePerDefeat > 0) state.addScore(part.scorePerDefeat);
        } else {
          fx?.emit('shotHit', shot.x, shot.y);
        }
        return; // tiro consumido por esta parte
      }
    }

    // (2)/(3) Núcleo: só se vulnerável (sem partes vivas) e dentro do raio.
    const rr = shot.radius + boss.radius;
    const dx = shot.x - boss.x;
    const dy = shot.y - boss.y;
    if (dx * dx + dy * dy <= rr * rr) {
      shots.despawn(shot); // o corpo do chefe absorve o tiro
      if (!coreVulnerable) return; // partes vivas: núcleo imune
      if (sys.shieldActive) {
        sys.hitShield();
        fx?.emit('shotHit', shot.x, shot.y);
        return;
      }
      const prevPhase = boss.phaseIndex;
      if (boss.onHit(1)) {
        defeated = true;
        // Morte do chefe: explosão grande + hit-stop (P5-01-03/04).
        fx?.emit('bossKill', boss.x, boss.y, undefined, boss.radius);
      } else if (boss.phaseIndex > prevPhase) {
        // Troca de fase: estilhaço próprio (distingue de kill comum no JSON).
        fx?.emit('bossPhase', boss.x, boss.y, undefined, boss.radius);
      } else {
        fx?.emit('shotHit', shot.x, shot.y);
      }
    }
  });
  return defeated;
}

/** Balas inimigas × nave: no máximo um dano por tick (depois fica invulnerável). */
export function resolvePlayerVsBullets(
  player: PlayerHitbox,
  enemyBullets: BulletPool,
  state: GameState,
  fx?: FxEmitter,
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
      // Estilhaço na nave (P5-01-03). Respeita i-frames por construção: só
      // chega aqui quando o dano é aplicado (acima retornamos se invulnerável).
      fx?.emit('playerHit', player.x, player.y);
    }
  });
}
