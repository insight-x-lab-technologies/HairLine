/**
 * Cosmetics (P6-01-01) — camada de dados pura dos cosméticos: catálogo
 * declarativo (`src/data/cosmetics.json`), avaliação de desbloqueio e resolução
 * do loadout do jogador, com fallback para os defaults.
 *
 * Regra de ouro da visão: cosmético NUNCA afeta jogabilidade — muda só
 * render/áudio. A simulação não conhece este módulo; replay, ranking e Diário
 * ficam intocados por construção. Tudo aqui é puro e headless.
 *
 * Dependências P6-02-01 (conquistas) e P6-03-01 (perfil) ainda não existem;
 * este módulo define a superfície mínima de perfil (`CosmeticProfile`) e o
 * vocabulário canônico de condições de desbloqueio que aquelas issues reusarão.
 */
import { isKnownShape } from '../ui/shapes';

export type CosmeticKind = 'ship' | 'shotColor' | 'music';

/**
 * Estatísticas de perfil que uma condição `totalAtLeast` pode referenciar.
 * Vocabulário canônico — P6-03-01 (perfil/estatísticas) o produzirá; aqui ele
 * só é o contrato de validação para não permitir typos no catálogo.
 */
export const KNOWN_STATS: readonly string[] = ['totalGraze', 'totalKills', 'bestScore', 'totalRuns'];

/**
 * Condição de desbloqueio. Vocabulário compartilhado com as conquistas
 * (P6-02-01) — se precisar divergir, é sinal de design errado (ver issue).
 * - `default`: disponível desde o início (o visual atual).
 * - `achievement`: exige uma conquista por ID.
 * - `totalAtLeast`: exige um total de perfil >= `value`.
 */
export type UnlockCondition =
  | { readonly type: 'default' }
  | { readonly type: 'achievement'; readonly achievementId: string }
  | { readonly type: 'totalAtLeast'; readonly stat: string; readonly value: number };

interface CosmeticBase {
  readonly id: string;
  readonly kind: CosmeticKind;
  readonly title: string;
  readonly unlock: UnlockCondition;
}
export interface ShipCosmetic extends CosmeticBase {
  readonly kind: 'ship';
  /** Forma desenhável (`ui/shapes`), ex.: 'arrow'. */
  readonly shape: string;
  /** Cor neon #hex do corpo. */
  readonly color: string;
}
export interface ShotColorCosmetic extends CosmeticBase {
  readonly kind: 'shotColor';
  /** Cor neon #hex do tiro do jogador. */
  readonly color: string;
}
export interface MusicCosmetic extends CosmeticBase {
  readonly kind: 'music';
  /** Preset de trilha (aplicado pelo áudio na P6-01-02). */
  readonly preset: string;
}
export type Cosmetic = ShipCosmetic | ShotColorCosmetic | MusicCosmetic;

export interface CosmeticCatalog {
  readonly ships: readonly ShipCosmetic[];
  readonly shotColors: readonly ShotColorCosmetic[];
  readonly music: readonly MusicCosmetic[];
}

/**
 * Superfície mínima do perfil consumida na avaliação de desbloqueio. P6-02-01
 * (conquistas) e P6-03-01 (estatísticas) produzirão essas listas/totais; aqui
 * só as consumimos. Perfil vazio = jogador novo (só defaults disponíveis).
 */
export interface CosmeticProfile {
  readonly achievements: readonly string[];
  readonly totals: Readonly<Record<string, number>>;
}

/** Perfil vazio (jogador novo): sem conquistas e sem totais. */
export const EMPTY_PROFILE: CosmeticProfile = { achievements: [], totals: {} };

/** Seleção persistida do jogador, por tipo. Parcial: ausente ⇒ usa o default. */
export interface Loadout {
  readonly shipId: string;
  readonly shotColorId: string;
  readonly musicId: string;
}

/** O cosmético está desbloqueado para este perfil? */
export function isUnlocked(def: Cosmetic, profile: CosmeticProfile): boolean {
  const u = def.unlock;
  switch (u.type) {
    case 'default':
      return true;
    case 'achievement':
      return profile.achievements.includes(u.achievementId);
    case 'totalAtLeast':
      return (profile.totals[u.stat] ?? 0) >= u.value;
  }
}

/** Itens de um tipo, na ordem do catálogo. */
function itemsOf(catalog: CosmeticCatalog, kind: CosmeticKind): readonly Cosmetic[] {
  switch (kind) {
    case 'ship':
      return catalog.ships;
    case 'shotColor':
      return catalog.shotColors;
    case 'music':
      return catalog.music;
  }
}

/** O cosmético `default` de um tipo. Pressupõe catálogo validado (exatamente 1). */
export function getDefault(catalog: CosmeticCatalog, kind: CosmeticKind): Cosmetic {
  const def = itemsOf(catalog, kind).find((c) => c.unlock.type === 'default');
  if (!def) throw new Error(`Catálogo sem cosmético default para "${kind}"`);
  return def;
}

/** Acha um cosmético por id em qualquer tipo, ou undefined. */
export function findCosmetic(catalog: CosmeticCatalog, id: string): Cosmetic | undefined {
  return [...catalog.ships, ...catalog.shotColors, ...catalog.music].find((c) => c.id === id);
}

