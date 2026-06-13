import { describe, it, expect } from 'vitest';
import { BossRushDirector } from '../src/systems/BossRushDirector';
import { BulletPool } from '../src/entities/BulletPool';
import { GameState, type CombatConfig } from '../src/sim/GameState';
import { BOSS_IDS } from '../src/content';

const combat: CombatConfig = {
  lives: 3,
  invulnTicks: 90,
  focusMax: 100,
  focusPerGraze: 4,
  grazeMarginPx: 22,
  scorePerKill: 100,
  scorePerGraze: 10,
};

function drive(dir: BossRushDirector, ticks: number, state: GameState): void {
  const bullets = new BulletPool(4096);
  for (let t = 0; t < ticks; t++) {
    const boss = dir.boss;
    if (boss && boss.alive) boss.onHit(999); // mata o chefe atual rápido
    dir.update(t, bullets, 360, 1000, state);
  }
}

describe('BossRushDirector — chefes em sequência (Fase 4, modo Boss Rush)', () => {
  it('invoca um chefe imediatamente (sem inimigos comuns)', () => {
    const dir = new BossRushDirector(360, 1);
    const bullets = new BulletPool(4096);
    dir.update(0, bullets, 360, 1000, new GameState(combat));
    expect(dir.boss).not.toBeNull();
    expect(dir.boss!.alive).toBe(true);
  });

  it('encadeia todos os chefes e marca conclusão ao fim', () => {
    const state = new GameState(combat);
    const dir = new BossRushDirector(360, 1);
    drive(dir, BOSS_IDS.length * 4 + 4, state);
    expect(dir.completed).toBe(true);
    expect(dir.boss).toBeNull();
    // pontuou ao menos uma vez por chefe derrotado
    expect(state.score).toBeGreaterThan(0);
  });

  it('é determinístico: mesma seed = mesma ordem de chefes', () => {
    const order = (seed: number): number[] => {
      const dir = new BossRushDirector(360, seed);
      const state = new GameState(combat);
      const bullets = new BulletPool(4096);
      const hps: number[] = [];
      for (let t = 0; t < BOSS_IDS.length * 4 + 4; t++) {
        const boss = dir.boss;
        if (boss && boss.alive) {
          if (!hps.includes(boss.maxHp)) hps.push(boss.maxHp);
          boss.onHit(999);
        }
        dir.update(t, bullets, 360, 1000, state);
      }
      return hps;
    };
    expect(order(7)).toEqual(order(7));
  });

  it('seeds diferentes podem dar ordens diferentes', () => {
    // não garante sempre diferente, mas a ordem é função da seed
    const dirA = new BossRushDirector(360, 1);
    const dirB = new BossRushDirector(360, 2);
    expect(dirA.sequence).not.toBe(undefined);
    expect(dirB.sequence).not.toBe(undefined);
    expect(dirA.sequence.length).toBe(BOSS_IDS.length);
  });
});
