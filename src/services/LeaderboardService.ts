import { type KeyValueStore } from './SaveService';

/**
 * LeaderboardService — ranking diário (docs/04 Fase 3).
 *
 * Interface ASSÍNCRONA, agnóstica de backend:
 *  - LocalLeaderboard: localStorage (offline / fallback).
 *  - RemoteLeaderboard: HTTP (Cloudflare Worker + KV — ver worker/ e
 *    docs/leaderboard-backend.md). Selecionado por VITE_LEADERBOARD_URL.
 *
 * O placar enviado é validado por re-simulação de replay (anti-cheat, ver
 * Replay); aqui só tratamos persistência/transporte.
 */
export interface LeaderEntry {
  readonly name: string;
  readonly score: number;
  /** Id anônimo do jogador (identidade leve). */
  readonly id?: string;
  /** Epoch ms do envio. */
  readonly at?: number;
}

export interface Leaderboard {
  submit(dayKey: string, entry: LeaderEntry): Promise<void>;
  top(dayKey: string, n?: number): Promise<LeaderEntry[]>;
}

// ---- Local (localStorage) -------------------------------------------------

const KEY_PREFIX = 'hairline.lb.';

function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

function resolveStore(): KeyValueStore {
  try {
    return globalThis.localStorage ?? memoryStore();
  } catch {
    return memoryStore();
  }
}

export class LocalLeaderboard implements Leaderboard {
  private readonly store: KeyValueStore;

  constructor(
    store: KeyValueStore | null | undefined = undefined,
    private readonly maxEntries = 50,
  ) {
    this.store = store ?? resolveStore();
  }

  submit(dayKey: string, entry: LeaderEntry): Promise<void> {
    const list = this.read(dayKey);
    list.push({
      name: entry.name,
      score: Math.floor(entry.score),
      at: entry.at ?? Date.now(),
      ...(entry.id ? { id: entry.id } : {}),
    });
    list.sort((a, b) => b.score - a.score);
    list.length = Math.min(list.length, this.maxEntries);
    this.store.setItem(KEY_PREFIX + dayKey, JSON.stringify(list));
    return Promise.resolve();
  }

  top(dayKey: string, n = 10): Promise<LeaderEntry[]> {
    return Promise.resolve(this.read(dayKey).slice(0, n));
  }

  private read(dayKey: string): LeaderEntry[] {
    const raw = this.store.getItem(KEY_PREFIX + dayKey);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as LeaderEntry[]) : [];
    } catch {
      return [];
    }
  }
}

// ---- Remoto (HTTP) --------------------------------------------------------

/** Mínimo necessário de fetch (facilita teste com mock). */
export type FetchLike = (
  url: string,
  init?: { method?: string; body?: string; headers?: Record<string, string> },
) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

export class RemoteLeaderboard implements Leaderboard {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: FetchLike = globalThis.fetch as unknown as FetchLike,
  ) {}

  async submit(dayKey: string, entry: LeaderEntry): Promise<void> {
    await this.fetchFn(`${this.baseUrl}/api/leaderboard`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dayKey, ...entry }),
    });
  }

  async top(dayKey: string, n = 10): Promise<LeaderEntry[]> {
    const res = await this.fetchFn(
      `${this.baseUrl}/api/leaderboard?day=${encodeURIComponent(dayKey)}&n=${n}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as LeaderEntry[]) : [];
  }
}

// ---- Seleção --------------------------------------------------------------

let instance: Leaderboard | null = null;

/** Singleton: remoto se VITE_LEADERBOARD_URL existir; senão local. */
export function getLeaderboard(): Leaderboard {
  if (!instance) {
    const url =
      typeof import.meta !== 'undefined'
        ? (import.meta.env?.VITE_LEADERBOARD_URL as string | undefined)
        : undefined;
    instance = url ? new RemoteLeaderboard(url) : new LocalLeaderboard();
  }
  return instance;
}
