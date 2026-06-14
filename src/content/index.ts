import type {
  Pattern,
  EnemyDef,
  Wave,
  BossDef,
  StageDef,
  EffectsConfig,
  AudioConfig,
} from './types';
import { ALL_AUDIO_CUES, type AudioCue } from '../systems/AudioCues';

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
import wave002 from '../data/waves/wave-002.json';
import wave003 from '../data/waves/wave-003.json';
import wave004 from '../data/waves/wave-004.json';
import wave005 from '../data/waves/wave-005.json';

import warden from '../data/bosses/warden.json';
import spinner from '../data/bosses/spinner.json';
import gunner from '../data/bosses/gunner.json';
import vortex from '../data/bosses/vortex.json';
import colossus from '../data/bosses/colossus.json';

import stage001 from '../data/stages/stage-001.json';
import stage002 from '../data/stages/stage-002.json';
import stage003 from '../data/stages/stage-003.json';

import effectsData from '../data/effects.json';
import audioData from '../data/audio.json';
import cosmeticsData from '../data/cosmetics.json';
import { validateCosmetics, type CosmeticCatalog } from '../services/Cosmetics';
import achievementsData from '../data/achievements.json';
import { validateAchievements, type AchievementDef } from '../services/Achievements';

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
const waves = index<Wave>([wave001, wave002, wave003, wave004, wave005] as unknown as Wave[]);
const bosses = index<BossDef>([warden, spinner, gunner, vortex, colossus] as unknown as BossDef[]);
// Ordem do array = ordem de desbloqueio dos estágios (P4-04b-04). É contrato:
// ids nunca mudam de posição relativa após lançados.
const stages = index<StageDef>([stage001, stage002, stage003] as unknown as StageDef[]);

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
      if (
        !(mv.intervalTicks > 0) ||
        !(mv.telegraphTicks >= 1) ||
        mv.telegraphTicks >= mv.intervalTicks
      ) {
        throw new Error(`${where}, fase ${i}: teleport exige 1 <= telegraphTicks < intervalTicks`);
      }
      if (!(mv.regionPadPx >= 0)) {
        throw new Error(`${where}, fase ${i}: teleport.regionPadPx inválido`);
      }
    }
  });
}

/**
 * Valida um estágio curado (P4-04b-01): ≥1 seção; cada seção referencia uma
 * onda/chefe existente e tem `type` válido. Lança em caso de erro — roda no
 * carregamento (abaixo) e é exercitada pelos testes de conteúdo.
 */
export function validateStageDef(def: StageDef): void {
  const where = `estágio "${def.id}"`;
  if (!Array.isArray(def.sections) || def.sections.length < 1) {
    throw new Error(`${where}: precisa de ao menos 1 seção`);
  }
  def.sections.forEach((s, i) => {
    if (s.type === 'wave') {
      if (!waves.has(s.waveId)) {
        throw new Error(`${where}, seção ${i}: onda inexistente "${s.waveId}"`);
      }
    } else if (s.type === 'boss') {
      if (!bosses.has(s.bossId)) {
        throw new Error(`${where}, seção ${i}: chefe inexistente "${s.bossId}"`);
      }
    } else {
      throw new Error(`${where}, seção ${i}: tipo de seção inválido`);
    }
  });
}

const effects = effectsData as unknown as EffectsConfig;
const audioConfig = audioData as unknown as AudioConfig;
const cosmetics = cosmeticsData as unknown as CosmeticCatalog;
const achievements = (achievementsData as unknown as { achievements: AchievementDef[] }).achievements;
const VALID_CUES = new Set<string>(ALL_AUDIO_CUES);

function assertFiniteNonNeg(n: unknown, where: string): void {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) {
    throw new Error(`${where}: número inválido (${String(n)})`);
  }
}

/**
 * Valida `effects.json` (P5-01-01): cues de shake/flash existem no tipo
 * `AudioCue`; números são finitos e não-negativos; seções de partículas,
 * hit-stop, anel de graze, HUD de Foco e haptics são coerentes. Lança em erro.
 */
