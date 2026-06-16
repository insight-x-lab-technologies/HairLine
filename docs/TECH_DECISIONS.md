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

## TD-24 — Perfil local: totais + recordes + histórico, fora da simulação (P6-03) ✅
O **perfil** é estado do **jogador**, não do jogo: nunca entra em `src/sim/`,
replay ou `hashState()`. Persistido pelo `SaveService` (store injetável, fallback
em memória), em **chaves versionadas separadas** — não um blob único: totais
(`hairline.profile.totals.v1`), recordes por modo (`…best.v1`), conquistas
(`…achievements.v1`) e histórico (`…profile.history.v1`). A P6-03-01 especulava
um `hairline.profile` único, mas a P6-02-01 já entregou o modelo por-chave e o
`recordRun`; manter isso (não reescrever) é a menor implementação segura e cada
chave já é versionada e resiliente por si.

`recordRun(run: RunSummary)` é o **ponto canônico** de fim de run (`ResultsScene`):
acumula totais (monotônico), sobe recordes por modo (máximo) e empurra a run no
**anel de histórico** (mais recente primeiro, podado em **20** — teto fixo, perfil
nunca cresce sem limite). Run abandonada (sair no meio) **não conta** — só a
transição para Results grava.

**Política de corrupção = reset:** JSON inválido/array malformado ⇒ valor zerado
(`{}`/`[]`), nunca exceção; a gravação seguinte volta a funcionar. **Migração:** na
primeira leitura sem o bloco de recordes, o `bestScore` legado é importado para
`endless` (chave antiga intacta ⇒ rollback barato). `RunSummary` ganhou campos
**informativos opcionais** para o histórico (`durationTicks`, `dateIso`, `seed`) —
as conquistas não dependem deles, então não exigem `version` nova. Formatação é
**derivada, não armazenada** (`ui/stats`: `durationTicks` ⇒ mm:ss via `TICK_RATE_HZ`;
`dateIso` UTC ⇒ data local curta). A `StatsScene` é apresentação pura sobre isso.

## TD-25 — Classe de nave como config determinística de run (P6-04) ✅
**Contexto:** P6-04 ("naves com regras de jogo distintas, não mais fortes") não
tinha spec escrita — só a linha do ROADMAP. O agente registrou a ambiguidade em
`docs/issues/P6-04-01-naves-com-regras.md` e implementou a **menor fatia segura**.

**Decisão central:** ao contrário do cosmético (TD-22, só aparência), a classe
de nave muda a **jogabilidade**, logo é **entrada determinística** — não pode
ficar fora do hash/replay. `shipId` entra em `SimulationOptions`, é gravado no
`Replay`/`verifyReplay` e re-simulado pelo anti-cheat. As regras são
**multiplicadores puros** (`sim/Ships.ts`: `applyShipToPlayer/AutoFire/Combat`)
sobre as configs base, **compostos com os `mods`** do evento semanal (TD-… RunMods),
mais `livesDelta`. Dados em `ships.json`, validados no load (`validateShips`).

**Compatibilidade retroativa (regra de ouro):** a nave **default é identidade
pura** (multiplicadores 1, `livesDelta` 0) — `validateShips` *exige* isso. A
`Simulation` **só dobra o ordinal da nave no checksum quando ela não é a
default** (`mix(h,0)` não é no-op), então a baseline produz hash **byte-idêntico**
ao histórico ⇒ replays e o Diário já gravados continuam válidos. Duas classes
distintas têm linhagens de hash distintas por construção.

**Justiça do Diário:** classes diferentes = regras diferentes, o que quebraria a
comparação "mesma seed para todos". Por isso o **Diário força a nave default**
(no Menu); Endless/Estágios/Boss Rush/Evento Semanal usam a nave escolhida.
`shipId` inválido resolve para a default (`getShipOrDefault`) — id corrompido
nunca quebra a re-simulação; um id válido diferente do gravado muda o hash e
reprova o replay (anti-cheat). **Sem desbloqueio** (são sidegrades; o schema não
impede um `unlock` futuro). **Sem distinção visual por classe** (aparência segue
sendo cosmético) — fora de escopo. Balanceamento é tuning de JSON + teste manual.

