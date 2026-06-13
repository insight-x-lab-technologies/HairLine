import { describe, it, expect } from 'vitest';
import { BossSystem } from '../src/systems/BossSystem';
import { resolveShotsVsBossSystem } from '../src/systems/CollisionSystem';
import { BulletPool } from '../src/entities/BulletPool';
import { EnemyPool } from '../src/entities/EnemyPool';
import { GameState, type CombatConfig } from '../src/sim/GameState';
import { getPattern } from '../src/content';
import type { BossDef } from '../src/content/types';

const CENTER_X = 360; // fieldWidth = 720
const HOME_Y = 200;

const combat: CombatConfig = {
  lives: 3,
  invulnTicks: 90,
  focusMax: 100,
  focusPerGraze: 4,
  grazeMarginPx: 22,
  scorePerKill: 100,
  scorePerGraze: 10,
};

function baseDef(over: Partial<BossDef>): BossDef {
  return {
    id: 'test',
    hp: 100,
    radiusPx: 40,
    enterTick: 0,
    homeY: HOME_Y,
    sweepAmplitudePx: 100,
    sweepPeriodTicks: 200,
    defeatScore: 1000,
    phases: [],
    ...over,
  };
}

function spawnSys(def: BossDef, seed = 1): BossSystem {
  const sys = new BossSystem(def, CENTER_X, false, seed);
  sys.spawnNow();
  return sys;
}

/** Dispara um tiro exatamente sobre (x,y) e resolve a colisão com o chefe. */
function shootAt(sys: BossSystem, shots: BulletPool, state: GameState, x: number, y: number): void {
  shots.spawn(x, y, 0, 0, 4);
  resolveShotsVsBossSystem(shots, sys, state);
}

// ---------------------------------------------------------------------------
// P4-02b-01 — fases data-driven (N fases, thresholds)
// ---------------------------------------------------------------------------
describe('P4-02b-01 — fases data-driven', () => {
  const def3 = baseDef({
    hp: 100,
    phases: [
      { patternId: 'ring', untilHpPct: 0.66 },
      { patternId: 'aimed', untilHpPct: 0.33 },
      { patternId: 'spiral', untilHpPct: 0 },
    ],
  });

  it('um chefe de 3 fases troca de padrão nos thresholds corretos (0.66/0.33)', () => {
    const sys = spawnSys(def3);
    expect(sys.boss.phaseIndex).toBe(0);
    for (let i = 0; i < 35; i++) sys.boss.onHit(1); // hp = 65 ≤ 66
    expect(sys.boss.phaseIndex).toBe(1);
    expect(sys.boss.phaseAge).toBe(0); // padrão da nova fase reinicia
    for (let i = 0; i < 33; i++) sys.boss.onHit(1); // hp = 32 ≤ 33
    expect(sys.boss.phaseIndex).toBe(2);
  });

  it('dano que atravessa dois thresholds num golpe cai direto na fase correta', () => {
    const sys = spawnSys(def3);
    sys.boss.onHit(70); // hp = 30 ≤ 33 ⇒ pula direto para a fase 2
    expect(sys.boss.phaseIndex).toBe(2);
    expect(sys.boss.alive).toBe(true);
  });

  it('phaseAge zera ao trocar de fase mesmo após envelhecer no padrão', () => {
    const bullets = new BulletPool(2048);
    const sys = spawnSys(def3);
    for (let t = 0; t < 50; t++) sys.update(t, bullets, 360, 1000);
    expect(sys.boss.phaseAge).toBeGreaterThan(0);
    sys.boss.onHit(40); // hp = 60 ≤ 66 ⇒ fase 1
    expect(sys.boss.phaseIndex).toBe(1);
    expect(sys.boss.phaseAge).toBe(0);
  });

  it('é determinístico para 3 fases (mesma seed ⇒ mesma emissão)', () => {
    const run = (): number => {
      const bullets = new BulletPool(2048);
      const sys = spawnSys(def3, 42);
      for (let t = 0; t < 200; t++) sys.update(t, bullets, 200, 1000);
      return bullets.activeCount + Math.round(sys.boss.x);
    };
    expect(run()).toBe(run());
  });
});

