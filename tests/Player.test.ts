import { describe, it, expect } from 'vitest';
import { Player, type PlayerConfig, type Bounds } from '../src/sim/Player';

const cfg: PlayerConfig = {
  maxSpeedPxPerSec: 1000,
  focusSpeedFactor: 0.5,
  hitboxRadiusPx: 5,
  marginPx: 10,
  startXPx: 100,
  startYPx: 100,
};

const bounds: Bounds = { w: 720, h: 1280 };

describe('Player — movimento determinístico (Fase 1; docs/02 §3.1, §3.5)', () => {
  it('começa na posição inicial configurada (dados, não hardcode)', () => {
    const p = new Player(cfg);
    expect(p.x).toBe(100);
    expect(p.y).toBe(100);
  });

  it('persegue o alvo, limitado pela velocidade máxima no dt', () => {
    const p = new Player(cfg);
    // alvo a 200 px; em 0,1 s a maxStep = 1000 * 0,1 = 100 px.
    p.step(0.1, { moveX: 100, moveY: 300, focus: false }, bounds);
    expect(p.x).toBeCloseTo(100, 6);
    expect(p.y).toBeCloseTo(200, 6);
  });

  it('encaixa no alvo quando ele está dentro do passo (não ultrapassa)', () => {
    const p = new Player(cfg);
    p.step(0.1, { moveX: 100, moveY: 150, focus: false }, bounds); // dist 50 < 100
    expect(p.y).toBeCloseTo(150, 6);
  });

  it('modo Foco reduz a velocidade efetiva pelo fator configurado', () => {
    const p = new Player(cfg);
    // foco: speed 500 → maxStep 50 px em 0,1 s.
    p.step(0.1, { moveX: 100, moveY: 300, focus: true }, bounds);
    expect(p.y).toBeCloseTo(150, 6);
  });

  it('clampa o alvo às bordas jogáveis (margem), preservando justiça do campo', () => {
    const p = new Player(cfg);
    // alvo fora à esquerda/topo → clampado para a margem (10,10).
    p.step(1, { moveX: -500, moveY: -500, focus: false }, bounds);
    expect(p.x).toBeCloseTo(10, 6);
    expect(p.y).toBeCloseTo(10, 6);
  });

  it('clampa o alvo à borda direita/inferior', () => {
    const p = new Player({ ...cfg, startXPx: 700, startYPx: 1270 });
    p.step(1, { moveX: 99999, moveY: 99999, focus: false }, bounds);
    expect(p.x).toBeCloseTo(bounds.w - cfg.marginPx, 6); // 710
    expect(p.y).toBeCloseTo(bounds.h - cfg.marginPx, 6); // 1270
  });

  it('alvo igual à posição não move (sem jitter)', () => {
    const p = new Player(cfg);
    p.step(0.016, { moveX: 100, moveY: 100, focus: false }, bounds);
    expect(p.x).toBe(100);
    expect(p.y).toBe(100);
  });

  it('hitbox lógica é pequena — hitbox ≠ sprite (docs/02 §3.5)', () => {
    const p = new Player(cfg);
    expect(p.hitboxRadius).toBe(5);
    expect(p.hitboxRadius).toBeLessThan(20); // muito menor que o visual da nave
  });

  it('é determinístico: mesma sequência de passos = mesma posição', () => {
    const a = new Player(cfg);
    const b = new Player(cfg);
    const steps = [
      { moveX: 300, moveY: 400, focus: false },
      { moveX: 50, moveY: 600, focus: true },
      { moveX: 700, moveY: 100, focus: false },
    ];
    for (const s of steps) {
      a.step(1 / 60, s, bounds);
      b.step(1 / 60, s, bounds);
    }
    expect(a.x).toBe(b.x);
    expect(a.y).toBe(b.y);
  });
});
