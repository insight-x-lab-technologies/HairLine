import Phaser from 'phaser';
import { SceneKeys } from '../config/sceneKeys';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT, TICK_RATE_HZ } from '../config/layout';
import { Simulation } from '../sim/Simulation';
import { FixedStepLoop } from '../sim/FixedStepLoop';
import type { GameMode, RunMods } from '../sim/types';
import { Rng } from '../services/Rng';
import { InputService, type ViewportMapper } from '../services/InputService';
import { getAudio } from '../services/AudioService';
import { snapshotOf, diffCues, type AudioSnapshot } from '../systems/AudioCues';
import { ReplayRecorder } from '../sim/Replay';
import { readSafeAreaInsets } from '../services/SafeArea';
import { hudPadding, type HudPadding } from '../ui/hudLayout';
import { shapePoints } from '../ui/shapes';
import { neonText } from '../ui/neonText';
import { ParticlePool } from '../ui/ParticlePool';
import { hitStopDurationFor, applyHitStop, tickHitStop, isFrozen } from '../ui/HitStop';
import { musicTargets } from '../services/MusicDirector';
import { getHaptics } from '../services/HapticsService';
import { getSave } from '../services/SaveService';
import { getEffects, getAudioConfig } from '../content';
import type { EffectsConfig } from '../content/types';
import type { FxEventType } from '../sim/FxEvents';
import playerData from '../data/player.json';

/**
 * GameScene — camada de APRESENTAÇÃO do jogo. Toda a lógica vive na simulação
 * headless determinística (`src/sim`); aqui só fazemos:
 *   - Simulation dirigida por FixedStepLoop (passos fixos, separados do FPS);
 *   - InputService traduzindo toque/mouse/teclado em eventos lógicos
 *     (move, focus, pulse) que viram SimInput;
 *   - render dos pools autoritativos (nave, tiros, inimigos, balas) por frame,
 *     sem criar GameObjects no loop.
 *
 * A nave desenha um ponto central pequeno = HITBOX ≠ SPRITE (docs/02 §3.5).
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
  /** Modificadores de regra (evento semanal). */
  mods?: RunMods;
  /** Rótulos dos modificadores ativos (para exibir no HUD). */
  modLabels?: string[];
}

export class GameScene extends Phaser.Scene {
  private sim!: Simulation;
  private loop!: FixedStepLoop;
  private inputSvc!: InputService;

  private ship!: Phaser.GameObjects.Container;
  private engine!: Phaser.GameObjects.Triangle;
  private bgGfx!: Phaser.GameObjects.Graphics;
  /** Campo de estrelas (parallax) — x, y, profundidade z (0..1). */
  private readonly stars: { x: number; y: number; z: number }[] = [];
  /** Rng decorativo do fundo (não afeta o jogo; só evita Math.random). */
  private starRng!: Rng;
  private shotsGfx!: Phaser.GameObjects.Graphics;
  private enemyGfx!: Phaser.GameObjects.Graphics;
  private bossGfx!: Phaser.GameObjects.Graphics;
  private enemyBulletGfx!: Phaser.GameObjects.Graphics;
  private fxGfx!: Phaser.GameObjects.Graphics;
  /** Anel de graze na nave (P5-02-02), camada baixa para não cobrir balas. */
  private ringGfx!: Phaser.GameObjects.Graphics;
  /** Partículas decorativas de impacto/kill/graze (P5-01-02/03, P5-02-01). */
  private particlesGfx!: Phaser.GameObjects.Graphics;
  private particles!: ParticlePool;
  /** Barra de Foco no HUD (P5-02-03). */
  private focusGfx!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private pauseBtn!: Phaser.GameObjects.Text;
  private muteBtn!: Phaser.GameObjects.Text;
  private pulseBtn!: Phaser.GameObjects.Text;
  private hintText: Phaser.GameObjects.Text | undefined;
  /** Padding do HUD em unidades virtuais, respeitando safe-areas. */
  private hudPad: HudPadding = { top: 16, right: 16, bottom: 16, left: 16 };
  /** Pedido de pulso pendente, consumido no próximo tick da simulação. */
  private pulseRequested = false;
  /** Marca o 1º frame após retomar da pausa (descarta o delta gigante). */
  private justResumed = false;
  /** Último instantâneo de áudio, para detectar eventos a sonorizar. */
  private prevAudio!: AudioSnapshot;
  /** Gravação de inputs da run (para replay/anti-cheat e Diário). */
  private recorder!: ReplayRecorder;
  private daily = false;
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

