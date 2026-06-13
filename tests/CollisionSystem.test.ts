import { describe, it, expect } from 'vitest';
import {
  resolveShotsVsEnemies,
  resolvePlayerVsBullets,
  resolveShotsVsBoss,
} from '../src/systems/CollisionSystem';
import { BulletPool } from '../src/entities/BulletPool';
import { EnemyPool } from '../src/entities/EnemyPool';
import { Boss } from '../src/systems/BossSystem';
import { GameState, type CombatConfig } from '../src/sim/GameState';
import type { Pattern } from '../src/content/types';

const cfg: CombatConfig = {
  lives: 3,
  invulnTicks: 90,
  focusMax: 100,
  focusPerGraze: 4,
  grazeMarginPx: 22,
  scorePerKill: 100,
  scorePerGraze: 10,
};
const pat: Pattern = { id: 'p', emitters: [] };

describe('CollisionSystem — hitbox, não bounding box (docs/02 §3.5)', () => {
  it('tiro que sobrepõe inimigo causa dano e é consumido', () => {
    const shots = new BulletPool(8);
    const enemies = new EnemyPool(8);
    const state = new GameState(cfg);
    shots.spawn(100, 100, 0, -100, 4);
    const enemy = enemies.spawn(100, 100, 0, 0, 3, 18, pat)!;

    resolveShotsVsEnemies(shots, enemies, state);
    expect(enemy.hp).toBe(2);
    expect(shots.activeCount).toBe(0); // tiro consumido
    expect(enemies.activeCount).toBe(1); // ainda vivo
  });

  it('inimigo com 1 de vida morre e pontua', () => {
    const shots = new BulletPool(8);
    const enemies = new EnemyPool(8);
    const state = new GameState(cfg);
    shots.spawn(200, 200, 0, -100, 4);
    enemies.spawn(200, 200, 0, 0, 1, 18, pat);

    resolveShotsVsEnemies(shots, enemies, state);
    expect(enemies.activeCount).toBe(0);
    expect(state.score).toBe(100);
  });

  it('tiro distante não acerta', () => {
    const shots = new BulletPool(8);
    const enemies = new EnemyPool(8);
    const state = new GameState(cfg);
    shots.spawn(0, 0, 0, -100, 4);
    enemies.spawn(500, 500, 0, 0, 3, 18, pat);

    resolveShotsVsEnemies(shots, enemies, state);
    expect(shots.activeCount).toBe(1);
    expect(state.score).toBe(0);
  });

  it('bala inimiga sobre a hitbox da nave causa dano e é consumida', () => {
    const bullets = new BulletPool(8);
    const state = new GameState(cfg);
    const player = { x: 360, y: 1000, hitboxRadius: 5 };
    bullets.spawn(360, 1000, 0, 100, 6);

    resolvePlayerVsBullets(player, bullets, state);
    expect(state.lives).toBe(2);
    expect(bullets.activeCount).toBe(0);
    expect(state.invulnerable).toBe(true);
  });

  it('só um dano por tick mesmo com várias balas sobrepostas (invuln)', () => {
    const bullets = new BulletPool(8);
    const state = new GameState(cfg);
    const player = { x: 100, y: 100, hitboxRadius: 5 };
    bullets.spawn(100, 100, 0, 0, 6);
    bullets.spawn(100, 100, 0, 0, 6);

    resolvePlayerVsBullets(player, bullets, state);
    expect(state.lives).toBe(2);
  });

  it('tiros acertam o chefe, causam dano e o derrotam ao zerar a vida', () => {
    const shots = new BulletPool(8);
    const boss = new Boss();
    boss.alive = true;
    boss.hp = 3;
    boss.maxHp = 3;
    boss.radius = 40;
    boss.x = 360;
    boss.y = 260;

    shots.spawn(360, 260, 0, -100, 4);
    let defeated = resolveShotsVsBoss(shots, boss);
    expect(defeated).toBe(false);
    expect(boss.hp).toBe(2);
    expect(shots.activeCount).toBe(0);

    boss.hp = 1;
    shots.spawn(360, 260, 0, -100, 4);
    defeated = resolveShotsVsBoss(shots, boss);
    expect(defeated).toBe(true);
    expect(boss.alive).toBe(false);
  });

  it('bala que passa longe da hitbox não causa dano', () => {
    const bullets = new BulletPool(8);
    const state = new GameState(cfg);
    const player = { x: 100, y: 100, hitboxRadius: 5 };
    bullets.spawn(100, 130, 0, 0, 6); // 30px longe (> 5+6)

    resolvePlayerVsBullets(player, bullets, state);
    expect(state.lives).toBe(3);
    expect(bullets.activeCount).toBe(1);
  });
});
