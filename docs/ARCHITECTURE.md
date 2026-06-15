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
  `AudioService` (**fachada** de áudio — P10-03: concentra o transversal
  [contexto Web Audio, master, **mute**, **ducking**, `SfxPolicy`, ruído
  pré-gerado, autoplay/gesto] e **delega** a síntese/trilha ao `AudioTheme`
  ativo; interface de consumo estável), `SaveService` (**perfil local**: recorde,
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
- **`src/services/audio/`** (sem Phaser, presentation-only — P10-03): **temas de
  áudio**. `AudioTheme.ts` é a **interface** do que varia por tema (`playCue`,
  `startMusic`/`setLayerTargets`/`stopMusic`, `setMusicPreset`), recebendo o
  `AudioBackend` transversal (ctx/master/musicGain/noiseBuffer) que a fachada
  `AudioService` provê. `SynthAudioTheme.ts` é a 1ª implementação = a síntese
  procedural neon atual **realocada** (blip/sweep/arp/noiseBurst, trilha em 4
  camadas, `MUSIC_PRESETS`). Um `SampleAudioTheme` futuro (P10-12) entra aqui sem
  tocar a fachada. O preset de trilha (cosmético `music`) é **por-tema**. Ver TD-29.
- **`src/data/`**: JSON de patterns/enemies/bosses/waves/**stages**/**ships** +
  difficulty/player/combat/**effects/audio**.
- **`src/render/`** (Phaser, presentation-only — P10-02): **temas de render**.
  `GameRenderer.ts` é a **interface** do desenho do gameplay (init/setHudPad/
  updateBackground/reactToCue/consumeFx/advanceFx/draw/destroy), modelada por
  **intenção** (desenhar a nave/inimigo em x,y na sua forma/cor), não por
  primitivas de `Graphics`, para comportar um `SpriteTheme` futuro (P10-09) sem
  reescrita. `VectorTheme.ts` é a 1ª implementação = o **neon vetorial atual**
  realocado (nave, inimigos, chefe, balas, tiros, partículas, anel de graze,
  barra de Foco, fundo estelar, fx do pulso + loadout cosmético). O tema só **lê**
  o estado autoritativo da sim e cria `Graphics`/pools no `init` (sem `new` no
  loop). A `GameScene` cria o tema e **delega** o desenho. Ver TD-28.
  `createRenderer.ts` (P10-04) resolve o `rendererId` do registro de temas para a
  implementação concreta — costura Phaser-side que mantém o registro dado puro.
- **`src/scenes/`** (Phaser): Boot, Preload, Menu, Game, Pause, Results. A
  `GameScene` é o **driver de apresentação** (loop, input, áudio, HUD textual,
  botões, anúncios de estágio e hit-stop) e **delega todo o desenho do mundo** ao
  `GameRenderer` ativo (P10-02). O hit-stop fica na cena (controla o loop): o tema
  consome os fx e devolve a duração; a cena aplica.
- **`src/ui/`**: `neonText`, `shapes` (polígonos), `hudLayout` (safe-areas),
  **`ParticlePool`** (partículas decorativas, sem Phaser) e **`HitStop`** (lógica
  pura do congelamento). Camada de **FX render-side** (P5): a `GameScene` lê o
  buffer `Simulation.fxEvents` (decorativo, fora do `hashState`) e dispara
  partículas/hit-stop; `services/MusicDirector` + `SfxPolicy` (puros) dirigem o
  áudio dinâmico; `services/HapticsService` faz a vibração.
- **Temas de apresentação (P10-04):** `config/themes` é o **registro único** —
  dado puro (sem Phaser/áudio, testável headless) que lista os temas (`id`,
  `label`, `rendererId`, `audioThemeId`, `assets`). `resolveTheme(id)` cai no
  default (`arcade`) para id ausente/desconhecido. As factories `render/
  createRenderer` e `services/audio/createAudioTheme` resolvem id→implementação.
  Tema é **estado do jogador** (chave `hairline.theme.v1` no `SaveService`,
  presentation-only, **fora da sim/replay/hash/Diário**). O `PreloadScene`
  carrega só `assets` do tema ativo (vetorial = nenhum); a `GameScene` resolve o
  tema no `create()` (renderer via `createRenderer`, áudio via
  `AudioService.useAudioTheme` — no-op se já ativo) sem lookup no loop. Ver TD-30.
- **`src/config/`**: `layout` (virtual 720×1280, 60Hz), `gameConfig`, `sceneKeys`,
  **`about`** (P6-06: fonte única de versão via `__APP_VERSION__` injetado por
  `define`, estúdio, URL do jogo, frase de share e links de doação) e
  **`controls`** (P10-01: lê `data/controls.json` — esquema/sensibilidade do
  toque). **Presentation-only:** `config/controls` **não** é importável por
  `src/sim` (o JSON fica fora de `content/index.ts`, que a sim importa); a
  sensibilidade nunca entra na sim/replay/hash. A cena resolve o alvo absoluto e
  só ele chega à `Simulation`. Ver TD-27.
- **Home (P6-06):** `ui/home` (modelo de layout puro, responsivo/safe-areas, com
  rodapé reservado), `ui/heroBackground` (geometria decorativa procedural via
  `Rng`) e `ui/socialLinks` (alvos de share puros + `openExternal`/`shareGame`
  defensivos). A `MenuScene` só desenha. Render-side puro — nada toca a sim. TD-26.
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
- Novo efeito visual → `render/` (tema ativo, ex.: `VectorTheme`); som →
  `services/AudioService` (nunca na sim).
- Novo modo → `GameMode` em `types.ts` + branch no tick + opção no Menu.
