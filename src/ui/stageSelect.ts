import type { GameSceneData } from '../scenes/GameScene';
import type { SaveService } from '../services/SaveService';
import { getStage } from '../content';

/**
 * Helpers PUROS do seletor de estágios (P4-04b-04) — sem Phaser, para serem
 * testáveis. A `MenuScene` desenha as linhas; aqui só calculamos os dados
 * (status de desbloqueio, recorde) e o payload de início da run.
 */

/** Estado de uma linha do seletor (nome, desbloqueio, conclusão, recorde). */
export interface StageRow {
  readonly id: string;
  readonly name: string;
  readonly unlocked: boolean;
  readonly completed: boolean;
  readonly bestScore: number;
}

/** Payload de `GameSceneData` para iniciar um estágio pelo seletor. */
export function stagePayload(stageId: string): GameSceneData {
  return { mode: 'stage', stageId };
}

/** Monta as linhas do seletor, na ordem canônica de `STAGE_IDS`. */
export function stageRows(ids: readonly string[], save: SaveService): StageRow[] {
  return ids.map((id) => {
    const rec = save.getStageRecord(id);
    return {
      id,
      name: getStage(id).name,
      unlocked: save.isStageUnlocked(id, ids),
      completed: rec.completed,
      bestScore: rec.bestScore,
    };
  });
}
