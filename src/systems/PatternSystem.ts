import type { BulletPool } from '../entities/BulletPool';
import type { Enemy } from '../entities/EnemyPool';
import type { Emitter, Pattern } from '../content/types';

/**
 * PatternSystem — traduz emitters declarativos em balas (Fase 1).
 *
 * Sem estado próprio: a emissão é função PURA da idade do emissor (em ticks), o
 * que é determinístico e não exige guardar cooldowns. Convenção de ângulo:
 * 0°=baixo (+y), horário; vx=speed·sin θ, vy=speed·cos θ.
 *
 * É genérico na ORIGEM (x, y, idade), então serve tanto para inimigos comuns
 * quanto para o chefe (que troca de padrão por fase). `emitEnemyBullets` é um
 * atalho para a origem ser um Enemy.
 */
const DEG2RAD = Math.PI / 180;

/** Emite as salvas devidas de `pattern` na idade `age`, a partir de (ox, oy). */
export function emitPattern(
  pattern: Pattern,
  ox: number,
  oy: number,
  age: number,
  bullets: BulletPool,
  playerX: number,
  playerY: number,
): void {
  for (const em of pattern.emitters) {
    const volleyIndex = volleyIndexAt(em, age);
    if (volleyIndex === null) continue;
    fireVolley(em, ox, oy, bullets, playerX, playerY, volleyIndex);
  }
}

/** Atalho: emite o padrão de um inimigo usando sua posição e idade. */
export function emitEnemyBullets(
  enemy: Enemy,
  bullets: BulletPool,
  playerX: number,
  playerY: number,
): void {
  if (!enemy.pattern) return;
  emitPattern(enemy.pattern, enemy.x, enemy.y, enemy.ageTicks, bullets, playerX, playerY);
}

/** Índice da salva devida nesta idade, ou null se nenhuma salva ocorre agora. */
function volleyIndexAt(em: Emitter, age: number): number | null {
  const rel = age - em.startTick;
  if (rel < 0) return null;
  if (em.intervalTicks <= 0) return rel === 0 && em.repeat >= 1 ? 0 : null;
  if (rel % em.intervalTicks !== 0) return null;
  const volleyIndex = rel / em.intervalTicks;
  return volleyIndex < em.repeat ? volleyIndex : null;
}

function fireVolley(
  em: Emitter,
  ox: number,
  oy: number,
  bullets: BulletPool,
  playerX: number,
  playerY: number,
  volleyIndex: number,
): void {
  const n = em.count;
  if (n <= 0) return;
  // Base = direção + offset de mira + rotação acumulada por salva (espirais).
  const base =
    baseAngleDeg(em, ox, oy, playerX, playerY) +
    (em.aimOffsetDeg ?? 0) +
    volleyIndex * (em.angleStepDeg ?? 0);
  const accel = em.accel ?? 0;
  const speedStep = em.speedStep ?? 0;
  const radiusStep = em.radiusStep ?? 0;

  for (let i = 0; i < n; i++) {
    const angleDeg = base + offsetDeg(em, i, n);
    const rad = angleDeg * DEG2RAD;
    const dirX = Math.sin(rad);
    const dirY = Math.cos(rad);
    const speed = em.speed + i * speedStep;
    const radius = em.bulletRadius + i * radiusStep;
    bullets.spawn(ox, oy, speed * dirX, speed * dirY, radius, accel * dirX, accel * dirY);
  }
}

/** Direção base da salva em graus (ring/fan usam angleDeg; aimed mira o jogador). */
function baseAngleDeg(
  em: Emitter,
  ox: number,
  oy: number,
  playerX: number,
  playerY: number,
): number {
  if (em.type === 'aimed') {
    return Math.atan2(playerX - ox, playerY - oy) / DEG2RAD; // 0°=baixo, horário
  }
  return em.angleDeg ?? 0;
}

/** Deslocamento angular da i-ésima bala dentro da salva. */
function offsetDeg(em: Emitter, i: number, n: number): number {
  if (em.type === 'ring') {
    return (i * 360) / n;
  }
  // fan e aimed: distribui no spread, centrado na base.
  const spread = em.spreadDeg ?? 0;
  if (n === 1) return 0;
  return -spread / 2 + (i * spread) / (n - 1);
}
