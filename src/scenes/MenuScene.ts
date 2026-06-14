import Phaser from 'phaser';
import { SceneKeys } from '../config/sceneKeys';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../config/layout';
import { neonText, pulse } from '../ui/neonText';
import { getAudio } from '../services/AudioService';
import { getSave } from '../services/SaveService';
import { getHaptics } from '../services/HapticsService';
import { dailySeed, dayKey } from '../services/DailySeed';
import { getIdentity } from '../services/PlayerIdentity';
import { pickWeeklyModifiers, combineMods, weeklySeed, weekKey } from '../systems/Modifiers';
import { STAGE_IDS } from '../content';
import { stagePayload, stageRows } from '../ui/stageSelect';
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

    const endlessBtn = neonText(this, cx, cy + 16, '▶ ENDLESS', 36, '#0bd3c6').setInteractive({
      useHandCursor: true,
    });
    pulse(this, endlessBtn);
    endlessBtn.on('pointerdown', () => this.start({}));

    const stagesBtn = neonText(this, cx, cy + 56, '◆ ESTÁGIOS', 28, '#3df5a5').setInteractive({
      useHandCursor: true,
    });
    stagesBtn.on('pointerdown', () => this.showStages());

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

    // Hangar (P6-01-02) + Conquistas (P6-02-02): meta-progressão, lado a lado.
    const hangar = neonText(this, cx - 110, cy + 292, '✦ HANGAR', 24, '#a78bfa').setInteractive({
      useHandCursor: true,
    });
    hangar.on('pointerdown', () => this.scene.start(SceneKeys.Hangar));

    const ach = neonText(this, cx + 110, cy + 292, '★ CONQUISTAS', 24, '#ffd166').setInteractive({
      useHandCursor: true,
    });
    ach.on('pointerdown', () => this.scene.start(SceneKeys.Achievements));

    // Estatísticas pessoais (P6-03-02): curva de maestria visível.
    const stats = neonText(this, cx, cy + 328, '▦ ESTATÍSTICAS', 22, '#9af7ef').setInteractive({
      useHandCursor: true,
    });
    stats.on('pointerdown', () => this.scene.start(SceneKeys.Stats));

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

    // Toggle de vibração (P5-04-03): exibido só onde a API existe (Android).
    const haptics = getHaptics(getSave());
    if (haptics.isSupported) {
      const label = (): string => `📳 ${haptics.isEnabled ? 'ON' : 'OFF'}`;
      const hapticBtn = neonText(
        this,
        cx,
        VIRTUAL_HEIGHT - 40,
        label(),
        18,
        '#5a6b7a',
      ).setInteractive({
        useHandCursor: true,
      });
      hapticBtn.on('pointerdown', () => {
        haptics.toggle();
        hapticBtn.setText(label());
      });
    }
  }

  /**
   * Seletor de estágios (P4-04b-04): overlay com a lista de estágios, status de
   * desbloqueio (✔ concluído / ▶ disponível / 🔒 travado) e melhor score. Tocar
   * num disponível inicia a run; travado é ignorado (sem interatividade).
   */
  private showStages(): void {
    const cx = VIRTUAL_WIDTH / 2;
    const overlay = this.add.container(0, 0).setDepth(100);
    // Fundo opaco interativo: cobre o menu e absorve toques em área vazia.
    const bg = this.add
      .rectangle(cx, VIRTUAL_HEIGHT / 2, VIRTUAL_WIDTH, VIRTUAL_HEIGHT, 0x05060a, 0.97)
      .setInteractive();
    overlay.add(bg);
    overlay.add(neonText(this, cx, 150, 'ESTÁGIOS', 48, '#0bd3c6'));

    stageRows(STAGE_IDS, getSave()).forEach((r, i) => {
      const y = 300 + i * 110;
      const status = r.unlocked ? (r.completed ? '✔' : '▶') : '🔒';
      const color = r.unlocked ? (r.completed ? '#3df5a5' : '#ffd166') : '#5a6b7a';
      const label = neonText(this, cx, y, `${status} ${r.name}`, 36, color);
      const sub = r.unlocked
        ? r.bestScore > 0
          ? `melhor ${r.bestScore}`
          : 'disponível'
        : 'bloqueado';
      const subText = neonText(this, cx, y + 38, sub, 18, '#5a6b7a');
      overlay.add(label);
      overlay.add(subText);
      if (r.unlocked) {
        label.setInteractive({ useHandCursor: true });
        label.on('pointerdown', () => this.start(stagePayload(r.id)));
      }
    });

    const back = neonText(this, cx, VIRTUAL_HEIGHT - 90, '‹ VOLTAR', 28, '#ff5d8f').setInteractive({
      useHandCursor: true,
    });
    overlay.add(back);
    back.on('pointerdown', () => overlay.destroy());
  }

  /** Inicia uma run (gesto satisfaz autoplay do áudio). */
  private start(data: GameSceneData): void {
    getAudio().start();
    this.scene.start(SceneKeys.Game, data);
  }
}
