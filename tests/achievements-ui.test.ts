import { describe, it, expect } from 'vitest';
import { galleryModel, toastQueue } from '../src/ui/achievements';
import type { AchievementDef } from '../src/services/Achievements';

/** Defs sintéticas (ordem do array = ordem de exibição). */
const DEFS: readonly AchievementDef[] = [
  { id: 'a', title: 'Alfa', desc: 'Faça A.', condition: { type: 'winMode', mode: 'any' } },
  { id: 'b', title: 'Beta', desc: 'Faça B.', condition: { type: 'winMode', mode: 'any' } },
  { id: 'c', title: 'Gama', desc: 'Faça C.', condition: { type: 'winMode', mode: 'any' } },
];

describe('galleryModel (P6-02-02)', () => {
  it('estado vazio: 0/N, todas apagadas com a condição', () => {
    const m = galleryModel(DEFS, {});
    expect(m.unlockedCount).toBe(0);
    expect(m.total).toBe(3);
    expect(m.rows.every((r) => !r.unlocked && r.dateIso === undefined)).toBe(true);
    expect(m.rows.map((r) => r.desc)).toEqual(['Faça A.', 'Faça B.', 'Faça C.']);
  });

  it('parcial: acesas trazem a data; contador conta só as do JSON', () => {
    const m = galleryModel(DEFS, { a: '2026-06-14', c: '2026-06-13' });
    expect(m.unlockedCount).toBe(2);
    expect(m.total).toBe(3);
    expect(m.rows.map((r) => r.unlocked)).toEqual([true, false, true]);
    expect(m.rows[0]!.dateIso).toBe('2026-06-14');
    expect(m.rows[1]!.dateIso).toBeUndefined();
  });

  it('ordem do JSON é preservada na exibição', () => {
    const m = galleryModel(DEFS, { b: '2026-01-01' });
    expect(m.rows.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('conquista no perfil ausente do JSON é ignorada (sem erro)', () => {
    const m = galleryModel(DEFS, { a: '2026-06-14', removida: '2025-01-01' });
    expect(m.unlockedCount).toBe(1);
    expect(m.rows.find((r) => r.id === 'removida')).toBeUndefined();
  });
});

describe('toastQueue (P6-02-02)', () => {
  it('N desbloqueios ⇒ N anúncios na ordem do JSON', () => {
    const q = toastQueue(DEFS, ['c', 'a']);
    expect(q.map((t) => t.id)).toEqual(['a', 'c']);
    expect(q.map((t) => t.title)).toEqual(['Alfa', 'Gama']);
  });

  it('0 desbloqueios ⇒ nenhum anúncio', () => {
    expect(toastQueue(DEFS, [])).toEqual([]);
  });

  it('ID sem definição (conteúdo removido) é ignorado', () => {
    expect(toastQueue(DEFS, ['removida', 'b'])).toEqual([{ id: 'b', title: 'Beta' }]);
  });
});
