import { describe, it, expect } from 'vitest';
import { SaveService, type KeyValueStore } from '../src/services/SaveService';
import { stagePayload, stageRows } from '../src/ui/stageSelect';
import { STAGE_IDS } from '../src/content';

/**
 * Progresso/desbloqueio de estágios (P4-04b-04). Lógica de meta-jogo (fora da
 * sim): testável em jsdom com um store em memória injetado.
 */
function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

const ORDER = ['stage-001', 'stage-002', 'stage-003'];

describe('SaveService — progresso por estágio (P4-04b-04)', () => {
  it('save vazio: só o primeiro estágio está desbloqueado', () => {
    const save = new SaveService(memoryStore());
    expect(save.isStageUnlocked('stage-001', ORDER)).toBe(true);
    expect(save.isStageUnlocked('stage-002', ORDER)).toBe(false);
    expect(save.isStageUnlocked('stage-003', ORDER)).toBe(false);
    expect(save.getStageRecord('stage-001')).toEqual({ completed: false, bestScore: 0 });
  });

  it('concluir o estágio 1 desbloqueia o 2 (mas não o 3)', () => {
    const save = new SaveService(memoryStore());
    save.recordStageResult('stage-001', { completed: true, score: 1000 });
    expect(save.isStageUnlocked('stage-002', ORDER)).toBe(true);
    expect(save.isStageUnlocked('stage-003', ORDER)).toBe(false);
  });

  it('best score é monotônico (só sobe) e marca recorde corretamente', () => {
    const save = new SaveService(memoryStore());
    expect(save.recordStageResult('stage-001', { completed: false, score: 500 }).isRecord).toBe(true);
    expect(save.recordStageResult('stage-001', { completed: false, score: 300 }).isRecord).toBe(
      false,
    );
    expect(save.recordStageResult('stage-001', { completed: true, score: 800 }).isRecord).toBe(true);
    expect(save.getStageRecord('stage-001')).toEqual({ completed: true, bestScore: 800 });
  });

  it('conclusão é monotônica: um resultado posterior sem vitória não "desconclui"', () => {
    const save = new SaveService(memoryStore());
    save.recordStageResult('stage-001', { completed: true, score: 800 });
    save.recordStageResult('stage-001', { completed: false, score: 900 });
    expect(save.getStageRecord('stage-001').completed).toBe(true);
    expect(save.getStageRecord('stage-001').bestScore).toBe(900);
  });

  it('round-trip de serialização: outro SaveService lê o mesmo store', () => {
    const store = memoryStore();
    new SaveService(store).recordStageResult('stage-002', { completed: true, score: 1234 });
    const reloaded = new SaveService(store);
    expect(reloaded.getStageRecord('stage-002')).toEqual({ completed: true, bestScore: 1234 });
  });
});

describe('seletor de estágios — helpers puros (P4-04b-04)', () => {
  it('stagePayload monta GameSceneData com mode stage e stageId correto', () => {
    expect(stagePayload('stage-002')).toEqual({ mode: 'stage', stageId: 'stage-002' });
  });

  it('stageRows reflete nome, desbloqueio e recorde na ordem canônica', () => {
    const save = new SaveService(memoryStore());
    const rows = stageRows(STAGE_IDS, save);
    expect(rows.map((r) => r.id)).toEqual([...STAGE_IDS]);
    expect(rows[0]!.unlocked).toBe(true);
    expect(rows[1]!.unlocked).toBe(false);
    save.recordStageResult(STAGE_IDS[0]!, { completed: true, score: 10 });
    expect(stageRows(STAGE_IDS, save)[1]!.unlocked).toBe(true);
  });
});