// ---------------------------------------------------------------------------
// P4-02b-02 — escudo
// ---------------------------------------------------------------------------
describe('P4-02b-02 — escudo', () => {
  const toPhase1 = (sys: BossSystem, bullets: BulletPool): void => {
    sys.boss.onHit(55); // hp = 45 ≤ 50 ⇒ fase 1
    sys.update(0, bullets, 360, 1000); // reconcilia mecânicas (escudo sobe)
  };

  it('escudo absorve dano até quebrar; só depois o núcleo é atingido', () => {
    const def = baseDef({
      phases: [
        { patternId: 'ring', untilHpPct: 0.5 },
        { patternId: 'aimed', untilHpPct: 0, shield: { hp: 5 } },
      ],
    });
    const bullets = new BulletPool(64);
    const shots = new BulletPool(64);
    const state = new GameState(combat);
    const sys = spawnSys(def);
    toPhase1(sys, bullets);
    expect(sys.shieldActive).toBe(true);

    const hp0 = sys.boss.hp;
    for (let i = 0; i < 5; i++) shootAt(sys, shots, state, sys.boss.x, sys.boss.y);
    expect(sys.boss.hp).toBe(hp0); // núcleo intacto
    expect(sys.shieldActive).toBe(false); // escudo quebrou
    expect(sys.shieldHp).toBe(0); // excedente não vaza (escudo fica em 0)

    shootAt(sys, shots, state, sys.boss.x, sys.boss.y);
    expect(sys.boss.hp).toBe(hp0 - 1); // agora o dano vai ao núcleo
  });

  it('recarrega após rechargeTicks dentro da mesma fase', () => {
    const def = baseDef({
      phases: [
        { patternId: 'ring', untilHpPct: 0.5 },
        { patternId: 'aimed', untilHpPct: 0, shield: { hp: 2, rechargeTicks: 5 } },
      ],
    });
    const bullets = new BulletPool(64);
    const shots = new BulletPool(64);
    const state = new GameState(combat);
    const sys = spawnSys(def);
    toPhase1(sys, bullets);
    for (let i = 0; i < 2; i++) shootAt(sys, shots, state, sys.boss.x, sys.boss.y);
    expect(sys.shieldActive).toBe(false);

    for (let t = 1; t <= 12 && !sys.shieldActive; t++) sys.update(t, bullets, 360, 1000);
    expect(sys.shieldActive).toBe(true);
    expect(sys.shieldHp).toBe(2); // volta cheio
  });

  it('sem rechargeTicks o escudo fica quebrado até a fase acabar', () => {
    const def = baseDef({
      phases: [
        { patternId: 'ring', untilHpPct: 0.5 },
        { patternId: 'aimed', untilHpPct: 0, shield: { hp: 1 } },
      ],
    });
    const bullets = new BulletPool(64);
    const shots = new BulletPool(64);
    const state = new GameState(combat);
    const sys = spawnSys(def);
    toPhase1(sys, bullets);
    shootAt(sys, shots, state, sys.boss.x, sys.boss.y); // quebra
    for (let t = 1; t <= 200; t++) sys.update(t, bullets, 360, 1000);
    expect(sys.shieldActive).toBe(false);
  });

  it('trocar de fase descarta o escudo da fase antiga', () => {
    const def = baseDef({
      phases: [
        { patternId: 'ring', untilHpPct: 0.5, shield: { hp: 99 } },
        { patternId: 'aimed', untilHpPct: 0 },
      ],
    });
    const bullets = new BulletPool(64);
    const sys = spawnSys(def);
    sys.update(0, bullets, 360, 1000);
    expect(sys.shieldActive).toBe(true); // fase 0 tem escudo
    sys.boss.onHit(55); // ⇒ fase 1 (sem escudo)
    sys.update(1, bullets, 360, 1000);
    expect(sys.shieldActive).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// P4-02b-03 — adds
// ---------------------------------------------------------------------------
describe('P4-02b-03 — adds', () => {
  const def = baseDef({
    phases: [
      { patternId: 'ring', untilHpPct: 0.5 },
      {
        patternId: 'aimed',
        untilHpPct: 0,
        adds: { enemyId: 'drone', count: 2, intervalTicks: 120, maxAlive: 4 },
      },
    ],
  });

  it('invoca na cadência certa e respeita maxAlive', () => {
    const bullets = new BulletPool(256);
    const enemies = new EnemyPool(64);
    const sys = spawnSys(def);
    sys.boss.onHit(55); // ⇒ fase 1 (phaseAge 0)

    // Até phaseAge 120 não invocou; em 120 surgem 2.
    for (let t = 0; t < 121; t++) sys.update(t, bullets, 360, 1000, { enemies });
    expect(enemies.activeCount).toBe(2);
    // Em 240 surgem mais 2 (total 4).
    for (let t = 121; t < 241; t++) sys.update(t, bullets, 360, 1000, { enemies });
    expect(enemies.activeCount).toBe(4);
    // Em 360 já há 4 vivos ⇒ não invoca (maxAlive).
    for (let t = 241; t < 361; t++) sys.update(t, bullets, 360, 1000, { enemies });
    expect(enemies.activeCount).toBe(4);
  });

  it('pool cheio ⇒ invocação falha graciosamente (sem crash)', () => {
    const bullets = new BulletPool(256);
    const enemies = new EnemyPool(1); // capacidade mínima
    const sys = spawnSys(def);
    sys.boss.onHit(55);
    expect(() => {
      for (let t = 0; t < 130; t++) sys.update(t, bullets, 360, 1000, { enemies });
    }).not.toThrow();
    expect(enemies.activeCount).toBeLessThanOrEqual(1);
  });

  it('cleanupAdds remove só os adds do chefe, preservando inimigos comuns', () => {
    const bullets = new BulletPool(256);
    const enemies = new EnemyPool(64);
    const sys = spawnSys(def);
    sys.boss.onHit(55);
    for (let t = 0; t < 121; t++) sys.update(t, bullets, 360, 1000, { enemies });
    // Um inimigo comum (não invocado pelo chefe).
    enemies.spawn(10, 10, 0, 0, 1, 8, getPattern('ring'));
    const before = enemies.activeCount;
    expect(before).toBe(3); // 2 adds + 1 comum

    sys.cleanupAdds(enemies);
    expect(enemies.activeCount).toBe(1); // só o comum sobrou
  });

  it('é determinístico (mesma seed ⇒ mesmos spawns)', () => {
    const run = (): number => {
      const bullets = new BulletPool(256);
      const enemies = new EnemyPool(64);
      const sys = spawnSys(def, 7);
      sys.boss.onHit(55);
      for (let t = 0; t < 260; t++) sys.update(t, bullets, 360, 1000, { enemies });
      return enemies.activeCount;
    };
    expect(run()).toBe(run());
  });
});

// ---------------------------------------------------------------------------
// P4-02b-04 — partes destrutíveis
// ---------------------------------------------------------------------------
describe('P4-02b-04 — partes destrutíveis', () => {
  const makeDef = (): BossDef =>
    baseDef({
      hp: 100,
      scorePerPartDefeat: 200,
      phases: [
        {
          patternId: 'ring',
          untilHpPct: 0.5,
          parts: [
            { offsetXPx: -60, offsetYPx: 0, radiusPx: 14, hp: 3, patternId: 'aimed' },
            { offsetXPx: 60, offsetYPx: 0, radiusPx: 14, hp: 3 },
          ],
        },
        { patternId: 'cross', untilHpPct: 0 },
      ],
    });

  it('núcleo é invulnerável enquanto há parte viva; vulnerável após destruí-las', () => {
    const bullets = new BulletPool(256);
    const shots = new BulletPool(64);
    const state = new GameState(combat);
    const sys = spawnSys(makeDef());
    sys.update(0, bullets, 360, 1000);
    expect(sys.coreVulnerable).toBe(false);

    const hp0 = sys.boss.hp;
    shootAt(sys, shots, state, sys.boss.x, sys.boss.y); // tiro no núcleo
    expect(sys.boss.hp).toBe(hp0); // imune
    expect(shots.activeCount).toBe(0); // mas absorveu o tiro

    // Destroi as duas partes.
    for (const part of [sys.parts[0]!, sys.parts[1]!]) {
      for (let i = 0; i < 3; i++) shootAt(sys, shots, state, part.x, part.y);
    }
    expect(sys.parts.every((p) => !p.alive)).toBe(true);
    expect(sys.coreVulnerable).toBe(true);

    shootAt(sys, shots, state, sys.boss.x, sys.boss.y);
    expect(sys.boss.hp).toBe(hp0 - 1); // agora o núcleo recebe dano
  });

  it('pontua a parte exatamente uma vez', () => {
    const bullets = new BulletPool(256);
    const shots = new BulletPool(64);
    const state = new GameState(combat);
    const sys = spawnSys(makeDef());
    sys.update(0, bullets, 360, 1000);
    const part = sys.parts[0]!;
    for (let i = 0; i < 3; i++) shootAt(sys, shots, state, part.x, part.y);
    expect(state.score).toBe(200);
    // tiros extras na posição da parte morta não pontuam de novo
    shootAt(sys, shots, state, part.x, part.y);
    expect(state.score).toBe(200);
  });

  it('partes acompanham o vaivém do chefe (posição = centro + offset)', () => {
    const bullets = new BulletPool(256);
    const sys = spawnSys(makeDef());
    sys.update(0, bullets, 360, 1000);
    sys.update(1, bullets, 360, 1000);
    expect(sys.parts[0]!.x - sys.boss.x).toBeCloseTo(-60, 5);
    expect(sys.parts[1]!.x - sys.boss.x).toBeCloseTo(60, 5);
  });

  it('parte com padrão emite balas (a partir da sua posição)', () => {
    const bullets = new BulletPool(512);
    const sys = spawnSys(makeDef());
    for (let t = 0; t < 30; t++) sys.update(t, bullets, 360, 1000);
    expect(bullets.activeCount).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// P4-02b-05 — movimento por teleporte
// ---------------------------------------------------------------------------
describe('P4-02b-05 — teleporte', () => {
  const def = baseDef({
    phases: [
      { patternId: 'ring', untilHpPct: 0.5 },
      {
        patternId: 'aimed',
        untilHpPct: 0,
        movement: { type: 'teleport', intervalTicks: 60, telegraphTicks: 20, regionPadPx: 50 },
      },
    ],
  });

  it('ciclo intervalo → telegraph → salto nas contagens certas', () => {
    const bullets = new BulletPool(256);
    const sys = spawnSys(def, 12345);
    sys.boss.onHit(55); // ⇒ fase 1
    let sawTelegraph = false;
    let destAtTelegraph = { x: 0, y: 0 };
    let jumped = false;
    for (let t = 0; t < 70; t++) {
      sys.update(t, bullets, 360, 1000);
      if (sys.telegraphActive) {
        sawTelegraph = true;
        destAtTelegraph = { x: sys.teleportDestX, y: sys.teleportDestY };
      }
      // Salto: chega ao destino telegrafado e sai do telegraph.
      if (
        sawTelegraph &&
        !sys.telegraphActive &&
        Math.abs(sys.boss.x - destAtTelegraph.x) < 1e-6 &&
        Math.abs(sys.boss.y - destAtTelegraph.y) < 1e-6
      ) {
        jumped = true;
      }
    }
    expect(sawTelegraph).toBe(true);
    expect(jumped).toBe(true);
  });

  it('destino sempre dentro dos limites do campo', () => {
    const bullets = new BulletPool(256);
    const sys = spawnSys(def, 999);
    sys.boss.onHit(55);
    for (let t = 0; t < 600; t++) {
      sys.update(t, bullets, 360, 1000);
      if (sys.telegraphActive) {
        expect(sys.teleportDestX).toBeGreaterThanOrEqual(50);
        expect(sys.teleportDestX).toBeLessThanOrEqual(720 - 50);
        expect(sys.teleportDestY).toBeGreaterThanOrEqual(50);
        expect(sys.teleportDestY).toBeLessThanOrEqual(HOME_Y);
      }
    }
  });

  it('mesma seed ⇒ mesma sequência de destinos; seeds diferentes ⇒ diferentes', () => {
    const run = (seed: number): string => {
      const bullets = new BulletPool(256);
      const sys = spawnSys(def, seed);
      sys.boss.onHit(55);
      const out: number[] = [];
      for (let t = 0; t < 200; t++) {
        sys.update(t, bullets, 360, 1000);
        out.push(Math.round(sys.boss.x), Math.round(sys.boss.y));
      }
      return out.join(',');
    };
    expect(run(7)).toBe(run(7));
    expect(run(7)).not.toBe(run(99));
  });

  it('fase sweep (sem movement) é independente da seed — não consome Rng de movimento', () => {
    const sweepDef = baseDef({
      phases: [
        { patternId: 'ring', untilHpPct: 0.5 },
        { patternId: 'aimed', untilHpPct: 0 },
      ],
    });
    const run = (seed: number): string => {
      const bullets = new BulletPool(256);
      const sys = spawnSys(sweepDef, seed);
      const out: number[] = [];
      for (let t = 0; t < 120; t++) {
        sys.update(t, bullets, 360, 1000);
        out.push(Math.round(sys.boss.x));
      }
      return out.join(',');
    };
    expect(run(1)).toBe(run(2)); // seed não altera o vaivém
  });
});
