import { describe, it, expect } from 'vitest';
import { SaveService, type KeyValueStore } from '../src/services/SaveService';

/** Store em memória para teste (sem depender de localStorage). */
function fakeStore(): KeyValueStore {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
  };
}

describe('SaveService — persistência local (docs/02 §8)', () => {
  it('melhor pontuação começa em zero', () => {
    const s = new SaveService(fakeStore());
    expect(s.getBestScore()).toBe(0);
  });

  it('registra novo recorde e persiste', () => {
    const store = fakeStore();
    const s = new SaveService(store);
    expect(s.setBestScore(1500)).toBe(true);
    expect(s.getBestScore()).toBe(1500);
    // nova instância sobre o mesmo store mantém o valor
    expect(new SaveService(store).getBestScore()).toBe(1500);
  });

  it('não rebaixa o recorde com pontuação menor', () => {
    const s = new SaveService(fakeStore());
    s.setBestScore(2000);
    expect(s.setBestScore(500)).toBe(false);
    expect(s.getBestScore()).toBe(2000);
  });

  it('é resiliente a valor corrompido no store', () => {
    const store = fakeStore();
    store.setItem('hairline.bestScore', 'abc');
    const s = new SaveService(store);
    expect(s.getBestScore()).toBe(0);
  });

  it('funciona sem store disponível (fallback em memória)', () => {
    const s = new SaveService(null);
    expect(s.getBestScore()).toBe(0);
    expect(s.setBestScore(300)).toBe(true);
    expect(s.getBestScore()).toBe(300);
  });

  it('seleção de cosméticos começa vazia e persiste (P6-01-01)', () => {
    const store = fakeStore();
    const s = new SaveService(store);
    expect(s.getLoadoutSelection()).toEqual({});
    s.setLoadoutSelection({ shipId: 'ship-prism', shotColorId: 'shot-ion' });
    // nova instância sobre o mesmo store mantém a seleção
    expect(new SaveService(store).getLoadoutSelection()).toEqual({
      shipId: 'ship-prism',
      shotColorId: 'shot-ion',
    });
  });

  it('seleção de cosméticos corrompida cai em vazio (P6-01-01)', () => {
    const store = fakeStore();
    store.setItem('hairline.loadout.v1', '{nao é json');
    expect(new SaveService(store).getLoadoutSelection()).toEqual({});
  });
});
