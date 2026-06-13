import { describe, it, expect } from 'vitest';
import { BossDirector } from '../src/systems/BossDirector';
import { BulletPool } from '../src/entities/BulletPool';
import { GameState, type CombatConfig } from '../src/sim/GameState';
import { Rng } from '../src/services/Rng';

const combat: CombatConfig = {
  lives: 3,
  invulnTicks: 90,
  focusMax: 100,
  focusPerGraze: 4,
  grazeMarginPx: 22,
  scorePerKill: 100,
  scorePerGraze: 10,
};

function make(): BossDirector {
  return new BossDirector({ firstLevel: 2, everyLevels: 3, centerX: 360 });
}

describe('BossDirector — encontros de chefe no Endless (Fase 2)', () => {
  it('não há chefe antes do primeiro nível de encontro', () => {
    const dir = make();
    const bullets = new BulletPool(2048);
    const state = new GameState(combat);
    const rng = new Rng(1);
    dir.update(0, 0, bullets, 360, 1000, rng, state);
    expect(dir.boss).toBeNull();
    dir.update(1, 10, bullets, 360, 1000, rng, state);
    expect(dir.boss).toBeNull();
  });

  it('invoca um chefe ao atingir o nível de encontro', () => {
    const dir = make();
    const bullets = new BulletPool(2048);
    const state = new GameState(combat);
    const rng = new Rng(1);
    dir.update(2, 100, bullets, 360, 1000, rng, state);
    expect(dir.boss).not.toBeNull();
    expect(dir.boss!.alive).toBe(true);
  });

  it('ao derrotar o chefe, pontua e libera o campo (sem encerrar a run)', () => {
    const dir = make();
    const bullets = new BulletPool(2048);
    const state = new GameState(combat);
    const rng = new Rng(1);
    dir.update(2, 100, bullets, 360, 1000, rng, state);
    const boss = dir.boss!;
    while (boss.alive) boss.onHit(20);
    const before = state.score;
    dir.update(2, 101, bullets, 360, 1000, rng, state); // detecta derrota
    expect(dir.boss).toBeNull();
    expect(state.score).toBeGreaterThan(before); // bônus de derrota
    expect(state.gameOver).toBe(false); // Endless continua
  });

  it('agenda o próximo encontro everyLevels níveis depois', () => {
    const dir = make();
    const bullets = new BulletPool(2048);
    const state = new GameState(combat);
    const rng = new Rng(1);
    dir.update(2, 100, bullets, 360, 1000, rng, state);
    const boss = dir.boss!;
    while (boss.alive) boss.onHit(20);
    dir.update(2, 101, bullets, 360, 1000, rng, state); // derrota → próximo = 5
    // nível 3,4 sem chefe
    dir.update(4, 200, bullets, 360, 1000, rng, state);
    expect(dir.boss).toBeNull();
    // nível 5 → novo chefe
    dir.update(5, 300, bullets, 360, 1000, rng, state);
    expect(dir.boss).not.toBeNull();
  });

  it('é determinístico: mesma seed escolhe os mesmos chefes', () => {
    const run = (): string[] => {
      const dir = make();
      const bullets = new BulletPool(2048);
      const state = new GameState(combat);
      const rng = new Rng(99);
      const ids: string[] = [];
      let level = 2;
      for (let n = 0; n < 3; n++) {
        dir.update(level, n * 1000, bullets, 360, 1000, rng, state);
        const boss = dir.boss!;
        ids.push(`${boss.maxHp}`); // hp identifica o chefe escolhido
        while (boss.alive) boss.onHit(50);
        dir.update(level, n * 1000 + 1, bullets, 360, 1000, rng, state);
        level += 3;
      }
      return ids;
    };
    expect(run()).toEqual(run());
  });
});
