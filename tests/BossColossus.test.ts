import { describe, it, expect } from 'vitest';
import { BossSystem } from '../src/systems/BossSystem';
import { BossRushDirector } from '../src/systems/BossRushDirector';
import { resolveShotsVsBossSystem } from '../src/systems/CollisionSystem';
import { BulletPool } from '../src/entities/BulletPool';
import { EnemyPool } from '../src/entities/EnemyPool';
import { GameState, type CombatConfig } from '../src/sim/GameState';
import { getBoss, BOSS_IDS } from '../src/content';

const CENTER_X = 360;
const combat: CombatConfig = {
  lives: 3,
  invulnTicks: 90,
  focusMax: 100,
  focusPerGraze: 4,
  grazeMarginPx: 22,
  scorePerKill: 100,
  scorePerGraze: 10,
};

function shootAt(sys: BossSystem, shots: BulletPool, state: GameState, x: number, y: number): void {
  shots.spawn(x, y, 0, 0, 4);
  resolveShotsVsBossSystem(shots, sys, state);
}

describe('P4-02b-06 — colossus (5º chefe, 3 fases compondo mecânicas)', () => {
  it('está registrado e tem ≥3 fases', () => {
    expect(BOSS_IDS).toContain('colossus');
    expect(getBoss('colossus').phases.length).toBeGreaterThanOrEqual(3);
  });

  it('entra na rotação do Boss Rush (sequência)', () => {
    const dir = new BossRushDirector(CENTER_X, 1234);
    expect(dir.sequence).toContain('colossus');
  });

  it('run completa: fase 1 partes ⇒ núcleo imune; fase 2 escudo+adds; fase 3 teleporte; derrota', () => {
    const def = getBoss('colossus');
    const sys = new BossSystem(def, CENTER_X, false, 2024);
    const bullets = new BulletPool(4096);
    const shots = new BulletPool(64);
    const enemies = new EnemyPool(64);
    const state = new GameState(combat);
    sys.spawnNow();
    sys.update(0, bullets, 360, 1100, { enemies }); // monta a fase 1

    // --- FASE 1: partes destrutíveis, núcleo imune ---
    expect(sys.boss.phaseIndex).toBe(0);
    expect(sys.coreVulnerable).toBe(false);
    const hpStart = sys.boss.hp;
    shootAt(sys, shots, state, sys.boss.x, sys.boss.y);
    expect(sys.boss.hp).toBe(hpStart); // núcleo imune com partes vivas
    for (const part of sys.parts.slice()) {
      for (let i = 0; i < part.maxHp; i++) shootAt(sys, shots, state, part.x, part.y);
    }
    expect(sys.coreVulnerable).toBe(true);
    sys.boss.onHit(def.hp * 0.4); // leva o núcleo abaixo de 0.66 ⇒ fase 2

    // --- FASE 2: escudo + adds ---
    sys.update(1, bullets, 360, 1100, { enemies }); // reconcilia fase 2
    expect(sys.boss.phaseIndex).toBe(1);
    expect(sys.shieldActive).toBe(true);
    const hpPhase2 = sys.boss.hp;
    shootAt(sys, shots, state, sys.boss.x, sys.boss.y);
    expect(sys.boss.hp).toBe(hpPhase2); // escudo bloqueia o núcleo
    // Adds aparecem na cadência da fase.
    const addsCfg = def.phases[1]!.adds!;
    for (let t = 2; t < addsCfg.intervalTicks + 5; t++) {
      sys.update(t, bullets, 360, 1100, { enemies });
    }
    expect(enemies.activeCount).toBeGreaterThanOrEqual(1); // invocou lacaios
    sys.boss.onHit(def.hp * 0.4); // ⇒ fase 3

    // --- FASE 3: teleporte ---
    expect(sys.boss.phaseIndex).toBe(2);
    let sawTelegraph = false;
    const xs = new Set<number>();
    for (let t = 300; t < 700; t++) {
      sys.update(t, bullets, 360, 1100, { enemies });
      if (sys.telegraphActive) sawTelegraph = true;
      xs.add(Math.round(sys.boss.x));
    }
    expect(sawTelegraph).toBe(true);
    expect(xs.size).toBeGreaterThan(1); // a posição mudou (saltou)

    // --- Derrota ---
    sys.boss.onHit(def.hp); // zera
    expect(sys.boss.defeated).toBe(true);
    expect(sys.boss.alive).toBe(false);
  });

  it('a run completa é determinística (mesma seed ⇒ mesma trajetória)', () => {
    const run = (): string => {
      const def = getBoss('colossus');
      const sys = new BossSystem(def, CENTER_X, false, 777);
      const bullets = new BulletPool(4096);
      const enemies = new EnemyPool(64);
      const out: number[] = [];
      // Fase 1 → 2 → 3 por dano direto (atalho), registrando posição/balas.
      for (let t = 0; t < 100; t++) sys.update(t, bullets, 300, 1100, { enemies });
      sys.boss.onHit(def.hp * 0.4);
      for (let t = 100; t < 300; t++) {
        sys.update(t, bullets, 300, 1100, { enemies });
        out.push(Math.round(sys.boss.x));
      }
      sys.boss.onHit(def.hp * 0.4);
      for (let t = 300; t < 600; t++) {
        sys.update(t, bullets, 300, 1100, { enemies });
        out.push(Math.round(sys.boss.x), Math.round(sys.boss.y));
      }
      return out.join(',') + '|' + bullets.activeCount + '|' + enemies.activeCount;
    };
    expect(run()).toBe(run());
  });
});
