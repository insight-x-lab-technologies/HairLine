/**
 * Achievements (P6-02-01) — motor de conquistas: definições declarativas em
 * dados (`src/data/achievements.json`) e um avaliador PURO que, ao fim de cada
 * run, cruza o `RunSummary` com os totais do perfil e devolve o que foi
 * desbloqueado. Sem UI (P6-02-02), sem I/O no avaliador, sem Phaser.
 *
 * Regra de ouro: conquista NUNCA dá vantagem de jogo. A avaliação é pós-run
 * (mesmo ponto do registro da run), nunca por tick — a simulação não a conhece.
 *
 * Dependência P6-03-01 (perfil/`RunSummary`/`recordRun`) ainda não existe; este
 * módulo define a superfície mínima (`RunSummary`, `AchievementProfile`) e o
 * vocabulário de condições que aquela issue reusará/expandirá. IDs de conquista
 * são CONTRATO público interno (cosméticos os referenciam) — imutáveis.
 */
import type { GameMode } from '../sim/types';

/** Chave de modo para condições. 'daily' = run do Desafio Diário; 'any' = qualquer. */
export type ModeKey = GameMode | 'daily' | 'any';

/** Modos concretos válidos numa condição (sem 'any'). */
export const CONCRETE_MODES: readonly ModeKey[] = ['endless', 'stage', 'bossrush', 'daily'];

/** Totais de perfil que uma condição `totalAtLeast` pode referenciar. */
export const KNOWN_TOTALS: readonly string[] = [
  'totalRuns',
  'totalGraze',
  'totalKills',
  'totalWins',
  'totalDaily',
];

/** Campos do `RunSummary` que uma condição `runStat` pode comparar. */
export const KNOWN_RUN_STATS: readonly string[] = ['score', 'graze', 'kills', 'livesLost'];

/**
 * Fatos de uma run terminada (P6-02-01). Produzido no ponto de fim de run e
 * passado ao avaliador. `daily` distingue o Desafio Diário do modo de base.
 */
export interface RunSummary {
  readonly mode: GameMode;
  readonly daily: boolean;
  readonly won: boolean;
  readonly score: number;
  readonly graze: number;
  readonly kills: number;
  /** Vidas perdidas na run (0 ⇒ run sem tomar dano). */
  readonly livesLost: number;
}

/**
 * Superfície de perfil consumida pelo avaliador: totais acumulados e melhor
 * pontuação por modo. P6-03-01 (perfil) produzirá isto; aqui só consumimos.
 */
export interface AchievementProfile {
  readonly totals: Readonly<Record<string, number>>;
  readonly best: Readonly<Record<string, number>>;
}

/**
 * Condição declarativa (tipos enumerados — sem expressões/eval):
 * - `totalAtLeast`: total de perfil `stat` >= `value`.
 * - `runStat`: campo do `RunSummary` comparado a `value` (`gte` default | `lte`),
 *   opcionalmente restrito a um modo.
 * - `bestAtLeast`: melhor pontuação no `mode` >= `value`.
 * - `winMode`: vencer no `mode` (`any` = qualquer), opcionalmente sem tomar dano.
 */
export type Condition =
  | { readonly type: 'totalAtLeast'; readonly stat: string; readonly value: number }
  | {
      readonly type: 'runStat';
      readonly stat: string;
      readonly value: number;
      readonly cmp?: 'gte' | 'lte';
      readonly mode?: ModeKey;
    }
  | { readonly type: 'bestAtLeast'; readonly mode: ModeKey; readonly value: number }
  | { readonly type: 'winMode'; readonly mode: ModeKey; readonly noDamage?: boolean };

export interface AchievementDef {
  readonly id: string;
  readonly title: string;
  /** Descrição = como desbloquear. Fonte única do texto da condição (P6-02-02). */
  readonly desc: string;
  readonly condition: Condition;
}

/** A run satisfaz a chave de modo? 'any' sempre; 'daily' exige Diário. */
function runMatchesMode(run: RunSummary, mode: ModeKey): boolean {
  if (mode === 'any') return true;
  if (mode === 'daily') return run.daily;
  return run.mode === mode;
}

/** Chaves de modo sob as quais a run conta para "melhor por modo". */
export function runModeKeys(run: RunSummary): string[] {
  return run.daily ? [run.mode, 'daily'] : [run.mode];
}

/** A condição está satisfeita por (perfil já atualizado + esta run)? Puro. */
export function isSatisfied(
  cond: Condition,
  profile: AchievementProfile,
  run: RunSummary,
): boolean {
  switch (cond.type) {
    case 'totalAtLeast':
      return (profile.totals[cond.stat] ?? 0) >= cond.value;
    case 'runStat': {
      if (cond.mode && !runMatchesMode(run, cond.mode)) return false;
      const actual = runStatValue(run, cond.stat);
      return (cond.cmp ?? 'gte') === 'lte' ? actual <= cond.value : actual >= cond.value;
    }
    case 'bestAtLeast':
      return (profile.best[cond.mode] ?? 0) >= cond.value;
    case 'winMode':
      return run.won && runMatchesMode(run, cond.mode) && (!cond.noDamage || run.livesLost === 0);
  }
}