## TD-26 — Home profissional: arte procedural, versão única e share por rede (P6-06) ✅
**Decisão central:** a "nova home profissional" (P6-06) é construída **dentro da
estética neon vetorial/procedural** — sem introduzir pipeline de assets raster
(contraria a `PRODUCT_VISION`; raster exigiria preload/otimização/PWA-cache e
abriria um TD próprio). O hero é o título em **camadas de glow** + fundo
procedural (`ui/heroBackground`, geometria determinística por `Rng` com seed do
relógio — decorativo, fora do `hashState`). Layout via **modelo puro** `ui/home`
(responsivo, safe-areas, rodapé reservado); a `MenuScene` só desenha.

**Versão = fonte única:** `__APP_VERSION__` é injetado no build a partir do
`package.json` via `define` em **vite.config.ts e vitest.config.ts** (espelhados,
para o teste enxergar a versão), exposto por `src/config/about.ts` com fallback
defensivo. `package.json` saiu de `0.0.0` para `0.1.0`.

**Compartilhar o JOGO (≠ ShareCard):** `ui/socialLinks` separa o **modelo puro**
(`shareTargets`: deep links com `encodeURIComponent`) do **efeito colateral**
(`openExternal`/`shareGame`, defensivos/SSR-safe). WhatsApp/Telegram/X têm intent
web confiável; **Instagram/TikTok não têm** intent web de texto/URL ⇒ caem na
**Web Share API** nativa (ótima no celular) com fallback de copiar o link e, por
último, abrir a URL do jogo. Links externos abrem com `noopener,noreferrer`.
URLs do jogo e de doação (Ko-fi / Buy Me a Coffee) centralizadas em `config/about`
(dados separados de código). Doação adianta P7-01 (monetização não-invasiva).

## TD-27 — Controle de toque relativo: sensibilidade NÃO entra na sim (P10-01) ✅
**Problema:** no celular o `InputService` emitia a posição **absoluta** do dedo e
a nave perseguia esse ponto ⇒ o dedo cobria a nave e a hitbox (não dava para ver
se estava desviando). **Decisão:** controle **relativo (offset/drag)** no toque —
no `pointerdown` ancora (não pula a nave para o dedo); no `pointermove` o alvo
acumula `+= delta × sensibilidade` (incremental a partir do alvo corrente, com
clamp ao mundo para o arraste de volta não "travar" contra a parede). Reancora a
cada novo toque e no `RESUME` (sem salto).

**Linha vermelha — determinismo:** a sensibilidade e o esquema são
**presentation-only** e **nunca** entram na sim, no `ReplayRecorder` ou no
`hashState()`. O `InputService` resolve o **alvo absoluto** e só esse `moveX/moveY`
chega à `Simulation` (contrato de `SimInput` inalterado). Logo replays/Diário
antigos seguem byte-idênticos e `verifyReplay` continua válido. O feel mora em
`src/data/controls.json`, lido por `src/config/controls.ts` (**não importável por
`src/sim`** — `content/index.ts` é importado pela sim, então o JSON de controle
fica fora do registro). O Foco reduz a sensibilidade (precisão), coerente com o
`focusSpeedFactor` da nave.

**Mouse:** permanece **absoluto** (cursor já deslocado; relativo pioraria o
desktop) — decisão explícita, coberta por teste. Toggle OFFSET×DIRETO no Menu,
persistido no `SaveService` (`hairline.controlScheme.v1`; ausente ⇒ default do
JSON). Aritmética de offset/âncora/Foco/clamp coberta em
`tests/InputService.dom.test.ts`; persistência em `tests/SaveService.test.ts`.

## TD-28 — Abstração de tema de render (`GameRenderer` + `VectorTheme`) (P10-02) ✅
**Problema:** a `GameScene` era um "objeto-deus" que misturava ciclo de vida +
input + áudio + **todo o desenho** do gameplay (nave, inimigos, chefe, balas,
tiros, partículas, anel de graze, barra de Foco, fundo, fx do pulso). Isso
impedia o objetivo da Fase 10: **temas de apresentação selecionáveis** (Arcade
vetorial × Polido sprite) sem tocar a simulação.

**Decisão:** extrair o desenho para uma **interface de tema de render** em
`src/render/` — `GameRenderer` (init/setHudPad/updateBackground/reactToCue/
consumeFx/advanceFx/draw/destroy). A `GameScene` passa a **delegar**: cria o tema
no `create()` e o invoca por frame; não desenha mais nada diretamente. A 1ª
implementação, **`VectorTheme`**, é o **neon vetorial atual apenas realocado**
(paridade visual 1:1, sem redesign — isso vem em P10-05/06/07).

