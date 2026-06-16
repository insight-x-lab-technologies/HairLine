import type Phaser from 'phaser';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../config/layout';
import type { Simulation } from '../sim/Simulation';
import type { ThemeCosmetics } from './GameRenderer';
import { VectorTheme } from './VectorTheme';
import { SpritePool } from './SpritePool';
import {
  resolveSpriteSource,
  resolveShipSprite,
  shipVariantKey,
  spriteKey,
  type SpriteCategory,
} from './spriteFallback';
import { parallaxLayers, advanceTileOffset } from './parallaxBackground';

/**
 * Capacidade do pool de sprites de inimigos. Espelha `ENEMY_CAPACITY` da sim
 * (interna, não exportada): teto estável para o pool nunca saturar no caso
 * comum. Se a demanda exceder, `drawEnemies` cai no vetorial (sem sumir inimigo).
 */
const ENEMY_SPRITE_CAPACITY = 64;

/**
 * Tamanho de referência (px virtuais) do sprite da nave — contrato de asset
 * (P10-10): qualquer arte (placeholder ou final, em qualquer resolução nativa)
 * é escalada para este footprint, casando com a silhueta vetorial. ~diâmetro do
 * glow da nave vetorial (raio 34). Ver `docs/ASSET_CONTRACT.md`.
 */
const SHIP_SPRITE_SIZE = 64;

/**
 * SpriteTheme — tema "Polido" (P10-09): desenha SPRITES lendo as MESMAS posições
 * autoritativas da sim e, onde faltar asset, CAI no `VectorTheme` (herança). Por
 * herdar do vetorial, o tema é jogável e correto mesmo SEM nenhuma arte (P10-10/
 * 11 entram incrementalmente): cada categoria (nave/inimigos/chefe) checa se há
 * textura registrada e, se não, delega ao desenho vetorial do pai.
 *
 * Decisão de arquitetura (TD): HERANÇA em vez de composição — é a menor abordagem
 * segura para "fallback total por padrão". O pai já desenha tudo; aqui só
 * sobrescrevemos os seams por entidade. **Balas e anel de graze permanecem
 * vetoriais** nos dois temas (req 3): não são seams, então herdam o pai direto.
 *
 * Pooling (TD-07): sprites de inimigos vêm de um `SpritePool` pré-alocado —
 * nunca `new` no loop. A nave é um sprite único criado no `init`.
 */
export class SpriteTheme extends VectorTheme {
  /** Categorias com textura efetivamente carregada no cache do Phaser. */
  private readonly useSprite: Record<SpriteCategory, boolean> = {
    ship: false,
    enemy: false,
    boss: false,
  };

  /**
   * Textura da nave resolvida no `init` (P10-13): variante de arte curada do
   * cosmético (`spr-ship-<id>`) quando registrada, senão a arte default
   * (`spr-ship`). Só usada quando `useSprite.ship`; o `makeShip` herdado a lê.
   */
  private shipSpriteKey = spriteKey('ship');

  /** Pool de sprites de inimigos (quando há asset). */
  private enemyPool?: SpritePool;
  /** Sprite único do chefe (quando há asset). */
  private bossSprite?: Phaser.GameObjects.Sprite;
  /**
   * Camadas de fundo raster com parallax/tiling (P10-11), presentes só quando
   * TODOS os assets de fundo estão carregados; senão `undefined` ⇒ fundo
   * procedural do pai (fallback). `wrap` = altura da textura (limita o offset).
   */
  private bgTiles?: { sprite: Phaser.GameObjects.TileSprite; speed: number; wrap: number }[];

