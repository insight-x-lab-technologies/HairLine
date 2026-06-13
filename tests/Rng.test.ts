import { describe, it, expect } from 'vitest';
import { Rng } from '../src/services/Rng';

describe('Rng — determinismo (docs/02 §3.1)', () => {
  it('mesma seed produz a mesma sequência', () => {
    const a = new Rng(12345);
    const b = new Rng(12345);
    const seqA = Array.from({ length: 100 }, () => a.next());
    const seqB = Array.from({ length: 100 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('seeds diferentes divergem', () => {
    const a = new Rng(1).next();
    const b = new Rng(2).next();
    expect(a).not.toEqual(b);
  });

  it('next() retorna no intervalo [0, 1)', () => {
    const rng = new Rng(999);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('clone() reproduz a continuação exata a partir do estado atual', () => {
    const rng = new Rng(777);
    rng.next();
    rng.next();
    const clone = rng.clone();
    const fromOriginal = Array.from({ length: 50 }, () => rng.next());
    const fromClone = Array.from({ length: 50 }, () => clone.next());
    expect(fromClone).toEqual(fromOriginal);
  });

  it('reset(seed) volta ao início da sequência daquela seed', () => {
    const rng = new Rng(42);
    const first = Array.from({ length: 10 }, () => rng.next());
    rng.reset(42);
    const again = Array.from({ length: 10 }, () => rng.next());
    expect(again).toEqual(first);
  });

  it('intRange(min, max) é determinístico e respeita os limites (inclusivos)', () => {
    const a = new Rng(2024);
    const b = new Rng(2024);
    for (let i = 0; i < 500; i++) {
      const v = a.intRange(3, 9);
      expect(v).toBe(b.intRange(3, 9));
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(9);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('golden: mulberry32 com seed 1 gera os valores de referência conhecidos', () => {
    // Valores de referência (golden) da implementação mulberry32 para seed=1.
    // Se este teste quebra, o PRNG mudou e o Desafio Diário ficaria incompatível.
    const rng = new Rng(1);
    const got = [rng.nextUint32(), rng.nextUint32(), rng.nextUint32()];
    expect(got).toEqual([2693262067, 11749833, 2265367787]);
  });
});
