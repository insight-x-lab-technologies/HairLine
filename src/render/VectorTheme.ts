import Phaser from 'phaser';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../config/layout';
import type { Simulation } from '../sim/Simulation';
import { Rng } from '../services/Rng';
import { shapePoints, shipSilhouette, starPoints, type Pt } from '../ui/shapes';
import {
  createStarField,
  createNebula,
  advanceStarField,
  advanceNebula,
  type Star,
  type NebulaBlob,
} from './background';
import { ParticlePool } from '../ui/ParticlePool';
import { hitStopDurationFor } from '../ui/HitStop';
import { getEffects } from '../content';
import type { EffectsConfig } from '../content/types';
import type { FxEventType } from '../sim/FxEvents';
import type { HudPadding } from '../ui/hudLayout';
import type { GameRenderer, RenderContext, ThemeCosmetics } from './GameRenderer';
import { shipVisualState, type ShipVisualState } from './shipVisual';
import playerData from '../data/player.json';

/** Achata `Pt[]` em `[x0, y0, x1, y1, …]` para o construtor de `polygon`. */
function flatPoints(pts: readonly Pt[]): number[] {
  return pts.flatMap((p) => [p.x, p.y]);
}

/**
 * VectorTheme — tema de render NEON VETORIAL (P10-02): a primeira implementação
 * de `GameRenderer`, com o visual atual da `GameScene` apenas REALOCADO (paridade
 * 1:1, sem redesign). Desenha tudo a partir do estado autoritativo da sim com
 * `Graphics` pré-criados, sem `new` no loop. Presentation-only — nada toca a sim.
 *
 * A nave desenha um ponto central pequeno = HITBOX ≠ SPRITE (docs/02 §3.5).
 */
export class VectorTheme implements GameRenderer {
  // `protected` (não `private`): o `SpriteTheme` (P10-09) herda este tema como
  // fallback e sobrescreve só os seams de desenho por entidade (nave/inimigos/
  // chefe), reusando o resto (balas, anel, partículas, foco, fundo).
  protected scene!: Phaser.Scene;

  protected ship!: Phaser.GameObjects.Container;
  protected engine!: Phaser.GameObjects.Triangle;
  private bgGfx!: Phaser.GameObjects.Graphics;
  /** Campo de estrelas multicamada (parallax) e nebulosa — P10-07. */
  private stars: Star[] = [];
  private nebula: NebulaBlob[] = [];
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

  /** Padding do HUD em unidades virtuais, respeitando safe-areas. */
  private hudPad: HudPadding = { top: 16, right: 16, bottom: 16, left: 16 };

  /** Config de efeitos resolvida uma vez (P5-01-01) — nada de lookup no loop. */
  private readonly effects: EffectsConfig = getEffects();
  /** Cores de partícula pré-convertidas (hex→int) por tipo de evento. */
  private particleColors: Partial<Record<FxEventType, number>> = {};
  /** Cache hex→int para cores herdadas do evento (inimigo/chefe). */
  private readonly colorCache = new Map<string, number>();
  /** Ping do anel de graze, em ticks restantes (P5-02-02). */
  private grazeRingPing = 0;
  /** Blip da barra de Foco, em ticks restantes (P5-02-03). */
  private focusBlip = 0;
  /** Foco do frame anterior, para detectar ganho (blip). */
  private prevFocus = 0;

  /** Loadout cosmético resolvido (P6-01-02): só apresentação. */
  protected shipShape = 'arrow';
  protected shipColor = 0x0bd3c6;
  protected shotColor = 0xffe066;

  init(scene: Phaser.Scene, cosmetics: ThemeCosmetics): void {
    this.scene = scene;
    this.shipShape = cosmetics.shipShape;
    this.shipColor = cosmetics.shipColor;
    this.shotColor = cosmetics.shotColor;

    this.drawField();
    // Camadas únicas redesenhadas por frame a partir dos pools da sim
    // (sem criar GameObjects no loop). Ordem de empilhamento (baixo→alto):
    // anel de graze → inimigos → tiros → balas → fx do pulso → partículas.
    this.ringGfx = scene.add.graphics(); // sob as balas (legibilidade)
    this.enemyGfx = scene.add.graphics();
    this.bossGfx = scene.add.graphics();
    this.shotsGfx = scene.add.graphics();
    this.enemyBulletGfx = scene.add.graphics();
    this.fxGfx = scene.add.graphics();
    this.particlesGfx = scene.add.graphics(); // faíscas acima das balas
    this.focusGfx = scene.add.graphics();
    this.particles = new ParticlePool(512, 0x5eed);
    this.cacheParticleColors();
    // Faíscas de impacto do tiro herdam a cor do tiro do jogador (P6-01-02 §4).
    this.particleColors.shotHit = this.shotColor;
    this.ship = this.makeShip();
  }

