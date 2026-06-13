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

  constructor() {
    super(SceneKeys.Game);
  }

  create(data: GameSceneData = {}): void {
    this.drawField();
    // Camadas únicas redesenhadas por frame a partir dos pools da sim
    // (sem criar GameObjects no loop). Ordem: inimigos → tiros → balas inimigas.
    this.enemyGfx = this.add.graphics();
    this.bossGfx = this.add.graphics();
    this.shotsGfx = this.add.graphics();
    this.enemyBulletGfx = this.add.graphics();
    this.fxGfx = this.add.graphics();
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
    this.events.on(Phaser.Scenes.Events.PAUSE, () => this.inputSvc.detach());
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.inputSvc.attach();
      this.loop.reset();
      this.justResumed = true;
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
    // 1) Movimento contínuo por teclado é integrado pelo InputService.
    this.inputSvc.update(deltaMs / 1000);
    // 2) A simulação avança em passos FIXOS, independente deste FPS de render.
    //    No 1º frame após retomar da pausa, descarta o delta gigante acumulado.
    if (this.justResumed) {
      this.justResumed = false;
    } else {
      this.loop.advance(deltaMs);
    }
    // 2b) Fundo estelar (parallax).
    this.updateBackground(deltaMs);

    // 2c) Áudio + feedback de dano: sonoriza e reage aos eventos detectados.
    const curAudio = snapshotOf(this.sim);
    const audio = getAudio();
    for (const cue of diffCues(this.prevAudio, curAudio)) {
      audio.play(cue);
      this.reactToCue(cue);
    }
    this.prevAudio = curAudio;

    // 2d) Progresso do estágio: anúncio de seção + indicador "n/m".
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
    this.ship.setAlpha(inv ? 0.35 + 0.35 * Math.sin(_time / 35) : 1);
    // Chama do motor pulsando.
    this.engine.setScale(1, 0.7 + 0.3 * Math.sin(_time / 60));

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
    this.enemyBulletGfx.clear();
    this.sim.enemyBullets.forEachActive((b) => {
      this.enemyBulletGfx.fillStyle(0xff7b3d, 0.3).fillCircle(b.x, b.y, b.radius * 2);
      this.enemyBulletGfx.fillStyle(0xffe08a, 1).fillCircle(b.x, b.y, b.radius);
    });

    this.drawReflectFx();

    const s = this.sim.state;
    const modLine = this.modLabels.length > 0 ? `\n⚡ ${this.modLabels.join(' · ')}` : '';
    this.hud.setText(
      `SCORE ${s.score}   VIDAS ${'♥'.repeat(s.lives)}   NÍVEL ${this.sim.level + 1}\n` +
        `FOCO ${s.focus}  GRAZE ${s.grazeCount}  ${this.focus ? '[modo foco]' : ''}\n` +
        `inimigos ${this.sim.enemies.activeCount}  balas ${this.sim.enemyBullets.activeCount}  fps ${Math.round(this.game.loop.actualFps)}` +
        modLine,
    );
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

  /** Reação visual de câmera aos eventos (clareza de dano, juice). */
  private reactToCue(cue: string): void {
    const cam = this.cameras.main;
    switch (cue) {
      case 'hit':
        cam.shake(200, 0.014);
        cam.flash(160, 255, 60, 80); // flash vermelho = levei dano
        break;
      case 'gameover':
        cam.shake(450, 0.02);
        cam.flash(300, 255, 40, 60);
        break;
      case 'pulse':
        cam.flash(120, 90, 210, 255);
        break;
      case 'victory':
        cam.flash(300, 120, 255, 230);
        break;
      case 'bossshield':
        cam.flash(160, 90, 200, 240); // escudo quebrou: flash ciano
        break;
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
      this.bossGfx
        .lineStyle(2, 0x6cf0ff, 0.5)
        .strokeCircle(boss.x, boss.y, boss.radius + 7);
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
    const FLASH_TICKS = 18;
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
