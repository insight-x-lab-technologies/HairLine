import type { BulletPool } from '../entities/BulletPool';
import type { GameState } from '../sim/GameState';
import type { PlayerHitbox } from './CollisionSystem';
import type { FxEmitter } from '../sim/FxEvents';

/**
 * GrazeSystem — a mecânica central (docs/01 §4.1): passar PERTO de uma bala
 * inimiga sem ser atingido carrega o Foco. É o que empurra o jogador para
 * dentro do perigo.
 *
 * Anel de graze: hitDist < distância ≤ hitDist + margem. Cada bala conta no
 * máximo uma vez (flag `grazed`), e balas que de fato acertam (≤ hitDist) são
 * tratadas pela colisão, não aqui. Determinístico (docs/03 §3).
 *
 * Deve rodar ANTES da colisão jogador×bala, para que o raspão seja creditado
 * mesmo no tick em que a bala eventualmente encostaria.
 */
export function updateGraze(
  player: PlayerHitbox,
  enemyBullets: BulletPool,
  state: GameState,
  grazeMarginPx: number,
  fx?: FxEmitter,
): void {
  enemyBullets.forEachActive((b) => {
    if (b.grazed) return;
    const hitDist = player.hitboxRadius + b.radius;
    const grazeDist = hitDist + grazeMarginPx;
    const dx = b.x - player.x;
    const dy = b.y - player.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > hitDist * hitDist && d2 <= grazeDist * grazeDist) {
      b.grazed = true;
      state.addGraze();
      // Evento de FX na posição da bala raspada (P5-02-01) — decorativo, fora
      // do hashState(). A bala segue ativa (o destaque visual lê b.grazed).
      fx?.emit('graze', b.x, b.y);
    }
  });
}
