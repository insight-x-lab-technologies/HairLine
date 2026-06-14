import { describe, it, expect } from 'vitest';
import {
  getPattern,
  getEnemyDef,
  getBoss,
  getWave,
  getStage,
  getCosmetics,
  getAchievementDefs,
  getShips,
  getShip,
  getShipOrDefault,
  DEFAULT_SHIP_ID,
  validateBossDef,
  validateStageDef,
  PATTERN_IDS,
  ENEMY_IDS,
  BOSS_IDS,
  WAVE_IDS,
  STAGE_IDS,
  SHIP_IDS,
} from '../src/content';
import { validateCosmetics, getDefault } from '../src/services/Cosmetics';
import { validateAchievements } from '../src/services/Achievements';
import { validateShips, shipRules, isIdentity } from '../src/sim/Ships';
import type { BossDef, StageDef } from '../src/content/types';

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

  it('todo estágio registrado tem seções válidas (ondas/chefes existentes)', () => {
    expect(STAGE_IDS.length).toBeGreaterThanOrEqual(3); // P4-04b-03
    for (const id of STAGE_IDS) {
      const stage = getStage(id);
      expect(() => validateStageDef(stage)).not.toThrow();
      expect(stage.sections.length).toBeGreaterThanOrEqual(1);
      for (const s of stage.sections) {
        if (s.type === 'wave') expect(() => getWave(s.waveId)).not.toThrow();
        else expect(() => getBoss(s.bossId)).not.toThrow();
      }
    }
  });

  it('estágio inválido falha na validação (onda inexistente, seções vazias) — P4-04b-01', () => {
    const base = getStage('stage-001');
    const bad = (sections: StageDef['sections']): StageDef => ({ ...base, sections });
    // Seções vazias.
    expect(() => validateStageDef(bad([]))).toThrow();
    // Onda inexistente.
    expect(() => validateStageDef(bad([{ type: 'wave', waveId: 'wave-999' }]))).toThrow();
    // Chefe inexistente.
    expect(() => validateStageDef(bad([{ type: 'boss', bossId: 'ninguem' }]))).toThrow();
  });

  it('a ordem de STAGE_IDS é o contrato de desbloqueio (stage-001 primeiro) — P4-04b-04', () => {
    expect(STAGE_IDS[0]).toBe('stage-001');
  });

  it('o catálogo de cosméticos inicial é válido (P6-01-01)', () => {
    const c = getCosmetics();
    expect(() => validateCosmetics(c)).not.toThrow();
    // ~3 naves, ~4 cores de tiro, ~2 trilhas — pelo menos um default por tipo.
    expect(c.ships.length).toBeGreaterThanOrEqual(3);
    expect(c.shotColors.length).toBeGreaterThanOrEqual(4);
    expect(c.music.length).toBeGreaterThanOrEqual(2);
    expect(getDefault(c, 'ship').id).toBe('ship-default');
    expect(getDefault(c, 'shotColor').id).toBe('shot-default');
    expect(getDefault(c, 'music').id).toBe('music-default');
  });

  it('o roster de naves inicial é válido e a default é identidade (P6-04)', () => {
    const ships = getShips();
    expect(() => validateShips(ships)).not.toThrow();
    expect(ships.length).toBeGreaterThanOrEqual(2);
    // DEFAULT_SHIP_ID é a primeira da ordem (ordinal estável) e é baseline pura.
    expect(SHIP_IDS[0]).toBe(DEFAULT_SHIP_ID);
    expect(isIdentity(shipRules(getShip(DEFAULT_SHIP_ID)))).toBe(true);
    // IDs únicos; getShipOrDefault nunca quebra.
    expect(new Set(SHIP_IDS).size).toBe(SHIP_IDS.length);
    expect(getShipOrDefault('___').id).toBe(DEFAULT_SHIP_ID);
  });

  it('as conquistas iniciais são válidas e cobrem os 4 tipos de condição (P6-02-01)', () => {
    const defs = getAchievementDefs();
    expect(() => validateAchievements(defs)).not.toThrow();
    expect(defs.length).toBeGreaterThanOrEqual(10);
    const types = new Set(defs.map((d) => d.condition.type));
    expect(types).toEqual(new Set(['totalAtLeast', 'runStat', 'bestAtLeast', 'winMode']));
    // IDs únicos (contrato imutável referenciado por cosméticos).
    expect(new Set(defs.map((d) => d.id)).size).toBe(defs.length);
  });
});
