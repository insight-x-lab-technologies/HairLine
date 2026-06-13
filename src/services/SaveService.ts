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
/** Bloco de progresso por estágio (P4-04b-04). Versionado para evolução futura. */
const STAGE_PROGRESS_KEY = 'hairline.stageProgress.v1';

/** Progresso persistido de um estágio: concluído? melhor pontuação? */
export interface StageRecord {
  readonly completed: boolean;
  readonly bestScore: number;
}

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

  // ---- Progresso por estágio (P4-04b-04) --------------------------------

  /** Registro de um estágio (default: não concluído, sem score). */
  getStageRecord(stageId: string): StageRecord {
    const r = this.readStages()[stageId];
    return { completed: r?.completed ?? false, bestScore: r?.bestScore ?? 0 };
  }

  /**
   * O estágio está liberado? O primeiro da ordem está sempre aberto; os demais
   * abrem ao concluir o anterior. `order` é a lista canônica (`STAGE_IDS`), cuja
   * ordem é contrato de desbloqueio. Save antigo sem bloco ⇒ só o primeiro.
   */
  isStageUnlocked(stageId: string, order: readonly string[]): boolean {
    const i = order.indexOf(stageId);
    if (i <= 0) return true; // primeiro da lista (ou desconhecido) sempre aberto
    return this.getStageRecord(order[i - 1]!).completed;
  }

  /**
   * Grava o resultado de uma run de estágio: marca conclusão (monotônica: nunca
   * "desconclui") e sobe o best score se aplicável. Retorna se bateu recorde.
   */
  recordStageResult(stageId: string, result: { completed: boolean; score: number }): {
    isRecord: boolean;
  } {
    const map = this.readStages();
    const cur = map[stageId] ?? { completed: false, bestScore: 0 };
    const score = Math.floor(result.score);
    const isRecord = score > cur.bestScore;
    map[stageId] = {
      completed: cur.completed || result.completed,
      bestScore: Math.max(cur.bestScore, score),
    };
    this.writeStages(map);
    return { isRecord };
  }

  private readStages(): Record<string, StageRecord> {
    const raw = this.store.getItem(STAGE_PROGRESS_KEY);
    if (!raw) return {};
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, StageRecord>) : {};
    } catch {
      return {};
    }
  }

  private writeStages(map: Record<string, StageRecord>): void {
    this.store.setItem(STAGE_PROGRESS_KEY, JSON.stringify(map));
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
