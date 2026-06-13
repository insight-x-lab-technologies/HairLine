import { describe, it, expect } from 'vitest';
import {
  LocalLeaderboard,
  RemoteLeaderboard,
  type FetchLike,
} from '../src/services/LeaderboardService';
import type { KeyValueStore } from '../src/services/SaveService';

function fakeStore(): KeyValueStore {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

describe('LocalLeaderboard — ranking diário local (docs/04 Fase 3)', () => {
  it('submete e lista do maior para o menor', async () => {
    const lb = new LocalLeaderboard(fakeStore());
    await lb.submit('2026-06-07', { name: 'ana', score: 100 });
    await lb.submit('2026-06-07', { name: 'bia', score: 300 });
    await lb.submit('2026-06-07', { name: 'cau', score: 200 });
    const top = await lb.top('2026-06-07');
    expect(top.map((e) => e.name)).toEqual(['bia', 'cau', 'ana']);
  });

  it('isola rankings por dia', async () => {
    const lb = new LocalLeaderboard(fakeStore());
    await lb.submit('2026-06-07', { name: 'ana', score: 100 });
    await lb.submit('2026-06-08', { name: 'bia', score: 999 });
    expect(await lb.top('2026-06-07')).toHaveLength(1);
    expect((await lb.top('2026-06-08'))[0]!.name).toBe('bia');
  });

  it('persiste no store (nova instância enxerga os dados)', async () => {
    const store = fakeStore();
    await new LocalLeaderboard(store).submit('2026-06-07', { name: 'ana', score: 100 });
    expect((await new LocalLeaderboard(store).top('2026-06-07'))[0]!.score).toBe(100);
  });

  it('limita o tamanho do ranking (top N)', async () => {
    const lb = new LocalLeaderboard(fakeStore(), 3);
    for (let i = 0; i < 10; i++) await lb.submit('d', { name: `p${i}`, score: i });
    const top = await lb.top('d');
    expect(top).toHaveLength(3);
    expect(top[0]!.score).toBe(9);
    expect(top[2]!.score).toBe(7);
  });
});

describe('RemoteLeaderboard — cliente HTTP (Cloudflare Worker)', () => {
  it('submit faz POST com dayKey e entry no corpo', async () => {
    const calls: Array<{ url: string; init: Parameters<FetchLike>[1] }> = [];
    const fetchFn: FetchLike = (url, init) => {
      calls.push({ url, init });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    };
    const lb = new RemoteLeaderboard('https://api.test', fetchFn);
    await lb.submit('2026-06-07', { name: 'ana', score: 500, id: 'x1' });
    expect(calls[0]!.url).toBe('https://api.test/api/leaderboard');
    expect(calls[0]!.init?.method).toBe('POST');
    const body = JSON.parse(calls[0]!.init!.body!);
    expect(body).toMatchObject({ dayKey: '2026-06-07', name: 'ana', score: 500, id: 'x1' });
  });

  it('top faz GET e devolve a lista', async () => {
    const fetchFn: FetchLike = (url) => {
      expect(url).toContain('day=2026-06-07');
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ name: 'bia', score: 300 }]),
      });
    };
    const lb = new RemoteLeaderboard('https://api.test', fetchFn);
    const top = await lb.top('2026-06-07');
    expect(top[0]!.name).toBe('bia');
  });

  it('top retorna [] quando a resposta falha', async () => {
    const fetchFn: FetchLike = () =>
      Promise.resolve({ ok: false, json: () => Promise.resolve(null) });
    const lb = new RemoteLeaderboard('https://api.test', fetchFn);
    expect(await lb.top('2026-06-07')).toEqual([]);
  });
});
