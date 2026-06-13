import Phaser from 'phaser';
import { SceneKeys } from '../config/sceneKeys';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../config/layout';
import { neonText, pulse } from '../ui/neonText';
import { getAudio } from '../services/AudioService';
import { getSave } from '../services/SaveService';
import { dailySeed, dayKey } from '../services/DailySeed';
import { getIdentity } from '../services/PlayerIdentity';
import { pickWeeklyModifiers, combineMods, weeklySeed, weekKey } from '../systems/Modifiers';
import type { GameSceneData } from './GameScene';

/**
 * MenuScene — tela inicial: título, recorde e dois modos: Endless (seed casual)
 * e Desafio Diário (mesma seed para todos no dia — docs/04 Fase 3).
 */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Menu);
  }

  create(): void {
    const cx = VIRTUAL_WIDTH / 2;
    const cy = VIRTUAL_HEIGHT / 2;

    neonText(this, cx, cy - 180, 'HAIRLINE', 72);
    neonText(this, cx, cy - 112, 'bullet hell · graze · daily', 22, '#5a6b7a');

    const best = getSave().getBestScore();
    if (best > 0) neonText(this, cx, cy - 64, `recorde  ${best}`, 24, '#ffd166');

    const endlessBtn = neonText(this, cx, cy + 20, '▶ ENDLESS', 36, '#0bd3c6').setInteractive({
      useHandCursor: true,
    });
    pulse(this, endlessBtn);
    endlessBtn.on('pointerdown', () => this.start({}));

    const today = new Date();
    const daily = neonText(this, cx, cy + 90, '◎ DESAFIO DIÁRIO', 30, '#ffd166').setInteractive({
      useHandCursor: true,
    });
    daily.on('pointerdown', () =>
      this.start({ seed: dailySeed(today), daily: true, dayKey: dayKey(today) }),
    );
    neonText(this, cx, cy + 124, dayKey(today), 16, '#5a6b7a');

    const rush = neonText(this, cx, cy + 162, '☠ BOSS RUSH', 26, '#ff5d8f').setInteractive({
      useHandCursor: true,
    });
    rush.on('pointerdown', () => this.start({ mode: 'bossrush' }));

    // Evento semanal: modificadores de regra iguais para todos na semana.
    const weeklyDefs = pickWeeklyModifiers(today, 2);
    const weekly = neonText(this, cx, cy + 214, '⚡ EVENTO SEMANAL', 26, '#9af7ef').setInteractive({
      useHandCursor: true,
    });
    weekly.on('pointerdown', () =>
      this.start({
        seed: weeklySeed(today),
        mode: 'endless',
        mods: combineMods(weeklyDefs),
        modLabels: weeklyDefs.map((m) => m.label),
      }),
    );
    neonText(
      this,
      cx,
      cy + 248,
      `${weekKey(today)}: ${weeklyDefs.map((m) => m.label).join(' · ')}`,
      14,
      '#5a6b7a',
    );

    this.input.keyboard?.once('keydown-ENTER', () => this.start({}));
    this.input.keyboard?.once('keydown-SPACE', () => this.start({}));

    // Apelido editável (identidade anônima leve, usada no ranking diário).
    const me = getIdentity();
    const nameBtn = neonText(
      this,
      cx,
      VIRTUAL_HEIGHT - 80,
      `nome: ${me.name}  ✎`,
      20,
      '#5a6b7a',
    ).setInteractive({ useHandCursor: true });
    nameBtn.on('pointerdown', () => {
      const novo = typeof window !== 'undefined' ? window.prompt('Seu apelido:', me.name) : null;
      if (novo !== null) {
        me.setName(novo);
        nameBtn.setText(`nome: ${me.name}  ✎`);
      }
    });
  }

  /** Inicia uma run (gesto satisfaz autoplay do áudio). */
  private start(data: GameSceneData): void {
    getAudio().start();
    this.scene.start(SceneKeys.Game, data);
  }
}
