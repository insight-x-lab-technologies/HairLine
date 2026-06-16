import type Phaser from 'phaser';

/**
 * SpritePool — pool de `Phaser.GameObjects.Sprite` pré-alocados para o
 * `SpriteTheme` (P10-09), no mesmo espírito de `BulletPool`/`EnemyPool`/
 * `ParticlePool`: capacidade fixa, criada UMA vez no setup, sem `new` no loop
 * (TD-07). É APRESENTAÇÃO pura — não toca `src/sim`, `hashState()` nem replay.
 *
 * Uso por frame: `begin()` zera o cursor; `next()` adquire o próximo sprite
 * (já visível) para posicionar; `end()` esconde os que sobraram. Sprites ociosos
 * ficam invisíveis (não destruídos), prontos para o próximo frame.
 *
 * Se a demanda exceder a capacidade, `next()` devolve `null` — o chamador então
 * desenha o excedente pelo fallback vetorial (consistência > perfeição).
 */
export class SpritePool {
  readonly capacity: number;
  private readonly sprites: Phaser.GameObjects.Sprite[];
  private cursor = 0;

  constructor(scene: Phaser.Scene, textureKey: string, capacity: number, depth: number) {
    this.capacity = capacity;
    this.sprites = new Array(capacity);
    for (let i = 0; i < capacity; i++) {
      const s = scene.add.sprite(0, 0, textureKey).setVisible(false).setActive(false).setDepth(depth);
      this.sprites[i] = s;
    }
  }

  /** Inicia um frame: nenhum sprite adquirido ainda. */
  begin(): void {
    this.cursor = 0;
  }

  /** Adquire o próximo sprite livre (visível) ou `null` se a capacidade acabou. */
  next(): Phaser.GameObjects.Sprite | null {
    if (this.cursor >= this.capacity) return null;
    const s = this.sprites[this.cursor++]!;
    s.setVisible(true).setActive(true);
    return s;
  }

  /** Encerra o frame: esconde os sprites não adquiridos (ociosos invisíveis). */
  end(): void {
    for (let i = this.cursor; i < this.capacity; i++) {
      const s = this.sprites[i]!;
      if (!s.visible) break; // a cauda já está escondida desde frames anteriores
      s.setVisible(false).setActive(false);
    }
  }

  /** Libera os GameObjects (simétrico à criação). */
  destroy(): void {
    for (const s of this.sprites) s.destroy();
    this.sprites.length = 0;
  }
}