function runStatValue(run: RunSummary, stat: string): number {
  switch (stat) {
    case 'score':
      return run.score;
    case 'graze':
      return run.graze;
    case 'kills':
      return run.kills;
    case 'livesLost':
      return run.livesLost;
    default:
      return 0;
  }
}

/**
 * Avaliador puro: devolve os IDs recém-desbloqueados, na ordem do JSON,
 * pulando os já desbloqueados (`unlockedIds`). Idempotente e sem I/O — rodar de
 * novo com o mesmo estado devolve `[]`.
 */
export function evaluate(
  defs: readonly AchievementDef[],
  profile: AchievementProfile,
  run: RunSummary,
  unlockedIds: ReadonlySet<string>,
): string[] {
  const out: string[] = [];
  for (const def of defs) {
    if (unlockedIds.has(def.id)) continue;
    if (isSatisfied(def.condition, profile, run)) out.push(def.id);
  }
  return out;
}

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Valida as definições de conquista (P6-02-01): IDs únicos em kebab-case,
 * condições com tipos/campos conhecidos e números finitos. Lança em erro —
 * roda no carregamento e é exercitada pelos testes de conteúdo.
 */
export function validateAchievements(defs: readonly AchievementDef[]): void {
  const seen = new Set<string>();
  for (const def of defs) {
    if (!ID_RE.test(def.id)) throw new Error(`conquista: id fora de kebab-case "${def.id}"`);
    if (seen.has(def.id)) throw new Error(`conquista: id duplicado "${def.id}"`);
    seen.add(def.id);
    if (!def.title || !def.desc) throw new Error(`conquista "${def.id}": title/desc vazios`);
    validateCondition(def.condition, def.id);
  }
}

function assertFinitePositive(n: unknown, where: string): void {
  if (typeof n !== 'number' || !Number.isFinite(n))
    throw new Error(`${where}: número inválido (${String(n)})`);
}

function validateCondition(cond: Condition, id: string): void {
  const where = `conquista "${id}"`;
  switch (cond.type) {
    case 'totalAtLeast':
      if (!KNOWN_TOTALS.includes(cond.stat))
        throw new Error(`${where}: total desconhecido "${cond.stat}"`);
      assertFinitePositive(cond.value, `${where}.value`);
      return;
    case 'runStat':
      if (!KNOWN_RUN_STATS.includes(cond.stat))
        throw new Error(`${where}: runStat desconhecido "${cond.stat}"`);
      if (cond.cmp && cond.cmp !== 'gte' && cond.cmp !== 'lte')
        throw new Error(`${where}: cmp inválido "${cond.cmp}"`);
      if (cond.mode && !isKnownMode(cond.mode))
        throw new Error(`${where}: modo desconhecido "${cond.mode}"`);
      assertFinitePositive(cond.value, `${where}.value`);
      return;
    case 'bestAtLeast':
      if (!CONCRETE_MODES.includes(cond.mode))
        throw new Error(`${where}: bestAtLeast exige modo concreto, veio "${cond.mode}"`);
      assertFinitePositive(cond.value, `${where}.value`);
      return;
    case 'winMode':
      if (!isKnownMode(cond.mode)) throw new Error(`${where}: modo desconhecido "${cond.mode}"`);
      return;
    default:
      throw new Error(`${where}: tipo de condição desconhecido "${(cond as { type: string }).type}"`);
  }
}

function isKnownMode(mode: ModeKey): boolean {
  return mode === 'any' || CONCRETE_MODES.includes(mode);
}

/**
 * Superfície mínima de persistência usada pela orquestração pós-run. O
 * `SaveService` a implementa; nos testes, um fake basta.
 */
export interface AchievementStore {
  recordRun(run: RunSummary): void;
  getProfileTotals(): Record<string, number>;
  getBestByMode(): Record<string, number>;
  getAchievements(): Record<string, string>;
  unlockAchievements(ids: readonly string[], dateIso: string): void;
}

/** Data (YYYY-MM-DD, UTC) do dia corrente — padrão do registro de desbloqueio. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Orquestração de fim de run (ponto canônico, junto do registro da run):
 * registra a run nos totais, avalia as conquistas contra o perfil já atualizado
 * e persiste os desbloqueios novos. Devolve os IDs recém-desbloqueados (ordem do
 * JSON) — a UI (P6-02-02) os anuncia. `now` injetável para teste.
 */
export function recordAndUnlock(
  store: AchievementStore,
  defs: readonly AchievementDef[],
  run: RunSummary,
  now: () => string = todayIso,
): string[] {
  store.recordRun(run);
  const profile: AchievementProfile = {
    totals: store.getProfileTotals(),
    best: store.getBestByMode(),
  };
  const unlocked = new Set(Object.keys(store.getAchievements()));
  const newly = evaluate(defs, profile, run, unlocked);
  if (newly.length > 0) store.unlockAchievements(newly, now());
  return newly;
}
