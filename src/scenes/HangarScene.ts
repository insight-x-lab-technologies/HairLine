import Phaser from 'phaser';
import { SceneKeys } from '../config/sceneKeys';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../config/layout';
import { neonText } from '../ui/neonText';
import { shapePoints } from '../ui/shapes';
import { getSave } from '../services/SaveService';
import { getAudio } from '../services/AudioService';
import { getCosmetics, getAchievementDefs } from '../content';
import {
  selectCosmetic,
  getLoadout,
  findCosmetic,
  type CosmeticCatalog,
  type CosmeticKind,
  type Loadout,
  type ShipCosmetic,
  type ShotColorCosmetic,
} from '../services/Cosmetics';
import {
  hangarGroups,
  cosmeticProfileFrom,
  type HangarGroup,
  type HangarItem,
} from '../ui/hangar';

/** Layout vertical de cada banda de grupo (rótulo, amostras, título, condição). */
const BANDS: Readonly<Record<CosmeticKind, { label: number; swatch: number; title: number }>> = {
  ship: { label: 168, swatch: 244, title: 296 },
  shotColor: { label: 372, swatch: 444, title: 496 },
  music: { label: 560, swatch: 622, title: 672 },
};

/**
 * HangarScene (P6-01-02) — seletor de cosméticos: NAVE / TIRO / TRILHA. Itens
 * desbloqueados são tocáveis (seleção marcada); bloqueados ficam apagados com a
 * condição visível (texto da `ui/hangar`, fonte única com a galeria de
 * conquistas). Preview honesto embaixo: a nave/tiro como aparecem no jogo;
 * tocar uma trilha toca uma amostra do preset (respeitando o mudo).
 *
 * Cosmético é só apresentação — esta cena escreve apenas a seleção persistida
 * (`SaveService`); a simulação/replay/ranking nunca a veem.
 */
export class HangarScene extends Phaser.Scene {
  private readonly catalog: CosmeticCatalog = getCosmetics();
  private root!: Phaser.GameObjects.Container;

  constructor() {
    super(SceneKeys.Hangar);
  }

  create(): void {
    this.add
      .rectangle(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2, VIRTUAL_WIDTH, VIRTUAL_HEIGHT, 0x070912)
      .setDepth(-10);
    neonText(this, VIRTUAL_WIDTH / 2, 80, 'HANGAR', 56, '#0bd3c6');

    const back = neonText(this, VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT - 70, '‹ VOLTAR', 30, '#ff5d8f')
      .setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start(SceneKeys.Menu));
    this.input.keyboard?.once('keydown-ESC', () => this.scene.start(SceneKeys.Menu));

