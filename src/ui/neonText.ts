import Phaser from 'phaser';

/** Estilo neon padrão (docs/01 §4.3 — estética vetorial/geométrica). */
export function neonText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size = 40,
  color = '#39f5e8',
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, { fontFamily: 'monospace', fontSize: `${size}px`, color })
    .setOrigin(0.5);
}

/** Texto que pulsa suavemente — usado em "toque para continuar". */
export function pulse(scene: Phaser.Scene, obj: Phaser.GameObjects.Text): void {
  scene.tweens.add({
    targets: obj,
    alpha: { from: 1, to: 0.35 },
    duration: 700,
    yoyo: true,
    repeat: -1,
  });
}
