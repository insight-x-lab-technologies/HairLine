# TECH_DECISIONS — HAIRLINE (ADR resumido)

> Doc de memória: decisões técnicas tomadas e o porquê, para novas sessões não
> reabrirem o que já foi resolvido. Formato leve de ADR. Status: ✅ vigente.

## TD-01 — Phaser 4.1.0 fixado exato ✅
Engine 2D web padrão; renderer node-based bom para milhares de balas. **Fixar a
versão exata** (`package.json`, sem `^`). ⚠️ Phaser 4 ≠ 3: `setTintFill()` não
faz nada; usar `setTint()` + `setTintMode()`.

## TD-02 — TypeScript estrito + Vite + Vitest ✅
`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` etc. Pega bugs cedo e
ancora geração agêntica. Vite p/ dev/build/PWA; Vitest p/ testes headless.

## TD-03 — Determinismo é lei ✅
Fixed timestep 60 Hz, lógica headless separável do render, `hashState()`
reproduzível. Habilita Diário justo + anti-cheat por re-simulação.

## TD-04 — PRNG mulberry32 (`Rng`) ✅
Simples, rápido, estado de 32 bits, qualidade suficiente. **Proibido
`Math.random`** (ESLint barra). Valores golden fixados em teste.

## TD-05 — Dados separados de código ✅
Padrões/inimigos/chefes/ondas/balanceamento em **JSON** (`src/data/`), lidos via
`src/content`. Permite criar conteúdo sem tocar em sistemas.

## TD-06 — Padrões de bala = emitters declarativos ✅
Em vez de DSL/script, cada padrão é uma lista de emitters parametrizados
(`ring/fan/aimed` + `angleStepDeg/accel/speedStep/radiusStep/aimOffsetDeg`).
Cobre muita variedade com pouco código. Um **editor** (P4-06) viria por cima
deste formato, não o substitui.

## TD-07 — Pooling obrigatório ✅
`BulletPool`/`EnemyPool` pré-alocados, free-list LIFO, varredura por índice
(ordem estável = determinismo). Nunca `new` no loop.

## TD-08 — Render por `Graphics` redesenhado por frame ✅
Cenas leem os pools e redesenham (sem criar GameObjects no loop). Formas por tipo
(`ui/shapes`) + glow. Simples e suficiente; otimização fica para a Fase 5.

## TD-09 — Áudio procedural (Web Audio), sem assets ✅
SFX e trilha sintetizados (osciladores+envelopes). Combina com a estética neon e
evita pipeline de áudio. Lógica "que som tocar" é pura (`AudioCues`, testável);
o backend (`AudioService`) é apresentação. Mute persistido.

## TD-10 — Plataforma de hospedagem: Cloudflare ✅
Deploy do PWA em **Cloudflare Pages** (preparado, não deployado). Ranking em
**Cloudflare Workers + KV** (`worker/`, preparado). Escolha consistente entre app
e backend. (Supabase foi a alternativa considerada e descartada.)

## TD-11 — `Leaderboard` assíncrono + cliente intercambiável ✅
Interface `Promise`-based; `LocalLeaderboard` (offline/default) e
`RemoteLeaderboard` (fetch). Troca por `VITE_LEADERBOARD_URL`, sem mexer nos
chamadores.

## TD-12 — Identidade anônima leve ✅
`PlayerIdentity`: id estável gerado localmente (via `Rng`, sem `Math.random`) +
apelido editável. Sem cadastro. Só para distinguir no ranking.

## TD-13 — Anti-cheat v1 por re-simulação ✅
O replay grava inputs+seed+mode+**mods**; `verifyReplay` re-roda a sim e confere
hash/score. Plausibilidade simples no Worker. Re-sim no servidor = futuro.

## TD-14 — Seeds: dia (UTC) e semana (ISO) ✅
`DailySeed` (Diário) e `Modifiers.weeklySeed` (Evento Semanal) derivam de
data/semana via FNV-1a → mesmas para todos. `RunMods` plano e serializável.

