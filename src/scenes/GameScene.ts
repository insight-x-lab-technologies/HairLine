import Phaser from 'phaser';
import { SceneKeys } from '../config/sceneKeys';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT, TICK_RATE_HZ } from '../config/layout';
import { Simulation } from '../sim/Simulation';
import { FixedStepLoop } from '../sim/FixedStepLoop';
import type { GameMode, RunMods } from '../sim/types';
import { InputService, type ViewportMapper } from '../services/InputService';
import { getAudio } from '../services/AudioService';
import { snapshotOf, diffCues, type AudioSnapshot } from '../systems/AudioCues';
import { ReplayRecorder } from '../sim/Replay';
import { readSafeAreaInsets } from '../services/SafeArea';
import { hudPadding } from '../ui/hudLayout';
import { neonText } from '../ui/neonText';
import { applyHitStop, tickHitStop, isFrozen } from '../ui/HitStop';
import { musicTargets } from '../services/MusicDirector';
import { getHaptics } from '../services/HapticsService';
import { getSave } from '../services/SaveService';
import { getControlsConfig } from '../config/controls';
import { getEffects, getAudioConfig, getCosmetics } from '../content';
import { getLoadout, findCosmetic, type ShipCosmetic, type ShotColorCosmetic, type MusicCosmetic } from '../services/Cosmetics';
import { cosmeticProfileFrom } from '../ui/hangar';
import type { EffectsConfig } from '../content/types';
import { createRenderer } from '../render/createRenderer';
import { resolveTheme } from '../config/themes';
import type { GameRenderer, ThemeCosmetics } from '../render/GameRenderer';

/**
 * GameScene — camada de APRESENTAÇÃO do jogo. Toda a lógica vive na simulação
 * headless determinística (`src/sim`); aqui só fazemos:
 *   - Simulation dirigida por FixedStepLoop (passos fixos, separados do FPS);
 *   - InputService traduzindo toque/mouse/teclado em eventos lógicos
 *     (move, focus, pulse) que viram SimInput;
 *   - HUD textual, botões, anúncios de estágio e o hit-stop do loop.
 *
 * O DESENHO do mundo (nave, inimigos, chefe, balas, partículas, fundo, anel de
 * graze, barra de Foco) é DELEGADO a um `GameRenderer` (tema de render, P10-02):
 * a cena resolve o tema ativo do registro (P10-04) no `create()` e o invoca por
 * frame, sem desenhar nada diretamente. O tema lê só o estado autoritativo da
 * sim (presentation-only). O tema default (arcade) é o `VectorTheme` (neon
 * vetorial = visual atual) + `SynthAudioTheme`.
 *
 * Suporta pausa (overlay PauseScene) e game over → tela de resultado.
 */
/** Dados passados pelo Menu ao iniciar uma run. */
export interface GameSceneData {
  seed?: number;
  mode?: GameMode;
  daily?: boolean;
  dayKey?: string;
  /** Id do estágio curado (modo `stage`). */
  stageId?: string;
  /** Classe de nave (P6-04): muda regras de jogo. Ausente ⇒ nave default. */
  shipId?: string;
  /** Modificadores de regra (evento semanal). */
  mods?: RunMods;
  /** Rótulos dos modificadores ativos (para exibir no HUD). */
  modLabels?: string[];
}

export class GameScene extends Phaser.Scene {
  private sim!: Simulation;
  private loop!: FixedStepLoop;
  private inputSvc!: InputService;

  /** Tema de render (P10-02): a cena DELEGA todo o desenho do mundo a ele. */
  private theme!: GameRenderer;
  private hud!: Phaser.GameObjects.Text;
  private pauseBtn!: Phaser.GameObjects.Text;
  private muteBtn!: Phaser.GameObjects.Text;
  private pulseBtn!: Phaser.GameObjects.Text;
  private hintText: Phaser.GameObjects.Text | undefined;
  /** Pedido de pulso pendente, consumido no próximo tick da simulação. */
  private pulseRequested = false;
  /** Marca o 1º frame após retomar da pausa (descarta o delta gigante). */
  private justResumed = false;
  /** Último instantâneo de áudio, para detectar eventos a sonorizar. */
  private prevAudio!: AudioSnapshot;
  /** Gravação de inputs da run (para replay/anti-cheat e Diário). */
  private recorder!: ReplayRecorder;
  private daily = false;
  /** Seed da run corrente (informativo no histórico de runs — P6-03-02). */
  private seed = 0;
  private dayKey: string | undefined;
  private stageId: string | undefined;
  private modLabels: string[] = [];
  /** Indicador persistente de progresso do estágio ("n/m"). */
  private stageHud: Phaser.GameObjects.Text | undefined;
  /** Texto de anúncio central reutilizado ("ONDA n/m" / "CHEFE"). */
  private announceText: Phaser.GameObjects.Text | undefined;
  /** Última seção anunciada (0 = nenhuma), para disparar o anúncio uma vez. */
  private lastSection = 0;

