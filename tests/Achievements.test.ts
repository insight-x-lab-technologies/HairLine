import { describe, it, expect } from 'vitest';
import {
  isSatisfied,
  evaluate,
  validateAchievements,
  recordAndUnlock,
  type AchievementDef,
  type AchievementProfile,
  type RunSummary,
} from '../src/services/Achievements';
import { SaveService, type KeyValueStore } from '../src/services/SaveService';

function run(p: Partial<RunSummary> = {}): RunSummary {
  return {
    mode: p.mode ?? 'endless',
    daily: p.daily ?? false,
    won: p.won ?? false,
    score: p.score ?? 0,
    graze: p.graze ?? 0,
    kills: p.kills ?? 0,
    livesLost: p.livesLost ?? 0,
  };
}

function profile(p: Partial<AchievementProfile> = {}): AchievementProfile {
  return { totals: p.totals ?? {}, best: p.best ?? {} };
}

function fakeStore(): KeyValueStore {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

describe('Achievements — condições (P6-02-01)', () => {
  it('totalAtLeast avalia na borda exata do limiar', () => {
    const c = { type: 'totalAtLeast', stat: 'totalGraze', value: 1000 } as const;
    expect(isSatisfied(c, profile({ totals: { totalGraze: 999 } }), run())).toBe(false);
    expect(isSatisfied(c, profile({ totals: { totalGraze: 1000 } }), run())).toBe(true);
    expect(isSatisfied(c, profile({ totals: { totalGraze: 1001 } }), run())).toBe(true);
    expect(isSatisfied(c, profile(), run())).toBe(false); // total ausente = 0
  });

  it('runStat com gte (default) e lte', () => {
    const gte = { type: 'runStat', stat: 'graze', value: 200 } as const;
    expect(isSatisfied(gte, profile(), run({ graze: 199 }))).toBe(false);
    expect(isSatisfied(gte, profile(), run({ graze: 200 }))).toBe(true);
    const lte = { type: 'runStat', stat: 'livesLost', value: 0, cmp: 'lte' } as const;
    expect(isSatisfied(lte, profile(), run({ livesLost: 0 }))).toBe(true);
    expect(isSatisfied(lte, profile(), run({ livesLost: 1 }))).toBe(false);
  });

  it('runStat com modo: graze alto no endless não conta para condição do diário', () => {
    const c = { type: 'runStat', stat: 'graze', value: 1, mode: 'daily' } as const;
    expect(isSatisfied(c, profile(), run({ graze: 9999, daily: false }))).toBe(false);
    expect(isSatisfied(c, profile(), run({ graze: 1, daily: true }))).toBe(true);
  });

  it('bestAtLeast por modo', () => {
    const c = { type: 'bestAtLeast', mode: 'endless', value: 50000 } as const;
    expect(isSatisfied(c, profile({ best: { endless: 49999 } }), run())).toBe(false);
    expect(isSatisfied(c, profile({ best: { endless: 50000 } }), run())).toBe(true);
    expect(isSatisfied(c, profile({ best: { daily: 99999 } }), run())).toBe(false); // outro modo
  });

  it('winMode: derrota não desbloqueia; vitória no modo certo sim; any aceita qualquer', () => {
    const bossrush = { type: 'winMode', mode: 'bossrush' } as const;
    expect(isSatisfied(bossrush, profile(), run({ won: false, mode: 'bossrush' }))).toBe(false);
    expect(isSatisfied(bossrush, profile(), run({ won: true, mode: 'endless' }))).toBe(false);
    expect(isSatisfied(bossrush, profile(), run({ won: true, mode: 'bossrush' }))).toBe(true);
    const any = { type: 'winMode', mode: 'any' } as const;
    expect(isSatisfied(any, profile(), run({ won: true, mode: 'stage' }))).toBe(true);
  });

  it('winMode noDamage exige vitória sem perder vidas', () => {
    const c = { type: 'winMode', mode: 'any', noDamage: true } as const;
    expect(isSatisfied(c, profile(), run({ won: true, livesLost: 1 }))).toBe(false);
    expect(isSatisfied(c, profile(), run({ won: true, livesLost: 0 }))).toBe(true);
    expect(isSatisfied(c, profile(), run({ won: false, livesLost: 0 }))).toBe(false);
  });
});

describe('Achievements — avaliador (P6-02-01)', () => {
  const defs: AchievementDef[] = [
    { id: 'a', title: 'A', desc: 'a', condition: { type: 'winMode', mode: 'any' } },
    { id: 'b', title: 'B', desc: 'b', condition: { type: 'runStat', stat: 'graze', value: 100 } },
    { id: 'c', title: 'C', desc: 'c', condition: { type: 'totalAtLeast', stat: 'totalRuns', value: 1 } },
  ];

  it('run que satisfaz 3 condições devolve 3 IDs novos na ordem do JSON', () => {
    const newly = evaluate(
      defs,
      profile({ totals: { totalRuns: 1 } }),
      run({ won: true, graze: 150 }),
      new Set(),
    );
    expect(newly).toEqual(['a', 'b', 'c']);
  });

  it('idempotência: já desbloqueada nunca re-desbloqueia', () => {
    const newly = evaluate(
      defs,
      profile({ totals: { totalRuns: 1 } }),
      run({ won: true, graze: 150 }),
      new Set(['a', 'c']),
    );
    expect(newly).toEqual(['b']);
  });

  it('nada satisfeito ⇒ []', () => {
    expect(evaluate(defs, profile(), run(), new Set())).toEqual([]);
  });
});

describe('Achievements — integridade do JSON (P6-02-01)', () => {
  it('barra id duplicado, fora de kebab-case e condição/campo desconhecidos', () => {
    const ok: AchievementDef[] = [
      { id: 'first-win', title: 'X', desc: 'y', condition: { type: 'winMode', mode: 'any' } },
    ];
    expect(() => validateAchievements(ok)).not.toThrow();

    expect(() =>
      validateAchievements([ok[0]!, { ...ok[0]! }]),
    ).toThrow(/duplicado/);

    expect(() =>
      validateAchievements([{ ...ok[0]!, id: 'Bad_ID' }]),
    ).toThrow(/kebab-case/);

    expect(() =>
      validateAchievements([
        { id: 'x', title: 'X', desc: 'y', condition: { type: 'totalAtLeast', stat: 'xp', value: 5 } },
      ]),
    ).toThrow(/total desconhecido/);

    expect(() =>
      validateAchievements([
        { id: 'x', title: 'X', desc: 'y', condition: { type: 'bestAtLeast', mode: 'any', value: 5 } },
      ]),
    ).toThrow(/modo concreto/);
  });
});

describe('Achievements — recordAndUnlock integra com SaveService (P6-02-01)', () => {
  const defs: AchievementDef[] = [
    { id: 'first-flight', title: 'F', desc: 'd', condition: { type: 'totalAtLeast', stat: 'totalRuns', value: 1 } },
    { id: 'first-win', title: 'W', desc: 'd', condition: { type: 'winMode', mode: 'any' } },
  ];

  it('terminar a primeira run grava "first-flight"; derrota não dá "first-win"', () => {
    const store = fakeStore();
    const save = new SaveService(store);
    const newly = recordAndUnlock(save, defs, run({ won: false, graze: 10 }), () => '2026-06-14');
    expect(newly).toEqual(['first-flight']);
    // persiste com data e sobrevive a recarga
    expect(new SaveService(store).getAchievements()).toEqual({ 'first-flight': '2026-06-14' });
    expect(save.getProfileTotals().totalRuns).toBe(1);
  });

  it('rodar de novo após vitória adiciona só "first-win" (idempotente)', () => {
    const store = fakeStore();
    const save = new SaveService(store);
    recordAndUnlock(save, defs, run(), () => '2026-06-14');
    const newly = recordAndUnlock(save, defs, run({ won: true }), () => '2026-06-15');
    expect(newly).toEqual(['first-win']);
    expect(save.getProfileTotals().totalRuns).toBe(2);
    expect(save.getProfileTotals().totalWins).toBe(1);
    const map = save.getAchievements();
    expect(map['first-flight']).toBe('2026-06-14'); // data preservada
    expect(map['first-win']).toBe('2026-06-15');
  });

  it('best por modo: run diária registra best em endless e em daily', () => {
    const save = new SaveService(fakeStore());
    recordAndUnlock(save, defs, run({ mode: 'endless', daily: true, score: 1234 }));
    expect(save.getBestByMode().endless).toBe(1234);
    expect(save.getBestByMode().daily).toBe(1234);
  });

  it('conquista no perfil ausente do JSON é preservada, sem erro', () => {
    const store = fakeStore();
    const save = new SaveService(store);
    save.unlockAchievements(['conquista-extinta'], '2025-01-01');
    // defs não contém esse id; recordAndUnlock não deve removê-lo
    recordAndUnlock(save, defs, run(), () => '2026-06-14');
    expect(save.getAchievements()['conquista-extinta']).toBe('2025-01-01');
  });
});
