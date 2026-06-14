import Phaser from 'phaser';
import { SceneKeys } from '../config/sceneKeys';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../config/layout';
import { neonText } from '../ui/neonText';
import { getSave } from '../services/SaveService';
import { statsModel } from '../ui/stats';

/**
 * StatsScene (P6-03-02) — estatísticas pessoais: totais acumulados, recordes por
 * modo e o histórico recente (anel das últimas runs). A curva de maestria
 * visível que alimenta o "só mais uma run". Apresentação pura: lê o perfil que
 * a P6-03-01 persiste (totais/recordes/histórico), não muda nada do jogo.
 *
 * Mesmo padrão visual da `AchievementsScene`; modelo derivado em `ui/stats`.
 */
export class StatsScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Stats);
  }

  create(): void {
    this.add
      .rectangle(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2, VIRTUAL_WIDTH, VIRTUAL_HEIGHT, 0x070912)
      .setDepth(-10);
    const cx = VIRTUAL_WIDTH / 2;
    const save = getSave();
    const model = statsModel(save.getProfileTotals(), save.getBestByMode(), save.getHistory());

    neonText(this, cx, 80, 'ESTATÍSTICAS', 48, '#0bd3c6');

    if (model.empty) {
      neonText(this, cx, VIRTUAL_HEIGHT / 2 - 40, 'jogue uma run', 30, '#ffd166');
      neonText(this, cx, VIRTUAL_HEIGHT / 2, 'para começar', 30, '#ffd166');
      neonText(
        this,
        cx,
        VIRTUAL_HEIGHT / 2 + 60,
        'seus totais e recordes aparecem aqui',
        18,
        '#5a6b7a',
      );
      this.addBack(cx);
      return;
    }

    // Totais (esquerda · direita), compactos no topo.
    const t = model.totals;
    const totalLines: ReadonlyArray<readonly [string, string]> = [
      ['runs', String(t.runs)],
      ['vitórias', String(t.wins)],
      ['kills', String(t.kills)],
      ['grazes', String(t.grazes)],
      ['tempo', t.playtime],
    ];
    totalLines.forEach(([k, v], i) => {
      const y = 150 + i * 34;
      neonText(this, 60, y, k, 22, '#5a6b7a').setOrigin(0, 0.5);
      neonText(this, VIRTUAL_WIDTH - 60, y, v, 24, '#9af7ef').setOrigin(1, 0.5);
    });

    // Recordes por modo (só os que existem).
    let y = 150 + totalLines.length * 34 + 18;
    neonText(this, 60, y, 'RECORDES', 22, '#ffd166').setOrigin(0, 0.5);
    y += 34;
    model.bests.forEach((b) => {
      neonText(this, 80, y, b.label, 20, '#5a6b7a').setOrigin(0, 0.5);
      neonText(this, VIRTUAL_WIDTH - 60, y, String(b.score), 22, '#ffd166').setOrigin(1, 0.5);
      y += 32;
    });

    // Histórico recente (data · modo · score · ✓/✗ · duração).
    y += 16;
    neonText(this, 60, y, 'RECENTES', 22, '#3df5a5').setOrigin(0, 0.5);
    y += 32;
    const maxRows = Math.max(0, Math.floor((VIRTUAL_HEIGHT - 120 - y) / 28));
    model.history.slice(0, maxRows).forEach((r) => {
      const mark = r.won ? '✓' : '✗';
      const color = r.won ? '#3df5a5' : '#ff5d8f';
      neonText(this, 60, y, `${r.date}  ${r.modeLabel}`, 18, '#5a6b7a').setOrigin(0, 0.5);
      neonText(
        this,
        VIRTUAL_WIDTH - 60,
        y,
        `${r.score} ${mark} ${r.duration}`,
        18,
        color,
      ).setOrigin(1, 0.5);
      y += 28;
    });

    this.addBack(cx);
  }

  private addBack(cx: number): void {
    const back = neonText(this, cx, VIRTUAL_HEIGHT - 60, '‹ VOLTAR', 30, '#ff5d8f').setInteractive({
      useHandCursor: true,
    });
    back.on('pointerdown', () => this.scene.start(SceneKeys.Menu));
    this.input.keyboard?.once('keydown-ESC', () => this.scene.start(SceneKeys.Menu));
  }
}