export function validateEffects(cfg: EffectsConfig): void {
  for (const cue of Object.keys(cfg.shake)) {
    if (!VALID_CUES.has(cue)) throw new Error(`effects.shake: cue desconhecida "${cue}"`);
    assertFiniteNonNeg(cfg.shake[cue]!.durationMs, `effects.shake.${cue}.durationMs`);
    assertFiniteNonNeg(cfg.shake[cue]!.intensity, `effects.shake.${cue}.intensity`);
  }
  for (const cue of Object.keys(cfg.flash)) {
    if (!VALID_CUES.has(cue)) throw new Error(`effects.flash: cue desconhecida "${cue}"`);
    const f = cfg.flash[cue]!;
    for (const k of ['durationMs', 'r', 'g', 'b'] as const)
      assertFiniteNonNeg(f[k], `effects.flash.${cue}.${k}`);
  }
  assertFiniteNonNeg(cfg.reflectFx.durationTicks, 'effects.reflectFx.durationTicks');
  for (const [name, p] of Object.entries(cfg.particles)) {
    for (const k of ['count', 'speed', 'lifeTicks', 'size'] as const)
      assertFiniteNonNeg(p[k], `effects.particles.${name}.${k}`);
    if (!(p.lifeTicks > 0)) throw new Error(`effects.particles.${name}.lifeTicks deve ser > 0`);
  }
  assertFiniteNonNeg(cfg.hitStop.maxMs, 'effects.hitStop.maxMs');
  for (const [name, ms] of Object.entries(cfg.hitStop.durations))
    assertFiniteNonNeg(ms, `effects.hitStop.durations.${name}`);
  const gr = cfg.grazeRing;
  for (const a of [gr.alphaNormal, gr.alphaFocus, gr.pingAlpha]) {
    if (typeof a !== 'number' || a < 0 || a > 1)
      throw new Error('effects.grazeRing: alpha fora de [0,1]');
  }
  assertFiniteNonNeg(gr.pingDurationTicks, 'effects.grazeRing.pingDurationTicks');
  assertFiniteNonNeg(cfg.focusHud.width, 'effects.focusHud.width');
  assertFiniteNonNeg(cfg.focusHud.height, 'effects.focusHud.height');
  assertFiniteNonNeg(cfg.haptics.throttleMs, 'effects.haptics.throttleMs');
  for (const [cue, pat] of Object.entries(cfg.haptics.patterns)) {
    if (!Array.isArray(pat) || pat.length === 0)
      throw new Error(`effects.haptics.patterns.${cue}: padrão vazio`);
    let sum = 0;
    for (const v of pat) {
      if (typeof v !== 'number' || !(v > 0))
        throw new Error(`effects.haptics.patterns.${cue}: valor <= 0`);
      sum += v;
    }
    if (sum > cfg.haptics.maxPatternMs)
      throw new Error(`effects.haptics.patterns.${cue}: soma > maxPatternMs`);
  }
}

/**
 * Valida `audio.json` (P5-04): ganhos de camada em [0,1], limiares positivos,
 * ramps positivos; tetos de polifonia ≥ 1 e variações sãs. Lança em erro.
 */
export function validateAudioConfig(cfg: AudioConfig): void {
  const m = cfg.music;
  for (const g of Object.values(m.layers)) {
    if (typeof g !== 'number' || g < 0 || g > 1)
      throw new Error('audio.music.layers: ganho fora de [0,1]');
  }
  assertFiniteNonNeg(m.rhythmLevel, 'audio.music.rhythmLevel');
  if (!(m.rampMs.in > 0) || !(m.rampMs.out > 0))
    throw new Error('audio.music.rampMs deve ser positivo');
  const s = cfg.sfx;
  if (!(s.maxVoices >= 1)) throw new Error('audio.sfx.maxVoices deve ser >= 1');
  for (const [cue, n] of Object.entries(s.perCueMax)) {
    if (!(n >= 1)) throw new Error(`audio.sfx.perCueMax.${cue} deve ser >= 1`);
  }
  if (s.pitchVar < 0 || s.pitchVar > 1) throw new Error('audio.sfx.pitchVar fora de faixa');
  if (s.gainVar < 0 || s.gainVar > 1) throw new Error('audio.sfx.gainVar fora de faixa');
  if (s.duck.amount < 0 || s.duck.amount > 1)
    throw new Error('audio.sfx.duck.amount fora de [0,1]');
}

// Validação de integridade no carregamento (falha cedo em dados quebrados).
for (const def of bosses.values()) validateBossDef(def);
for (const def of stages.values()) validateStageDef(def);
validateEffects(effects);
validateAudioConfig(audioConfig);
// P6-01-01: catálogo inicial validado no carregamento. A validação cruzada com
// `achievements.json` (P6-02-01) entra quando aquele registro existir — por ora
// o catálogo não usa unlock por conquista, então não há referência a checar.
validateCosmetics(cosmetics);
// P6-02-01: definições de conquista validadas no carregamento.
validateAchievements(achievements);

export function getEffects(): EffectsConfig {
  return effects;
}

export function getAudioConfig(): AudioConfig {
  return audioConfig;
}

/** Catálogo de cosméticos (P6-01-01). Apresentação pura — fora da simulação. */
export function getCosmetics(): CosmeticCatalog {
  return cosmetics;
}

/** Definições de conquista (P6-02-01), na ordem do JSON (= ordem de exibição). */
export function getAchievementDefs(): readonly AchievementDef[] {
  return achievements;
}

/** Cue de áudio cuja seção de haptics deve existir (para integração na cena). */
export function hapticPatternFor(cue: AudioCue): readonly number[] | undefined {
  return effects.haptics.patterns[cue];
}

/** Ids registrados (para varreduras de integridade e seleção de conteúdo). */
export const PATTERN_IDS: readonly string[] = [...patterns.keys()];
export const ENEMY_IDS: readonly string[] = [...enemies.keys()];
export const WAVE_IDS: readonly string[] = [...waves.keys()];
export const BOSS_IDS: readonly string[] = [...bosses.keys()];
/** Ids dos estágios na ordem de registro = ordem de desbloqueio (P4-04b-04). */
export const STAGE_IDS: readonly string[] = [...stages.keys()];

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

export function getStage(id: string): StageDef {
  const s = stages.get(id);
  if (!s) throw new Error(`Estágio desconhecido: ${id}`);
  return s;
}