## TD-15 — Persistência local ✅
`SaveService` (recorde), `PlayerIdentity`, mute, ranking local — tudo em
localStorage com fallback em memória e store injetável (testável).

## TD-16 — Scripts dev expõem rede (Tailscale) ✅
`scripts/run.sh` usa `--host` + `server.allowedHosts: true` (Vite) para acesso
via LAN/Tailscale; não-bloqueante (setsid + pidfile); `--strictPort` 8080.

## TD-17 — Fases de chefe data-driven + mecânicas compostas (P4-02b) ✅
`BossDef.phases: BossPhaseDef[]` substitui `phasePatternIds` (sem suporte duplo —
o jogo não lançou). Cada fase declara `patternId` + `untilHpPct` e, opcionalmente,
`shield` / `adds` / `parts` / `movement`. Decisões fechadas:
- **Transição de fase = função pura do HP**, dentro de `Boss.onHit` (mesmo ponto
  de antes, preserva hash); `BossSystem` reconcilia as mecânicas no `update`
  seguinte quando `phaseIndex` muda (1 tick depois, determinístico).
- **`BossSystem` recebe um `Rng` semeado PRÓPRIO e isolado** (derivado da seed da
  run), usado só pelo teleporte. Não toca o stream principal da simulação ⇒
  chefes sem `movement` não consomem aleatoriedade e runs antigas de chefes
  `sweep` ficam byte-idênticas. Os adds usam **offsets fixos** (sem Rng).
- **Contrato de colisão ampliado**: `resolveShotsVsBossSystem(shots, sys, state)`
  resolve, por tiro e em ordem fixa, partes → escudo → núcleo (o antigo
  `resolveShotsVsBoss(shots, boss)` segue para o caminho só-núcleo).
- **Hash**: escudo (HP), partes (vivas/soma de HP) e ciclo de teleporte
  (telegraph + posição) entram no checksum — replay/anti-cheat cobrem a luta.

## TD-18 — Estágios curados data-driven + modo `stage` (P4-04b) ✅
`StageDef { id, name, sections: StageSection[] }` em `src/data/stages/*.json`;
seção = `{type:'wave',waveId}` | `{type:'boss',bossId}`. Decisões fechadas:
- **Modo `campaign` removido** (sem suporte duplo — o jogo não lançou): `stage`
  o absorve. `GameMode = 'endless' | 'stage' | 'bossrush'`; `waveId`/`bossId`
  saem de `SimulationOptions` (eram só da campanha); entra `stageId` (default
  `stage-001`), gravado no `Replay` e re-simulado por `verifyReplay`.
- **Chefe entra por LIMPEZA de seção, não por `enterTick`** (mudança de
  comportamento vs. campanha): a seção de onda fecha com spawner esgotado +
  `enemies.activeCount === 0`; a de chefe, ao derrotá-lo (some `defeatScore`,
  como o `BossRushDirector`). `BossDef.enterTick` segue no schema (Endless usa).
- **`StageDirector` espelha as fases do tick** (spawn → chefe → fim), com 3
  métodos chamados em pontos fixos da `Simulation`, preservando a ordem
  determinística. O índice da seção entra no `hashState()` (replay/anti-cheat
  cobrem o avanço onda→onda→chefe). Como é modo novo, fixtures golden de
  campanha foram migradas para `stage` com hashes novos (mudança especificada
  em P4-04b-01; CLAUDE.md §"não consertar teste para acomodar bug" não se
  aplica — é comportamento novo, citado no commit).
- **Progresso é só estado exposto** (`stageProgress`, somente-leitura); anúncios
  e indicador "n/m" ficam na `GameScene` (nada vaza para a sim — hash inalterado).
- **Save de progresso versionado**: bloco `hairline.stageProgress.v1` no
  `SaveService` (`{ [stageId]: { completed, bestScore } }`). Desbloqueio segue a
  ordem de `STAGE_IDS` (contrato: ids nunca mudam de posição relativa). Save
  antigo sem o bloco ⇒ só o primeiro estágio aberto.

