import Phaser from 'phaser';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from './layout';
import { BootScene } from '../scenes/BootScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { MenuScene } from '../scenes/MenuScene';
import { HangarScene } from '../scenes/HangarScene';
import { AchievementsScene } from '../scenes/AchievementsScene';
import { StatsScene } from '../scenes/StatsScene';
import { GameScene } from '../scenes/GameScene';
import { PauseScene } from '../scenes/PauseScene';
import { ResultsScene } from '../scenes/ResultsScene';

/**
 * Configuração do Phaser 4 (docs/02 §5.1).
 *
 * Scale Manager em modo FIT sobre a resolução virtual em retrato: o mundo
 * lógico tem tamanho fixo (VIRTUAL_WIDTH×VIRTUAL_HEIGHT) e o Phaser apenas o
 * encaixa na tela física, centralizado. A área jogável é idêntica em qualquer
 * formato (celular retrato/paisagem, tablet, desktop widescreen); só a moldura
 * ao redor muda (letterbox). Isso preserva determinismo e a justiça do ranking.
 */
export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#05060a',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: VIRTUAL_WIDTH,
      height: VIRTUAL_HEIGHT,
      // expandParent + resize garantem reflow ao girar o aparelho.
      expandParent: true,
    },
    // Antialias suave; o estilo é neon vetorial (docs/01 §4.3).
    render: {
      antialias: true,
      powerPreference: 'high-performance',
    },
    // Física desligada por ora: a colisão do gênero é por hitbox lógica
    // (docs/02 §3.5), não pelo motor de física. Decisão revista na Fase 1.
    scene: [
      BootScene,
      PreloadScene,
      MenuScene,
      HangarScene,
      AchievementsScene,
      StatsScene,
      GameScene,
      PauseScene,
      ResultsScene,
    ],
  };
}
