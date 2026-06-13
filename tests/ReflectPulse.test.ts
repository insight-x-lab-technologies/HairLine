import { describe, it, expect } from 'vitest';
import { tryReflectPulse, type ReflectConfig } from '../src/systems/ReflectPulse';
import { BulletPool } from '../src/entities/BulletPool';
import { GameState, type CombatConfig } from '../src/sim/GameState';

const combat: CombatConfig = {
  lives: 3,
  invulnTicks: 90,
  focusMax: 100,
  focusPerGraze: 4,
  grazeMarginPx: 22,
  scorePerKill: 100,
  scorePerGraze: 10,
};
const cfg: ReflectConfig = { pulseCost: 100, pulseRadiusPx: 300, scorePerReflected: 20 };
const player = { x: 360, y: 1000, hitboxRadius: 5 };

function fullFocus(s: GameState): void {
  for (let i = 0; i < 30; i++) s.addGraze(); // satura em focusMax
}

describe('ReflectPulse — payoff do graze (docs/01 §4.1)', () => {
  it('com Foco cheio, limpa as balas próximas e gasta o Foco', () => {
    const bullets = new BulletPool(16);
    const state = new GameState(combat);
    fullFocus(state);
    bullets.spawn(360, 1050, 0, 0, 6); // perto (50px)
    bullets.spawn(380, 980, 0, 0, 6); // perto
    const cleared = tryReflectPulse(player, bullets, state, cfg);
    expect(cleared).toBe(2);
    expect(bullets.activeCount).toBe(0);
    expect(state.focus).toBe(0);
  });

  it('balas fora do raio não são limpas', () => {
    const bullets = new BulletPool(16);
    const state = new GameState(combat);
    fullFocus(state);
    bullets.spawn(360, 1050, 0, 0, 6); // dentro
    bullets.spawn(360, 100, 0, 0, 6); // 900px acima → fora do raio 300
    const cleared = tryReflectPulse(player, bullets, state, cfg);
    expect(cleared).toBe(1);
    expect(bullets.activeCount).toBe(1);
  });

  it('balas refletidas concedem pontuação', () => {
    const bullets = new BulletPool(16);
    const state = new GameState(combat);
    fullFocus(state);
    const before = state.score;
    bullets.spawn(360, 1050, 0, 0, 6);
    bullets.spawn(370, 1040, 0, 0, 6);
    tryReflectPulse(player, bullets, state, cfg);
    expect(state.score - before).toBe(2 * cfg.scorePerReflected);
  });

  it('sem Foco suficiente, não ativa (retorna -1) e nada muda', () => {
    const bullets = new BulletPool(16);
    const state = new GameState(combat); // foco 0
    bullets.spawn(360, 1050, 0, 0, 6);
    const cleared = tryReflectPulse(player, bullets, state, cfg);
    expect(cleared).toBe(-1);
    expect(bullets.activeCount).toBe(1);
    expect(state.focus).toBe(0);
  });

  it('é determinístico', () => {
    const run = (): number => {
      const bullets = new BulletPool(16);
      const state = new GameState(combat);
      fullFocus(state);
      bullets.spawn(360, 1050, 0, 0, 6);
      bullets.spawn(340, 1030, 0, 0, 6);
      return tryReflectPulse(player, bullets, state, cfg);
    };
    expect(run()).toBe(run());
  });
});