**Contrato lê-estado (presentation-only).** O tema só **lê** o estado
autoritativo da `Simulation` (somente leitura) e cria `Graphics`/pools no `init`
(sem `new` no loop). Os métodos descrevem **a intenção** (desenhar a nave/inimigo
em x,y na sua forma/cor), **não** primitivas de `Graphics` (`fillCircle`), para
que o `SpriteTheme` futuro (P10-09) caiba sem reescrever o contrato. Nada do tema
entra em `hashState()`, replay, Diário ou ranking; aleatoriedade decorativa segue
no `Rng` (sem `Math.random`). Cosméticos (forma/cor da nave, cor do tiro) são
aplicados pelo tema; o preset de **trilha** (áudio) fica na cena.

**Linha vermelha — determinismo.** Refactor mecânico, presentation-only: a
`Simulation`, o `ReplayRecorder` e a ordem de tick não mudaram ⇒ replays/Diário
seguem byte-idênticos e `verifyReplay` continua válido (regressão verde em
`tests/Replay.test.ts`/`Simulation.test.ts`, 405 testes). O desenho não é
unit-testado (`TEST_STRATEGY.md`); paridade visual é conferência manual.

**Divisão de responsabilidades:** o **hit-stop** fica na cena (controla o
`loop.advance`) — o tema consome os `fxEvents` (partículas + micro-shake) e
**devolve** a duração de hit-stop; a cena a aplica. Shake/flash de câmera e o
"ping" do anel de graze (`reactToCue`) migraram para o tema; HUD textual, botões,
anúncios de estágio e a posição das safe-areas (`setHudPad`) ficam na cena.
`init`/`destroy` simétricos; pausar/retomar/resize seguem geridos pela cena. A
barra de Foco deriva a posição do botão de pulso do `hudPad` (não referencia o
GameObject). Detalhes: `docs/issues/P10-02-abstracao-tema-de-render.md`.

## TD-29 — Abstração de tema de áudio (`AudioTheme` + `SynthAudioTheme`) (P10-03) ✅
**Problema:** o `AudioService` era monolítico — misturava o **transversal**
(contexto Web Audio, master gain, mute persistido, ducking, `SfxPolicy`, ruído
pré-gerado, autoplay/gesto) com a **síntese** de cada cue e a construção/gestão
da trilha em camadas. Isso impedia o objetivo da Fase 10: **temas de áudio
selecionáveis** (synth procedural × samples, P10-12) sem tocar a simulação.

**Decisão:** extrair o que **varia por tema** para uma interface
`src/services/audio/AudioTheme.ts` — `playCue`, `startMusic`/`setLayerTargets`/
`stopMusic` e `setMusicPreset`. O `AudioService` vira **fachada**: mantém o
singleton `getAudio()`, o estado de mute/started/contexto e **delega** ao tema
ativo. A 1ª implementação, **`SynthAudioTheme`**, é a síntese procedural atual
(TD-09/TD-20) **apenas realocada** — **paridade audível 1:1**, sem redesign (a
melhoria "arcade" do synth é P10-08; o seletor/persistência é P10-04).

**O que é transversal × por-tema (linha de divisão).** Fica na **fachada** tudo
que não muda entre synth e samples: contexto/master, **mute** (persistido em
`hairline.muted`), **ducking** da trilha (opera no `musicGain`), `SfxPolicy`
(polifonia/prioridade/`pitchFactor`/`gainFactor`), o **buffer de ruído**
pré-gerado e a política de autoplay/gesto. Fica no **tema** o que varia: como
cada cue soa e como a trilha em camadas é construída/dirigida (incl. as ramps).
A fachada resolve mute + `SfxPolicy.request` **antes** de chamar `playCue` e
aplica `duckMusic` **depois** — o tema não vê mute nem decide ducking.

**`AudioBackend` (recursos emprestados).** Para o tema não gerir ciclo de vida,
a fachada passa um `AudioBackend = { ctx, master, musicGain, noiseBuffer }` a
cada operação. O tema só **usa** esses nodes (sintetiza neles); nunca os cria
nem destrói. `backend()` retorna `null` sem Web Audio / antes do gesto ⇒ no-op
silencioso de toda operação (robustez do jsdom/iOS preservada).