  /** Alvo de movimento corrente, em coordenadas do mundo virtual. */
  private readonly target = { x: VIRTUAL_WIDTH / 2, y: VIRTUAL_HEIGHT * 0.78 };
  private focus = false;

  /**
   * Config de efeitos resolvida uma vez (P5-01-01). A cena só usa o teto do
   * hit-stop e a cor de "pulso pronto"; o resto do consumo de efeitos vive no
   * tema de render. Nada de lookup no loop.
   */
  private readonly effects: EffectsConfig = getEffects();
  /** Hit-stop pendente em ms (P5-01-04): enquanto >0, a cena pula o advance. */
  private hitStopMs = 0;

  /** Preset de trilha do cosmético escolhido (P6-01-02): domínio de áudio. */
  private musicPreset = 'default';

  constructor() {
    super(SceneKeys.Game);
  }

  create(data: GameSceneData = {}): void {
    // Loadout cosmético (P6-01-02): resolvido UMA vez aqui (apresentação pura;
    // a simulação não o recebe). Seleção inválida/bloqueada cai nos defaults.
    const cosmetics = this.resolveLoadout();
    // Serviço de haptics (P5-04-03): preferência persistida no SaveService.
    getHaptics(getSave());

    // --- Núcleo determinístico -------------------------------------------
    // Seed/modo vêm do Menu (Endless casual = seed do relógio; Diário = seed do dia).
    const seed = data.seed ?? Date.now() >>> 0;
    this.seed = seed;
    const mode = data.mode ?? 'endless';
    this.daily = data.daily ?? false;
    this.dayKey = data.dayKey;
    this.stageId = data.stageId;
    this.modLabels = data.modLabels ?? [];
    this.sim = new Simulation({
      seed,
      tickRateHz: TICK_RATE_HZ,
      mode,
      ...(data.mods ? { mods: data.mods } : {}),
      ...(this.stageId ? { stageId: this.stageId } : {}),
      ...(data.shipId ? { shipId: data.shipId } : {}),
    });
    this.recorder = new ReplayRecorder(seed, mode, data.mods, this.stageId, data.shipId);
    // Alvo inicial = posição inicial da nave, para "neutro" = ficar parado.
    this.target.x = this.sim.player.x;
    this.target.y = this.sim.player.y;
    // Tema de apresentação (P10-04): resolvido UMA vez do registro (estado do
    // jogador, fora da sim). Escolhe o renderer (P10-02) e o tema de áudio
    // (P10-03) — sem lookup no loop. Inválido/ausente ⇒ default arcade.
    const themeDef = resolveTheme(getSave().getSelectedThemeId());
    getAudio().useAudioTheme(themeDef.audioThemeId);
    // Tema de render: cria os GameObjects de apresentação e desenha o mundo a
    // partir do estado autoritativo da sim. A cena só DELEGA o desenho.
    this.theme = createRenderer(themeDef.rendererId);
    this.theme.init(this, cosmetics);
    this.loop = new FixedStepLoop(this.sim.fixedDeltaMs, () => {
      const pulse = this.pulseRequested;
      this.pulseRequested = false; // consome uma vez (gatilho de borda)
      const input = { moveX: this.target.x, moveY: this.target.y, focus: this.focus, pulse };
      this.recorder.record(input); // grava exatamente o que será simulado
      this.sim.tick(input);
    });
    this.prevAudio = snapshotOf(this.sim);
    // Áudio só inicia após um gesto (políticas de autoplay) + trilha em loop.
    // Preset de trilha do cosmético escolhido (P6-01-02), antes de iniciar.
    getAudio().start();
    getAudio().setMusicPreset(this.musicPreset);
    getAudio().startMusic();

    // --- Input abstrato (toque/mouse/teclado → eventos lógicos) ----------
    // Controle de toque relativo (P10-01): config de feel em controls.json,
    // esquema escolhido persistido no SaveService. Presentation-only — a sim
    // segue recebendo só o alvo absoluto já resolvido.
    const controls = getControlsConfig();
    this.inputSvc = new InputService(this.game.canvas, this.makeMapper(), {
      touchScheme: getSave().getControlScheme() ?? controls.scheme,
      sensitivity: controls.sensitivity,
      focusSensitivityFactor: controls.focusSensitivityFactor,
      bounds: { width: VIRTUAL_WIDTH, height: VIRTUAL_HEIGHT },
    });
    this.inputSvc.attach();
    // Ancora o alvo na posição inicial da nave para o 1º toque não dar salto.
    this.inputSvc.seedTarget(this.sim.player.x, this.sim.player.y);
    this.inputSvc.on('move', (m) => {
      this.target.x = Phaser.Math.Clamp(m.x, 0, VIRTUAL_WIDTH);
      this.target.y = Phaser.Math.Clamp(m.y, 0, VIRTUAL_HEIGHT);
    });
    this.inputSvc.on('focus', (f) => {
      this.focus = f;
    });
    this.inputSvc.on('pulse', () => {
      this.pulseRequested = true;
    });

    // --- HUD (posicionado por layoutHud, respeitando safe-areas) ---------
    this.hud = neonText(this, 0, 0, '', 20, '#5a6b7a').setOrigin(0, 0);

    // Botão de pulso refletor na tela (também por tecla Espaço/X).
    this.pulseBtn = neonText(this, 0, 0, '◎ PULSO', 30, '#ffd166')
      .setOrigin(0.5, 1)
      .setInteractive({ useHandCursor: true });
    this.pulseBtn.on('pointerdown', () => this.inputSvc.requestPulse());

    // Pausa: botão na tela (também por ESC/P).
    this.pauseBtn = neonText(this, 0, 0, '❚❚', 26, '#5a6b7a')
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    this.pauseBtn.on('pointerdown', () => this.pauseGame());

    // Mudo: alterna o áudio (estado persistido no AudioService).
    this.muteBtn = neonText(this, 0, 0, getAudio().isMuted ? '♪̸' : '♪', 26, '#5a6b7a')
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    this.muteBtn.on('pointerdown', () => {
      getAudio().start();
      this.muteBtn.setText(getAudio().toggleMute() ? '♪̸' : '♪');
    });
    this.input.keyboard?.on('keydown-ESC', () => this.pauseGame());
    this.input.keyboard?.on('keydown-P', () => this.pauseGame());

    // --- Progresso do estágio (P4-04b-02): indicador "n/m" + anúncios --------
    if (mode === 'stage') {
      this.stageHud = neonText(this, 0, 0, '', 22, '#ffd166').setOrigin(0.5, 0);
      // Anúncio central no terço superior (não cobre a nave); reutilizado.
      this.announceText = neonText(this, VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT * 0.3, '', 56, '#9af7ef')
        .setOrigin(0.5)
        .setAlpha(0);
    }

    this.showTutorialHint();
    this.layoutHud();
    // Reposiciona ao girar/redimensionar (mantém HUD fora das safe-areas).
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layoutHud, this);

