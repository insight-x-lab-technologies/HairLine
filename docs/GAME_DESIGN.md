# GAME_DESIGN — HAIRLINE

> Doc de memória: regras concretas do jogo e onde ajustá-las. Tudo que é
> balanceamento mora em **JSON** (`src/data/`), nunca hardcoded.

## Campo e tempo

- Mundo virtual fixo: **720×1280** (retrato 9:16), `src/config/layout.ts`.
- Lógica em **fixed timestep 60 Hz** (`TICK_RATE_HZ`), separada do render.
- A hitbox da nave é um **ponto pequeno** (raio ~5px), muito menor que o sprite.

## Nave (jogador) — `src/data/player.json`

- `maxSpeedPxPerSec`, `focusSpeedFactor` (modo Foco reduz velocidade),
  `hitboxRadiusPx`, `marginPx` (limite do campo), `startX/Y`.
- `autoFire`: `{ intervalTicks, speedPxPerSec, radiusPx }` — tiro automático
  para cima, cadência em **ticks** (determinístico).
- Movimento: a nave **persegue** o alvo do dedo, limitada pela velocidade máx.

## Combate — `src/data/combat.json`

- `lives`, `invulnTicks` (i-frames após dano), `focusMax`, `focusPerGraze`,
  `grazeMarginPx` (anel de graze), `scorePerKill`, `scorePerGraze`.
- Pulso refletor: `pulseCost` (Foco), `pulseRadiusPx`, `scorePerReflected`.

## Mecânica central: Graze → Foco → Pulso

1. Bala inimiga passa no **anel** (hitbox < dist ≤ hitbox+margem) sem acertar →
   `+focusPerGraze`, conta graze e pontua. Cada bala conta **uma vez** (`grazed`).
2. Com Foco ≥ `pulseCost`, o **pulso** limpa balas no raio e pontua por bala.
3. Ordem no tick (determinística): pulso → graze → colisões. Ver `Simulation.tick`.

## Inimigos — `src/data/enemies/*.json`

Campos: `hp`, `radiusPx`, `speedYPxPerSec`, `patternId`, `shape`
(triangle/diamond/hex/circle), `color` (#hex). Atuais: drone, sniper, turret,
weaver, bomber, lancer, orbiter (**7**). Idade (`ageTicks`) controla a emissão.

## Padrões de bala (emitters declarativos) — `src/data/patterns/*.json`

Um padrão = lista de **emitters**. Campos por emitter:
- `type`: `ring` | `fan` | `aimed`.
- `count`, `speed`, `bulletRadius`, `startTick`, `intervalTicks`, `repeat`.
- `angleDeg` (base), `spreadDeg` (abertura fan/aimed).
- `angleStepDeg` (rotação por salva → espirais), `accel` (px/s² na direção),
  `speedStep`/`radiusStep` (variação por bala → camadas), `aimOffsetDeg`.
- Convenção de ângulo: **0°=baixo**, horário; `vx=speed·sinθ, vy=speed·cosθ`.
Atuais: ring, fan, aimed, spiral, wall, accel-ring, layered-fan, spiral-aimed,
cross (**9**).

## Chefes — `src/data/bosses/*.json`

Campos base: `hp`, `radiusPx`, `enterTick`, `homeY`, `sweepAmplitudePx`,
`sweepPeriodTicks`, `defeatScore`, `scorePerPartDefeat?`, `shape?`, `color?`.

**Fases data-driven (P4-02b-01).** `phases: BossPhaseDef[]` — lista ordenada,
mínimo 2, sem máximo. Cada fase: `{ patternId, untilHpPct, ... }`. A fase vale
enquanto `hp/maxHp > untilHpPct`; thresholds **estritamente decrescentes** e a
última fase usa `untilHpPct === 0`. A transição zera `phaseAge` (o padrão da nova
fase recomeça). Validação no registro (`src/content/index.ts`, `validateBossDef`).

**Mecânicas opcionais por fase (P4-02b-02..05):**
- `shield: { hp, rechargeTicks? }` — invulnerabilidade quebrável: os tiros gastam
  o HP do escudo, não o do chefe. Com `rechargeTicks`, volta cheio após o
  intervalo dentro da mesma fase; sem ele, fica quebrado até a fase trocar.
- `adds: { enemyId, count, intervalTicks, maxAlive }` — invoca inimigos comuns
  (via `EnemyPool`, offsets fixos) na cadência da fase, até `maxAlive` vivos;
  limpos ao derrotar o chefe.
- `parts: [{ offsetXPx, offsetYPx, radiusPx, hp, patternId?, scorePerDefeat? }]` —
  sub-alvos presos ao corpo (acompanham o movimento). Enquanto houver parte viva,
  o **núcleo é invulnerável**. Cada parte pode emitir seu padrão e pontua ao cair.
- `movement: { type:"sweep" } | { type:"teleport", intervalTicks, telegraphTicks,
  regionPadPx }` — ausente ⇒ `sweep` (vaivém senoidal, default). `teleport`:
  ciclo intervalo → telegraph (destino exposto p/ aviso) → salto, destino sorteado
  por um `Rng` semeado isolado (ver TD-17).

Atuais: warden (escudo), spinner (teleporte), gunner (adds), vortex (partes) e
**colossus** — clímax de 3 fases (partes → escudo+adds → teleporte) (**5**).

## Dificuldade (Endless) — `src/data/difficulty.json`

- `rampTicks` (ticks/nível), `baseSpawnIntervalTicks`, `minSpawnIntervalTicks`,
  `spawnIntervalDecayPerLevel`, `enemySpeedMulPerLevel`, `enemyHpBonusPerLevel`.
- `tiers`: desbloqueio de inimigos por nível (cumulativo).
- Chefe no Endless: `bossFirstLevel`, `bossEveryLevels` (rotação por seed).
- **Formações** (P4-03): `formationFromLevel`, `formationChance`,
  `formationSizeMin/Max`, `formationSpacingPx` (line/vee/column).
- Início **deliberadamente fácil** (feedback do usuário): rampa suave.

## Modos

- `endless` (padrão), `campaign` (onda autoral + chefe que entra por tick),
  `bossrush` (chefes em sequência → vitória ao vencer todos).

## Modificadores (Evento Semanal) — `src/systems/Modifiers.ts`

`RunMods` (multiplicadores/overrides): `scorePerGrazeMul`, `scorePerKillMul`,
`focusPerGrazeMul`, `playerSpeedMul`, `spawnIntervalMul`, `livesOverride`.
Escolhidos por **seed da semana ISO** (mesmos para todos). Fazem parte do estado
determinístico (entram no replay).

## Controles

Toque: arrastar = mover; (2º toque/botão direito = Foco — refinar mobile);
botão PULSO. Teclado: WASD/setas, Shift/Z = Foco, Espaço/X = pulso, ESC/P =
pausa. Abstraídos em `InputService` → eventos `move`/`focus`/`pulse`.

## Feedback / juice (estado)

Dano: screen shake + flash vermelho + nave piscando (i-frames). Kill/graze/
pulso/vitória: SFX procedural. Fundo: campo de estrelas parallax. Falta hit-stop
e partículas (P5-01).

## Princípios de design inegociáveis

Determinismo (justiça do Diário), dados separados de código, hitbox ≠ sprite,
legibilidade do perigo > beleza, monetização nunca afeta o ranking.
