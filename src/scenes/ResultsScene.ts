import Phaser from 'phaser';
import { SceneKeys } from '../config/sceneKeys';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../config/layout';
import { neonText, pulse } from '../ui/neonText';
import { getSave } from '../services/SaveService';
import { getLeaderboard } from '../services/LeaderboardService';
import { getIdentity } from '../services/PlayerIdentity';
import { shareCard, type ShareData } from '../services/ShareCard';
import { shareResult } from '../services/ShareImage';
import { verifyReplay, type Replay } from '../sim/Replay';
import type { GameMode } from '../sim/types';
import { getStage, STAGE_IDS, getAchievementDefs } from '../content';
import { recordAndUnlock, type RunSummary } from '../services/Achievements';

interface ResultsData {
  score?: number;
  graze?: number;
  kills?: number;
  livesLost?: number;
  ticks?: number;
  level?: number;
  won?: boolean;
  mode?: GameMode;
  daily?: boolean;
  dayKey?: string;
  stageId?: string;
  replay?: Replay;
}

/**
 * ResultsScene — placar da run: score/graze/recorde, card compartilhável e, no
 * Desafio Diário, envio ao ranking local + verificação anti-cheat por
 * re-simulação do replay (docs/04 Fase 3).
 */
export class ResultsScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Results);
  }

  create(data: ResultsData): void {
    const cx = VIRTUAL_WIDTH / 2;
    const score = data.score ?? 0;

    const title = data.won ? 'VITÓRIA!' : 'FIM DE JOGO';
    neonText(this, cx, 150, title, 54, data.won ? '#9af7ef' : '#ff5d8f');

    const isRecord = getSave().setBestScore(score);
    const best = getSave().getBestScore();

    // P6-02-01: registra a run no perfil e desbloqueia conquistas (ponto
    // canônico de fim de run). `data.mode` ausente ⇒ entrada sem run real.
    // O retorno (IDs novos) será anunciado pela UI da P6-02-02 (toasts).
    if (data.mode !== undefined) {
      const run: RunSummary = {
        mode: data.mode,
        daily: data.daily ?? false,
        won: data.won ?? false,
        score,
        graze: data.graze ?? 0,
        kills: data.kills ?? 0,
        livesLost: data.livesLost ?? 0,
      };
      recordAndUnlock(getSave(), getAchievementDefs(), run);
    }

    neonText(this, cx, 250, `SCORE  ${score}`, 40, '#ffd166');
    neonText(this, cx, 300, `GRAZE  ${data.graze ?? 0}   NÍVEL ${data.level ?? 1}`, 24, '#0bd3c6');
    if (isRecord) {
      pulse(this, neonText(this, cx, 344, '★ NOVO RECORDE! ★', 24, '#9af7ef'));
    } else {
      neonText(this, cx, 344, `recorde  ${best}`, 20, '#5a6b7a');
    }

    if (data.daily && data.dayKey) {
      this.showDaily(cx, data, score);
    } else if (data.mode === 'stage' && data.stageId) {
      this.showStage(cx, data, score);
    }

    this.showShare(cx, data, score);

    const prompt = neonText(this, cx, VIRTUAL_HEIGHT - 120, 'TOQUE PARA VOLTAR', 26, '#0bd3c6');
    pulse(this, prompt);
    // Pequeno atraso evita que o toque do fim de jogo já volte ao menu.
    this.time.delayedCall(400, () => {
      this.input.once('pointerdown', () => this.scene.start(SceneKeys.Menu));
      this.input.keyboard?.once('keydown-ENTER', () => this.scene.start(SceneKeys.Menu));
    });
  }

  /**
   * Bloco de estágio (P4-04b-04): grava conclusão + best local e mostra o
   * estado (estágio concluído / novo recorde do estágio). Desbloqueio do
   * próximo é consequência da conclusão (lido pelo seletor no Menu).
   */
  private showStage(cx: number, data: ResultsData, score: number): void {
    const stageId = data.stageId!;
    const stage = getStage(stageId);
    const { isRecord } = getSave().recordStageResult(stageId, {
      completed: data.won ?? false,
      score,
    });
    if (data.won) {
      pulse(this, neonText(this, cx, 400, `✓ ${stage.name} concluído!`, 24, '#3df5a5'));
      const idx = STAGE_IDS.indexOf(stageId);
      const next = idx >= 0 && idx + 1 < STAGE_IDS.length ? getStage(STAGE_IDS[idx + 1]!) : null;
      if (next) neonText(this, cx, 436, `▶ ${next.name} desbloqueado`, 18, '#0bd3c6');
    } else {
      neonText(this, cx, 400, `${stage.name}`, 22, '#5a6b7a');
    }
    if (isRecord) {
      neonText(this, cx, data.won ? 470 : 436, '★ recorde do estágio', 18, '#ffd166');
    }
  }

  /** Bloco do Desafio Diário: verificação anti-cheat + envio/listagem do ranking. */
  private showDaily(cx: number, data: ResultsData, score: number): void {
    const verified = data.replay ? verifyReplay(data.replay).ok : true;
    neonText(
      this,
      cx,
      400,
      verified ? '✓ run verificada' : '⚠ run não verificada',
      18,
      verified ? '#3df5a5' : '#ff5d8f',
    );
    neonText(this, cx, 446, `DIÁRIO ${data.dayKey}`, 20, '#ffd166');

    const me = getIdentity();
    const lb = getLeaderboard();
    const loading = neonText(this, cx, 486, 'carregando ranking…', 16, '#5a6b7a');
    // Envia (se verificada) e lista o top — assíncrono (local ou remoto).
    void (async () => {
      try {
        if (verified) await lb.submit(data.dayKey!, { name: me.name, score, id: me.id });
        const top = await lb.top(data.dayKey!, 5);
        loading.destroy();
        top.forEach((e, i) => {
          const mine = e.id === me.id;
          neonText(
            this,
            cx,
            486 + i * 30,
            `${i + 1}. ${e.name}  ${e.score}`,
            18,
            mine ? '#9af7ef' : '#5a6b7a',
          );
        });
        if (top.length === 0) loading.setText('seja o primeiro do dia!').setAlpha(1);
      } catch {
        loading.setText('ranking indisponível');
      }
    })();
  }

  /** Compartilhar: imagem (Web Share/download) + copiar texto (fator Wordle). */
  private showShare(cx: number, data: ResultsData, score: number): void {
    // Rótulo do estágio para o card (ex.: "Estágio 2"), pela ordem de STAGE_IDS.
    const stageIdx = data.stageId ? STAGE_IDS.indexOf(data.stageId) : -1;
    const share: ShareData = {
      mode: data.daily ? 'daily' : (data.mode ?? 'endless'),
      score,
      graze: data.graze ?? 0,
      level: data.level ?? 1,
      ...(data.dayKey ? { dayKey: data.dayKey } : {}),
      ...(data.won ? { won: true } : {}),
      ...(data.mode === 'stage' && stageIdx >= 0 ? { stageLabel: `Estágio ${stageIdx + 1}` } : {}),
    };

    const imgBtn = neonText(
      this,
      cx,
      VIRTUAL_HEIGHT - 230,
      '⤴ COMPARTILHAR IMAGEM',
      26,
      '#ffd166',
    ).setInteractive({ useHandCursor: true });
    imgBtn.on('pointerdown', () => {
      imgBtn.setText('gerando…');
      void shareResult(share).then((r) => {
        imgBtn.setText(
          r === 'downloaded'
            ? '✓ imagem salva'
            : r === 'shared'
              ? '✓ compartilhado'
              : 'indisponível',
        );
      });
    });

    const text = shareCard(share);
    const copyBtn = neonText(
      this,
      cx,
      VIRTUAL_HEIGHT - 180,
      '⧉ copiar texto',
      20,
      '#0bd3c6',
    ).setInteractive({ useHandCursor: true });
    copyBtn.on('pointerdown', () => {
      void navigator.clipboard?.writeText(text).then(
        () => copyBtn.setText('✓ copiado!'),
        () => copyBtn.setText('copie manualmente'),
      );
    });
  }
}
