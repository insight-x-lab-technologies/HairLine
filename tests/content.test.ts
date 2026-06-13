import { describe, it, expect } from 'vitest';
import {
  getPattern,
  getEnemyDef,
  getBoss,
  getWave,
  PATTERN_IDS,
  ENEMY_IDS,
  BOSS_IDS,
  WAVE_IDS,
} from '../src/content';

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
    for (const id of BOSS_IDS) {
      const boss = getBoss(id);
      expect(boss.phasePatternIds.length).toBeGreaterThanOrEqual(2); // 2 fases
      for (const pid of boss.phasePatternIds) {
        expect(() => getPattern(pid)).not.toThrow();
      }
    }
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
