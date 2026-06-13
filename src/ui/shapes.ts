/**
 * shapes — geometria de polígonos para o visual neon vetorial (docs/01 §4.3).
 * Puro (sem Phaser): calcula os vértices; o render desenha com Graphics.
 */
export interface Pt {
  x: number;
  y: number;
}

/** Vértices de um polígono regular de `sides` lados, com rotação (rad). */
export function polygonPoints(
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  rotation = 0,
): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i / sides) * Math.PI * 2 - Math.PI / 2;
    pts.push({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius });
  }
  return pts;
}

/** Mapeia um nome de forma para seus vértices. 'circle'/desconhecido → []. */
export function shapePoints(
  shape: string,
  cx: number,
  cy: number,
  radius: number,
  rotation = 0,
): Pt[] {
  switch (shape) {
    case 'triangle':
      return polygonPoints(cx, cy, radius, 3, rotation);
    case 'diamond':
      return polygonPoints(cx, cy, radius, 4, rotation);
    case 'hex':
      return polygonPoints(cx, cy, radius, 6, rotation);
    default:
      return [];
  }
}