    // Ao pausar/retomar: solta/recupera o input e descarta o delta acumulado.
    // Hit-stop tem precedência zero diante da pausa: zera para não vazar (P5-01-04).
    this.events.on(Phaser.Scenes.Events.PAUSE, () => {
      this.inputSvc.detach();
      this.hitStopMs = 0;
    });
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.inputSvc.attach();
      // Reancora na posição corrente do alvo: soltar/pausar e tocar de novo
      // não dá salto no modo relativo (P10-01).
      this.inputSvc.seedTarget(this.target.x, this.target.y);
      this.loop.reset();
      this.justResumed = true;
      this.hitStopMs = 0;
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.inputSvc.detach();
      getAudio().stopMusic();
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layoutHud, this);
      this.theme.destroy();
    });
  }

  private pauseGame(): void {
    this.scene.pause();
    this.scene.launch(SceneKeys.Pause);
  }

  /** Reposiciona o HUD respeitando as safe-areas (chamado no início e no resize). */
  private layoutHud(): void {
    const pad = hudPadding(
      VIRTUAL_WIDTH,
      VIRTUAL_HEIGHT,
      window.innerWidth,
      window.innerHeight,
      readSafeAreaInsets(),
    );
    this.theme.setHudPad(pad);
    this.hud.setPosition(pad.left, pad.top);
    this.pauseBtn.setPosition(VIRTUAL_WIDTH - pad.right, pad.top);
    this.muteBtn.setPosition(VIRTUAL_WIDTH - pad.right - 48, pad.top);
    this.pulseBtn.setPosition(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT - pad.bottom - 12);
    this.hintText?.setPosition(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT - pad.bottom - 70);
    // Indicador de estágio no topo-centro (acima da barra de vida do chefe).
    this.stageHud?.setPosition(VIRTUAL_WIDTH / 2, pad.top);
  }

  /** Dica de controles que esmaece nos primeiros segundos (tutorial mínimo). */
  private showTutorialHint(): void {
    this.hintText = neonText(
      this,
      VIRTUAL_WIDTH / 2,
      VIRTUAL_HEIGHT - 200,
      'ARRASTE p/ mover · SEGURE p/ FOCO · PULSO limpa balas',
      16,
      '#5a6b7a',
    );
    this.tweens.add({
      targets: this.hintText,
      alpha: 0,
      delay: 3500,
      duration: 1500,
      onComplete: () => {
        this.hintText?.destroy();
        this.hintText = undefined;
      },
    });
  }

  override update(_time: number, deltaMs: number): void {
    // 1) Movimento contínuo por teclado é integrado pelo InputService (segue
    //    rodando mesmo no hit-stop, para o arrasto não dar salto ao retomar).
    this.inputSvc.update(deltaMs / 1000);
    // 2) A simulação avança em passos FIXOS, independente deste FPS de render.
    //    HIT-STOP (P5-01-04): enquanto congelado, NÃO alimenta loop.advance e
    //    NÃO acumula o tempo (sem catch-up de ticks). No 1º frame após retomar
    //    da pausa, descarta o delta gigante acumulado.
    const frozen = isFrozen(this.hitStopMs);
    if (frozen) {
      this.hitStopMs = tickHitStop(this.hitStopMs, deltaMs);
    } else if (this.justResumed) {
      this.justResumed = false;
    } else {
      this.loop.advance(deltaMs);
    }
    // 2b) Fundo estelar (parallax) — delegado ao tema.
    this.theme.updateBackground(deltaMs);

    // 2c) Áudio + haptics + feedback de dano: sonoriza e reage aos eventos.
    //     Os efeitos VISUAIS de cada cue (shake/flash/ping) vão para o tema.
    const curAudio = snapshotOf(this.sim);
    const audio = getAudio();
    const haptics = getHaptics();
    for (const cue of diffCues(this.prevAudio, curAudio)) {
      audio.play(cue);
      this.theme.reactToCue(cue);
      haptics.vibrate(cue);
    }
    this.prevAudio = curAudio;

    // 2d) Trilha dinâmica por intensidade (P5-04-01).
    this.updateMusic();

    // 2e) Eventos de FX com posição → partículas + hit-stop (P5-01-03/P5-02-01).
    //     Só quando NÃO congelado: o buffer é do último tick avançado; durante
    //     o hit-stop as partículas congelam junto (coerência visual). O tema
    //     dispara as partículas e devolve o hit-stop; a cena o aplica ao loop.
    if (!frozen) {
      this.hitStopMs = applyHitStop(
        this.hitStopMs,
        this.theme.consumeFx(this.sim),
        this.effects.hitStop.maxMs,
      );
      this.theme.advanceFx(this.sim, deltaMs / this.sim.fixedDeltaMs);
    }

    // 2f) Progresso do estágio: anúncio de seção + indicador "n/m".
    this.updateStageProgress();

    // 3) Fim de jogo: vai para a tela de resultado com o placar.
    if (this.sim.state.gameOver) {
      this.endRun();
      return;
    }

    // 4) Render do mundo: DELEGADO ao tema, que lê só o estado autoritativo da
    //    sim. A cena mantém apenas HUD textual e o estado do botão de pulso.
    this.theme.draw(this.sim, { time: _time, focus: this.focus });

    const s = this.sim.state;
    const modLine = this.modLabels.length > 0 ? `\n⚡ ${this.modLabels.join(' · ')}` : '';
    this.hud.setText(
      `SCORE ${s.score}   VIDAS ${'♥'.repeat(s.lives)}   NÍVEL ${this.sim.level + 1}\n` +
        `FOCO ${s.focus}  GRAZE ${s.grazeCount}  ${this.focus ? '[modo foco]' : ''}\n` +
        `inimigos ${this.sim.enemies.activeCount}  balas ${this.sim.enemyBullets.activeCount}  fps ${Math.round(this.game.loop.actualFps)}` +
        modLine,
    );

    // Estado do botão de pulso (P5-02-03): "pronto" acende e pulsa; senão apaga.
    const ready = s.focus >= this.sim.pulseCost;
    this.pulseBtn.setColor(ready ? this.effects.focusHud.readyColor : '#5a6b7a');
    this.pulseBtn.setAlpha(ready ? 0.75 + 0.25 * Math.sin(_time / 120) : 0.4);
  }

  /**
   * Lê o progresso do estágio da sim (somente leitura) e reage no render
   * (P4-04b-02): mantém o indicador "n/m" e dispara o anúncio uma vez por
   * troca de seção. O "último visto" mora na CENA, nunca na simulação.
   */
  private updateStageProgress(): void {
    const p = this.sim.stageProgress;
    if (!p || !this.stageHud) return;
    this.stageHud.setText(`${p.section}/${p.total}`);
    if (p.section === this.lastSection) return;
    this.lastSection = p.section;
    const t = this.announceText;
    if (t) {
      t.setText(p.kind === 'boss' ? 'CHEFE' : `ONDA ${p.section}/${p.total}`);
      t.setColor(p.kind === 'boss' ? '#ff5d8f' : '#9af7ef');
      t.setAlpha(1);
      this.tweens.killTweensOf(t);
      this.tweens.add({ targets: t, alpha: 0, delay: 900, duration: 700 });
    }
    if (p.kind === 'boss') getAudio().play('bossentry');
  }

  /** Alimenta a trilha dinâmica com o snapshot de intensidade (P5-04-01). */
  private updateMusic(): void {
    const boss = this.sim.boss;
    const targets = musicTargets(
      {
        level: this.sim.level,
        bossActive: boss?.alive ?? false,
        lives: this.sim.state.lives,
        gameOver: this.sim.state.gameOver,
      },
      getAudioConfig().music,
    );
    getAudio().setLayerTargets(targets);
  }

  /**
   * Resolve o loadout cosmético (P6-01-02) do save para a apresentação: forma/
   * cor da nave, cor do tiro (entregues ao tema de render) e preset de trilha
   * (domínio de áudio, fica na cena). Seleção inválida/bloqueada cai nos defaults
   * (`getLoadout` nunca lança). NADA disto chega à simulação.
   */
  private resolveLoadout(): ThemeCosmetics {
    const catalog = getCosmetics();
    const save = getSave();
    const loadout = getLoadout(catalog, cosmeticProfileFrom(save), save.getLoadoutSelection());
    const ship = findCosmetic(catalog, loadout.shipId) as ShipCosmetic;
    const shot = findCosmetic(catalog, loadout.shotColorId) as ShotColorCosmetic;
    const music = findCosmetic(catalog, loadout.musicId) as MusicCosmetic;
    this.musicPreset = music.preset;
    return {
      shipId: loadout.shipId,
      shipShape: ship.shape,
      shipColor: Phaser.Display.Color.HexStringToColor(ship.color).color,
      shotColor: Phaser.Display.Color.HexStringToColor(shot.color).color,
    };
  }

  private makeMapper(): ViewportMapper {
    // FIT mode: o canvas (via CSS) cobre exatamente a área de jogo exibida,
    // então mapear pelo bounding rect do canvas converte tela → mundo virtual.
    const canvas = this.game.canvas;
    return {
      toWorld: (clientX: number, clientY: number) => {
        const r = canvas.getBoundingClientRect();
        return {
          x: ((clientX - r.left) / r.width) * VIRTUAL_WIDTH,
          y: ((clientY - r.top) / r.height) * VIRTUAL_HEIGHT,
        };
      },
    };
  }

  private endRun(): void {
    const s = this.sim.state;
    getAudio().stopMusic();
    this.scene.start(SceneKeys.Results, {
      score: s.score,
      graze: s.grazeCount,
      kills: s.kills,
      livesLost: s.startLives - s.lives,
      ticks: this.sim.tickCount,
      level: this.sim.level + 1,
      won: s.won,
      mode: this.sim.mode,
      daily: this.daily,
      seed: this.seed,
      dayKey: this.dayKey,
      stageId: this.stageId,
      replay: this.recorder.finalize(this.sim),
    });
  }
}
