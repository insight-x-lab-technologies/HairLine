import Phaser from 'phaser';
import { SceneKeys } from '../config/sceneKeys';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../config/layout';
import { neonText } from '../ui/neonText';
import { getSave } from '../services/SaveService';
import { getAchievementDefs } from '../content';
import { galleryModel } from '../ui/achievements';

/**
 * AchievementsScene (P6-02-02) — galeria de conquistas: todas as do JSON na
 * ordem de exibição, desbloqueadas acesas (título + data) e bloqueadas apagadas
 * com a condição (a `desc` da conquista, fonte única). Contador X/Y no topo.
 *
 * Cena própria acessível do Menu — a `StatsScene` (P6-03-02) ainda não existe;
 * quando existir, esta galeria pode virar uma aba lá (decisão registrada no PR).
 * Apresentação pura: lê só o que a P6-02-01 persiste, não muda nada do jogo.
 */
export class AchievementsScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Achievements);
  }

  create(): void {
    this.add
      .rectangle(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2, VIRTUAL_WIDTH, VIRTUAL_HEIGHT, 0x070912)
      .setDepth(-10);
    const cx = VIRTUAL_WIDTH / 2;
    neonText(this, cx, 80, 'CONQUISTAS', 52, '#0bd3c6');

    const model = galleryModel(getAchievementDefs(), getSave().getAchievements());
    neonText(this, cx, 142, `${model.unlockedCount}/${model.total}`, 28, '#ffd166');

    // Lista de ~10 itens sem scroll (cabe na tela retrato 720×1280).
    const top = 222;
    const step = Math.min(92, (VIRTUAL_HEIGHT - 160 - top) / Math.max(1, model.total));
    model.rows.forEach((row, i) => {
      const y = top + i * step;
      const titleColor = row.unlocked ? '#9af7ef' : '#5a6b7a';
      const mark = row.unlocked ? '★' : '🔒';
      neonText(this, 56, y, `${mark} ${row.title}`, 30, titleColor).setOrigin(0, 0.5);
      const sub = row.unlocked ? `desbloqueada · ${row.dateIso}` : row.desc;
      neonText(this, 92, y + 32, sub, 17, '#5a6b7a').setOrigin(0, 0.5);
    });

    const back = neonText(this, cx, VIRTUAL_HEIGHT - 70, '‹ VOLTAR', 30, '#ff5d8f').setInteractive({
      useHandCursor: true,
    });
    back.on('pointerdown', () => this.scene.start(SceneKeys.Menu));
    this.input.keyboard?.once('keydown-ESC', () => this.scene.start(SceneKeys.Menu));
  }
}