**Preset de trilha é por-tema.** O cosmético `music` (TD-22/P6-01-02) seleciona
um preset de **síntese**; logo `MUSIC_PRESETS` migrou para o `SynthAudioTheme` e
`setMusicPreset`/`previewMusic` delegam a ele. Regra documentada: cada tema
declara os seus presets — o synth tem os históricos (`default`/`pulse`); o tema
de samples (P10-12) definirá os seus. `setMusicPreset` segue funcionando na
fachada (não fica órfão).

**Linha vermelha — determinismo.** Refactor mecânico, presentation-only: a
`Simulation`, o `ReplayRecorder` e o `hashState()` não foram tocados — áudio
nunca entrou na sim. Replays/Diário/ranking seguem byte-idênticos. A síntese
não é unit-testada (`TEST_STRATEGY.md`): paridade **audível** é conferência
manual; o novo `tests/AudioService.dom.test.ts` cobre o **contrato da fachada**
(no-op sem Web Audio, mute persistido, delegação ao tema via spy, mute/ducking
centrais). `MusicDirector`/`SfxPolicy` (puros) seguem verdes sem alteração.

## TD-30 — Registro de temas + seleção/persistência/carga condicional (P10-04) ✅
**Problema:** P10-02/03 deram as abstrações (`GameRenderer`/`VectorTheme` e
`AudioTheme`/`SynthAudioTheme`), mas faltava a **costura**: como o jogador
escolhe um tema de apresentação, como isso persiste e como carregar **só** os
assets do tema ativo — sem hardcodar dois temas no seletor nem regredir o peso
de carga do tema vetorial (que não tem assets).

**Decisão:** uma **fonte única** — `src/config/themes.ts` — lista os temas
(`id`, `label`, `rendererId`, `audioThemeId`, `assets`). É **dado puro** (sem
Phaser/Web Audio), logo testável headless; a resolução id→implementação fica em
duas factories finas — `render/createRenderer` (Phaser) e
`services/audio/createAudioTheme` (áudio). Assim o seletor, o `PreloadScene` e a
`GameScene` iteram **um** registro e o tema "polido" (Bloco C) aparece sozinho ao
se registrar, sem editar consumidor algum.

**Persistência (estado do jogador, não do jogo).** Chave `hairline.theme.v1` no
`SaveService`, leitura **burra** (id cru ou `null`): a validade é do registro
(`resolveTheme` cai no default `arcade` para ausente/desconhecido/corrompido) —
mesmo padrão da classe de nave (TD-…/P6-04) e do esquema de controle (P10-01).

**Carga condicional.** O `PreloadScene` carrega **só** `resolveTheme(...).assets`
do tema ativo; vetorial = lista vazia ⇒ nada novo (sem requests de "polido").

**Resolução única, sem lookup no loop.** A `GameScene` resolve o tema no
`create()`: `createRenderer(rendererId)` instancia o `GameRenderer` e
`AudioService.useAudioTheme(audioThemeId)` troca o tema de áudio — **no-op**
quando já é o ativo (preserva a trilha do menu; só ao trocar de fato para a
trilha e substitui o backend de síntese). O seletor do menu aplica o áudio na
hora; o render passa a valer na próxima run.

**Linha vermelha — determinismo.** Tema é presentation-only: nunca entra em
`SimulationOptions`, `ReplayRecorder` ou `hashState()`. Mesma seed/inputs com
qualquer tema ⇒ mesmo hash/replay/ranking. Testes headless cobrem o registro
(lista/atual/fallback) e a persistência (ida-e-volta, vazio ⇒ default); carga
condicional e feel são conferência manual (`TEST_STRATEGY.md`). Ver TD-28/TD-29.

## TD-31 — Tema "Polido" por sprites com fallback vetorial + pipeline/PWA por tema (P10-09) ✅
**Problema:** o eixo visual só vira "dois temas" de verdade quando existe um
renderer por **sprites** (arte raster) sem deixar o jogo inconsistente enquanto a
arte entra incrementalmente (P10-10/11). E os assets do tema "Polido" não podem
inchar o bundle/PWA do **arcade** (default, sem assets).

**Decisão — herança, não composição.** `SpriteTheme extends VectorTheme`: por
padrão o tema **é** o vetorial (fallback total). Só sobrescreve os *seams* por
entidade (`drawShip`/`drawEnemies`/`drawBoss`, mais `makeShip`) — para isso o
`VectorTheme` extraiu esses métodos e abriu `protected` (campos `scene`/`ship`/
`engine`, helpers `colorOf`/`lightenColor`). É a **menor abordagem segura** para
"cai no vetorial onde faltar asset" sem duplicar desenho. **Balas e anel de graze
NÃO são seams** ⇒ herdam o pai e permanecem **vetoriais neon** nos dois temas
(legibilidade > beleza, req 3).

