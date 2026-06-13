import { describe, it, expect } from 'vitest';
import { shareCard } from '../src/services/ShareCard';

describe('ShareCard — resultado compartilhável (docs/04 Fase 3)', () => {
  it('inclui título, score, graze e nível', () => {
    const txt = shareCard({
      mode: 'daily',
      dayKey: '2026-06-07',
      score: 12345,
      graze: 88,
      level: 7,
    });
    expect(txt).toContain('HAIRLINE');
    expect(txt).toContain('2026-06-07');
    expect(txt).toContain('12345');
    expect(txt).toContain('88');
  });

  it('é determinístico para a mesma entrada', () => {
    const d = { mode: 'endless' as const, score: 500, graze: 10, level: 2 };
    expect(shareCard(d)).toBe(shareCard(d));
  });

  it('marca vitória quando won=true', () => {
    const txt = shareCard({ mode: 'stage', score: 9000, graze: 50, level: 1, won: true });
    expect(txt.toLowerCase()).toContain('vit');
  });

  it('modo diário menciona "Diário"; endless menciona "Endless"', () => {
    expect(
      shareCard({ mode: 'daily', dayKey: '2026-06-07', score: 1, graze: 0, level: 1 }),
    ).toContain('Diário');
    expect(shareCard({ mode: 'endless', score: 1, graze: 0, level: 1 })).toContain('Endless');
  });
});
