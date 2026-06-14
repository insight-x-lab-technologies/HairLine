import { describe, it, expect } from 'vitest';
import { FxEventBuffer } from '../src/sim/FxEvents';
import { resolveShotsVsEnemies, resolvePlayerVsBullets } from '../src/systems/CollisionSystem';
import { updateGraze } from '../src/systems/GrazeSystem';
import { BulletPool } from '../src/entities/BulletPool';
import { EnemyPool } from '../src/entities/EnemyPool';
import { GameState, type CombatConfig } from '../src/sim/GameState';
import { Simulation } from '../src/sim/Simulation';
import { getPattern } from '../src/content';

const combat: CombatConfig = {
  lives: 3,
  invulnTicks: 90,
  focusMax: 100,
  focusPerGraze: 4,
  grazeMarginPx: 22,
  scorePerKill: 100,
  scorePerGraze: 10,
};

describe('FxEventBuffer — eventos de FX com posição (P5-01-03/P5-02-01)', () => {
  it('emite, percorre em ordem e zera sem realocar', () => {
    const buf = new FxEventBuffer(8);
    buf.emit('kill', 10, 20, '#ff0000', 12);
    buf.emit('shotHit', 30, 40);
    expect(buf.length).toBe(2);
    const seen: string[] = [];
    buf.forEach((e) => seen.push(`${e.type}@${e.x},${e.y}`));
    expect(seen).toEqual(['kill@10,20', 'shotHit@30,40']);
    buf.reset();
    expect(buf.length).toBe(0);
  });

  it('saturação descarta o excedente e nunca passa da capacidade', () => {
    const buf = new FxEventBuffer(64);
    for (let i = 0; i < 70; i++) buf.emit('kill', i, i);
    expect(buf.length).toBe(64);
  });
});

describe('Emissão pelos sistemas de colisão/graze', () => {
  it('matar um inimigo emite kill com a posição e cor do inimigo', () => {
    const buf = new FxEventBuffer();
    const shots = new BulletPool(8);
    const enemies = new EnemyPool(8);
    const state = new GameState(combat);
    const e = enemies.spawn(100, 200, 0, 0, 1, 12, getPattern('ring'))!;
    e.color = '#abcdef';
    shots.spawn(100, 200, 0, 0, 4);
    resolveShotsVsEnemies(shots, enemies, state, buf);
    expect(buf.length).toBe(1);
    let ev: { type: string; x: number; y: number; color: string | undefined } | null = null;
    buf.forEach((x) => (ev = { type: x.type, x: x.x, y: x.y, color: x.color }));
    expect(ev).toEqual({ type: 'kill', x: 100, y: 200, color: '#abcdef' });
  });

  it('acerto sem matar emite shotHit (não kill)', () => {
    const buf = new FxEventBuffer();
    const shots = new BulletPool(8);
    const enemies = new EnemyPool(8);
    const state = new GameState(combat);
    enemies.spawn(100, 200, 0, 0, 3, 12, getPattern('ring'));
    shots.spawn(100, 200, 0, 0, 4);
    resolveShotsVsEnemies(shots, enemies, state, buf);
    let type = '';
    buf.forEach((e) => (type = e.type));
    expect(type).toBe('shotHit');
  });

  it('dano ao jogador emite playerHit; i-frames evitam evento duplicado', () => {
    const buf = new FxEventBuffer();
    const bullets = new BulletPool(8);
    const state = new GameState(combat);
    const player = { x: 50, y: 50, hitboxRadius: 5 };
    bullets.spawn(50, 50, 0, 0, 4);
    resolvePlayerVsBullets(player, bullets, state, buf);
    expect(buf.length).toBe(1);
    let t = '';
    buf.forEach((e) => (t = e.type));
    expect(t).toBe('playerHit');
    // Agora invulnerável: novo tiro não gera novo evento.
    buf.reset();
    bullets.spawn(50, 50, 0, 0, 4);
    resolvePlayerVsBullets(player, bullets, state, buf);
    expect(buf.length).toBe(0);
  });

  it('graze emite evento na posição da bala; mesma bala não duplica', () => {
    const buf = new FxEventBuffer();
    const bullets = new BulletPool(8);
    const state = new GameState(combat);
    const player = { x: 100, y: 100, hitboxRadius: 5 };
    bullets.spawn(120, 100, 0, 0, 6); // dist 20 → dentro do anel de graze
    updateGraze(player, bullets, state, combat.grazeMarginPx, buf);
    expect(buf.length).toBe(1);
    let ev: { type: string; x: number; y: number } | null = null;
    buf.forEach((e) => (ev = { type: e.type, x: e.x, y: e.y }));
    expect(ev).toEqual({ type: 'graze', x: 120, y: 100 });
    // Mesma bala em tick seguinte: sem novo evento (flag grazed).
    updateGraze(player, bullets, state, combat.grazeMarginPx, buf);
    expect(buf.length).toBe(1);
  });
});

describe('Determinismo intacto (regressão P5-01-03)', () => {
  it('o buffer de FX não muda o hashState entre runs idênticas', () => {
    const run = (): string => {
      const sim = new Simulation({ seed: 777, tickRateHz: 60, mode: 'endless' });
      for (let i = 0; i < 400; i++)
        sim.tick({ moveX: 360, moveY: 1000, focus: false, pulse: false });
      return sim.hashState();
    };
    expect(run()).toBe(run());
  });

  it('fxEvents zera a cada tick (não acumula entre ticks)', () => {
    const sim = new Simulation({ seed: 1, tickRateHz: 60, mode: 'endless' });
    sim.tick();
    // Após qualquer tick, o buffer reflete só aquele tick; um tick neutro sem
    // colisões deixa o buffer vazio.
    sim.tick();
    expect(sim.fxEvents.length).toBe(0);
  });
});
