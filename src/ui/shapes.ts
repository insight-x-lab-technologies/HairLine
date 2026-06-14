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

/**
 * Vértices de uma "seta" (nave) apontando para cima, inscrita em `radius`.
 * Proporções espelham o corpo da nave do jogo (alto, com entalhe traseiro).
 */
export function arrowPoints(cx: number, cy: number, radius: number, rotation = 0): Pt[] {
  const base: Pt[] = [
    { x: 0, y: -radius },
    { x: radius * 0.66, y: radius * 0.73 },
    { x: 0, y: radius * 0.4 },
    { x: -radius * 0.66, y: radius * 0.73 },
  ];
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return base.map((p) => ({ x: cx + p.x * cos - p.y * sin, y: cy + p.x * sin + p.y * cos }));
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
    case 'arrow':
      return arrowPoints(cx, cy, radius, rotation);
    default:
      return [];
  }
}

/**
 * Formas nomeadas que o render sabe desenhar (incl. 'circle', sem polígono).
 * Usado pela validação de cosméticos (P6-01-01) para barrar `shape` inexistente.
 */
export const KNOWN_SHAPES: readonly string[] = ['triangle', 'diamond', 'hex', 'arrow', 'circle'];

/** A forma é desenhável (consta em `KNOWN_SHAPES`)? */
export function isKnownShape(shape: string): boolean {
  return KNOWN_SHAPES.includes(shape);
}
