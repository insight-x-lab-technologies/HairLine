import { describe, it, expect } from 'vitest';
import { hudPadding } from '../src/ui/hudLayout';

const VW = 720;
const VH = 1280;

describe('hudLayout — padding do HUD respeitando safe-areas (docs/02 §5.3)', () => {
  it('sem insets, o padding é só a base em todos os lados', () => {
    const p = hudPadding(VW, VH, 1920, 1080, { top: 0, right: 0, bottom: 0, left: 0 }, 16);
    expect(p).toEqual({ top: 16, right: 16, bottom: 16, left: 16 });
  });

  it('notch dentro do letterbox NÃO intrude no campo (sem padding extra)', () => {
    // 360x780: escala 0.5, campo 360x640 centralizado → letterbox vertical 70px.
    // Um notch de 40px cabe no letterbox → não invade a área de jogo.
    const p = hudPadding(VW, VH, 360, 780, { top: 40, right: 0, bottom: 0, left: 0 }, 16);
    expect(p.top).toBe(16);
  });

  it('notch que invade o campo vira padding em unidades virtuais', () => {
    // 360x640: escala 0.5, campo preenche a altura (sem letterbox vertical).
    // Notch de 40px css invade 40px → 40/0.5 = 80 virtuais + base.
    const p = hudPadding(VW, VH, 360, 640, { top: 40, right: 0, bottom: 0, left: 0 }, 16);
    expect(p.top).toBeCloseTo(96, 4);
  });

  it('insets laterais em paisagem viram padding horizontal virtual', () => {
    // paisagem: campo estreito centralizado; inset esquerdo grande invade.
    const p = hudPadding(VW, VH, 1280, 720, { top: 0, right: 0, bottom: 0, left: 60 }, 16);
    // escala = min(1280/720=1.778, 720/1280=0.5625) = 0.5625
    // dispW = 405, offsetX = (1280-405)/2 = 437.5 → inset 60 < offsetX → não invade
    expect(p.left).toBe(16);
  });

  it('é determinístico e não retorna valores negativos', () => {
    const p = hudPadding(VW, VH, 400, 900, { top: 100, right: 10, bottom: 80, left: 10 }, 16);
    for (const v of Object.values(p)) expect(v).toBeGreaterThanOrEqual(16);
  });
});