/** O id é selecionável (existe, é do tipo certo e está desbloqueado)? */
export function canSelect(
  catalog: CosmeticCatalog,
  profile: CosmeticProfile,
  kind: CosmeticKind,
  id: string,
): boolean {
  const item = itemsOf(catalog, kind).find((c) => c.id === id);
  return item !== undefined && isUnlocked(item, profile);
}

/**
 * Resolve o loadout efetivo a partir da seleção persistida (possivelmente
 * parcial/inválida/bloqueada) e do perfil. Para cada tipo: usa o id escolhido
 * se existir E estiver desbloqueado; caso contrário cai no default do tipo.
 * Nunca lança — perfil editado na mão ou cosmético removido do catálogo cai
 * graciosamente no default.
 */
export function getLoadout(
  catalog: CosmeticCatalog,
  profile: CosmeticProfile,
  selection: Partial<Loadout>,
): Loadout {
  const resolve = (kind: CosmeticKind, chosen: string | undefined): string =>
    chosen !== undefined && canSelect(catalog, profile, kind, chosen)
      ? chosen
      : getDefault(catalog, kind).id;
  return {
    shipId: resolve('ship', selection.shipId),
    shotColorId: resolve('shotColor', selection.shotColorId),
    musicId: resolve('music', selection.musicId),
  };
}

/**
 * Aplica uma escolha à seleção e devolve a nova seleção. Rejeita (lança) item
 * inexistente ou bloqueado — a camada de serviço não persiste seleção inválida.
 */
export function selectCosmetic(
  catalog: CosmeticCatalog,
  profile: CosmeticProfile,
  selection: Partial<Loadout>,
  kind: CosmeticKind,
  id: string,
): Partial<Loadout> {
  if (!canSelect(catalog, profile, kind, id)) {
    throw new Error(`Cosmético "${id}" não é selecionável para "${kind}" (inexistente ou bloqueado)`);
  }
  const key = kind === 'shotColor' ? 'shotColorId' : kind === 'music' ? 'musicId' : 'shipId';
  return { ...selection, [key]: id };
}

const HEX6 = /^#[0-9a-fA-F]{6}$/;

/**
 * Valida o catálogo de cosméticos (P6-01-01): ids únicos, exatamente um
 * `default` por tipo, cores #hex válidas, `shape` desenhável, presets não
 * vazios, e condições coerentes (stat conhecido, valor > 0, achievement com id).
 * Se `knownAchievementIds` for passado, faz a validação cruzada catálogo⇄
 * conquistas (P6-02-01) — referência inexistente quebra o CI, não o jogador.
 * Lança em caso de erro.
 */
export function validateCosmetics(
  catalog: CosmeticCatalog,
  knownAchievementIds?: ReadonlySet<string>,
): void {
  const all: Cosmetic[] = [...catalog.ships, ...catalog.shotColors, ...catalog.music];
  const seen = new Set<string>();
  for (const c of all) {
    if (seen.has(c.id)) throw new Error(`cosmético: id duplicado "${c.id}"`);
    seen.add(c.id);
    validateUnlock(c, knownAchievementIds);
  }
  validateGroup(catalog.ships, 'ship');
  validateGroup(catalog.shotColors, 'shotColor');
  validateGroup(catalog.music, 'music');

  for (const s of catalog.ships) {
    if (!isKnownShape(s.shape)) throw new Error(`cosmético "${s.id}": shape inexistente "${s.shape}"`);
    if (!HEX6.test(s.color)) throw new Error(`cosmético "${s.id}": cor inválida "${s.color}"`);
  }
  for (const s of catalog.shotColors) {
    if (!HEX6.test(s.color)) throw new Error(`cosmético "${s.id}": cor inválida "${s.color}"`);
  }
  for (const m of catalog.music) {
    if (typeof m.preset !== 'string' || m.preset.length === 0)
      throw new Error(`cosmético "${m.id}": preset de trilha vazio`);
  }
}

function validateGroup(items: readonly Cosmetic[], kind: CosmeticKind): void {
  if (items.length === 0) throw new Error(`cosmético: tipo "${kind}" sem itens`);
  let defaults = 0;
  for (const c of items) {
    if (c.kind !== kind) throw new Error(`cosmético "${c.id}": kind "${c.kind}" no grupo "${kind}"`);
    if (c.unlock.type === 'default') defaults++;
  }
  if (defaults !== 1)
    throw new Error(`cosmético: tipo "${kind}" precisa de exatamente 1 default (tem ${defaults})`);
}

function validateUnlock(c: Cosmetic, knownAchievementIds?: ReadonlySet<string>): void {
  const u = c.unlock;
  if (u.type === 'totalAtLeast') {
    if (!KNOWN_STATS.includes(u.stat))
      throw new Error(`cosmético "${c.id}": stat desconhecido "${u.stat}"`);
    if (typeof u.value !== 'number' || !(u.value > 0))
      throw new Error(`cosmético "${c.id}": totalAtLeast.value deve ser > 0`);
  } else if (u.type === 'achievement') {
    if (!u.achievementId) throw new Error(`cosmético "${c.id}": achievementId vazio`);
    if (knownAchievementIds && !knownAchievementIds.has(u.achievementId))
      throw new Error(`cosmético "${c.id}": conquista inexistente "${u.achievementId}"`);
  }
}
