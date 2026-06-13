import { describe, it, expect } from 'vitest';
import { dayKey, dailySeed } from '../src/services/DailySeed';

describe('DailySeed — cenário do dia igual para todos (docs/04 Fase 3)', () => {
  it('dayKey é a data UTC em YYYY-MM-DD', () => {
    expect(dayKey(new Date('2026-06-07T10:30:00Z'))).toBe('2026-06-07');
    expect(dayKey(new Date('2026-06-07T23:59:59Z'))).toBe('2026-06-07');
    expect(dayKey(new Date('2026-12-31T00:00:00Z'))).toBe('2026-12-31');
  });

  it('a seed é determinística para a mesma data (mesma para todos)', () => {
    const a = dailySeed(new Date('2026-06-07T08:00:00Z'));
    const b = dailySeed(new Date('2026-06-07T20:00:00Z'));
    expect(a).toBe(b);
  });

  it('dias diferentes geram seeds diferentes', () => {
    expect(dailySeed(new Date('2026-06-07T00:00:00Z'))).not.toBe(
      dailySeed(new Date('2026-06-08T00:00:00Z')),
    );
  });

  it('a seed é um uint32 válido', () => {
    const s = dailySeed(new Date('2026-06-07T00:00:00Z'));
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(0xffffffff);
  });
});
