import type { Pattern, EnemyDef, Wave, BossDef } from './types';

import ring from '../data/patterns/ring.json';
import fan from '../data/patterns/fan.json';
import aimed from '../data/patterns/aimed.json';
import spiral from '../data/patterns/spiral.json';
import wall from '../data/patterns/wall.json';
import accelRing from '../data/patterns/accel-ring.json';
import layeredFan from '../data/patterns/layered-fan.json';
import spiralAimed from '../data/patterns/spiral-aimed.json';
import cross from '../data/patterns/cross.json';

import drone from '../data/enemies/drone.json';
import turret from '../data/enemies/turret.json';
import sniper from '../data/enemies/sniper.json';
import weaver from '../data/enemies/weaver.json';
import bomber from '../data/enemies/bomber.json';
import lancer from '../data/enemies/lancer.json';
import orbiter from '../data/enemies/orbiter.json';

import wave001 from '../data/waves/wave-001.json';

import warden from '../data/bosses/warden.json';
import spinner from '../data/bosses/spinner.json';
import gunner from '../data/bosses/gunner.json';
import vortex from '../data/bosses/vortex.json';
import colossus from '../data/bosses/colossus.json';

/**
 * Content — registro central do conteúdo dirigido por dados (docs/02 §3.2).
 *
 * Importa os JSON estáticos e os indexa por id. A lógica consulta aqui em vez
 * de hardcodar números/padrões. Os `as` convertem os literais inferidos do JSON
 * (ex.: `type: string`) para os tipos de união do contrato — único ponto de
 * cast, validado pela forma dos arquivos.
 */
function index<T extends { id: string }>(items: readonly T[]): ReadonlyMap<string, T> {
  const map = new Map<string, T>();
  for (const item of items) map.set(item.id, item);
  return map;
}

const patterns = index<Pattern>([
  ring,
  fan,
  aimed,
  spiral,
  wall,
  accelRing,
  layeredFan,
  spiralAimed,
  cross,
] as unknown as Pattern[]);
const enemies = index<EnemyDef>([
  drone,
  turret,
  sniper,
  weaver,
  bomber,
  lancer,
  orbiter,
] as unknown as EnemyDef[]);
const waves = index<Wave>([wave001] as unknown as Wave[]);
const bosses = index<BossDef>([
  warden,
  spinner,
  gunner,
  vortex,
  colossus,
] as unknown as BossDef[]);

/**
 * Valida o schema de fases de um chefe (P4-02b-01): ≥2 fases, padrões/inimigos
 * referenciados existem, thresholds `untilHpPct` estritamente decrescentes com a
 * última fase em 0, e parâmetros de mecânica coerentes. Lança em caso de erro —
 * roda no carregamento (abaixo) e é exercitada pelos testes de conteúdo.
 */
export function validateBossDef(def: BossDef): void {
  const where = `chefe "${def.id}"`;
  if (!Array.isArray(def.phases) || def.phases.length < 2) {
    throw new Error(`${where}: precisa de ao menos 2 fases`);
  }
  const last = def.phases.length - 1;
  let prev = Infinity;
  def.phases.forEach((phase, i) => {
    if (!patterns.has(phase.patternId)) {
      throw new Error(`${where}, fase ${i}: padrão inexistente "${phase.patternId}"`);
    }
    const t = phase.untilHpPct;
    if (typeof t !== 'number' || t < 0 || t >= 1) {
      throw new Error(`${where}, fase ${i}: untilHpPct fora de [0,1)`);
    }
    if (t >= prev) {
      throw new Error(`${where}, fase ${i}: untilHpPct não é estritamente decrescente`);
    }
    if (i === last && t !== 0) {
      throw new Error(`${where}: a última fase deve ter untilHpPct === 0`);
    }
    prev = t;

    if (phase.shield && !(phase.shield.hp > 0)) {
      throw new Error(`${where}, fase ${i}: shield.hp deve ser > 0`);
    }
    if (phase.adds) {
      const a = phase.adds;
      if (!enemies.has(a.enemyId)) {
        throw new Error(`${where}, fase ${i}: adds.enemyId inexistente "${a.enemyId}"`);
      }
      if (!(a.count > 0) || !(a.intervalTicks > 0) || !(a.maxAlive > 0)) {
        throw new Error(`${where}, fase ${i}: adds com count/intervalTicks/maxAlive inválidos`);
      }
    }
    for (const part of phase.parts ?? []) {
      if (!(part.radiusPx > 0) || !(part.hp > 0)) {
        throw new Error(`${where}, fase ${i}: parte com radiusPx/hp inválidos`);
      }
      if (part.patternId && !patterns.has(part.patternId)) {
        throw new Error(`${where}, fase ${i}: parte com padrão inexistente "${part.patternId}"`);
      }
    }
    const mv = phase.movement;
    if (mv && mv.type === 'teleport') {
      if (!(mv.intervalTicks > 0) || !(mv.telegraphTicks >= 1) || mv.telegraphTicks >= mv.intervalTicks) {
        throw new Error(`${where}, fase ${i}: teleport exige 1 <= telegraphTicks < intervalTicks`);
      }
      if (!(mv.regionPadPx >= 0)) {
        throw new Error(`${where}, fase ${i}: teleport.regionPadPx inválido`);
      }
    }
  });
}

// Validação de integridade no carregamento (falha cedo em dados quebrados).
for (const def of bosses.values()) validateBossDef(def);

/** Ids registrados (para varreduras de integridade e seleção de conteúdo). */
export const PATTERN_IDS: readonly string[] = [...patterns.keys()];
export const ENEMY_IDS: readonly string[] = [...enemies.keys()];
export const WAVE_IDS: readonly string[] = [...waves.keys()];
export const BOSS_IDS: readonly string[] = [...bosses.keys()];

export function getPattern(id: string): Pattern {
  const p = patterns.get(id);
  if (!p) throw new Error(`Padrão de bala desconhecido: ${id}`);
  return p;
}

export function getEnemyDef(id: string): EnemyDef {
  const e = enemies.get(id);
  if (!e) throw new Error(`Inimigo desconhecido: ${id}`);
  return e;
}

export function getWave(id: string): Wave {
  const w = waves.get(id);
  if (!w) throw new Error(`Onda desconhecida: ${id}`);
  return w;
}

export function getBoss(id: string): BossDef {
  const b = bosses.get(id);
  if (!b) throw new Error(`Chefe desconhecido: ${id}`);
  return b;
}