## TD-19 — Camada de FX render-side: partículas + buffer de eventos (P5-01) ✅
Juice da Fase 5 sem tocar o determinismo. Decisões fechadas:
- **`effects.json` + `getEffects()`** (P5-01-01): shake/flash/anel-do-pulso e as
  seções novas (partículas, hit-stop, anel de graze, HUD de Foco, haptics) saem
  do código da cena para dados, no padrão `getPattern`/`getBoss`. Validação no
  carregamento (`validateEffects`): cues existem em `ALL_AUDIO_CUES`, números
  sãos. `src/sim/` NÃO conhece o arquivo.
- **`ParticlePool` próprio + `Graphics`** (P5-01-02), não o emitter nativo do
  Phaser (coerente com TD-08). Struct-of-arrays pré-alocado, sem `new` no loop;
  saturação **descarta** o excedente. **Rng local decorativo** (privado do pool)
  para espalhamento — respeita o lint (proibido `Math.random`), reproduzível em
  teste, **fora do replay**. Avança por **tempo de render** (dtTicks do frame),
  não por ticks da sim — é decorativo; congela junto no hit-stop.
- **Buffer `Simulation.fxEvents`** (P5-01-03/P5-02-01): eventos `{type,x,y,color,
  radius}` pré-alocados (cap 64), preenchidos nos pontos de colisão/graze via uma
  interface mínima `FxEmitter` (mantém os sistemas desacoplados). **NÃO entra no
  `hashState()`** (derivado/decorativo) ⇒ replays gravados seguem válidos. Zera o
  índice a cada tick; com múltiplos ticks por frame, o render vê os eventos do
  **último** tick (aceitável p/ FX). Saturação descarta sem alocar.
- **Hit-stop no driver do loop** (P5-01-04), fora de `src/sim/`: a cena não
  alimenta `loop.advance` por N ms e **não acumula** o tempo (sem catch-up). A
  sequência de ticks/inputs fica idêntica ⇒ `verifyReplay`/determinismo intactos.
  Alternativa de timestep variável dentro da sim **rejeitada** (complexidade +
  risco de determinismo sem ganho). Lógica pura em `src/ui/HitStop.ts`.

## TD-20 — Áudio dinâmico: trilha em camadas, SFX em camadas, haptics (P5-04) ✅
Evolução do TD-09 (segue 100% procedural, sem assets). Decisões fechadas:
- **`MusicDirector` puro** decide ganhos-alvo por camada a partir de um snapshot
  (nível/chefe/vidas/gameOver); o `AudioService` aplica com ramps
  (`linearRamp`, sobe rápido / desce devagar — anti liga-desliga no limiar).
  Camadas: base-pad + rítmica (nível) + tensão (chefe) + perigo (vida baixa),
  cada uma com seu `GainNode`. Dirigido por `src/data/audio.json`.
- **SFX em camadas** com ruído branco **pré-gerado uma vez** (Rng local, como o
  pool) + sub/osc; **variação** de pitch/ganho por disparo (Rng decorativo);
  **`SfxPolicy` pura** para polifonia/prioridade (despeja a voz de menor
  prioridade) e **ducking** da trilha em eventos grandes. Tudo em `audio.json`.
- **Haptics** (`HapticsService`): `navigator.vibrate` por cue (padrões no
  `effects.json`), no-op gracioso onde a API não existe (iOS Safari), throttle
  global, toggle persistido (`hairline.haptics` no `SaveService`). `graze` e
  `kill` comum **não vibram** (reserva o canal; bateria/dessensibilização).
- **Apresentação pura**: nada disso entra na sim/replay/`hashState()`.

## TD-21 — Cue `focusready` derivada de estado (P5-02-03) ✅
A prontidão do pulso vira cue testável: o `AudioSnapshot` ganha
`pulseReady = focus ≥ pulseCost` e `diffCues` emite `focusready` na borda de
subida (uma vez por cruzamento; gastar e recarregar reemite). Mantém a cena sem
lógica (padrão `AudioCues`), com regressão garantindo que cues existentes não
mudam. `Simulation` expõe `pulseCost`/`grazeMargin` (somente-leitura) para o HUD
e o anel de graze derivarem dos JSONs, sem duplicar números.