    // Para a amostra de trilha ao sair (não deixa osciladores tocando).
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => getAudio().stopMusic());

    this.render();
  }

  /** Reconstrói toda a UI dinâmica a partir do save (após cada seleção). */
  private render(): void {
    this.root?.destroy();
    this.root = this.add.container(0, 0);

    const save = getSave();
    const achDesc = this.achievementDescResolver();
    const groups = hangarGroups(this.catalog, cosmeticProfileFrom(save), save.getLoadoutSelection(), achDesc);
    for (const group of groups) this.renderGroup(group);
    this.renderPreview();
  }

  /** Mapa id→desc das conquistas, para a condição de desbloqueio (fonte única). */
  private achievementDescResolver(): (id: string) => string | undefined {
    const byId = new Map(getAchievementDefs().map((d) => [d.id, d.desc] as const));
    return (id) => byId.get(id);
  }

  private renderGroup(group: HangarGroup): void {
    const band = BANDS[group.kind];
    this.root.add(neonText(this, 56, band.label, group.label, 26, '#5a6b7a').setOrigin(0, 0.5));

    const n = group.items.length;
    const step = VIRTUAL_WIDTH / (n + 1);
    group.items.forEach((item, i) => this.renderItem(group.kind, item, step * (i + 1), band));
  }

  private renderItem(
    kind: CosmeticKind,
    item: HangarItem,
    cx: number,
    band: { swatch: number; title: number },
  ): void {
    const alpha = item.unlocked ? 1 : 0.32;
    const g = this.add.graphics().setAlpha(alpha);
    this.drawSwatch(g, item, cx, band.swatch);
    this.root.add(g);

    // Marca da seleção: aro ao redor da amostra.
    if (item.selected) {
      const ring = this.add.graphics();
      ring.lineStyle(3, 0x9af7ef, 0.95).strokeCircle(cx, band.swatch, 40);
      this.root.add(ring);
    }

    const titleColor = item.selected ? '#9af7ef' : item.unlocked ? '#cfd8e3' : '#5a6b7a';
    this.root.add(neonText(this, cx, band.title, item.title, 18, titleColor).setAlpha(alpha));

    if (!item.unlocked) {
      this.root.add(neonText(this, cx, band.swatch - 34, '🔒', 18, '#5a6b7a'));
      this.root.add(neonText(this, cx, band.title + 26, item.condition, 13, '#5a6b7a'));
      return; // bloqueado não é selecionável
    }

    // Zona tocável sobre a amostra (polegar): seleciona e re-renderiza.
    const zone = this.add
      .rectangle(cx, band.swatch, 96, 96, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => this.select(kind, item));
    this.root.add(zone);
  }

  /** Aplica a seleção (persistida) e toca a amostra de trilha quando for o caso. */
  private select(kind: CosmeticKind, item: HangarItem): void {
    const save = getSave();
    try {
      const next = selectCosmetic(
        this.catalog,
        cosmeticProfileFrom(save),
        save.getLoadoutSelection(),
        kind,
        item.id,
      );
      save.setLoadoutSelection(next);
    } catch {
      return; // bloqueado (defensivo — zona só existe para desbloqueados)
    }
    if (kind === 'music' && item.preset) getAudio().previewMusic(item.preset);
    this.render();
  }

  /** Preview honesto da seleção atual: a nave grande + tiros na cor escolhida. */
  private renderPreview(): void {
    const save = getSave();
    const loadout: Loadout = getLoadout(this.catalog, cosmeticProfileFrom(save), save.getLoadoutSelection());
    const ship = findCosmetic(this.catalog, loadout.shipId) as ShipCosmetic;
    const shot = findCosmetic(this.catalog, loadout.shotColorId) as ShotColorCosmetic;
    const cx = VIRTUAL_WIDTH / 2;
    const cy = 820;

    this.root.add(neonText(this, cx, 752, '— PREVIEW —', 18, '#5a6b7a'));
    const g = this.add.graphics();
    // Tiros (cor do cosmético) subindo da nave.
    const shotInt = Phaser.Display.Color.HexStringToColor(shot.color).color;
    for (let i = 0; i < 3; i++) {
      const sy = cy - 90 - i * 46;
      g.fillStyle(shotInt, 0.3).fillCircle(cx, sy, 16);
      g.fillStyle(shotInt, 1).fillCircle(cx, sy, 7);
    }
    this.drawShip(g, ship.shape, Phaser.Display.Color.HexStringToColor(ship.color).color, cx, cy, 66);
    this.root.add(g);
  }

  /** Desenha a amostra de um item conforme o tipo. */
  private drawSwatch(g: Phaser.GameObjects.Graphics, item: HangarItem, cx: number, cy: number): void {
    if (item.kind === 'ship' && item.shape && item.color) {
      this.drawShip(g, item.shape, Phaser.Display.Color.HexStringToColor(item.color).color, cx, cy, 28);
    } else if (item.kind === 'shotColor' && item.color) {
      const c = Phaser.Display.Color.HexStringToColor(item.color).color;
      g.fillStyle(c, 0.25).fillCircle(cx, cy, 30);
      g.fillStyle(c, 1).fillCircle(cx, cy, 16);
    } else {
      // Trilha: ícone de nota neon (acompanha o dim de item bloqueado).
      g.lineStyle(3, 0x9af7ef, 0.9).strokeCircle(cx, cy, 26);
      this.root.add(neonText(this, cx, cy, '♪', 28, '#9af7ef').setAlpha(item.unlocked ? 1 : 0.32));
    }
  }

  /** Desenha uma nave (forma + cor) com glow e contorno claro, igual ao jogo. */
  private drawShip(
    g: Phaser.GameObjects.Graphics,
    shape: string,
    color: number,
    cx: number,
    cy: number,
    radius: number,
  ): void {
    const stroke = lighten(color, 90);
    g.fillStyle(color, 0.15).fillCircle(cx, cy, radius * 1.15);
    const pts = shapePoints(shape, cx, cy, radius);
    if (pts.length === 0) {
      g.fillStyle(color, 1).lineStyle(3, stroke, 1).fillCircle(cx, cy, radius).strokeCircle(cx, cy, radius);
      return;
    }
    const poly = pts as unknown as Phaser.Math.Vector2[];
    g.fillStyle(color, 1).lineStyle(3, stroke, 1).fillPoints(poly, true).strokePoints(poly, true);
  }
}

/** Clareia uma cor int em direção ao branco (contorno neon). */
function lighten(color: number, amount: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) + amount);
  const g = Math.min(255, ((color >> 8) & 0xff) + amount);
  const b = Math.min(255, (color & 0xff) + amount);
  return (r << 16) | (g << 8) | b;
}
