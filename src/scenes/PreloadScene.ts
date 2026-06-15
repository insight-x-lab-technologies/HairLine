import Phaser from 'phaser';
import { SceneKeys } from '../config/sceneKeys';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../config/layout';
import { resolveTheme } from '../config/themes';
import { getSave } from '../services/SaveService';

/**
 * PreloadScene — carrega assets e mostra uma barra de progresso. Carregamento
 * CONDICIONAL pelo tema ativo (P10-04): só o manifesto do tema escolhido entra,
 * nunca assets de outro tema "por via das dúvidas". O tema vetorial (arcade) é
 * desenhado por código e não tem manifesto ⇒ nada além do simbólico é carregado.
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

    // Carregamento simbólico para a barra ter o que mostrar (sem assets de tema).
    this.load.image('__favicon', 'favicon.svg');

    // Manifesto do tema ATIVO apenas (P10-04). Vetorial = lista vazia (no-op);
    // o tema "polido" registrará atlas/áudio e só estes serão carregados.
    const theme = resolveTheme(getSave().getSelectedThemeId());
    for (const asset of theme.assets) {
      if (asset.type === 'audio') this.load.audio(asset.key, asset.url);
      else this.load.image(asset.key, asset.url);
    }
  }

  create(): void {
    this.scene.start(SceneKeys.Menu);
  }
}