**Resolução asset×fallback é pura.** `render/spriteFallback.ts` (sem Phaser):
convenção de chave `spr-<categoria>` e `resolveSpriteSource(available, category)`
dizem "usar sprite ou cair no vetorial". Testável headless; o runtime alimenta
`available` a partir do cache de texturas do Phaser (`textures.exists`). Registrar
a chave de uma categoria a habilita; até lá, vetorial. Hoje só **nave** tem
placeholder ⇒ prova do fallback parcial (nave sprite, inimigos/chefe vetoriais).

**Pooling (TD-07).** `render/SpritePool.ts` pré-aloca sprites de inimigos
(`begin`/`next`/`end` por frame; ociosos invisíveis, nunca destruídos) — **sem
`new` no loop**. Nave e chefe são sprites únicos criados no `init`. Pool saturado
⇒ excedente cai no vetorial (não some inimigo). Cor do cosmético via `setTint`
(Phaser 4: `setTintFill` é no-op — CLAUDE.md). As **mecânicas** do chefe (barra de
vida, escudo, partes, telegraph, núcleo) seguem desenhadas pelo vetorial do pai.

**Pipeline/PWA por tema.** O manifesto do tema (TD-30) lista os assets; o
`PreloadScene` carrega **só** os do tema ativo. O `vite-plugin-pwa` exclui
`sprites/**` do precache (`globIgnores`): o asset vai para `dist/` e é buscado
**sob demanda** quando o "Polido" está ativo — o arcade não baixa/precacheia nada
do "Polido". Conferido no build (precache não lista `sprites/`).

**Linha vermelha — determinismo.** Como TD-28/TD-30, o tema é presentation-only:
não entra em `SimulationOptions`/`ReplayRecorder`/`hashState()`. Trocar de tema
não muda hash/replay/ranking. Cobertura headless: `spriteFallback` (seleção
asset×fallback) + `themes` (registro do "polido"). Pool/integração/FPS/PWA são
conferência manual (`TEST_STRATEGY.md`). Fecha a "Decisão em aberto" de atlas vs
`Graphics`: **convivem** — sprite por cima, vetorial como base/fallback.

## TD-32 — Áudio por samples (`SampleAudioTheme`) com fallback synth por cue (P10-12) ✅
**Problema:** o eixo sonoro só vira "dois temas" quando existe reprodução por
**samples** (buffers) atrás de `play(cue)` — par sonoro do "Polido" (TD-31) — sem
quebrar a fachada (TD-29), sem regredir o arcade e tolerando que o conteúdo
(SFX/faixas finais) entre incrementalmente.

**Decisão — híbrido com fallback, não substituição.** `SampleAudioTheme`
implementa `AudioTheme` e mantém um `SynthAudioTheme` interno como **fallback por
cue e por trilha** (espelha `SpriteTheme`→vetorial, TD-31): onde há buffer no
`sampleBank`, toca por `AudioBufferSource`; onde falta, delega ao synth. É a menor
abordagem segura para "cai no synth onde faltar conteúdo" — nada quebra sem
samples (req 4) e dropar um arquivo ativa o sample sem mudar código.

**O transversal continua na fachada (TD-29).** Mute/ducking/`SfxPolicy`/gesto/
contexto seguem no `AudioService`; o tema só recebe `backend` + `pitchFactor`/
`gainFactor` por disparo. SFX = source descartável (`createBufferSource` por
disparo, `playbackRate=pitch`, ganho por disparo; nunca reusar source — iOS/Safari).

**Camadas do `MusicDirector` → cross-fade de 2 faixas.** A dinâmica em 4 camadas
(base/rítmica/tensão/perigo) é mapeada para um cross-fade entre `calm` e `intense`
por `sampleManifest.trackMix(LayerGains)` (puro/testável): `base=0`⇒silêncio
(game over); tensão/perigo⇒intensa; rítmica⇒meio-termo; só base⇒calma. **Trade-off
aceito:** faixas pré-mixadas perdem a granularidade das 4 camadas, mas evitam
multiplicar peso/conteúdo; `setLayerTargets` aplica os mesmos ramps (in/out) do
synth. Faixas por preset (`aud-music-<preset>-<faixa>`) ⇒ menu/gameplay têm faixas
próprias via preset.

