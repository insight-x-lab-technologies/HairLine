import Phaser from 'phaser';
import { SceneKeys } from '../config/sceneKeys';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../config/layout';

/**
 * PreloadScene — carrega assets e mostra uma barra de progresso. Na Fase 0 não
 * há assets reais (estilo neon é desenhado por código), então apenas exibe um
 * progresso simbólico e segue para o Menu. Aqui entrarão atlas/áudio na Fase 1+.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Preload);
  }

  preload(): void {
    const cx = VIRTUAL_WIDTH / 2;
    const cy = VIRTUAL_HEIGHT / 2;

    this.add
      .text(cx, cy - 60, 'HAIRLINE', {
        fontFamily: 'monospace',
        fontSize: '56px',
        color: '#39f5e8',
      })
      .setOrigin(0.5);

    const barW = 420;
    const barH = 14;
    const frame = this.add.rectangle(cx, cy + 30, barW, barH).setStrokeStyle(2, 0x39f5e8);
    const fill = this.add.rectangle(cx - barW / 2, cy + 30, 0, barH, 0x0bd3c6).setOrigin(0, 0.5);

    this.load.on('progress', (p: number) => {
      fill.width = barW * p;
    });
    this.load.once('complete', () => {
      frame.destroy();
      fill.destroy();
    });

    // Carregamento simbólico para a barra ter o que mostrar na Fase 0.
    this.load.image('__favicon', 'favicon.svg');
  }

  create(): void {
    this.scene.start(SceneKeys.Menu);
  }
}
