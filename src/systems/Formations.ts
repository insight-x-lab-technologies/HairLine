/**
 * Formations — formações coordenadas de inimigos (docs/04 Fase 4: "variedade
 * de inimigos e formações"). Geometria PURA e determinística: retorna offsets
 * (dx, dy) relativos a um ponto-âncora no topo; o spawner os aplica.
 *
 * Convenção: dy negativo = mais acima do topo (entra depois). Assim 'vee' e
 * 'column' formam o desenho conforme os inimigos descem.
 */
export const FORMATION_TYPES = ['line', 'vee', 'column'] as const;
export type FormationType = (typeof FORMATION_TYPES)[number];

export interface FormationOffset {
  readonly dx: number;
  readonly dy: number;
}

export function formationOffsets(
  type: FormationType,
  count: number,
  spacing: number,
): FormationOffset[] {
  const n = Math.max(1, Math.floor(count));
  if (n === 1) return [{ dx: 0, dy: 0 }];

  // Normaliza -0 para 0 (evita surpresas em comparações Object.is).
  const z = (v: number): number => (v === 0 ? 0 : v);
  const mid = (n - 1) / 2;
  const out: FormationOffset[] = [];
  for (let i = 0; i < n; i++) {
    const k = i - mid; // distância (em índices) do centro
    switch (type) {
      case 'line':
        out.push({ dx: z(k * spacing), dy: 0 });
        break;
      case 'vee':
        // pontas mais acima (entram depois) → V apontando para baixo.
        out.push({ dx: z(k * spacing), dy: z(-Math.abs(k) * spacing * 0.7) });
        break;
      case 'column':
        out.push({ dx: 0, dy: z(-i * spacing) });
        break;
    }
  }
  return out;
}
