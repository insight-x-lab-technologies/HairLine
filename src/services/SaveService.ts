/**
 * SaveService — persistência local leve (docs/02 §8): melhor pontuação e, no
 * futuro, cosméticos/configurações. Usa localStorage por padrão, com fallback
 * em memória (ambientes sem storage / testes). Store injetável para teste.
 *
 * Não faz parte da simulação (é estado do jogador, não do jogo determinístico).
 */
import type { Loadout } from './Cosmetics';
import type { RunSummary } from './Achievements';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const BEST_SCORE_KEY = 'hairline.bestScore';
/** Bloco de progresso por estágio (P4-04b-04). Versionado para evolução futura. */
const STAGE_PROGRESS_KEY = 'hairline.stageProgress.v1';
/** Preferência de vibração (P5-04-03). Default ligado onde a API existe. */
const HAPTICS_KEY = 'hairline.haptics';
/** Seleção de cosméticos do jogador (P6-01-01). Parcial; ausência ⇒ defaults. */
const LOADOUT_KEY = 'hairline.loadout.v1';
/** Totais acumulados do perfil (P6-02-01). Base mínima — P6-03-01 expande. */
const PROFILE_TOTALS_KEY = 'hairline.profile.totals.v1';
/** Melhor pontuação por modo (P6-02-01). Chaves: endless/stage/bossrush/daily. */
const PROFILE_BEST_KEY = 'hairline.profile.best.v1';
/** Conquistas desbloqueadas (P6-02-01): { [id]: dataIso }. Histórico do jogador. */
const ACHIEVEMENTS_KEY = 'hairline.achievements.v1';

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

  // ---- Preferência de vibração (P5-04-03) -------------------------------

  /** Vibração habilitada? Default true (só vibra de fato onde a API existe). */
  getHapticsEnabled(): boolean {
    return this.store.getItem(HAPTICS_KEY) !== '0';
  }

  /** Persiste a preferência de vibração. */
  setHapticsEnabled(value: boolean): void {
    this.store.setItem(HAPTICS_KEY, value ? '1' : '0');
  }

  // ---- Seleção de cosméticos / loadout (P6-01-01) -----------------------

  /**
   * Seleção de cosméticos persistida (parcial). Persistência burra: a rejeição
   * de item bloqueado é da camada de serviço (`Cosmetics.selectCosmetic`); a
   * resolução para defaults é de `Cosmetics.getLoadout`. Save corrompido ⇒ {}.
   */
  getLoadoutSelection(): Partial<Loadout> {
    const raw = this.store.getItem(LOADOUT_KEY);
    if (!raw) return {};
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return {};
      const o = parsed as Record<string, unknown>;
      const sel: { shipId?: string; shotColorId?: string; musicId?: string } = {};
      if (typeof o.shipId === 'string') sel.shipId = o.shipId;
      if (typeof o.shotColorId === 'string') sel.shotColorId = o.shotColorId;
      if (typeof o.musicId === 'string') sel.musicId = o.musicId;
      return sel;
    } catch {
      return {};
    }
  }

  /** Persiste a seleção de cosméticos (parcial). */
  setLoadoutSelection(selection: Partial<Loadout>): void {
    this.store.setItem(LOADOUT_KEY, JSON.stringify(selection));
  }

  // ---- Perfil: totais + conquistas (P6-02-01) ---------------------------

  /** Totais acumulados (runs/graze/kills/wins/daily). Ausentes ⇒ 0. */
  getProfileTotals(): Record<string, number> {
    return this.readNumberMap(PROFILE_TOTALS_KEY);
  }

  /** Melhor pontuação por modo. Ausentes ⇒ 0. */
  getBestByMode(): Record<string, number> {
    return this.readNumberMap(PROFILE_BEST_KEY);
  }

  /**
   * Registra uma run terminada nos totais/recordes por modo (ponto canônico,
   * junto do fim de run). Monotônico: totais só sobem, best por modo é máximo.
   * Não decide conquistas — isso é `Achievements.recordAndUnlock`.
   */
  recordRun(run: RunSummary): void {
    const t = this.getProfileTotals();
    t.totalRuns = (t.totalRuns ?? 0) + 1;
    t.totalGraze = (t.totalGraze ?? 0) + Math.max(0, Math.floor(run.graze));
    t.totalKills = (t.totalKills ?? 0) + Math.max(0, Math.floor(run.kills));
    t.totalWins = (t.totalWins ?? 0) + (run.won ? 1 : 0);
    t.totalDaily = (t.totalDaily ?? 0) + (run.daily ? 1 : 0);
    this.store.setItem(PROFILE_TOTALS_KEY, JSON.stringify(t));

    const best = this.getBestByMode();
    const score = Math.floor(run.score);
    for (const key of run.daily ? [run.mode, 'daily'] : [run.mode]) {
      best[key] = Math.max(best[key] ?? 0, score);
    }
    this.store.setItem(PROFILE_BEST_KEY, JSON.stringify(best));
  }

  /** Mapa de conquistas desbloqueadas { [id]: dataIso }. Corrompido ⇒ {}. */
  getAchievements(): Record<string, string> {
    const raw = this.store.getItem(ACHIEVEMENTS_KEY);
    if (!raw) return {};
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return {};
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v === 'string') out[k] = v;
      }
      return out;
    } catch {
      return {};
    }
  }

  /**
   * Persiste novos desbloqueios. Idempotente: nunca sobrescreve a data de uma
   * conquista já desbloqueada (desbloqueada é histórico). Conquista removida do
   * JSON permanece no perfil (não é apagada aqui).
   */
  unlockAchievements(ids: readonly string[], dateIso: string): void {
    const map = this.getAchievements();
    let changed = false;
    for (const id of ids) {
      if (!(id in map)) {
        map[id] = dateIso;
        changed = true;
      }
    }
    if (changed) this.store.setItem(ACHIEVEMENTS_KEY, JSON.stringify(map));
  }

  private readNumberMap(key: string): Record<string, number> {
    const raw = this.store.getItem(key);
    if (!raw) return {};
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return {};
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
      }
      return out;
    } catch {
      return {};
    }
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
  recordStageResult(
    stageId: string,
    result: { completed: boolean; score: number },
  ): {
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
