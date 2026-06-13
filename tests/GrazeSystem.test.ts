import { describe, it, expect } from 'vitest';
import { updateGraze } from '../src/systems/GrazeSystem';
import { BulletPool } from '../src/entities/BulletPool';
import { GameState, type CombatConfig } from '../src/sim/GameState';

const cfg: CombatConfig = {
  lives: 3,
  invulnTicks: 90,
  focusMax: 100,
  focusPerGraze: 4,
  grazeMarginPx: 22,
  scorePerKill: 100,
  scorePerGraze: 10,
};

const player = { x: 100, y: 100, hitboxRadius: 5 };

describe('GrazeSystem — a mecânica central (docs/01 §4.1, docs/03 §3)', () => {
  it('bala em raspão (perto, sem acertar) carrega o Foco', () => {
    const bullets = new BulletPool(8);
    const state = new GameState(cfg);
    // hitDist = 5+6 = 11; grazeDist = 11+22 = 33. Coloca a 20px → graze.
    bullets.spawn(120, 100, 0, 0, 6);
    updateGraze(player, bullets, state, cfg.grazeMarginPx);
    expect(state.grazeCount).toBe(1);
    expect(state.focus).toBe(cfg.focusPerGraze);
  });

  it('a mesma bala não conta graze duas vezes (docs/03 §3)', () => {
    const bullets = new BulletPool(8);
    const state = new GameState(cfg);
    bullets.spawn(120, 100, 0, 0, 6);
    updateGraze(player, bullets, state, cfg.grazeMarginPx);
    updateGraze(player, bullets, state, cfg.grazeMarginPx);
    expect(state.grazeCount).toBe(1);
  });

  it('bala que de fato acerta a hitbox não conta como graze', () => {
    const bullets = new BulletPool(8);
    const state = new GameState(cfg);
    bullets.spawn(100, 100, 0, 0, 6); // em cima da hitbox (dist 0 < hitDist)
    updateGraze(player, bullets, state, cfg.grazeMarginPx);
    expect(state.grazeCount).toBe(0);
  });

  it('bala longe demais não conta graze', () => {
    const bullets = new BulletPool(8);
    const state = new GameState(cfg);
    bullets.spawn(200, 100, 0, 0, 6); // 100px → fora do anel de graze
    updateGraze(player, bullets, state, cfg.grazeMarginPx);
    expect(state.grazeCount).toBe(0);
  });

  it('é determinístico para a mesma configuração de balas', () => {
    const run = (): number => {
      const bullets = new BulletPool(16);
      const state = new GameState(cfg);
      bullets.spawn(118, 100, 0, 0, 6);
      bullets.spawn(100, 122, 0, 0, 6);
      updateGraze(player, bullets, state, cfg.grazeMarginPx);
      return state.grazeCount;
    };
    expect(run()).toBe(run());
  });
});
