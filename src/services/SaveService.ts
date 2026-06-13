/**
 * SaveService — persistência local leve (docs/02 §8): melhor pontuação e, no
 * futuro, cosméticos/configurações. Usa localStorage por padrão, com fallback
 * em memória (ambientes sem storage / testes). Store injetável para teste.
 *
 * Não faz parte da simulação (é estado do jogador, não do jogo determinístico).
 */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const BEST_SCORE_KEY = 'hairline.bestScore';

/** Resolve o localStorage do ambiente, ou null se indisponível. */
function defaultStore(): KeyValueStore | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export class SaveService {
  private readonly store: KeyValueStore;

  /** @param store passe null para forçar fallback em memória. `undefined` usa localStorage. */
  constructor(store: KeyValueStore | null | undefined = undefined) {
    this.store = store === undefined ? (defaultStore() ?? memoryStore()) : (store ?? memoryStore());
  }

  getBestScore(): number {
    const raw = this.store.getItem(BEST_SCORE_KEY);
    const n = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  /** Grava se for maior que o atual. Retorna true se bateu novo recorde. */
  setBestScore(score: number): boolean {
    if (score <= this.getBestScore()) return false;
    this.store.setItem(BEST_SCORE_KEY, String(Math.floor(score)));
    return true;
  }
}

/** Store volátil em memória (fallback). */
function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
  };
}

let instance: SaveService | null = null;

/** Singleton do serviço de save. */
export function getSave(): SaveService {
  if (!instance) instance = new SaveService();
  return instance;
}
