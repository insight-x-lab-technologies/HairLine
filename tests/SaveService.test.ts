import { describe, it, expect } from 'vitest';
import { SaveService, type KeyValueStore } from '../src/services/SaveService';
import type { RunSummary } from '../src/services/Achievements';

/** Store em memória para teste (sem depender de localStorage). */
function fakeStore(): KeyValueStore {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
  };
}

describe('SaveService — persistência local (docs/02 §8)', () => {
  it('melhor pontuação começa em zero', () => {
    const s = new SaveService(fakeStore());
    expect(s.getBestScore()).toBe(0);
  });

  it('registra novo recorde e persiste', () => {
    const store = fakeStore();
    const s = new SaveService(store);
    expect(s.setBestScore(1500)).toBe(true);
    expect(s.getBestScore()).toBe(1500);
    // nova instância sobre o mesmo store mantém o valor
    expect(new SaveService(store).getBestScore()).toBe(1500);
  });

  it('não rebaixa o recorde com pontuação menor', () => {
    const s = new SaveService(fakeStore());
    s.setBestScore(2000);
    expect(s.setBestScore(500)).toBe(false);
    expect(s.getBestScore()).toBe(2000);
  });

  it('é resiliente a valor corrompido no store', () => {
    const store = fakeStore();
    store.setItem('hairline.bestScore', 'abc');
    const s = new SaveService(store);
    expect(s.getBestScore()).toBe(0);
  });

  it('funciona sem store disponível (fallback em memória)', () => {
    const s = new SaveService(null);
    expect(s.getBestScore()).toBe(0);
    expect(s.setBestScore(300)).toBe(true);
    expect(s.getBestScore()).toBe(300);
  });

  it('seleção de cosméticos começa vazia e persiste (P6-01-01)', () => {
    const store = fakeStore();
    const s = new SaveService(store);
    expect(s.getLoadoutSelection()).toEqual({});
    s.setLoadoutSelection({ shipId: 'ship-prism', shotColorId: 'shot-ion' });
    // nova instância sobre o mesmo store mantém a seleção
    expect(new SaveService(store).getLoadoutSelection()).toEqual({
      shipId: 'ship-prism',
      shotColorId: 'shot-ion',
    });
  });

  it('seleção de cosméticos corrompida cai em vazio (P6-01-01)', () => {
    const store = fakeStore();
    store.setItem('hairline.loadout.v1', '{nao é json');
    expect(new SaveService(store).getLoadoutSelection()).toEqual({});
  });

  it('esquema de controle: ausente ⇒ null, escolha persiste (P10-01)', () => {
    const store = fakeStore();
    const s = new SaveService(store);
    expect(s.getControlScheme()).toBeNull();
    s.setControlScheme('absolute');
    expect(new SaveService(store).getControlScheme()).toBe('absolute');
    s.setControlScheme('relative');
    expect(new SaveService(store).getControlScheme()).toBe('relative');
  });

  it('esquema de controle inválido no store ⇒ null (cai no default) (P10-01)', () => {
    const store = fakeStore();
    store.setItem('hairline.controlScheme.v1', 'diagonal');
    expect(new SaveService(store).getControlScheme()).toBeNull();
  });

  it('tema de apresentação: ausente ⇒ null, escolha persiste (P10-04)', () => {
    const store = fakeStore();
    const s = new SaveService(store);
    expect(s.getSelectedThemeId()).toBeNull();
    s.setSelectedThemeId('arcade');
    // nova instância sobre o mesmo store mantém a escolha
    expect(new SaveService(store).getSelectedThemeId()).toBe('arcade');
  });

  it('tema vazio no store ⇒ null (a validade fica no registro) (P10-04)', () => {
    const store = fakeStore();
    store.setItem('hairline.theme.v1', '');
    expect(new SaveService(store).getSelectedThemeId()).toBeNull();
  });
});

