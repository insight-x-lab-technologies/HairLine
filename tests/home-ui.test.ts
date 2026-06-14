import { describe, it, expect } from 'vitest';
import { homeLayout } from '../src/ui/home';
import type { HudPadding } from '../src/ui/hudLayout';

const W = 720;
const H = 1280;
const pad = (over: Partial<HudPadding> = {}): HudPadding => ({
  top: 16,
  right: 16,
  bottom: 16,
  left: 16,
  ...over,
});

/** Âncoras de conteúdo, na ordem vertical esperada (sem o rodapé). */
function contentAnchors(L: ReturnType<typeof homeLayout>): number[] {
  return [
    L.title,
    L.tagline,
    L.record,
    L.ship,
    L.endless,
    L.stages,
    L.daily,
    L.dayKey,
    L.bossrush,
    L.weekly,
    L.weeklyLabel,
    L.meta,
    L.utilities,
  ];
}

describe('homeLayout', () => {
  it('empilha o conteúdo em ordem vertical estritamente crescente', () => {
    const L = homeLayout(W, H, pad());
    const ys = contentAnchors(L);
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i]!).toBeGreaterThan(ys[i - 1]!);
    }
  });

  it('reserva a faixa de rodapé na base, sem sobreposição com o menu', () => {
    const L = homeLayout(W, H, pad());
    expect(L.footer.top).toBeGreaterThan(L.utilities - 0.001); // utilities não invade o rodapé
    expect(L.utilities).toBeLessThanOrEqual(L.footer.top + 0.001);
    // Rodapé em ordem e dentro da área útil (acima do bottom).
    expect(L.footer.social).toBeLessThan(L.footer.donate);
    expect(L.footer.donate).toBeLessThan(L.footer.legal);
    expect(L.footer.legal).toBeLessThanOrEqual(L.bottom);
  });

  it('respeita as safe-areas (insets deslocam topo/base para dentro)', () => {
    const base = homeLayout(W, H, pad());
    const inset = homeLayout(W, H, pad({ top: 80, bottom: 80 }));
    expect(inset.title).toBeGreaterThan(base.title); // header desce com o inset de topo
    expect(inset.footer.top).toBeLessThan(base.footer.top); // rodapé sobe com o inset de base
    expect(inset.footer.legal).toBeLessThanOrEqual(H - 80); // legal acima do inset inferior
  });

  it('comprime em telas curtas sem sobrepor nem estourar o rodapé', () => {
    const L = homeLayout(W, 640, pad());
    const ys = contentAnchors(L);
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i]!).toBeGreaterThan(ys[i - 1]!);
    }
    expect(L.utilities).toBeLessThanOrEqual(L.footer.top + 0.001);
    expect(L.footer.legal).toBeLessThanOrEqual(L.bottom);
  });

  it('centraliza horizontalmente', () => {
    const L = homeLayout(W, H, pad());
    expect(L.cx).toBe(W / 2);
  });
});
