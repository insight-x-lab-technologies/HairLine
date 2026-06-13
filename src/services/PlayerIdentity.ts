import { type KeyValueStore } from './SaveService';
import { Rng } from './Rng';

/**
 * PlayerIdentity — identidade anônima e leve (docs/04 Fase 3): um id estável
 * gerado localmente (sem cadastro) e um apelido editável, usados ao enviar o
 * placar ao ranking. Persistente em localStorage, com fallback em memória.
 *
 * O id NÃO usa Math.random (proibido no projeto): deriva do relógio via o Rng
 * semeável. Não é identidade forte — é só para distinguir jogadores no ranking.
 */
const ID_KEY = 'hairline.player.id';
const NAME_KEY = 'hairline.player.name';
const MAX_NAME = 16;
const DEFAULT_NAME = 'jogador';

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

export class PlayerIdentity {
  private readonly store: KeyValueStore;
  readonly id: string;
  private _name: string;

  constructor(store: KeyValueStore | null | undefined = undefined) {
    this.store = store ?? resolveStore();
    this.id = this.loadOrCreateId();
    this._name = this.store.getItem(NAME_KEY) ?? DEFAULT_NAME;
  }

  get name(): string {
    return this._name;
  }

  /** Define o apelido (sanitiza espaços e limita o tamanho). */
  setName(name: string): void {
    const clean = name.trim().slice(0, MAX_NAME).trim();
    this._name = clean.length > 0 ? clean : DEFAULT_NAME;
    this.store.setItem(NAME_KEY, this._name);
  }

  private loadOrCreateId(): string {
    const existing = this.store.getItem(ID_KEY);
    if (existing) return existing;
    // Id curto base36 a partir do relógio + um sorteio do Rng semeável.
    const rng = new Rng((Date.now() >>> 0) ^ 0x9e3779b1);
    const id = `p_${Date.now().toString(36)}${rng.nextUint32().toString(36)}`;
    this.store.setItem(ID_KEY, id);
    return id;
  }
}

let instance: PlayerIdentity | null = null;

/** Singleton da identidade do jogador. */
export function getIdentity(): PlayerIdentity {
  if (!instance) instance = new PlayerIdentity();
  return instance;
}