  /** Config de efeitos resolvida uma vez (P5-01-01) — nada de lookup no loop. */
  private readonly effects: EffectsConfig = getEffects();
  /** Cores de partícula pré-convertidas (hex→int) por tipo de evento. */
  private particleColors: Partial<Record<FxEventType, number>> = {};
  /** Cache hex→int para cores herdadas do evento (inimigo/chefe). */
  private readonly colorCache = new Map<string, number>();
  /** Hit-stop pendente em ms (P5-01-04): enquanto >0, a cena pula o advance. */
  private hitStopMs = 0;
  /** Ping do anel de graze, em ticks restantes (P5-02-02). */
  private grazeRingPing = 0;
  /** Blip da barra de Foco, em ticks restantes (P5-02-03). */
  private focusBlip = 0;
  /** Foco do frame anterior, para detectar ganho (blip). */
  private prevFocus = 0;

  constructor() {
    super(SceneKeys.Game);
  }

  create(data: GameSceneData = {}): void {
    this.drawField();
    // Camadas únicas redesenhadas por frame a partir dos pools da sim
    // (sem criar GameObjects no loop). Ordem de empilhamento (baixo→alto):
    // anel de graze → inimigos → tiros → balas → fx do pulso → partículas.
    this.ringGfx = this.add.graphics(); // sob as balas (legibilidade)
    this.enemyGfx = this.add.graphics();
    this.bossGfx = this.add.graphics();
    this.shotsGfx = this.add.graphics();
    this.enemyBulletGfx = this.add.graphics();
    this.fxGfx = this.add.graphics();
    this.particlesGfx = this.add.graphics(); // faíscas acima das balas
    this.focusGfx = this.add.graphics();
    this.particles = new ParticlePool(512, 0x5eed);
    this.cacheParticleColors();
    // Serviço de haptics (P5-04-03): preferência persistida no SaveService.
    getHaptics(getSave());
    this.ship = this.makeShip();

    // --- Núcleo determinístico -------------------------------------------
    // Seed/modo vêm do Menu (Endless casual = seed do relógio; Diário = seed do dia).
    const seed = data.seed ?? Date.now() >>> 0;
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
    });
    this.recorder = new ReplayRecorder(seed, mode, data.mods, this.stageId);
    // Alvo inicial = posição inicial da nave, para "neutro" = ficar parado.
    this.target.x = this.sim.player.x;
    this.target.y = this.sim.player.y;
    this.ship.setPosition(this.sim.player.x, this.sim.player.y);
    this.loop = new FixedStepLoop(this.sim.fixedDeltaMs, () => {
      const pulse = this.pulseRequested;
      this.pulseRequested = false; // consome uma vez (gatilho de borda)
      const input = { moveX: this.target.x, moveY: this.target.y, focus: this.focus, pulse };
      this.recorder.record(input); // grava exatamente o que será simulado
      this.sim.tick(input);
    });
    this.prevAudio = snapshotOf(this.sim);
    this.prevFocus = this.sim.state.focus;
    // Áudio só inicia após um gesto (políticas de autoplay) + trilha em loop.
    getAudio().start();
    getAudio().startMusic();

    // --- Input abstrato (toque/mouse/teclado → eventos lógicos) ----------
    this.inputSvc = new InputService(this.game.canvas, this.makeMapper());
    this.inputSvc.attach();
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
      this.loop.reset();
      this.justResumed = true;
      this.hitStopMs = 0;
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.inputSvc.detach();
      getAudio().stopMusic();
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layoutHud, this);
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
    this.hudPad = pad;
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
    // 2b) Fundo estelar (parallax).
    this.updateBackground(deltaMs);

    // 2c) Áudio + haptics + feedback de dano: sonoriza e reage aos eventos.
    const curAudio = snapshotOf(this.sim);
    const audio = getAudio();
    const haptics = getHaptics();
    for (const cue of diffCues(this.prevAudio, curAudio)) {
      audio.play(cue);
      this.reactToCue(cue);
      haptics.vibrate(cue);
    }
    this.prevAudio = curAudio;

    // 2d) Trilha dinâmica por intensidade (P5-04-01).
    this.updateMusic();

    // 2e) Eventos de FX com posição → partículas + hit-stop (P5-01-03/P5-02-01).
    //     Só quando NÃO congelado: o buffer é do último tick avançado; durante
    //     o hit-stop as partículas congelam junto (coerência visual).
    if (!frozen) {
      this.consumeFxEvents();
      this.particles.update(deltaMs / this.sim.fixedDeltaMs);
      if (this.grazeRingPing > 0) this.grazeRingPing--;
      if (this.focusBlip > 0) this.focusBlip--;
      // Blip da barra ao ganhar Foco (graze pagando) — P5-02-03.
      const f = this.sim.state.focus;
      if (f > this.prevFocus) this.focusBlip = this.effects.focusHud.blipDurationTicks;
      this.prevFocus = f;
    }

    // 2f) Progresso do estágio: anúncio de seção + indicador "n/m".
    this.updateStageProgress();

    // 3) Render: a nave segue a posição AUTORITATIVA da simulação (a lógica de
    //    movimento vive no headless sim; aqui é só apresentação).
    // Fim de jogo: vai para a tela de resultado com o placar.
    if (this.sim.state.gameOver) {
      this.endRun();
      return;
    }

    const player = this.sim.player;
    this.ship.setPosition(player.x, player.y);
    this.ship.setScale(this.focus ? 0.7 : 1);
    // Pisca a nave (vermelho) enquanto invulnerável — feedback claro de dano.
    const inv = this.sim.state.invulnerable;
    const shipAlpha = inv ? 0.35 + 0.35 * Math.sin(_time / 35) : 1;
    this.ship.setAlpha(shipAlpha);
    // Chama do motor pulsando.
    this.engine.setScale(1, 0.7 + 0.3 * Math.sin(_time / 60));
    // Anel de graze ao redor da nave (P5-02-02): zona de risco legível.
    this.drawGrazeRing(player.x, player.y, shipAlpha);

    // Inimigos: forma por tipo + glow, girando suavemente.
    this.enemyGfx.clear();
    this.sim.enemies.forEachActive((e) => {
      const color = Phaser.Display.Color.HexStringToColor(e.color).color;
      const rot = e.ageTicks * 0.03;
      const pts = shapePoints(e.shape, e.x, e.y, e.radius, rot);
      this.enemyGfx.fillStyle(color, 0.18).fillCircle(e.x, e.y, e.radius * 1.5); // glow
      this.enemyGfx.fillStyle(color, 0.9).lineStyle(2, 0xffffff, 0.85);
      if (pts.length === 0) {
        this.enemyGfx.fillCircle(e.x, e.y, e.radius).strokeCircle(e.x, e.y, e.radius);
      } else {
        // pts é {x,y}[]; o runtime aceita, mas o tipo pede Vector2[].
        const poly = pts as unknown as Phaser.Math.Vector2[];
        this.enemyGfx.fillPoints(poly, true).strokePoints(poly, true);
      }
    });

    this.drawBoss();

    // Tiros do jogador: núcleo + leve rastro/brilho.
    this.shotsGfx.clear();
    this.sim.playerShots.forEachActive((b) => {
      this.shotsGfx.fillStyle(0x9af7ef, 0.25).fillCircle(b.x, b.y, b.radius * 2.2);
      this.shotsGfx.fillStyle(0xffffff, 1).fillCircle(b.x, b.y, b.radius);
    });

    // Balas inimigas: glow âmbar + núcleo claro (legibilidade do perigo).
    // Bala já grazeada (P5-02-01) ganha brilho/núcleo extra: "esse risco já paguei".
    this.enemyBulletGfx.clear();
    this.sim.enemyBullets.forEachActive((b) => {
      if (b.grazed) {
        this.enemyBulletGfx.fillStyle(0x9af7ef, 0.28).fillCircle(b.x, b.y, b.radius * 2.6);
        this.enemyBulletGfx.fillStyle(0xff7b3d, 0.3).fillCircle(b.x, b.y, b.radius * 2);
        this.enemyBulletGfx.fillStyle(0xffffff, 1).fillCircle(b.x, b.y, b.radius);
      } else {
        this.enemyBulletGfx.fillStyle(0xff7b3d, 0.3).fillCircle(b.x, b.y, b.radius * 2);
        this.enemyBulletGfx.fillStyle(0xffe08a, 1).fillCircle(b.x, b.y, b.radius);
      }
    });

    this.drawReflectFx();
    this.drawParticles();
    this.drawFocusBar();

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

  /**
   * Reação visual de câmera aos eventos, dirigida por dados (P5-01-01): shake e
   * flash por cue vêm de `effects.json`. O graze dá o "ping" no anel da nave.
   */
  private reactToCue(cue: string): void {
    const cam = this.cameras.main;
    const shake = this.effects.shake[cue];
    if (shake) cam.shake(shake.durationMs, shake.intensity);
    const flash = this.effects.flash[cue];
    if (flash) cam.flash(flash.durationMs, flash.r, flash.g, flash.b);
    if (cue === 'graze') this.grazeRingPing = this.effects.grazeRing.pingDurationTicks;
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

  /** Pré-converte as cores próprias de cada tipo de partícula (hex→int). */
  private cacheParticleColors(): void {
    for (const [type, p] of Object.entries(this.effects.particles)) {
      if (p.color) this.particleColors[type as FxEventType] = this.colorOf(p.color);
    }
  }

  /** hex "#rrggbb" → int, com cache (evita realocar Color no caminho quente). */
  private colorOf(hex: string): number {
    const cached = this.colorCache.get(hex);
    if (cached !== undefined) return cached;
    const n = Number.parseInt(hex.replace('#', ''), 16) | 0;
    this.colorCache.set(hex, n);
    return n;
  }

  /**
   * Consome o buffer de eventos de FX do último tick (P5-01-03/P5-02-01):
   * dispara bursts de partículas (cor própria ou herdada do evento), micro-shake
   * opcional e acumula o maior hit-stop. Caps por tipo evitam poluição visual em
   * densidade alta (tempestade de kills/grazes).
   */
  private consumeFxEvents(): void {
    const caps = this.effects.consumeCapsPerFrame;
    let nShot = 0;
    let nKill = 0;
    let nGraze = 0;
    let hitStopAdd = 0;
    this.sim.fxEvents.forEach((e) => {
      // Cap de consumo visual (o contador de graze/score na sim não é afetado).
      if (e.type === 'shotHit') {
        if (nShot >= (caps.shotHit ?? Infinity)) return;
        nShot++;
      } else if (e.type === 'kill') {
        if (nKill >= (caps.kill ?? Infinity)) return;
        nKill++;
      } else if (e.type === 'graze') {
        if (nGraze >= (caps.graze ?? Infinity)) return;
        nGraze++;
      }
      const p = this.effects.particles[e.type];
      if (p) {
        const color = this.particleColors[e.type] ?? (e.color ? this.colorOf(e.color) : 0xffffff);
        this.particles.burst({
          x: e.x,
          y: e.y,
          count: p.count,
          speed: p.speed,
          lifeTicks: p.lifeTicks,
          size: p.size,
          color,
          ...(p.drag !== undefined ? { drag: p.drag } : {}),
          ...(p.gravity !== undefined ? { gravity: p.gravity } : {}),
          ...(p.spreadRad !== undefined ? { spreadRad: p.spreadRad } : {}),
        });
        if (p.shake) this.cameras.main.shake(p.shake.durationMs, p.shake.intensity);
      }
      const hs = hitStopDurationFor(e.type, this.effects.hitStop);
      if (hs > hitStopAdd) hitStopAdd = hs;
    });
    if (hitStopAdd > 0) {
      this.hitStopMs = applyHitStop(this.hitStopMs, hitStopAdd, this.effects.hitStop.maxMs);
    }
  }

  /** Desenha as partículas vivas (glow barato: fill + alpha). */
  private drawParticles(): void {
    const g = this.particlesGfx;
    g.clear();
    this.particles.forEachActive((x, y, size, color, alpha) => {
      g.fillStyle(color, alpha * 0.3).fillCircle(x, y, size * 2);
      g.fillStyle(color, alpha).fillCircle(x, y, size);
    });
  }

  /**
   * Anel de graze na nave (P5-02-02): circunferência em
   * `hitboxRadius + grazeMargin`, derivada de player.json/combat.json (não
   * duplica números). Discreto fora do Foco, claro no Foco; pulsa no graze.
   */
  private drawGrazeRing(x: number, y: number, shipAlpha: number): void {
    const cfg = this.effects.grazeRing;
    const g = this.ringGfx;
    g.clear();
    const ringR = playerData.hitboxRadiusPx + this.sim.grazeMargin;
    const base = this.focus ? cfg.alphaFocus : cfg.alphaNormal;
    const ping =
      this.grazeRingPing > 0 ? cfg.pingAlpha * (this.grazeRingPing / cfg.pingDurationTicks) : 0;
    // Durante i-frames o anel acompanha o piscar da nave (o dano domina).
    const alpha = Math.min(1, base + ping) * shipAlpha;
    if (alpha <= 0.01) return;
    const color = this.colorOf(cfg.color);
    g.lineStyle(
      cfg.lineWidth + 1.5 * (ping > 0 ? this.grazeRingPing / cfg.pingDurationTicks : 0),
      color,
      alpha,
    ).strokeCircle(x, y, ringR);
  }

  /**
   * Barra de Foco no HUD (P5-02-03): preenchimento = focus/focusMax, marca no
   * custo do pulso, cor de "pronto" quando focus ≥ pulseCost, blip ao ganhar.
   */
  private drawFocusBar(): void {
    const cfg = this.effects.focusHud;
    const g = this.focusGfx;
    g.clear();
    const s = this.sim.state;
    const focusMax = this.sim.state.focusMax;
    const frac = focusMax > 0 ? Math.min(1, s.focus / focusMax) : 0;
    const ready = s.focus >= this.sim.pulseCost;
    const w = cfg.width;
    const h = cfg.height;
    const x = VIRTUAL_WIDTH / 2 - w / 2;
    const y = this.pulseBtn.y - 44;
    g.fillStyle(this.colorOf(cfg.emptyColor), 1).fillRect(x, y, w, h);
    const fill = this.colorOf(ready ? cfg.readyColor : cfg.fillColor);
    g.fillStyle(fill, 1).fillRect(x, y, w * frac, h);
    // Blip: brilho curto extra no preenchimento ao ganhar Foco.
    if (this.focusBlip > 0) {
      const a = 0.4 * (this.focusBlip / cfg.blipDurationTicks);
      g.fillStyle(fill, a).fillRect(x, y - 3, w * frac, h + 6);
    }
    // Marca no ponto de custo do pulso (se for atingível antes do teto).
    if (this.sim.pulseCost < focusMax) {
      const mx = x + w * (this.sim.pulseCost / focusMax);
      g.fillStyle(this.colorOf(cfg.markColor), 0.9).fillRect(mx - 1, y - 2, 2, h + 4);
    }
  }

  /** Desenha o chefe (corpo neon + barra de vida) a partir do estado da sim. */
  private drawBoss(): void {
    this.bossGfx.clear();
    const boss = this.sim.boss;
    if (!boss || !boss.alive) return;
    const sys = this.sim.activeBossSystem;

    // Telegraph de teleporte (P4-02b-05): marcador pulsante no destino do salto.
    if (sys && sys.telegraphActive) {
      const pulse = 0.5 + 0.5 * Math.sin(this.sim.tickCount * 0.4);
      this.bossGfx
        .lineStyle(2, 0xffe08a, 0.4 + 0.5 * pulse)
        .strokeCircle(sys.teleportDestX, sys.teleportDestY, boss.radius * (0.7 + 0.4 * pulse))
        .lineStyle(2, 0xffe08a, 0.8)
        .strokeCircle(sys.teleportDestX, sys.teleportDestY, 6);
    }

    // Corpo: cor muda na fase 2 (feedback do "fica mais perigoso").
    const color = boss.phaseIndex === 0 ? 0xff5d8f : 0xff2d55;
    this.bossGfx
      .fillStyle(color, 0.2)
      .lineStyle(3, color, 1)
      .fillCircle(boss.x, boss.y, boss.radius)
      .strokeCircle(boss.x, boss.y, boss.radius);

    // Núcleo invulnerável enquanto há partes vivas (P4-02b-04): aro tracejado.
    if (sys && !sys.coreVulnerable) {
      this.bossGfx.lineStyle(2, 0x6cf0ff, 0.5).strokeCircle(boss.x, boss.y, boss.radius + 7);
    }

    // Partes destrutíveis (P4-02b-04): pods neon presos ao corpo, com dano.
    if (sys) {
      for (const p of sys.parts) {
        if (!p.alive) continue;
        const frac = p.maxHp > 0 ? p.hp / p.maxHp : 0;
        this.bossGfx
          .fillStyle(0xb56cff, 0.25)
          .lineStyle(2, 0xd9a6ff, 0.4 + 0.6 * frac)
          .fillCircle(p.x, p.y, p.radius)
          .strokeCircle(p.x, p.y, p.radius);
      }
    }

    // Escudo ativo (P4-02b-02): anel ciclano ao redor do chefe, espessura ~HP%.
    if (sys && sys.shieldActive) {
      const frac = sys.shieldMaxHp > 0 ? sys.shieldHp / sys.shieldMaxHp : 0;
      this.bossGfx
        .lineStyle(3 + 4 * frac, 0x4cc9f0, 0.35 + 0.5 * frac)
        .strokeCircle(boss.x, boss.y, boss.radius + 14);
    }

    // Barra de vida no topo do campo (abaixo da safe-area + linha do HUD).
    const barX = this.hudPad.left + 24;
    const barY = this.hudPad.top + 64;
    const barW = VIRTUAL_WIDTH - barX - (this.hudPad.right + 24);
    const frac = boss.maxHp > 0 ? boss.hp / boss.maxHp : 0;
    this.bossGfx
      .fillStyle(0x10323a, 1)
      .fillRect(barX, barY, barW, 10)
      .fillStyle(color, 1)
      .fillRect(barX, barY, barW * frac, 10);
  }

  /** Desenha o anel expansivo do pulso refletor logo após a ativação. */
  private drawReflectFx(): void {
    this.fxGfx.clear();
    const fx = this.sim.lastReflect;
    if (!fx) return;
    const FLASH_TICKS = this.effects.reflectFx.durationTicks;
    const age = this.sim.tickCount - fx.tick;
    if (age < 0 || age > FLASH_TICKS) return;
    const t = age / FLASH_TICKS; // 0→1
    this.fxGfx.lineStyle(6 * (1 - t) + 1, 0xffd166, 1 - t).strokeCircle(fx.x, fx.y, fx.radius * t);
  }

  // ---- Construção visual --------------------------------------------------

  private drawField(): void {
    // Fundo: leve gradiente vinheta + campo de estrelas (parallax).
    this.add
      .rectangle(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2, VIRTUAL_WIDTH, VIRTUAL_HEIGHT, 0x070912)
      .setDepth(-10);
    this.bgGfx = this.add.graphics().setDepth(-9);
    this.starRng = new Rng((Date.now() >>> 0) ^ 0x51a5);
    for (let i = 0; i < 90; i++) {
      this.stars.push({
        x: this.starRng.range(0, VIRTUAL_WIDTH),
        y: this.starRng.range(0, VIRTUAL_HEIGHT),
        z: 0.3 + this.starRng.next() * 0.7,
      });
    }
    // Moldura sutil do campo jogável.
    this.add
      .rectangle(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2, VIRTUAL_WIDTH - 4, VIRTUAL_HEIGHT - 4)
      .setStrokeStyle(2, 0x10323a)
      .setDepth(-8);
  }

  /** Estrelas descem com velocidade proporcional à profundidade (parallax). */
  private updateBackground(deltaMs: number): void {
    const g = this.bgGfx;
    g.clear();
    const dt = deltaMs / 1000;
    for (const s of this.stars) {
      s.y += (40 + s.z * 160) * dt;
      if (s.y > VIRTUAL_HEIGHT) {
        s.y = 0;
        s.x = this.starRng.range(0, VIRTUAL_WIDTH);
      }
      g.fillStyle(0x39f5e8, 0.15 + s.z * 0.5);
      g.fillCircle(s.x, s.y, s.z * 2);
    }
  }

  private makeShip(): Phaser.GameObjects.Container {
    // Chama do motor (atrás), pulsa no update.
    this.engine = this.add.triangle(0, 18, -8, 0, 8, 0, 0, 26, 0xffd166).setAlpha(0.9);
    const glow = this.add.circle(0, 0, 34, 0x39f5e8, 0.1);
    // Corpo: seta dupla camada (preenchimento + contorno neon).
    const body = this.add
      .polygon(0, 0, [0, -30, 20, 22, 0, 12, -20, 22], 0x0bd3c6, 1)
      .setStrokeStyle(3, 0x9af7ef);
    const wing = this.add
      .polygon(0, 0, [0, -8, 26, 26, -26, 26], 0x0b8f88, 0.5)
      .setStrokeStyle(1, 0x39f5e8);
    // Ponto central = HITBOX lógica, muito menor que o sprite (§3.5).
    const hitbox = this.add.circle(0, 0, 4, 0xff4d6d).setStrokeStyle(2, 0xffffff);
    return this.add.container(this.target.x, this.target.y, [
      glow,
      this.engine,
      wing,
      body,
      hitbox,
    ]);
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
      dayKey: this.dayKey,
      stageId: this.stageId,
      replay: this.recorder.finalize(this.sim),
    });
  }
}
