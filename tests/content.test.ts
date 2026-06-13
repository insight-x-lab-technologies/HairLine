import { describe, it, expect } from 'vitest';
import {
  getPattern,
  getEnemyDef,
  getBoss,
  getWave,
  validateBossDef,
  PATTERN_IDS,
  ENEMY_IDS,
  BOSS_IDS,
  WAVE_IDS,
} from '../src/content';
import type { BossDef } from '../src/content/types';

describe('content — integridade dos dados (docs/02 §3.2)', () => {
  it('todo padrão registrado resolve e tem ao menos um emitter', () => {
    expect(PATTERN_IDS.length).toBeGreaterThanOrEqual(5);
    for (const id of PATTERN_IDS) {
      const p = getPattern(id);
      expect(p.id).toBe(id);
      expect(p.emitters.length).toBeGreaterThan(0);
    }
  });

  it('todo inimigo referencia um padrão existente', () => {
    expect(ENEMY_IDS.length).toBeGreaterThanOrEqual(5);
    for (const id of ENEMY_IDS) {
      const def = getEnemyDef(id);
      expect(() => getPattern(def.patternId)).not.toThrow();
      expect(def.hp).toBeGreaterThan(0);
      expect(def.radiusPx).toBeGreaterThan(0);
    }
  });

  it('todo chefe referencia padrões existentes em todas as fases', () => {
    // Migrado para o schema de fases data-driven (P4-02b-01): phases[] em vez
    // de phasePatternIds; cada fase tem patternId e untilHpPct.
    for (const id of BOSS_IDS) {
      const boss = getBoss(id);
      expect(boss.phases.length).toBeGreaterThanOrEqual(2); // mínimo 2 fases
      for (const phase of boss.phases) {
        expect(() => getPattern(phase.patternId)).not.toThrow();
      }
    }
  });

  it('os chefes registrados têm fases válidas (thresholds decrescentes, última 0)', () => {
    for (const id of BOSS_IDS) {
      expect(() => validateBossDef(getBoss(id))).not.toThrow();
      const phases = getBoss(id).phases;
      expect(phases[phases.length - 1]!.untilHpPct).toBe(0);
    }
  });

  it('schema de fases inválido falha na validação de conteúdo (P4-02b-01)', () => {
    const base = getBoss('warden');
    const bad = (phases: BossDef['phases']): BossDef => ({ ...base, phases });
    // Thresholds não decrescentes.
    expect(() =>
      validateBossDef(
        bad([
          { patternId: 'ring', untilHpPct: 0.3 },
          { patternId: 'aimed', untilHpPct: 0.6 },
          { patternId: 'aimed', untilHpPct: 0 },
        ]),
      ),
    ).toThrow();
    // Última fase não termina em 0.
    expect(() =>
      validateBossDef(
        bad([
          { patternId: 'ring', untilHpPct: 0.5 },
          { patternId: 'aimed', untilHpPct: 0.2 },
        ]),
      ),
    ).toThrow();
    // patternId inexistente.
    expect(() =>
      validateBossDef(
        bad([
          { patternId: 'nope', untilHpPct: 0.5 },
          { patternId: 'aimed', untilHpPct: 0 },
        ]),
      ),
    ).toThrow();
    // adds com inimigo inexistente.
    expect(() =>
      validateBossDef(
        bad([
          { patternId: 'ring', untilHpPct: 0.5 },
          {
            patternId: 'aimed',
            untilHpPct: 0,
            adds: { enemyId: 'ghost', count: 1, intervalTicks: 60, maxAlive: 2 },
          },
        ]),
      ),
    ).toThrow();
  });

  it('toda onda referencia inimigos existentes', () => {
    for (const id of WAVE_IDS) {
      const wave = getWave(id);
      for (const entry of wave.entries) {
        expect(() => getEnemyDef(entry.enemyId)).not.toThrow();
      }
    }
  });

  it('os novos inimigos da Fase 2 estão registrados', () => {
    expect(ENEMY_IDS).toContain('weaver');
    expect(ENEMY_IDS).toContain('bomber');
    expect(PATTERN_IDS).toContain('spiral');
    expect(PATTERN_IDS).toContain('wall');
  });
});