**Ponte Phaser→tema.** `sampleManifest` (sem Phaser) fixa as chaves (`aud-sfx-*`,
`aud-music-*`) que o manifesto do tema (TD-30) registra, o `PreloadScene`
decodifica (Phaser → `AudioBuffer` no cache, independente de contexto) e o
`sampleBank` (singleton) entrega ao tema. Vazio ⇒ tudo cai no synth.

**Peso/PWA (como TD-31).** Áudio só no tema ativo; `audio/**` fora do precache
(`globIgnores` + não casa `globPatterns`) — o arcade não baixa nada. Placeholders
(`scripts/gen-placeholder-audio.mjs`, WAV curtos) **validam o fluxo**; o conteúdo
final substitui os mesmos arquivos/chaves. Conferido no build (precache sem `.wav`).

**Linha vermelha — determinismo.** Presentation-only (TD-28/29/30/31): nada entra
em sim/replay/`hashState`. Cobertura headless: `sampleManifest` (mapeamento puro) +
`SampleAudioTheme.dom` (roteamento sample/synth, no-op sem samples) + `themes`
(manifesto de áudio do "polido"). Qualidade/latência/peso são conferência manual.

## TD-33 — Cruzamento tema × cosméticos: variante de arte curada + fallback (P10-13) ✅
**Problema:** cosméticos (P6-01) e tema (P10-04) são eixos independentes que se
cruzam. No vetorial a nave tem **forma + cor**; no sprite "forma/cor" não mapeiam
1:1 para arte. Sem uma regra, ou some a identidade do loadout no Polido, ou se
exige arte para **cada** cosmético × tema × peça (explosão combinatória). Além
disso o preview do Hangar precisa ser honesto **por tema**.

**Decisão — cor sempre herda; forma cai numa cadeia de fallback clara.** A regra
fica numa função **pura** (`resolveShipSprite` em `render/spriteFallback`, testável
headless): **(1)** variante curada `spr-ship-<idDoCosmético>` se registrada →
**(2)** arte default `spr-ship` tingida pela cor → **(3)** silhueta vetorial (com
acento de forma). A **cor** herda sempre (preenchimento no vetorial; `setTint` no
sprite, Phaser 4). Só a **silhueta** depende de haver variante curada — sem ela,
todas as naves usam a default tingida. Assim arte é exigida **só** para os
cosméticos que se escolhe curar, nunca para a matriz inteira. É a menor abordagem
segura: o `SpriteTheme` herda o vetorial (TD-31) e já tinge a nave; aqui só
escolhe a textura no `init` (`makeShip` herdado a lê — sem `new` no loop).

**Balas e anel de graze: sempre neon vetorial** nos dois temas (não são *seams* —
TD-31). Cor de **tiro/faíscas** herda nos dois temas (já valia; tiro é vetorial).
Trilha (`music`) é por-tema (síntese no Arcade, samples no Polido — TD-32).

**Preview do Hangar consciente do tema.** `hangarPreview` (puro, `ui/hangar.ts`)
decide sprite×vetorial pela **disponibilidade da textura** — e como o
`PreloadScene` só carrega o tema ativo (TD-30), isso reflete o tema sem o Hangar
conhecer o id do tema. `ThemeCosmetics.shipId` foi adicionado para o sprite
resolver a variante (o vetorial o ignora). Nenhuma arte curada existe hoje ⇒ o
Polido exercita o caminho default-tingida.

**Linha vermelha — determinismo.** Presentation-only como TD-22/28/30/31: o
`shipId` cosmético resolve **render**, nunca entra em sim/replay/`hashState`/
ranking (≠ classe de nave, TD-25). Cobertura headless: `spriteFallback`
(resolução nave×variante×fallback) + `hangar` (modelo de preview por tema) +
regressão de determinismo reexecutada. Aplicação visual é conferência manual.

## Decisões em aberto (revisitar quando necessário)
- Formato compacto de replay (bitpacking de inputs) — hoje é array por tick.
- ~~Atlas único de sprites vs `Graphics`~~ — resolvido em TD-31: convivem (sprite
  sobre fallback vetorial). Atlas único (vs imagens soltas) decide-se em P10-10/11.
- Re-simulação de replay no servidor (anti-cheat v2).
