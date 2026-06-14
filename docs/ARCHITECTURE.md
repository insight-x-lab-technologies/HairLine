# ARCHITECTURE — HAIRLINE

> Doc de memória: como o código é organizado e por quê. Base original:
> `02-arquitetura-de-referencia.md`. Aqui reflete o estado **atual**.

## Princípio mestre: simulação determinística headless

Toda a **lógica de jogo** vive em `src/sim/` e `src/systems/` e roda **sem
Phaser** (headless, testável). O render (`src/scenes/`) só **lê** o estado e
desenha. Mesma `seed` + `mode` + `mods` + inputs ⇒ mesmo `hashState()` em
qualquer máquina (base do Diário e do anti-cheat por re-simulação).

```
Input (DOM) ──InputService──> SimInput ──> Simulation.tick() [60Hz fixo]
                                              │
        FixedStepLoop (acumulador)  ──────────┘   (separa lógica do FPS)
                                              │
Scenes (Phaser) <── leem estado autoritativo ┘  (pools, player, boss, state)
```

## Camadas e pastas

- **`src/sim/`** (headless, sem Phaser):
  - `Simulation.ts` — orquestra o tick (spawn → nave/tiro → inimigos/padrões →
    chefe → integra balas → pulso → graze → colisões → timers → hash).
  - `FixedStepLoop.ts` — acumulador de tempo → N ticks fixos (anti espiral-morte).
  - `Player.ts`, `AutoFire.ts`, `GameState.ts` (vidas/foco/score/kills/won).
  - `Replay.ts` — `ReplayRecorder` + `verifyReplay` (re-simula e confere hash/score).
  - `Ships.ts` (P6-04) — classes de nave com **regras de jogo** (multiplicadores
    puros sobre player/autofire/combat + `livesDelta`) e `validateShips`. A
    classe é **config determinística da run** (não cosmético): `shipId` entra em
    `SimulationOptions`, no replay e na linhagem do hash; a **default é
    identidade** (byte-idêntico ao histórico). O Diário força a default.
  - `types.ts` — `SimInput`, `SimulationOptions` (inclui `shipId`), `GameMode`, `RunMods`.
- **`src/systems/`** (lógica pura, sem Phaser):
  - Spawn: `SpawnSystem` (onda), `EndlessSpawnSystem` (procedural + formações),
    `DifficultySystem`, `Formations`.
  - Bala/combate: `PatternSystem` (emitters→balas), `CollisionSystem`,
    `GrazeSystem`, `ReflectPulse`.
  - Chefes: `BossSystem`, `BossDirector` (Endless), `BossRushDirector`.
  - Estágio: `StageDirector` (modo `stage`) — executa seções onda→chefe em
    sequência; expõe `stageProgress` para o render (P4-04b).
  - Regras/eventos: `Modifiers` (semanal), `AudioCues` (estado→sons).
- **`src/entities/`**: `BulletPool` (com aceleração), `EnemyPool` — **pools
  pré-alocados**, nunca `new` no loop.
- **`src/services/`**: `Rng` (mulberry32), `InputService`, `SafeArea`,
  `AudioService` (Web Audio procedural), `SaveService` (**perfil local**: recorde,
  totais, recordes por modo, conquistas e histórico de runs), `PlayerIdentity`,
  `DailySeed`, `ShareCard`, `ShareImage`, `LeaderboardService` (Local + Remote).
  - **Perfil local (P6-03):** estado do **jogador**, não do jogo — nunca entra na
    `sim`, no replay ou no `hashState()`. Chaves versionadas separadas; gravado uma
    vez por fim de run (`recordRun`, ponto canônico em Results). Contém totais,
    recordes por modo, conquistas e o anel das últimas 20 runs; **nunca** contém
    estado de simulação, inputs ou nada que afete determinismo/ranking. Save
    corrompido ⇒ reset limpo (nunca quebra o jogo). Ver TD-24.
- **`src/content/`**: `index.ts` (registro:
  getPattern/getEnemyDef/getBoss/getWave/getStage/**getEffects/getAudioConfig** +
  listas de ids, validação de bosses/estágios/**effects/audio** no load) e
  `types.ts`. Único ponto de `cast` dos JSON.
- **`src/data/`**: JSON de patterns/enemies/bosses/waves/**stages**/**ships** +
  difficulty/player/combat/**effects/audio**.
- **`src/scenes/`** (Phaser): Boot, Preload, Menu, Game, Pause, Results.
- **`src/ui/`**: `neonText`, `shapes` (polígonos), `hudLayout` (safe-areas),
  **`ParticlePool`** (partículas decorativas, sem Phaser) e **`HitStop`** (lógica
  pura do congelamento). Camada de **FX render-side** (P5): a `GameScene` lê o
  buffer `Simulation.fxEvents` (decorativo, fora do `hashState`) e dispara
  partículas/hit-stop; `services/MusicDirector` + `SfxPolicy` (puros) dirigem o
  áudio dinâmico; `services/HapticsService` faz a vibração.
- **`src/config/`**: `layout` (virtual 720×1280, 60Hz), `gameConfig`, `sceneKeys`.
- **`worker/`**: Cloudflare Worker (KV) do ranking — **não deployado**.

## Determinismo: regras de ouro

- Aleatoriedade só via `Rng` (ESLint barra `Math.random`). Decorativo (estrelas)
  usa `Rng` com seed do relógio.
- Cadências em **ticks**, nunca em segundos crus.
- Ordem de update fixa em `Simulation.tick`. `hashState()` = FNV-1a sobre o estado.
- Render pode usar `delta`/tempo de parede livremente (não afeta a lógica).
- `RunMods` fazem parte do estado determinístico → entram no replay e na verificação.

## Fluxo de dados (modos)

`MenuScene` monta `GameSceneData` (seed, mode, daily/dayKey, mods, modLabels) →
`GameScene.create` cria `Simulation` + `ReplayRecorder` → loop grava input e
ticka → game over/vitória → `ResultsScene` (recorde, ranking, share, verify).

## Backend (ranking)

`Leaderboard` é **assíncrono** (`submit`/`top`). `LocalLeaderboard`
(localStorage) é o default; `RemoteLeaderboard` (fetch) ativa com
`VITE_LEADERBOARD_URL`. Worker valida plausibilidade + dedupe por id; re-sim no
servidor é evolução futura (a sim é portável). Ver `docs/leaderboard-backend.md`.

## Build / qualidade / scripts

Vite (build+PWA), Vitest (headless + jsdom p/ DOM), tsc estrito
(`exactOptionalPropertyTypes`), ESLint flat (regra anti-`Math.random`), Prettier.
`scripts/run.sh`/`stop.sh` sobem o dev na 8080 com `--host` (acesso Tailscale),
não-bloqueante. CI em `.github/workflows/`.

## Onde adicionar coisas (mapa rápido)

- Novo padrão/inimigo/chefe/onda/**estágio** → JSON em `src/data/` + registrar em
  `content/index.ts`.
- Nova mecânica de jogo → `src/systems/*` (puro) + plugar em `Simulation.tick`.
- Novo efeito visual/som → `scenes/GameScene` ou `services/AudioService` (nunca na sim).
- Novo modo → `GameMode` em `types.ts` + branch no tick + opção no Menu.
