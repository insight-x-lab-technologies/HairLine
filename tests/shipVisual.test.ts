import { describe, it, expect } from 'vitest';
import { shipVisualState, SHIP_FOCUS_SCALE } from '../src/render/shipVisual';

describe('shipVisual — mapeamento estado→visual da nave (P10-10)', () => {
  it('fora do Foco a escala é 1; no Foco encolhe para SHIP_FOCUS_SCALE', () => {
    expect(shipVisualState({ focus: false, invulnerable: false, timeMs: 0 }).scale).toBe(1);
    expect(shipVisualState({ focus: true, invulnerable: false, timeMs: 0 }).scale).toBe(
      SHIP_FOCUS_SCALE,
    );
  });

  it('sem i-frames o alpha é 1 (nave sólida)', () => {
    for (const t of [0, 100, 999]) {
      expect(shipVisualState({ focus: false, invulnerable: false, timeMs: t }).alpha).toBe(1);
    }
  });

  it('em i-frames o alpha oscila dentro de [0, 1] (pisca, nunca some)', () => {
    for (let t = 0; t < 400; t += 7) {
      const a = shipVisualState({ focus: false, invulnerable: true, timeMs: t }).alpha;
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
    }
  });

  it('o alpha de i-frames varia com o tempo (é realmente um piscar, não fixo)', () => {
    const a0 = shipVisualState({ focus: false, invulnerable: true, timeMs: 0 }).alpha;
    // 35ms · π/2 ≈ 55ms ⇒ pico do seno (alpha máximo).
    const aPeak = shipVisualState({
      focus: false,
      invulnerable: true,
      timeMs: 35 * (Math.PI / 2),
    }).alpha;
    expect(aPeak).toBeGreaterThan(a0);
  });

  it('a chama do motor pulsa sempre (escala vertical positiva e oscilante)', () => {
    const e0 = shipVisualState({ focus: false, invulnerable: false, timeMs: 0 }).engineScaleY;
    const e1 = shipVisualState({
      focus: false,
      invulnerable: false,
      timeMs: 60 * (Math.PI / 2),
    }).engineScaleY;
    expect(e0).toBeGreaterThan(0);
    expect(e1).toBeGreaterThan(e0);
  });

  it('é pura: mesmas entradas ⇒ mesma saída', () => {
    const inp = { focus: true, invulnerable: true, timeMs: 123 };
    expect(shipVisualState(inp)).toEqual(shipVisualState(inp));
  });
});
