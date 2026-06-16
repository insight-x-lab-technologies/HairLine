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

/**
 * Vértices de uma SILHUETA de nave coesa (P10-05): um caça com nariz, ombros,
 * asas em flecha e dois pods de motor com um entalhe central por onde sai a
 * chama. É um único contorno fechado — lê como nave, não como peças soltas.
 * Inscrita em `radius` (todos os vértices têm |v| ≤ radius), apontando para
 * cima; pura/testável (sem Phaser). Usada igual no jogo (`VectorTheme`) e no
 * preview do Hangar para garantir coerência. A forma/cor do cosmético entram
 * como acento (cockpit) e tingimento, não trocando a silhueta.
 */
export function shipSilhouette(cx: number, cy: number, radius: number, rotation = 0): Pt[] {
  const base: Pt[] = [
    { x: 0, y: -1.0 }, // nariz
    { x: 0.16, y: -0.42 }, // pescoço dir.
    { x: 0.26, y: 0.02 }, // ombro dir.
    { x: 0.9, y: 0.38 }, // ponta da asa dir. (em flecha)
    { x: 0.4, y: 0.5 }, // bordo de fuga dir.
    { x: 0.3, y: 0.86 }, // pod de motor dir.
    { x: 0, y: 0.58 }, // entalhe traseiro (saída da chama)
    { x: -0.3, y: 0.86 }, // pod de motor esq.
    { x: -0.4, y: 0.5 }, // bordo de fuga esq.
    { x: -0.9, y: 0.38 }, // ponta da asa esq.
    { x: -0.26, y: 0.02 }, // ombro esq.
    { x: -0.16, y: -0.42 }, // pescoço esq.
  ];
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return base.map((p) => {
    const x = p.x * radius;
    const y = p.y * radius;
    return { x: cx + x * cos - y * sin, y: cy + x * sin + y * cos };
  });
}

/**
 * Vértices de uma ESTRELA de `points` pontas, alternando `outerRadius` e
 * `innerRadius` (2·points vértices). Usada como núcleo/identidade dos chefes
 * (P10-06) — um corpo com "cara de máquina" em vez de `fillCircle` puro. Pura
 * e testável; o render desenha com `Graphics`.
 */
export function starPoints(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  points: number,
  rotation = 0,
): Pt[] {
  const pts: Pt[] = [];
  const step = Math.PI / points; // meia-volta entre ponta e vale
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const a = rotation + i * step - Math.PI / 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
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
