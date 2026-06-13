import Phaser from 'phaser';
import { SceneKeys } from '../config/sceneKeys';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../config/layout';
import { neonText, pulse } from '../ui/neonText';

/**
 * PauseScene — overlay de pausa sobre a GameScene (docs/04 Fase 2).
 *
 * É lançada por cima (a GameScene fica pausada, sem ticar a simulação — o que
 * preserva o determinismo, pois nenhum tick ocorre enquanto pausado). Retomar
 * volta exatamente de onde parou; "sair" encerra a run e volta ao Menu.
 */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Pause);
  }

  create(): void {
    const cx = VIRTUAL_WIDTH / 2;
    const cy = VIRTUAL_HEIGHT / 2;

    this.add.rectangle(cx, cy, VIRTUAL_WIDTH, VIRTUAL_HEIGHT, 0x05060a, 0.7);
    neonText(this, cx, cy - 120, 'PAUSA', 64);

    const resume = neonText(this, cx, cy + 10, '▶ CONTINUAR', 34, '#0bd3c6')
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.resumeGame());
    pulse(this, resume);

    neonText(this, cx, cy + 90, '■ SAIR', 28, '#ff5d8f')
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.quitToMenu());

    this.input.keyboard?.on('keydown-ESC', () => this.resumeGame());
    this.input.keyboard?.on('keydown-P', () => this.resumeGame());
  }

  private resumeGame(): void {
    this.scene.stop();
    this.scene.resume(SceneKeys.Game);
  }

  private quitToMenu(): void {
    this.scene.stop(SceneKeys.Game);
    this.scene.stop();
    this.scene.start(SceneKeys.Menu);
  }
}
