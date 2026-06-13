import { describe, it, expect } from 'vitest';
import { shareFilename } from '../src/services/ShareImage';

describe('ShareImage — nome do arquivo de compartilhamento (Fase 3)', () => {
  it('inclui modo e score', () => {
    expect(shareFilename({ mode: 'endless', score: 4200, graze: 0, level: 1 })).toBe(
      'hairline-endless-4200.png',
    );
  });

  it('no diário inclui a data', () => {
    expect(
      shareFilename({ mode: 'daily', dayKey: '2026-06-07', score: 999, graze: 0, level: 1 }),
    ).toBe('hairline-daily-2026-06-07-999.png');
  });

  it('é determinístico e seguro (sem espaços/caracteres estranhos)', () => {
    const f = shareFilename({ mode: 'campaign', score: 12345, graze: 7, level: 3 });
    expect(f).toMatch(/^[a-z0-9.-]+$/);
  });
});