  init(scene: Phaser.Scene, cosmetics: ThemeCosmetics): void {
    // Resolve quais categorias têm sprite ANTES de o pai chamar `makeShip()`
    // (o pai seta `this.scene` no início do seu init; aqui adiantamos a leitura
    // do cache de texturas para decidir nave×fallback no momento certo).
    this.scene = scene;
    const available = this.availableKeys(scene, cosmetics.shipId);
    for (const category of ['enemy', 'boss'] as const) {
      this.useSprite[category] = resolveSpriteSource(available, category).useSprite;
    }
    // Nave (P10-13): variante de arte curada do cosmético → arte default → vetorial.
    // Resolve ANTES do `super.init` (que chama `makeShip`) e guarda a textura certa.
    const shipSrc = resolveShipSprite(available, cosmetics.shipId);
    this.useSprite.ship = shipSrc.useSprite;
    this.shipSpriteKey = shipSrc.key;

    super.init(scene, cosmetics);

    // Pools/sprites por categoria, criados UMA vez (sem `new` no loop). Inimigos
    // acompanham a capacidade da sim para o pool nunca saturar no caso comum.
    if (this.useSprite.enemy) {
      this.enemyPool = new SpritePool(scene, spriteKey('enemy'), ENEMY_SPRITE_CAPACITY, 1);
    }
    if (this.useSprite.boss) {
      this.bossSprite = scene.add.sprite(0, 0, spriteKey('boss')).setVisible(false);
    }
    this.initBackground(scene);
  }

  destroy(): void {
    this.enemyPool?.destroy();
    this.bossSprite?.destroy();
    if (this.bgTiles) for (const l of this.bgTiles) l.sprite.destroy();
    // `shipSprite` vive dentro do container da nave; o pai o destrói com o ship.
    super.destroy();
  }

  /**
   * Fundo raster (P10-11): cria um `TileSprite` por camada cobrindo o campo,
   * entre a cor base (-10) e a moldura (-8) do pai — abaixo de todas as entidades.
   * Só ativa se TODAS as camadas têm textura carregada (carga condicional do tema);
   * caso contrário deixa `bgTiles` indefinido e o pai segue com o fundo procedural
   * (fallback sem erro). Criado UMA vez (sem `new` no loop). Sobre a cor base
   * (espaço) ⇒ texturas com transparência empilham com parallax próprio.
   */
  private initBackground(scene: Phaser.Scene): void {
    const layers = parallaxLayers();
    if (layers.length === 0 || !layers.every((l) => scene.textures.exists(l.key))) return;
    this.bgTiles = layers.map((l) => {
      const sprite = scene.add
        .tileSprite(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2, VIRTUAL_WIDTH, VIRTUAL_HEIGHT, l.key)
        .setDepth(-9);
      const src = scene.textures.get(l.key).getSourceImage();
      return { sprite, speed: l.speedPxPerSec, wrap: src.height || VIRTUAL_HEIGHT };
    });
  }

  /**
   * Avança o fundo: parallax raster por camada quando ativo (rola a textura para
   * BAIXO — sensação de avanço, como o procedural); senão delega ao fundo
   * procedural do pai (P10-07). Chamado todo frame, mesmo congelado (decorativo).
   */
  updateBackground(deltaMs: number): void {
    if (!this.bgTiles) {
      super.updateBackground(deltaMs);
      return;
    }
    for (const layer of this.bgTiles) {
      // Velocidade negativa: a textura desce na tela (estrelas "vindo na nave").
      layer.sprite.tilePositionY = advanceTileOffset(
        layer.sprite.tilePositionY,
        -layer.speed,
        deltaMs,
        layer.wrap,
      );
    }
  }

