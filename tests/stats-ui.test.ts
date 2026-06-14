import { describe, it, expect } from 'vitest';
import { formatDuration, formatDateShort, statsModel } from '../src/ui/stats';
import type { RunSummary } from '../src/services/Achievements';

describe('ui/stats — formatação derivada (P6-03-02)', () => {
  it('ticks ⇒ m:ss com 60 Hz', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(3600)).toBe('1:00'); // 60 s
    expect(formatDuration(3630)).toBe('1:00'); // arredonda p/ baixo (meio segundo)
    expect(formatDuration(90 * 60)).toBe('1:30'); // 90 s
    expect(formatDuration(60 * 60 * 12)).toBe('12:00');
  });

  it('valores inválidos de duração não quebram', () => {
    expect(formatDuration(-100)).toBe('0:00');
    expect(formatDuration(Number.NaN)).toBe('0:00');
  });

  it('dateIso ⇒ data curta; ausente/ inválida ⇒ travessão', () => {
    expect(formatDateShort('2026-06-14T12:00:00.000Z')).toMatch(/^\d{2}\/\d{2}$/);
    expect(formatDateShort(undefined)).toBe('—');
    expect(formatDateShort('lixo')).toBe('—');
  });
});

describe('ui/stats — modelo de exibição (P6-03-02)', () => {
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
    seed: 1,
    ...over,
  });

  it('perfil vazio ⇒ empty true, sem NaN', () => {
    const m = statsModel({}, {}, []);
    expect(m.empty).toBe(true);
    expect(m.totals.runs).toBe(0);
    expect(m.totals.playtime).toBe('0:00');
    expect(m.bests).toEqual([]);
    expect(m.history).toEqual([]);
  });

  it('agrega totais, recordes (só os existentes) e histórico formatado', () => {
    const totals = { totalRuns: 2, totalKills: 8, totalGraze: 30, totalWins: 1 };
    const best = { endless: 2500, daily: 1500 };
    const history = [run({ score: 2500, won: true }), run({ daily: true, score: 1500 })];
    const m = statsModel(totals, best, history);

    expect(m.empty).toBe(false);
    expect(m.totals).toMatchObject({ runs: 2, kills: 8, grazes: 30, wins: 1 });
    // tempo = soma das durações do histórico (2 × 3600 ticks = 120 s)
    expect(m.totals.playtime).toBe('2:00');
    // só modos com recorde aparecem, na ordem canônica
    expect(m.bests.map((b) => b.mode)).toEqual(['endless', 'daily']);
    expect(m.history[0]).toMatchObject({ modeLabel: 'Endless', score: 2500, won: true });
    expect(m.history[1]!.modeLabel).toBe('Diário');
  });
});