  setHudPad(pad: HudPadding): void {
    this.hudPad = pad;
  }

  destroy(): void {
    this.particles.reset();
    this.ship.destroy();
    this.bgGfx.destroy();
    this.ringGfx.destroy();
    this.enemyGfx.destroy();
    this.bossGfx.destroy();
    this.shotsGfx.destroy();
    this.enemyBulletGfx.destroy();
    this.fxGfx.destroy();
    this.particlesGfx.destroy();
    this.focusGfx.destroy();
  }

  /**
   * Reação visual de câmera aos eventos, dirigida por dados (P5-01-01): shake e
   * flash por cue vêm de `effects.json`. O graze dá o "ping" no anel da nave.
   */
  reactToCue(cue: string): void {
    const cam = this.scene.cameras.main;
    const shake = this.effects.shake[cue];
    if (shake) cam.shake(shake.durationMs, shake.intensity);
    const flash = this.effects.flash[cue];
    if (flash) cam.flash(flash.durationMs, flash.r, flash.g, flash.b);
    if (cue === 'graze') this.grazeRingPing = this.effects.grazeRing.pingDurationTicks;
  }

  /**
   * Consome o buffer de eventos de FX do último tick (P5-01-03/P5-02-01):
   * dispara bursts de partículas (cor própria ou herdada do evento), micro-shake
   * opcional e retorna o maior hit-stop (a cena o aplica ao loop). Caps por tipo
   * evitam poluição visual em densidade alta (tempestade de kills/grazes).
   */
  consumeFx(sim: Simulation): number {
    const caps = this.effects.consumeCapsPerFrame;
    let nShot = 0;
    let nKill = 0;
    let nGraze = 0;
    let hitStopAdd = 0;
    sim.fxEvents.forEach((e) => {
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
        if (p.shake) this.scene.cameras.main.shake(p.shake.durationMs, p.shake.intensity);
      }
      const hs = hitStopDurationFor(e.type, this.effects.hitStop);
      if (hs > hitStopAdd) hitStopAdd = hs;
    });
    return hitStopAdd;
  }

  /** Avança partículas + pings e detecta ganho de Foco (blip) — P5-01/P5-02. */
  advanceFx(sim: Simulation, dtTicks: number): void {
    this.particles.update(dtTicks);
    if (this.grazeRingPing > 0) this.grazeRingPing--;
    if (this.focusBlip > 0) this.focusBlip--;
    // Blip da barra ao ganhar Foco (graze pagando) — P5-02-03.
    const f = sim.state.focus;
    if (f > this.prevFocus) this.focusBlip = this.effects.focusHud.blipDurationTicks;
    this.prevFocus = f;
  }

  draw(sim: Simulation, ctx: RenderContext): void {
    // Transform de apresentação da nave (P10-10): escala no Foco, piscar em
    // i-frames e pulso da chama vêm de uma função PURA, compartilhada com o
    // sprite — o feel é idêntico entre temas. O alpha é reusado pelo anel de
    // graze (sempre vetorial), que acompanha o piscar da nave.
    const ship = shipVisualState({
      focus: ctx.focus,
      invulnerable: sim.state.invulnerable,
      timeMs: ctx.time,
    });
    // Seams sobrescritos pelo SpriteTheme (P10-09): nave/inimigos/chefe podem
    // virar sprite; balas, anel, partículas e foco permanecem vetoriais (req 3).
    this.drawShip(sim, ship);
    // Anel de graze ao redor da nave (P5-02-02): zona de risco legível.
    this.drawGrazeRing(sim, sim.player.x, sim.player.y, ship.alpha, ctx.focus);
    this.drawEnemies(sim);
    this.drawBoss(sim);

    // Tiros do jogador: glow na cor do cosmético (P6-01-02) + núcleo claro.
    this.shotsGfx.clear();
    sim.playerShots.forEachActive((b) => {
      this.shotsGfx.fillStyle(this.shotColor, 0.3).fillCircle(b.x, b.y, b.radius * 2.2);
      this.shotsGfx.fillStyle(this.shotColor, 1).fillCircle(b.x, b.y, b.radius * 1.25);
      this.shotsGfx.fillStyle(0xffffff, 0.95).fillCircle(b.x, b.y, b.radius * 0.6);
    });

    // Balas inimigas: glow âmbar + núcleo claro (legibilidade do perigo).
    // Bala já grazeada (P5-02-01) ganha brilho/núcleo extra: "esse risco já paguei".
    this.enemyBulletGfx.clear();
    sim.enemyBullets.forEachActive((b) => {
      if (b.grazed) {
        this.enemyBulletGfx.fillStyle(0x9af7ef, 0.28).fillCircle(b.x, b.y, b.radius * 2.6);
        this.enemyBulletGfx.fillStyle(0xff7b3d, 0.3).fillCircle(b.x, b.y, b.radius * 2);
        this.enemyBulletGfx.fillStyle(0xffffff, 1).fillCircle(b.x, b.y, b.radius);
      } else {
        this.enemyBulletGfx.fillStyle(0xff7b3d, 0.3).fillCircle(b.x, b.y, b.radius * 2);
        this.enemyBulletGfx.fillStyle(0xffe08a, 1).fillCircle(b.x, b.y, b.radius);
      }
    });

    this.drawReflectFx(sim);
    this.drawParticles();
    this.drawFocusBar(sim);
  }

  // ---- Seams por entidade (sobrescritos pelo SpriteTheme — P10-09) ----------

  /**
   * Desenha a nave a partir da posição AUTORITATIVA da sim (a lógica de
   * movimento vive no headless sim; aqui é só apresentação) aplicando o transform
   * já resolvido (`shipVisualState`). Seam reusado pelo SpriteTheme (P10-10): a
   * mesma posição/escala/alpha/chama valem para a silhueta vetorial OU o sprite —
   * o tema só troca o CORPO em `makeShip`, não o comportamento.
   */
  protected drawShip(sim: Simulation, vis: ShipVisualState): void {
    const player = sim.player;
    this.ship.setPosition(player.x, player.y);
    this.ship.setScale(vis.scale);
    this.ship.setAlpha(vis.alpha);
    // Chama do motor pulsando.
    this.engine.setScale(1, vis.engineScaleY);
  }

  /**
   * Desenha os inimigos: forma por tipo + glow, girando suavemente, com acento
   * interno contra-rotativo e núcleo claro (P10-06: mais caráter, mesma leitura).
   * Seam: o SpriteTheme troca cada inimigo por um sprite quando há asset.
   */
  protected drawEnemies(sim: Simulation): void {
    this.enemyGfx.clear();
    const g = this.enemyGfx;
    sim.enemies.forEachActive((e) => {
      const color = Phaser.Display.Color.HexStringToColor(e.color).color;
      const light = this.lightenColor(color, 80);
      const rot = e.ageTicks * 0.03;
      g.fillStyle(color, 0.18).fillCircle(e.x, e.y, e.radius * 1.5); // glow
      g.fillStyle(color, 0.9).lineStyle(2, 0xffffff, 0.85);
      const pts = shapePoints(e.shape, e.x, e.y, e.radius, rot);
      if (pts.length === 0) {
        g.fillCircle(e.x, e.y, e.radius).strokeCircle(e.x, e.y, e.radius);
      } else {
        // pts é {x,y}[]; o runtime aceita, mas o tipo pede Vector2[].
        const poly = pts as unknown as Phaser.Math.Vector2[];
        g.fillPoints(poly, true).strokePoints(poly, true);
      }
      // Acento interno contra-rotativo (quando há forma) + núcleo claro.
      const inner = shapePoints(e.shape, e.x, e.y, e.radius * 0.5, -rot * 1.5);
      if (inner.length > 0) {
        const ip = inner as unknown as Phaser.Math.Vector2[];
        g.lineStyle(1.5, light, 0.8).strokePoints(ip, true);
      }
      g.fillStyle(light, 0.95).fillCircle(e.x, e.y, e.radius * 0.28);
    });
  }

  // ---- Apresentação por responsabilidade -----------------------------------

  /** Pré-converte as cores próprias de cada tipo de partícula (hex→int). */
  private cacheParticleColors(): void {
    for (const [type, p] of Object.entries(this.effects.particles)) {
      if (p.color) this.particleColors[type as FxEventType] = this.colorOf(p.color);
    }
  }

  /** hex "#rrggbb" → int, com cache (evita realocar Color no caminho quente). */
  protected colorOf(hex: string): number {
    const cached = this.colorCache.get(hex);
    if (cached !== undefined) return cached;
    const n = Number.parseInt(hex.replace('#', ''), 16) | 0;
    this.colorCache.set(hex, n);
    return n;
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
  private drawGrazeRing(sim: Simulation, x: number, y: number, shipAlpha: number, focus: boolean): void {
    const cfg = this.effects.grazeRing;
    const g = this.ringGfx;
    g.clear();
    const ringR = playerData.hitboxRadiusPx + sim.grazeMargin;
    const base = focus ? cfg.alphaFocus : cfg.alphaNormal;
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
   * A barra fica logo acima do botão de pulso, posicionado pela cena via safe-area.
   */
  private drawFocusBar(sim: Simulation): void {
    const cfg = this.effects.focusHud;
    const g = this.focusGfx;
    g.clear();
    const s = sim.state;
    const focusMax = sim.state.focusMax;
    const frac = focusMax > 0 ? Math.min(1, s.focus / focusMax) : 0;
    const ready = s.focus >= sim.pulseCost;
    const w = cfg.width;
    const h = cfg.height;
    const x = VIRTUAL_WIDTH / 2 - w / 2;
    // Mesma referência do botão de pulso (VIRTUAL_HEIGHT - pad.bottom - 12) - 44.
    const y = VIRTUAL_HEIGHT - this.hudPad.bottom - 56;
    g.fillStyle(this.colorOf(cfg.emptyColor), 1).fillRect(x, y, w, h);
    const fill = this.colorOf(ready ? cfg.readyColor : cfg.fillColor);
    g.fillStyle(fill, 1).fillRect(x, y, w * frac, h);
    // Blip: brilho curto extra no preenchimento ao ganhar Foco.
    if (this.focusBlip > 0) {
      const a = 0.4 * (this.focusBlip / cfg.blipDurationTicks);
      g.fillStyle(fill, a).fillRect(x, y - 3, w * frac, h + 6);
    }
    // Marca no ponto de custo do pulso (se for atingível antes do teto).
    if (sim.pulseCost < focusMax) {
      const mx = x + w * (sim.pulseCost / focusMax);
      g.fillStyle(this.colorOf(cfg.markColor), 0.9).fillRect(mx - 1, y - 2, 2, h + 4);
    }
  }

  /** Desenha o chefe (corpo neon + barra de vida) a partir do estado da sim. */
  protected drawBoss(sim: Simulation): void {
    this.bossGfx.clear();
    const boss = sim.boss;
    if (!boss || !boss.alive) return;
    const sys = sim.activeBossSystem;

    // Telegraph de teleporte (P4-02b-05): marcador pulsante no destino do salto.
    if (sys && sys.telegraphActive) {
      const pulse = 0.5 + 0.5 * Math.sin(sim.tickCount * 0.4);
      this.bossGfx
        .lineStyle(2, 0xffe08a, 0.4 + 0.5 * pulse)
        .strokeCircle(sys.teleportDestX, sys.teleportDestY, boss.radius * (0.7 + 0.4 * pulse))
        .lineStyle(2, 0xffe08a, 0.8)
        .strokeCircle(sys.teleportDestX, sys.teleportDestY, 6);
    }

    // Corpo: identidade derivada de `shape`/`color` do JSON (P10-06), não mais
    // `fillCircle` puro. A cor clareia por fase ⇒ "fica mais perigoso" continua
    // óbvio. `color` é reusado pela barra de vida abaixo.
    const baseColor = sys ? this.colorOf(sys.color) : 0xff5d8f;
    const shape = sys ? sys.shape : 'circle';
    const color = this.lightenColor(baseColor, boss.phaseIndex * 38);
    this.drawBossBody(this.bossGfx, boss.x, boss.y, boss.radius, shape, color, boss.phaseIndex, sim.tickCount);

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

  /**
   * Corpo do chefe (P10-06): casco com identidade derivada de `shape` + glow
   * que segue a forma + núcleo estelar contra-rotativo + olho pulsante, em vez
   * de `fillCircle` puro. Gerativo (qualquer `shape`/cor do JSON ganha visual;
   * 'circle'/desconhecido cai no disco com núcleo, sem quebrar). Preenchimento
   * CONTIDO para não encobrir as balas (legibilidade > beleza). A leitura das
   * mecânicas (escudo/partes/teleporte/núcleo invulnerável) é desenhada à parte.
   */
  private drawBossBody(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    radius: number,
    shape: string,
    color: number,
    phaseIndex: number,
    tick: number,
  ): void {
    const rot = tick * 0.008;
    const light = this.lightenColor(color, 90);
    // Casco + glow seguindo a forma (fallback círculo).
    const hull = shapePoints(shape, x, y, radius, rot);
    if (hull.length === 0) {
      g.fillStyle(color, 0.16).fillCircle(x, y, radius * 1.18);
      g.fillStyle(color, 0.2).lineStyle(3, light, 1).fillCircle(x, y, radius).strokeCircle(x, y, radius);
    } else {
      const glow = shapePoints(shape, x, y, radius * 1.18, rot) as unknown as Phaser.Math.Vector2[];
      g.fillStyle(color, 0.16).fillPoints(glow, true);
      const poly = hull as unknown as Phaser.Math.Vector2[];
      g.fillStyle(color, 0.2).lineStyle(3, light, 1).fillPoints(poly, true).strokePoints(poly, true);
    }
    // Núcleo estelar contra-rotativo: dá "cara de máquina"; pontas crescem com a
    // fase (identidade evolui junto com a cor, sem anéis que confundam o escudo).
    const core = starPoints(x, y, radius * 0.6, radius * 0.3, phaseIndex + 4, -rot * 1.7);
    const cp = core as unknown as Phaser.Math.Vector2[];
    g.fillStyle(color, 0.28).lineStyle(2, light, 0.85).fillPoints(cp, true).strokePoints(cp, true);
    // Olho central pulsante.
    const pulse = 0.6 + 0.4 * Math.sin(tick * 0.12);
    g.fillStyle(light, 0.9).fillCircle(x, y, radius * 0.1 + radius * 0.1 * pulse);
  }

  /** Desenha o anel expansivo do pulso refletor logo após a ativação. */
  private drawReflectFx(sim: Simulation): void {
    this.fxGfx.clear();
    const fx = sim.lastReflect;
    if (!fx) return;
    const FLASH_TICKS = this.effects.reflectFx.durationTicks;
    const age = sim.tickCount - fx.tick;
    if (age < 0 || age > FLASH_TICKS) return;
    const t = age / FLASH_TICKS; // 0→1
    this.fxGfx.lineStyle(6 * (1 - t) + 1, 0xffd166, 1 - t).strokeCircle(fx.x, fx.y, fx.radius * t);
  }

  // ---- Construção visual --------------------------------------------------

  private drawField(): void {
    const scene = this.scene;
    // Fundo procedural (P10-07): cor base + nebulosa + estrelas multicamada,
    // tudo dirigido por `effects.background`. Decorativo: `Rng` semeado pelo
    // relógio (sem Math.random) — não entra em `hashState`.
    const bg = this.effects.background;
    scene.add
      .rectangle(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2, VIRTUAL_WIDTH, VIRTUAL_HEIGHT, this.colorOf(bg.baseColor))
      .setDepth(-10);
    this.bgGfx = scene.add.graphics().setDepth(-9);
    this.starRng = new Rng((Date.now() >>> 0) ^ 0x51a5);
    this.stars = createStarField(bg, this.starRng);
    this.nebula = createNebula(bg, this.starRng);
    // Moldura sutil do campo jogável.
    scene.add
      .rectangle(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2, VIRTUAL_WIDTH - 4, VIRTUAL_HEIGHT - 4)
      .setStrokeStyle(2, 0x10323a)
      .setDepth(-8);
  }

  /**
   * Avança e desenha o fundo (P10-07): nebulosa derivando devagar (anéis
   * concêntricos baratos — sem blur) sob estrelas multicamada que descem ∝
   * velocidade da camada (parallax). Sem alocação por frame (arrays reciclados).
   */
  updateBackground(deltaMs: number): void {
    const g = this.bgGfx;
    g.clear();
    const dt = deltaMs / 1000;
    const bg = this.effects.background;
    // Nebulosa primeiro (camada mais ao fundo). Glow suave = 3 discos concêntricos.
    advanceNebula(this.nebula, bg.nebula.driftY, dt, this.starRng);
    for (const b of this.nebula) {
      g.fillStyle(b.color, b.alpha * 0.5).fillCircle(b.x, b.y, b.radius);
      g.fillStyle(b.color, b.alpha * 0.7).fillCircle(b.x, b.y, b.radius * 0.62);
      g.fillStyle(b.color, b.alpha).fillCircle(b.x, b.y, b.radius * 0.3);
    }
    // Estrelas por cima, cada uma com cor/tamanho/alpha da sua camada.
    advanceStarField(this.stars, dt, this.starRng);
    for (const s of this.stars) {
      g.fillStyle(s.color, s.alpha).fillCircle(s.x, s.y, s.size);
    }
  }

  protected makeShip(): Phaser.GameObjects.Container {
    const scene = this.scene;
    // Cor vem do cosmético resolvido (P6-01-02); tamanho é constante entre
    // naves — HITBOX ≠ SPRITE (§3.5): nave maior NÃO é hitbox maior.
    // P10-05: a nave é uma SILHUETA COESA (`shipSilhouette`), não 5 primitivos
    // soltos. A forma do cosmético vira ACENTO de cockpit (mantém a identidade
    // do loadout), coerente com o preview do Hangar.
    const fill = this.shipColor;
    const stroke = this.lightenColor(this.shipColor, 90);
    // Chama do motor (atrás), sai pelo entalhe traseiro; pulsa no update.
    this.engine = scene.add.triangle(0, 20, -7, 0, 7, 0, 0, 24, 0xffd166).setAlpha(0.9);
    // Glow integrado: segue a silhueta (não um círculo solto) — leitura coesa.
    const glow = scene.add.polygon(0, 0, flatPoints(shipSilhouette(0, 0, 34)), this.shipColor, 0.12);
    // Corpo: silhueta única do caça (preenchimento + contorno neon claro).
    const body = scene.add
      .polygon(0, 0, flatPoints(shipSilhouette(0, 0, 30)), fill, 1)
      .setStrokeStyle(3, stroke);
    // Acento de cockpit = forma do cosmético, próximo ao nariz; some no 'circle'.
    const acc = shapePoints(this.shipShape, 0, 0, 7);
    const accentFlat = acc.length > 0 ? flatPoints(acc) : [0, -8, 6, 4, 0, 1, -6, 4];
    const accent = scene.add
      .polygon(0, -7, accentFlat, this.lightenColor(this.shipColor, 70), 0.95)
      .setStrokeStyle(1.5, 0xffffff, 0.8);
    // Ponto central = HITBOX lógica, muito menor que o sprite (§3.5).
    const hitbox = scene.add.circle(0, 0, 4, 0xff4d6d).setStrokeStyle(2, 0xffffff);
    return scene.add.container(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT * 0.78, [
      glow,
      this.engine,
      body,
      accent,
      hitbox,
    ]);
  }

  /** Clareia (amount>0) ou escurece (amount<0) uma cor int — contorno/asa neon. */
  protected lightenColor(color: number, amount: number): number {
    const clamp = (v: number): number => Math.max(0, Math.min(255, v));
    const r = clamp(((color >> 16) & 0xff) + amount);
    const g = clamp(((color >> 8) & 0xff) + amount);
    const b = clamp((color & 0xff) + amount);
    return (r << 16) | (g << 8) | b;
  }
}