  /**
   * Nave (P10-10): sprite quando há asset, montado no MESMO container que o
   * vetorial (chama do motor atrás + sprite + ponto de HITBOX por cima), para
   * que o `drawShip` HERDADO posicione/escale/pisque/pulse a chama de forma
   * idêntica — o tema só troca o CORPO (silhueta → sprite), não o comportamento.
   * Sem asset ⇒ `super.makeShip()` (silhueta vetorial). Contrato: centro do
   * sprite = posição da sim, ancorado no centro, escalado ao tamanho de
   * referência. Ver `docs/ASSET_CONTRACT.md`.
   */
  protected makeShip(): Phaser.GameObjects.Container {
    if (!this.useSprite.ship) return super.makeShip();
    const scene = this.scene;
    // Chama do motor (atrás do casco) — efeito vetorial neon que pulsa via
    // `this.engine`, exatamente como na silhueta. `drawShip` (pai) anima-a.
    this.engine = scene.add.triangle(0, 20, -7, 0, 7, 0, 0, 24, 0xffd166).setAlpha(0.9);
    // Variante curada do cosmético quando há arte, senão a default (P10-13).
    const sprite = scene.add.sprite(0, 0, this.shipSpriteKey);
    // Tamanho de referência (contrato): casa o footprint do sprite com a nave
    // vetorial, independentemente da resolução nativa da arte (placeholder/final).
    sprite.setDisplaySize(SHIP_SPRITE_SIZE, SHIP_SPRITE_SIZE);
    // Phaser 4: `setTintFill` é no-op; usar `setTint` (CLAUDE.md). Cor do loadout.
    sprite.setTint(this.shipColor);
    // Ponto central = HITBOX lógica, muito menor que o sprite (§3.5) — mantido
    // VETORIAL por cima do sprite (hitbox ≠ sprite; o anel de graze idem, no pai).
    const hitbox = scene.add.circle(0, 0, 4, 0xff4d6d).setStrokeStyle(2, 0xffffff);
    return scene.add.container(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT * 0.78, [
      this.engine,
      sprite,
      hitbox,
    ]);
  }

  /**
   * Inimigos por sprite via pool: cada inimigo ativo adquire um sprite,
   * posicionado/escalado/tingido pelo estado da sim. Sem asset (ou pool saturado)
   * ⇒ cai no desenho vetorial do pai para os inimigos restantes.
   */
  protected drawEnemies(sim: Simulation): void {
    if (!this.useSprite.enemy || !this.enemyPool) {
      super.drawEnemies(sim);
      return;
    }
    const pool = this.enemyPool;
    pool.begin();
    let overflow = false;
    sim.enemies.forEachActive((e) => {
      const s = pool.next();
      if (!s) {
        overflow = true;
        return;
      }
      s.setPosition(e.x, e.y);
      // Escala o sprite ao diâmetro lógico do inimigo (sprite ancorado no centro).
      const diameter = e.radius * 2;
      s.setDisplaySize(diameter, diameter);
      s.setRotation(e.ageTicks * 0.03);
      s.setTint(this.colorOf(e.color));
    });
    pool.end();
    // Excedente (mais inimigos que a capacidade do pool): mantém tudo legível
    // caindo no vetorial em vez de sumir com inimigos.
    if (overflow) super.drawEnemies(sim);
  }

  /**
   * Chefe por sprite: corpo como sprite + as MECÂNICAS (barra de vida, escudo,
   * partes, telegraph, núcleo invulnerável) continuam pelo vetorial do pai
   * (legibilidade das regras > beleza). Sem asset ⇒ delega o corpo também.
   */
  protected drawBoss(sim: Simulation): void {
    if (!this.useSprite.boss || !this.bossSprite) {
      super.drawBoss(sim);
      return;
    }
    const boss = sim.boss;
    const sprite = this.bossSprite;
    if (!boss || !boss.alive) {
      sprite.setVisible(false);
      // Ainda desenha as mecânicas/limpa o gfx do chefe pelo pai.
      super.drawBoss(sim);
      return;
    }
    const diameter = boss.radius * 2;
    sprite.setVisible(true).setPosition(boss.x, boss.y).setDisplaySize(diameter, diameter);
    sprite.setRotation(sim.tickCount * 0.008);
    // Mecânicas + barra de vida pelo vetorial (não duplicar lógica).
    super.drawBoss(sim);
  }

  /**
   * Chaves de sprite efetivamente presentes no cache de texturas do Phaser:
   * categorias (`spr-<categoria>`) + a variante curada da nave selecionada
   * (`spr-ship-<id>`, P10-13), para a resolução nave×variante×fallback fechar.
   */
  private availableKeys(scene: Phaser.Scene, cosmeticShipId: string): Set<string> {
    const keys = new Set<string>();
    for (const category of ['ship', 'enemy', 'boss'] as const) {
      const key = spriteKey(category);
      if (scene.textures.exists(key)) keys.add(key);
    }
    const variant = shipVariantKey(cosmeticShipId);
    if (scene.textures.exists(variant)) keys.add(variant);
    return keys;
  }
}
