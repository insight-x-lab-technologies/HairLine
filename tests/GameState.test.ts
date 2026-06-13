import { describe, it, expect } from 'vitest';
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

describe('GameState — vidas/foco/score determinísticos (Fase 1)', () => {
  it('começa com vidas cheias, sem score/foco e não em game over', () => {
    const s = new GameState(cfg);
    expect(s.lives).toBe(3);
    expect(s.score).toBe(0);
    expect(s.focus).toBe(0);
    expect(s.grazeCount).toBe(0);
    expect(s.gameOver).toBe(false);
  });

  it('graze carrega o foco e soma pontos, com teto no focusMax', () => {
    const s = new GameState(cfg);
    for (let i = 0; i < 30; i++) s.addGraze(); // 30*4 = 120 > 100
    expect(s.focus).toBe(100);
    expect(s.grazeCount).toBe(30);
    expect(s.score).toBe(30 * 10);
  });

  it('matar inimigo soma score por kill e conta abates', () => {
    const s = new GameState(cfg);
    s.addKill();
    s.addKill();
    expect(s.score).toBe(200);
    expect(s.kills).toBe(2);
  });

  it('levar dano perde vida e concede invulnerabilidade temporária', () => {
    const s = new GameState(cfg);
    s.hitPlayer();
    expect(s.lives).toBe(2);
    expect(s.invulnerable).toBe(true);
  });

  it('durante a invulnerabilidade, novos hits são ignorados', () => {
    const s = new GameState(cfg);
    s.hitPlayer();
    s.hitPlayer(); // ignorado (invulnerável)
    expect(s.lives).toBe(2);
  });

  it('a invulnerabilidade expira após invulnTicks', () => {
    const s = new GameState(cfg);
    s.hitPlayer();
    for (let i = 0; i < cfg.invulnTicks; i++) s.tickTimers();
    expect(s.invulnerable).toBe(false);
    s.hitPlayer();
    expect(s.lives).toBe(1);
  });

  it('perder a última vida dispara game over', () => {
    const s = new GameState(cfg);
    for (let life = 0; life < 3; life++) {
      s.hitPlayer();
      for (let i = 0; i < cfg.invulnTicks; i++) s.tickTimers();
    }
    expect(s.lives).toBe(0);
    expect(s.gameOver).toBe(true);
  });

  it('não fica com vidas negativas nem perde vida após game over', () => {
    const s = new GameState(cfg);
    for (let k = 0; k < 10; k++) {
      s.hitPlayer();
      for (let i = 0; i < cfg.invulnTicks; i++) s.tickTimers();
    }
    expect(s.lives).toBe(0);
    expect(s.gameOver).toBe(true);
  });
});
