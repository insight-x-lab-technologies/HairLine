import { describe, it, expect } from 'vitest';
import {
  weekKey,
  weeklySeed,
  pickWeeklyModifiers,
  combineMods,
  MODIFIERS,
} from '../src/systems/Modifiers';

describe('Modifiers — mutadores semanais (docs/04 Fase 4)', () => {
  it('weekKey tem o formato ANO-Www e é estável dentro da semana', () => {
    const a = weekKey(new Date('2026-06-08T00:00:00Z')); // segunda
    const b = weekKey(new Date('2026-06-12T23:00:00Z')); // sexta da mesma semana
    expect(a).toMatch(/^\d{4}-W\d{2}$/);
    expect(a).toBe(b);
  });

  it('semanas diferentes geram seeds diferentes', () => {
    const s1 = weeklySeed(new Date('2026-06-08T00:00:00Z'));
    const s2 = weeklySeed(new Date('2026-06-15T00:00:00Z'));
    expect(s1).not.toBe(s2);
  });

  it('escolhe N modificadores distintos, determinístico por semana', () => {
    const d = new Date('2026-06-08T12:00:00Z');
    const a = pickWeeklyModifiers(d, 2);
    const b = pickWeeklyModifiers(d, 2);
    expect(a).toHaveLength(2);
    expect(a.map((m) => m.id)).toEqual(b.map((m) => m.id));
    expect(a[0]!.id).not.toBe(a[1]!.id); // distintos
  });

  it('combineMods multiplica os multiplicadores', () => {
    const defs = MODIFIERS.filter((m) => m.id === 'double-graze' || m.id === 'swarm');
    const combined = combineMods(defs);
    // double-graze tem scorePerGrazeMul=2; swarm tem spawnIntervalMul<1
    expect(combined.scorePerGrazeMul).toBeGreaterThanOrEqual(2);
    expect(combined.spawnIntervalMul ?? 1).toBeLessThan(1);
  });

  it('combineMods sem nenhum modificador é neutro', () => {
    const c = combineMods([]);
    expect(c.scorePerGrazeMul ?? 1).toBe(1);
    expect(c.spawnIntervalMul ?? 1).toBe(1);
    expect(c.livesOverride).toBeUndefined();
  });

  it('todos os modificadores têm id e rótulo', () => {
    expect(MODIFIERS.length).toBeGreaterThanOrEqual(4);
    for (const m of MODIFIERS) {
      expect(m.id).toBeTruthy();
      expect(m.label.length).toBeGreaterThan(0);
    }
  });
});
