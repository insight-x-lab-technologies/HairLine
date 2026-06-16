/**
 * hangar — modelo de exibição PURO do Hangar (P6-01-02), no espírito de
 * `ui/stageSelect`: sem Phaser, testável. A `HangarScene` desenha; aqui só
 * calculamos os dados (agrupamento por tipo, acesa/apagada/selecionada, texto
 * da condição de desbloqueio) e a ponte entre o `SaveService` e o perfil puro
 * que o serviço `Cosmetics` consome.
 *
 * Fonte única do texto da condição: reusa a `desc` da conquista quando o
 * desbloqueio é por conquista (mesma string da galeria — P6-02-02) e deriva um
 * rótulo curto para `totalAtLeast`. Cosmético NUNCA afeta jogabilidade.
 */
import type { SaveService } from '../services/SaveService';
import {
  isUnlocked,
  getLoadout,
  findCosmetic,
  type Cosmetic,
  type CosmeticCatalog,
  type CosmeticKind,
  type CosmeticProfile,
  type Loadout,
  type ShipCosmetic,
  type ShotColorCosmetic,
  type UnlockCondition,
} from '../services/Cosmetics';
import { resolveShipSprite } from '../render/spriteFallback';

/** Rótulo legível por estatística de perfil (vocabulário de `KNOWN_STATS`). */
const STAT_LABEL: Readonly<Record<string, string>> = {
  totalGraze: 'graze total',
  totalKills: 'abates totais',
  bestScore: 'melhor pontuação',
  totalRuns: 'partidas jogadas',
};

/** Cabeçalho de cada grupo, na ordem de exibição. */
export const GROUP_LABEL: Readonly<Record<CosmeticKind, string>> = {
  ship: 'NAVE',
  shotColor: 'TIRO',
  music: 'TRILHA',
};

/** Item já resolvido para a UI: estado de seleção/desbloqueio + amostra. */
export interface HangarItem {
  readonly id: string;
  readonly kind: CosmeticKind;
  readonly title: string;
  readonly unlocked: boolean;
  readonly selected: boolean;
  /** Texto da condição (vazio quando desbloqueado). */
  readonly condition: string;
  /** Cor #hex de amostra (nave/tiro); ausente em trilha. */
  readonly color?: string;
  /** Forma da nave (só `ship`). */
  readonly shape?: string;
  /** Preset de trilha (só `music`). */
  readonly preset?: string;
}

export interface HangarGroup {
  readonly kind: CosmeticKind;
  readonly label: string;
  readonly items: readonly HangarItem[];
}

/**
 * Texto da condição de desbloqueio (fonte única). `achievementDesc` resolve a
 * `desc` de uma conquista por id (a galeria de conquistas usa a mesma string).
 */
export function conditionText(
  unlock: UnlockCondition,
  achievementDesc?: (id: string) => string | undefined,
): string {
  switch (unlock.type) {
    case 'default':
      return '';
    case 'achievement':
      return achievementDesc?.(unlock.achievementId) ?? `conquista: ${unlock.achievementId}`;
    case 'totalAtLeast':
      return `${STAT_LABEL[unlock.stat] ?? unlock.stat} ≥ ${unlock.value}`;
  }
}

/** Ponte SaveService → perfil puro do `Cosmetics`. */
export function cosmeticProfileFrom(save: SaveService): CosmeticProfile {
  const totals = save.getProfileTotals();
  return {
    achievements: Object.keys(save.getAchievements()),
    // `bestScore` é mantido fora dos totais acumulados (P6-02-01), mas o
    // catálogo desbloqueia por ele; a ponte o injeta para a avaliação fechar.
    totals: { ...totals, bestScore: save.getBestScore() },
  };
}

/**
 * Preview do Hangar consciente do tema (P10-13): decide como a nave selecionada
 * deve ser desenhada no preview para refletir HONESTAMENTE o tema ativo. A
 * disponibilidade de textura (`availableShipKeys`) é a prova do tema: o
 * `PreloadScene` só carrega assets do tema ativo, então o tema vetorial não
 * registra sprite (⇒ `vector`) e o sprite registra `spr-ship`/variante (⇒ `sprite`).
 * Modelo PURO — a cena só desenha o que isto descreve. Tiro/balas/anel seguem
 * vetoriais nos dois temas (não entram aqui além da cor de tiro).
 */
export interface HangarPreview {
  /** Como desenhar o corpo da nave no tema ativo. */
  readonly shipMode: 'sprite' | 'vector';
  /** Textura da nave quando `shipMode === 'sprite'` (variante curada ou default). */
  readonly shipSpriteKey?: string;
  /** A nave-sprite é a variante curada do cosmético (true) ou a default (false). */
  readonly curated: boolean;
  /** Cor #hex do corpo (tint do sprite OU preenchimento vetorial). */
  readonly shipColor: string;
  /** Forma do cosmético (acento de cockpit no modo vetorial). */
  readonly shipShape: string;
  /** Cor #hex do tiro (sempre vetorial nos dois temas). */
  readonly shotColor: string;
}

export function hangarPreview(
  catalog: CosmeticCatalog,
  profile: CosmeticProfile,
  selection: Partial<Loadout>,
  availableShipKeys: Iterable<string>,
): HangarPreview {
  const loadout = getLoadout(catalog, profile, selection);
  const ship = findCosmetic(catalog, loadout.shipId) as ShipCosmetic;
  const shot = findCosmetic(catalog, loadout.shotColorId) as ShotColorCosmetic;
  const src = resolveShipSprite(availableShipKeys, loadout.shipId);
  return {
    shipMode: src.useSprite ? 'sprite' : 'vector',
    ...(src.useSprite ? { shipSpriteKey: src.key } : {}),
    curated: src.curated,
    shipColor: ship.color,
    shipShape: ship.shape,
    shotColor: shot.color,
  };
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

/** Id efetivamente selecionado de um tipo, a partir do loadout resolvido. */
function selectedId(loadout: Loadout, kind: CosmeticKind): string {
  switch (kind) {
    case 'ship':
      return loadout.shipId;
    case 'shotColor':
      return loadout.shotColorId;
    case 'music':
      return loadout.musicId;
  }
}

/**
 * Modelo de exibição do Hangar: um grupo por tipo, com cada item já marcado
 * como desbloqueado/selecionado e a condição (quando bloqueado). A seleção
 * efetiva vem de `getLoadout` — seleção inválida/bloqueada aparece como o
 * default marcado, não como erro.
 */
export function hangarGroups(
  catalog: CosmeticCatalog,
  profile: CosmeticProfile,
  selection: Partial<Loadout>,
  achievementDesc?: (id: string) => string | undefined,
): HangarGroup[] {
  const loadout = getLoadout(catalog, profile, selection);
  const kinds: CosmeticKind[] = ['ship', 'shotColor', 'music'];
  return kinds.map((kind) => {
    const sel = selectedId(loadout, kind);
    const items = itemsOf(catalog, kind).map((c): HangarItem => {
      const unlocked = isUnlocked(c, profile);
      return {
        id: c.id,
        kind,
        title: c.title,
        unlocked,
        selected: c.id === sel,
        condition: unlocked ? '' : conditionText(c.unlock, achievementDesc),
        ...(c.kind === 'ship' ? { color: c.color, shape: c.shape } : {}),
        ...(c.kind === 'shotColor' ? { color: c.color } : {}),
        ...(c.kind === 'music' ? { preset: c.preset } : {}),
      };
    });
    return { kind, label: GROUP_LABEL[kind], items };
  });
}
