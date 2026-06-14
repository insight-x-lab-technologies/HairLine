/**
 * achievements — modelo de exibição PURO das conquistas (P6-02-02), no espírito
 * de `ui/hangar`/`ui/stageSelect`: sem Phaser, testável. As cenas desenham; aqui
 * só calculamos os dados — a galeria (acesa/apagada/contador) e a fila de toasts
 * de fim de run. Ordem do JSON = ordem de exibição (curadoria manual).
 *
 * Fonte única do texto da condição: a `desc` da conquista (a mesma string que o
 * Hangar mostra ao desbloquear cosmético por conquista). Conquista no perfil que
 * não existe mais no JSON é simplesmente ignorada (sem erro) — a galeria lista o
 * conteúdo atual, o perfil preserva o histórico (P6-02-01).
 */
import type { AchievementDef } from '../services/Achievements';

/** Uma linha da galeria: já resolvida para acesa (com data) ou apagada. */
export interface GalleryRow {
  readonly id: string;
  readonly title: string;
  /** Descrição = como desbloquear (fonte única do texto da condição). */
  readonly desc: string;
  readonly unlocked: boolean;
  /** Data de desbloqueio (YYYY-MM-DD); ausente quando bloqueada. */
  readonly dateIso?: string;
}

export interface GalleryModel {
  readonly rows: readonly GalleryRow[];
  readonly unlockedCount: number;
  readonly total: number;
}

/**
 * Modelo da galeria: uma linha por conquista do JSON (ordem preservada), marcada
 * como desbloqueada (com a data do perfil) ou bloqueada (mostra a `desc`). O
 * contador `unlockedCount/total` conta só o conteúdo atual — IDs do perfil que
 * sumiram do JSON não entram (histórico preservado, mas não exibido).
 */
export function galleryModel(
  defs: readonly AchievementDef[],
  unlocked: Readonly<Record<string, string>>,
): GalleryModel {
  const rows = defs.map((d): GalleryRow => {
    const date = unlocked[d.id];
    return {
      id: d.id,
      title: d.title,
      desc: d.desc,
      unlocked: date !== undefined,
      ...(date !== undefined ? { dateIso: date } : {}),
    };
  });
  const unlockedCount = rows.reduce((n, r) => n + (r.unlocked ? 1 : 0), 0);
  return { rows, unlockedCount, total: rows.length };
}

/** Um anúncio de desbloqueio na fila de toasts da `ResultsScene`. */
export interface Toast {
  readonly id: string;
  readonly title: string;
}

/**
 * Fila de toasts a partir dos IDs recém-desbloqueados (retorno de
 * `recordAndUnlock`): um anúncio por ID conhecido, na ordem do JSON. IDs sem
 * definição (conteúdo removido) são ignorados; lista vazia ⇒ nenhum anúncio.
 */
export function toastQueue(defs: readonly AchievementDef[], newlyIds: readonly string[]): Toast[] {
  const ids = new Set(newlyIds);
  return defs.filter((d) => ids.has(d.id)).map((d) => ({ id: d.id, title: d.title }));
}
