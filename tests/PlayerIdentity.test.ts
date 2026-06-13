import { describe, it, expect } from 'vitest';
import { PlayerIdentity } from '../src/services/PlayerIdentity';
import type { KeyValueStore } from '../src/services/SaveService';

function fakeStore(): KeyValueStore {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

describe('PlayerIdentity — identidade anônima leve (docs/04 Fase 3)', () => {
  it('gera um id anônimo persistente na primeira vez', () => {
    const store = fakeStore();
    const id1 = new PlayerIdentity(store).id;
    const id2 = new PlayerIdentity(store).id;
    expect(id1).toBeTruthy();
    expect(id1).toBe(id2); // mesmo id entre instâncias (persistido)
  });

  it('tem um nome padrão e permite renomear (persistente)', () => {
    const store = fakeStore();
    const a = new PlayerIdentity(store);
    expect(a.name.length).toBeGreaterThan(0);
    a.setName('Mat');
    expect(a.name).toBe('Mat');
    expect(new PlayerIdentity(store).name).toBe('Mat');
  });

  it('sanitiza e limita o tamanho do nome', () => {
    const id = new PlayerIdentity(fakeStore());
    id.setName('   um nome muito muito longo demais   ');
    expect(id.name.length).toBeLessThanOrEqual(16);
    expect(id.name).toBe(id.name.trim());
  });

  it('nome vazio cai no padrão', () => {
    const id = new PlayerIdentity(fakeStore());
    id.setName('   ');
    expect(id.name.length).toBeGreaterThan(0);
  });

  it('funciona sem store (fallback em memória)', () => {
    const id = new PlayerIdentity(null);
    expect(id.id).toBeTruthy();
  });
});