## TD-22 — Cosméticos como dados + loadout no perfil (P6-01-01) ✅
Cosméticos vivem em `src/data/cosmetics.json` (naves, cores de tiro, trilhas) e
o serviço **puro** `src/services/Cosmetics.ts` resolve desbloqueio e loadout.
Princípio: cosmético **nunca** afeta jogabilidade — a simulação não conhece o
módulo; replay/ranking/Diário ficam intocados por construção (nada em `src/sim/`
ou `src/systems/` muda). A seleção do jogador é persistida em `SaveService`
(`hairline.loadout.v1`, parcial); `getLoadout()` resolve com fallback aos
defaults se a escolha for inválida/bloqueada (nunca lança). Validação de
integridade no carregamento (ids únicos, 1 default por tipo, #hex, `shape` em
`ui/shapes`, preset não vazio, condição coerente).

Vocabulário de **condições de desbloqueio** (`default | achievement |
totalAtLeast`) e a superfície mínima de perfil (`CosmeticProfile =
{ achievements, totals }`) são definidos aqui como contrato canônico que
**P6-02-01** (conquistas) e **P6-03-01** (perfil/estatísticas) reusarão —
inversão de dependência deliberada, já que aquelas issues ainda não existem. A
validação cruzada catálogo⇄conquistas é **pluggável** (`validateCosmetics(cat,
knownAchievementIds?)`): sem registro, ignora a checagem; o catálogo inicial usa
só `default`/`totalAtLeast`, 100% validável hoje. `KNOWN_STATS` barra typos de
`stat`. A nave padrão ganhou a forma nomeada `arrow` em `ui/shapes`
(`isKnownShape`/`KNOWN_SHAPES`). **Pendente:** P6-01-02 (Hangar + aplicação
visual/sonora do loadout em jogo).

## TD-23 — Conquistas: condições declarativas + avaliação pós-run (P6-02-01) ✅
Conquistas são **conteúdo** (`src/data/achievements.json`) avaliado por um motor
**puro** (`src/services/Achievements.ts`). Condições são tipos **enumerados**, sem
expressão/eval: `totalAtLeast` (total de perfil ≥ N), `runStat` (campo do
`RunSummary` com `gte`/`lte` e modo opcional), `bestAtLeast` (melhor por modo ≥ N)
e `winMode` (vencer num modo, `noDamage?` para "sem tomar dano"). O avaliador é
`(defs, profile, run, unlockedIds) => newIds` — determinístico, idempotente (já
desbloqueada não re-desbloqueia), ordem do JSON.

Avaliação é **pós-run**, no ponto canônico de fim de run (`ResultsScene`, junto do
`setBestScore`), nunca por tick — a simulação não conhece conquistas; sim/replay/
`hashState`/leaderboard ficam intactos. `recordAndUnlock(store, defs, run)`
registra a run nos totais e persiste os desbloqueios. IDs de conquista são
**contrato imutável** (cosméticos os referenciam; desbloqueada é histórico do
jogador — conquista removida do JSON permanece no perfil).

Como **P6-03-01** (perfil) ainda não existe, a superfície mínima foi definida
aqui e persistida no `SaveService`: totais (`totalRuns/Graze/Kills/Wins/Daily`),
melhor por modo (`endless/stage/bossrush/daily`) e o mapa de conquistas
(`{id: dataIso}`). `RunSummary` ganhou `livesLost` (derivado de
`GameState.startLives − lives`, constante fora do `hashState`) para "vencer sem
dano". P6-03-01 assume/expande esse perfil; P6-02-02 (toasts no Results +
galeria) consome `newlyUnlockedIds`/o mapa. **Pendente:** P6-02-02.

## Decisões em aberto (revisitar quando necessário)
- Formato compacto de replay (bitpacking de inputs) — hoje é array por tick.
- Atlas único de sprites vs `Graphics` — só se a performance exigir (Fase 5).
- Re-simulação de replay no servidor (anti-cheat v2).