describe('SaveService — perfil acumulado e histórico (P6-03)', () => {
  const run = (over: Partial<RunSummary> = {}): RunSummary => ({
    mode: 'endless',
    daily: false,
    won: false,
    score: 1000,
    graze: 10,
    kills: 5,
    livesLost: 0,
    durationTicks: 3600,
    dateIso: '2026-06-14T12:00:00.000Z',
    seed: 42,
    ...over,
  });

  it('acumula totais e recordes por modo em sequência (P6-03-01)', () => {
    const s = new SaveService(fakeStore());
    s.recordRun(run({ mode: 'endless', score: 1000, kills: 5, graze: 10, won: false }));
    s.recordRun(run({ mode: 'endless', score: 2500, kills: 7, graze: 20, won: true }));
    s.recordRun(run({ mode: 'endless', daily: true, score: 1500, kills: 3, graze: 8 }));

    expect(s.getProfileTotals()).toMatchObject({
      totalRuns: 3,
      totalKills: 15,
      totalGraze: 38,
      totalWins: 1,
      totalDaily: 1,
    });
    const best = s.getBestByMode();
    expect(best.endless).toBe(2500);
    expect(best.daily).toBe(1500);
  });

  it('pontuação menor não rebaixa o recorde do modo (P6-03-01)', () => {
    const s = new SaveService(fakeStore());
    s.recordRun(run({ score: 3000 }));
    s.recordRun(run({ score: 500 }));
    expect(s.getBestByMode().endless).toBe(3000);
  });

  it('migra bestScore legado para bestByMode.endless (P6-03-01 req 4)', () => {
    const store = fakeStore();
    store.setItem('hairline.bestScore', '5000');
    const s = new SaveService(store);
    expect(s.getBestByMode().endless).toBe(5000);
    // a chave legada permanece intacta (rollback barato)
    expect(s.getBestScore()).toBe(5000);
  });

  it('sem legado e sem perfil, recordes começam vazios (P6-03-01)', () => {
    expect(new SaveService(fakeStore()).getBestByMode()).toEqual({});
  });

  it('perfil corrompido ⇒ reset limpo, recordRun seguinte funciona (P6-03-01)', () => {
    const store = fakeStore();
    store.setItem('hairline.profile.totals.v1', '{lixo');
    store.setItem('hairline.profile.best.v1', 'não json');
    store.setItem('hairline.profile.history.v1', '{nao array');
    const s = new SaveService(store);
    expect(s.getProfileTotals()).toEqual({});
    expect(s.getBestByMode()).toEqual({});
    expect(s.getHistory()).toEqual([]);
    s.recordRun(run({ score: 1234 }));
    expect(s.getProfileTotals().totalRuns).toBe(1);
    expect(s.getBestByMode().endless).toBe(1234);
    expect(s.getHistory()).toHaveLength(1);
  });

  it('histórico é um anel de 20: 21ª run poda a mais antiga (P6-03-02)', () => {
    const s = new SaveService(fakeStore());
    for (let i = 1; i <= 21; i++) s.recordRun(run({ score: i }));

    const hist = s.getHistory();
    expect(hist).toHaveLength(20);
    // mais recente primeiro
    expect(hist[0]!.score).toBe(21);
    // a mais antiga (score 1) caiu; a 2 é agora a última
    expect(hist[hist.length - 1]!.score).toBe(2);
    expect(hist.some((r) => r.score === 1)).toBe(false);
    // agregados contam todas as 21, mesmo as podadas
    expect(s.getProfileTotals().totalRuns).toBe(21);
  });

  it('perfil sem chave de histórico (gravado antes da P6-03-02) ⇒ lista vazia', () => {
    const store = fakeStore();
    // só totais, sem a chave de histórico
    store.setItem('hairline.profile.totals.v1', JSON.stringify({ totalRuns: 3 }));
    const s = new SaveService(store);
    expect(s.getHistory()).toEqual([]);
    s.recordRun(run({ score: 99 }));
    expect(s.getHistory()).toHaveLength(1);
    expect(s.getProfileTotals().totalRuns).toBe(4);
  });
});
