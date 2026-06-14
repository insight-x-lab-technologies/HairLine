import { describe, it, expect } from 'vitest';
import { heroBackground } from '../src/ui/heroBackground';

const W = 720;
const H = 1280;

describe('heroBackground', () => {
  it('é determinístico: mesma seed ⇒ mesma saída', () => {
    const a = heroBackground(W, H, 12345);
    const b = heroBackground(W, H, 12345);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('seeds diferentes ⇒ saídas diferentes', () => {
    const a = heroBackground(W, H, 1);
    const b = heroBackground(W, H, 2);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('respeita as contagens pedidas', () => {
    const bg = heroBackground(W, H, 7, 40, 3);
    expect(bg.stars).toHaveLength(40);
    expect(bg.beams).toHaveLength(3);
  });

  it('gera estrelas dentro do campo e com alpha/raio plausíveis', () => {
    const bg = heroBackground(W, H, 99);
    for (const s of bg.stars) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(W);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(H);
      expect(s.r).toBeGreaterThan(0);
      expect(s.alpha).toBeGreaterThan(0);
      expect(s.alpha).toBeLessThanOrEqual(1);
    }
  });

  it('gera vigas dentro do campo, sutis', () => {
    const bg = heroBackground(W, H, 5);
    for (const beam of bg.beams) {
      expect(beam.y).toBeGreaterThanOrEqual(0);
      expect(beam.y).toBeLessThanOrEqual(H);
      expect(beam.alpha).toBeGreaterThan(0);
      expect(beam.alpha).toBeLessThan(0.2);
    }
  });
});
