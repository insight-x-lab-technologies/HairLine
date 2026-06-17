# ROADMAP — HAIRLINE (rastreador canônico com IDs)

> **Este é o rastreador VIVO do roadmap, com IDs estáveis por item.** Use os IDs
> (`P4-04`, `P5-02`, …) para abrir sessões de desenvolvimento focadas em uma
> funcionalidade. O documento `04-roadmap.md` mantém a narrativa/visão original;
> aqui ficam status e escopo curto de cada item.
>
> **Status:** ✅ feito · 🟡 parcial · ⬜ a fazer · ⏸️ adiado de propósito.
> **Atualizado:** 2026-06 (Fase 4 em andamento; Fase 10 — temas visuais/áudio —
> **código dos Blocos A/B/C entregue**; **P10-10** = arte raster do tema "Polido"
> (nave/inimigos/chefe) integrada e finalizada).
> **Convenção de ID:** `P{fase}-{nn}`. IDs nunca são reaproveitados.

## Resumo de progresso

| Fase | Tema | Status |
|---|---|---|
| 0 | Fundação técnica | ✅ completa |
| 1 | MVP jogável | ✅ completa |
| 2 | Loop completo + 1º lançamento | ✅ exceto lançar (⏸️ P2-06) |
| 3 | Desafio Diário + ranking | ✅ exceto deploy backend (⏸️ P3-03b) |
| 4 | Profundidade de conteúdo | 🟡 em andamento |
| 5 | Polimento, "juice" e áudio | 🟡 P5-01/02/04 feitas; falta P5-05/06 |
| 6–9+ | Meta-jogo → visão | ⬜ a fazer |
| 10 | Repaginação visual & áudio: temas selecionáveis | ⬜ planejada (priorizada) |

Contagem atual de conteúdo: **9 padrões de bala, 7 inimigos, 5 chefes, 5 ondas
autorais, 3 estágios curados, 3 classes de nave**.
Testes: **440 passando** (58 arquivos). Ver `TEST_STRATEGY.md`.

---

## FASE 0 — Fundação técnica ✅

- ✅ **P0-01** Repo + Vite + TypeScript + Phaser 4 + ESLint/Prettier.
- ✅ **P0-02** `CLAUDE.md` e docs 01–04 no repo.
- ✅ **P0-03** Cenas vazias encadeadas Boot→Preload→Menu→Game→Results.
- ✅ **P0-04** Scale Manager, resolução virtual retrato responsiva.
- ✅ **P0-05** `Rng` semeável (mulberry32) + teste de determinismo.
- ✅ **P0-06** Fixed timestep headless (`FixedStepLoop` + `Simulation`).
- ✅ **P0-07** CI verde (lint+typecheck+test) — `.github/workflows/ci.yml`.
- 🟡 **P0-08** Deploy "hello world" PWA — pipeline pronto (`deploy.yml`,
  `wrangler.toml`, Cloudflare Pages), **não disparado** (sem conta). Ver ⏸️ P2-06.

---

## FASE 1 — MVP jogável ✅

- ✅ **P1-01** Nave: arrastar, tiro automático, hitbox pequena, modo Foco.
- ✅ **P1-02** `BulletPool` + `EnemyPool` (pooling real, sem `new` no loop).
- ✅ **P1-03** Padrões de bala em JSON (`src/data/patterns`).
- ✅ **P1-04** `SpawnSystem` lê onda de JSON (`wave-001`).
- ✅ **P1-05** `CollisionSystem` por hitbox (bala↔nave, tiro↔inimigo).
- ✅ **P1-06** `GrazeSystem` — mecânica central (proximidade carrega Foco).
- ✅ **P1-07** Pulso refletor (`ReflectPulse`): gasta Foco, limpa balas próximas.
- ✅ **P1-08** Chefe com 2 fases (`BossSystem`).
- ✅ **P1-09** Pontuação (em `GameState`: score, graze, kills).
- ✅ **P1-10** Tela de resultado (`ResultsScene`).
- ✅ **P1-11** Game over / reiniciar.

---

## FASE 2 — Loop completo + 1º lançamento

- ✅ **P2-01** Modo Endless + `DifficultySystem` (escala densidade/velocidade/variedade).
- ✅ **P2-02** Biblioteca-base de conteúdo (≥5 padrões, ≥4 inimigos, ≥2 chefes).
- ✅ **P2-03** Menu, tutorial mínimo (dica que esmaece), pausa (`PauseScene`).
- ✅ **P2-04** HUD responsivo (safe-areas, `hudLayout`).
- ✅ **P2-05** Áudio básico (`AudioService` procedural: SFX + trilha; `AudioCues`).
- ⏸️ **P2-06** **Lançar** (itch.io/domínio). Adiado por decisão do usuário
   ("ser mais maduro antes"). Deploy preparado, falta conta/divulgação.

---

## FASE 3 — Desafio Diário + ranking ✅ (núcleo)

- ✅ **P3-01** Geração de cenário pela seed do dia (`DailySeed`, UTC).
- ✅ **P3-02** `ReplayRecorder` (grava inputs + seed + mods).
- ✅ **P3-03a** `LeaderboardService` (Local + cliente `RemoteLeaderboard`).
- ⏸️ **P3-03b** Backend remoto **implantado** (Cloudflare Worker + KV em `worker/`,
   pronto, **não deployado** — depende de conta). Ver `docs/leaderboard-backend.md`.
- ✅ **P3-04** Ranking diário + identidade anônima leve (`PlayerIdentity`).
- ✅ **P3-05** Resultado compartilhável: texto (`ShareCard`) + imagem PNG (`ShareImage`).
- ✅ **P3-06** Anti-cheat v1: verificação por re-simulação de replay (`verifyReplay`).
- ⬜ **P3-07** Medir retenção D1/D7 (pós-lançamento; depende de P2-06 + analytics).

---

## FASE 4 — Profundidade de conteúdo 🟡

- ✅ **P4-01** Sintaxe de padrões parametrizável: emitters com `angleStepDeg`,
   `accel`, `speedStep`, `radiusStep`, `aimOffsetDeg` (`PatternSystem`); balas com
   aceleração (`BulletPool`). Biblioteca em 9 padrões.
- ✅ **P4-02** Mais chefes com fases/mecânicas próprias. Fases data-driven
   (N fases, thresholds em JSON) + escudo, adds, partes destrutíveis e teleporte
   por fase. 5 chefes (warden=escudo, spinner=teleporte, gunner=adds,
   vortex=partes, **colossus**=3 fases compondo tudo). Concluído via **P4-02b**.
- ✅ **P4-03** Variedade de inimigos (7) + **formações** (`Formations`:
   line/vee/column, dirigidas por dados no Endless).
- ✅ **P4-04** Modos: **boss rush** ✅ (`BossRushDirector`, mode `bossrush`) +
   **estágios curados** ✅ (sequência autoral onda→onda→chefe, mode `stage`). → **P4-04b**.
- ✅ **P4-05** Eventos/modificadores semanais (`Modifiers`: seed ISO da semana,
   `RunMods` aplicados à Simulation e ao replay; opção "Evento Semanal" no Menu).
- ⬜ **P4-06** **Ferramenta interna de autoria de padrões** (editor de bullet
   patterns) — preview ao vivo, exportar JSON para `src/data/patterns`.

### Itens derivados da Fase 4
- ✅ **P4-02b** Mecânicas próprias de chefe (escudo, adds, partes, teleporte,
  fases ≥3). 6 issues SDD (`docs/issues/P4-02b-*.md`) implementadas: schema de
  fases data-driven, escudo, adds, partes destrutíveis, teleporte e o 5º chefe
  (colossus) compondo as mecânicas. Ver TD-17 e `tests/BossMechanics.test.ts` /
  `tests/BossColossus.test.ts`.
- ✅ **P4-04b** Estágios curados (formato de "stage" autoral + seletor de fases).
  4 issues SDD (`docs/issues/P4-04b-*.md`) implementadas: (01) `StageDef` +
  `StageDirector`, modo `stage` substitui `campaign`, `stageId` no replay; (02)
  `stageProgress` + anúncios "ONDA n/m"/"CHEFE" + indicador no HUD + sting de
  chefe; (03) 5 ondas autorais + 3 estágios curados (warden/spinner/gunner,
  curva fácil→difícil, `stage-001` tutorial); (04) seletor no Menu com
  desbloqueio progressivo + recordes locais por estágio (`SaveService`). Ver
  TD-18, `tests/StageDirector.test.ts`, `tests/stages.test.ts`,
  `tests/stage-progress.test.ts`.

---

## FASE 5 — Polimento, "juice" e áudio ⬜

- ✅ **P5-01** Screen shake / flash / hit-stop / partículas. Concluído via 4
   issues SDD (`docs/issues/P5-01-*.md`): `effects.json` + `getEffects()`,
   `ParticlePool` decorativo, buffer `fxEvents` (impacto/kill/dano) e hit-stop no
   driver do loop. Ver TD-19, `tests/{ParticlePool,FxEvents,HitStop,effects}.test.ts`.
- ✅ **P5-02** Feedback claro de graze (o risco precisa ser *sentido*). Concluído
   via 3 issues SDD (`docs/issues/P5-02-*.md`): faísca + bala grazeada destacada,
   anel de graze na nave (deriva dos JSONs) com ping, barra de Foco no HUD +
   estado "pulso pronto" + cue `focusready`. Ver TD-21.
- ✅/🟡 **P5-03** Clareza visual das balas (glow + núcleo). Revisar legibilidade
   em densidade alta e daltonismo (ver P5-05).
- ✅ **P5-04** Trilha dinâmica; SFX em camadas; haptics no celular. Concluído via
   3 issues SDD (`docs/issues/P5-04-*.md`): `MusicDirector` puro + camadas de
   trilha (`audio.json`), `SfxPolicy` + ruído/variação/ducking, `HapticsService`
   com toggle persistido. Ver TD-20, `tests/{MusicDirector,SfxPolicy,HapticsService.dom}.test.ts`.
- ⬜ **P5-05** Acessibilidade: daltonismo, redução de flashes, alto contraste.
- ⬜ **P5-06** Otimização de performance em celular fraco (orçamento de frame,
   modo de qualidade alto/baixo).

---

## FASE 6 — Progressão & meta-jogo ⬜

- ✅ **P6-01** Desbloqueáveis cosméticos (naves, cores de bala, trilhas).
  **P6-01-01 ✅** (fundação de dados): `cosmetics.json` + serviço puro
  `Cosmetics` (desbloqueio `default`/`achievement`/`totalAtLeast`, loadout com
  fallback), `loadout` persistido no `SaveService`, validação de integridade no
  carregamento, forma `arrow` em `ui/shapes`. Vocabulário de condições + perfil
  mínimo definidos aqui como contrato canônico para P6-02/P6-03 (validação
  cruzada com conquistas é pluggável). Ver TD-22, `tests/Cosmetics.test.ts`.
  **P6-01-02 ✅** (Hangar + aplicação visual/sonora em jogo): modelo de exibição
  puro `ui/hangar.ts` (grupos NAVE/TIRO/TRILHA, acesa/apagada/selecionada,
  condição de fonte única; ponte `cosmeticProfileFrom` injeta `bestScore` nos
  totais), `HangarScene` acessível do Menu com preview honesto e amostra de
  trilha por preset, aplicação no `create()` da `GameScene` (forma/cor da nave,
  cor de tiro/faíscas, preset de trilha via `AudioService.setMusicPreset`).
  Determinismo coberto por regressão (`tests/hangar.test.ts`). Falta apenas a
  verificação manual com `npm run dev`.
- ✅ **P6-02** Conquistas / desafios.
  **P6-02-01 ✅** (motor): `achievements.json` + avaliador puro pós-run
  (`Achievements`: condições `totalAtLeast`/`runStat`/`bestAtLeast`/`winMode`,
  idempotente), perfil mínimo (totais + best por modo + mapa `{id:dataIso}`) no
  `SaveService`, `recordAndUnlock` integrado ao fim de run (`ResultsScene`),
  `RunSummary` com `livesLost` (via `GameState.startLives`). 10 conquistas
  iniciais. Ver TD-23, `tests/Achievements.test.ts`. **P6-02-02 ✅** (UI):
  toasts sequenciados no topo da `ResultsScene` (cue `achievement`) + galeria
  `AchievementsScene` (acessível do Menu; acesas com data, bloqueadas com a
  `desc`, contador `X/Y`). Modelo puro `src/ui/achievements.ts`,
  `tests/achievements-ui.test.ts`. Issues: `docs/issues/P6-02-*.md`.
- ✅ **P6-03** Estatísticas pessoais e histórico de runs.
  **P6-03-01 ✅** (perfil): `recordRun` no `SaveService` consolidado como ponto
  canônico de fim de run — acumula totais (monotônico) e recordes por modo,
  migra o `bestScore` legado para `endless` (chave antiga intacta), corrupção ⇒
  reset limpo. `RunSummary` ganhou campos informativos opcionais (`durationTicks`,
  `dateIso`, `seed`). **Decisão:** mantido o modelo de chaves versionadas
  separadas já entregue na P6-02-01 (não o `hairline.profile` único que a issue
  especulava) — menor mudança segura, sem reescrever a integração de conquistas.
  **P6-03-02 ✅** (histórico + tela): anel das **20** últimas runs no perfil
  (insere no topo, poda no teto; agregados preservados), nova `StatsScene`
  (acessível do Menu) com totais, recordes por modo e histórico recente; estado
  vazio amigável. Helpers puros `src/ui/stats.ts` (ticks⇒mm:ss, data curta).
  Ver TD-24, `tests/SaveService.test.ts`, `tests/stats-ui.test.ts`. Issues:
  `docs/issues/P6-03-*.md`.
- ✅ **P6-04** Naves com regras de jogo distintas (diferentes, não mais fortes).
  **P6-04-01 ✅** (classes de nave): `ships.json` + módulo puro `sim/Ships.ts`
  (regras = multiplicadores sobre player/autofire/combat + `livesDelta`;
  `applyShipToPlayer/AutoFire/Combat`, `validateShips`). A classe é **entrada
  determinística**: `SimulationOptions.shipId`, gravada no `Replay`/`verifyReplay`
  e dobrada na linhagem do `hashState()` (só a nave **não-default**; a default é
  **identidade** ⇒ replays/Diário antigos byte-idênticos). 3 naves (vanguard=
  baseline, glaive=cadência alta/2 vidas/graze curto, bulwark=4 vidas/graze
  largo/lenta). Sem desbloqueio (sidegrades). Seleção persistida (`SaveService`)
  + seletor no Menu; **o Diário força a default** (mesma seed E mesmas regras
  para todos). **Decisão:** sem spec prévia — escopo registrado em
  `docs/issues/P6-04-01-naves-com-regras.md`; balanceamento é tuning de JSON +
  teste manual. Ver TD-25, `tests/Ships.test.ts`,
  `tests/{Simulation,Replay,content}.test.ts`.
- ⬜ **P6-05** Curva de maestria visível (rankings de habilidade).
- ✅ **P6-06** Nova home profissional. 4 issues SDD (`docs/issues/P6-06-*.md`):
  (01) layout via modelo puro `ui/home` (responsivo, safe-areas, rodapé
  reservado) — `MenuScene` reescrita só desenhando; (02) hero neon (título em
  camadas de glow + fundo procedural `ui/heroBackground`, **sem assets raster**,
  fiel à visão); (03) rodapé com **versão de fonte única** (`__APP_VERSION__`
  via `define`, `config/about`), © Insight X Lab Game Studio e ícones discretos
  de compartilhamento (`ui/socialLinks`: deep links WhatsApp/Telegram/X + Web
  Share para Instagram/TikTok); (04) doação Ko-fi + Buy Me a Coffee (URLs em
  `config/about`, adianta P7-01). `package.json` → `0.1.0`. Ver TD-26,
  `tests/{home-ui,heroBackground,about,socialLinks,socialLinks.dom}.test.ts`.
  Falta apenas a verificação manual com `npm run dev`.

---

## FASE 7 — Monetização leve ⬜

- ⬜ **P7-01** Doação (Ko-fi / itch "pay what you want").
- ⬜ **P7-02** Cosméticos pagos (nunca afetam jogabilidade).
- ⬜ **P7-03** Rewarded ads opcionais (só Endless, **nunca** Diário).
- ⬜ **P7-04** Versão "pro" (modos extras, sem anúncios).

---

## FASE 8 — Comunidade & social ⬜

- ⬜ **P8-01** Compartilhamento de replays (assistir run de outra pessoa).
- ⬜ **P8-02** Rankings de amigos / ligas semanais.
- ⬜ **P8-03** Página/Discord; divulgação em comunidades de shmup.
- ⬜ **P8-04** Localização (i18n).

---

## FASE 9+ — Visão de longo prazo ⬜ (provavelmente nunca)

- ⬜ **P9-01** Editor de fases compartilhável (UGC + moderação + backend sério).
- ⬜ **P9-02** "Daily" co-criado (seeds da comunidade).
- ⬜ **P9-03** Modo história opcional (narrativa leve sobre o loop).
- ⬜ **P9-04** Multiplayer assíncrono ("fantasmas" na mesma seed).
- ⬜ **P9-05** Multiplayer em tempo real (co-op/versus) — provável "nunca".
- ⬜ **P9-06** Port nativo (Capacitor/Tauri) para lojas/Steam.
- ⬜ **P9-07** Temporadas / battle pass cosmético.
- ⬜ **P9-08** Variantes de gênero reusando o engine de balas.
- ⬜ **P9-09** Procedural generativo de chefes (montados por peças).
- ⬜ **P9-10** Mod/API pública de padrões de bala.

---

## FASE 10 — Repaginação visual & áudio: temas selecionáveis ⬜

> **Priorizada por decisão do usuário (2026-06-15).** Apesar do número, vem antes
> das Fases 7–9. Origem: revisão do "look & feel" — a base de sistemas está
> sólida, mas a pele ainda não é profissional: a nave parece **5 primitivos
> soltos** (glow + chama + asa + corpo + hitbox), inimigos/chefes são geométricos
> (os **chefes são `fillCircle` puro**), os SFX são síntese "Atari 2600" e, no
> celular, o **dedo cobre a nave** e a hitbox.
>
> **Estratégia (validada em sessão de análise).** Tudo o que define o "look" vive
> na **camada de apresentação** (`scenes/GameScene`, `ui/*`,
> `services/AudioService`/`InputService`); **nada toca a sim**. Logo dá para
> introduzir um **tema de apresentação selecionável** — "Arcade anos 80"
> (vetorial, o atual, elevado) e "Polido" (arte raster + áudio real) — sem risco
> para determinismo, replays, Diário, ranking ou anti-cheat. Tema é **estado do
> jogador** (como mudo/cosméticos), persistido no `SaveService`, **fora da
> sim/replay/hash**. Princípios mantidos: **legibilidade do perigo > beleza**
> (balas e anel de graze permanecem **neon vetorial nos dois temas**) e
> **hitbox ≠ sprite**.
>
> **Vetorial = padrão gerativo** (desenha qualquer conteúdo a partir dos dados da
> sim — `shapePoints` por forma/cor —, custo zero por conteúdo novo). **Sprite =
> camada por cima** que fornece arte onde existe e **cai no vetorial onde ainda
> não há asset** ⇒ arte produzida incrementalmente, sem nunca deixar o jogo
> inconsistente/injogável. O custo de *código* de fazer os dois ≈ custo do tema
> sprite sozinho + a abstração; o custo real é **produção de arte/áudio**.
>
> **Sequência deliberada:** Bloco A (fundação, barato, já) → Bloco B (eleva o
> vetorial, sem assets) → Bloco C (produção de arte/áudio, incremental). O Bloco
> C só cobra o "imposto de dois temas" quando a arte sprite realmente existir.

### Bloco A — Fundação (barato, imediato)

- ✅ **P10-01** **Controle mobile relativo (offset/drag).** Implementado: o
  `InputService` ganhou esquema **relativo no toque** (default) — `pointerdown`
  ancora (não pula a nave para o dedo), `pointermove` acumula o alvo `+= delta ×
  sensibilidade` (clamp ao mundo), reancorando a cada toque e no `RESUME`. Feel
  em `src/data/controls.json` lido por `src/config/controls.ts`
  (presentation-only, **fora da sim**); o Foco reduz a sensibilidade. A sim segue
  recebendo o **alvo absoluto** já resolvido ⇒ replays/Diário intactos
  (`verifyReplay` verde). **Mouse permanece absoluto** (decisão registrada).
  Toggle OFFSET×DIRETO no Menu, persistido no `SaveService`
  (`hairline.controlScheme.v1`). Ver TD-27, `tests/InputService.dom.test.ts`,
  `tests/SaveService.test.ts`.

- ✅ **P10-02** **Abstração de tema de render (`GameRenderer`/`Theme`).**
  Implementado: nova camada `src/render/` com a **interface** `GameRenderer`
  (init/setHudPad/updateBackground/reactToCue/consumeFx/advanceFx/draw/destroy,
  modelada por **intenção**, não por primitivas de `Graphics`) e a 1ª
  implementação **`VectorTheme`** = o neon vetorial atual **realocado** (nave,
  inimigos, chefe, balas, tiros, partículas, anel de graze, barra de Foco, fundo
  estelar, fx do pulso + loadout cosmético) — **paridade visual 1:1**. A
  `GameScene` virou driver de apresentação (loop/input/áudio/HUD/hit-stop) e
  **delega** todo o desenho; o hit-stop fica na cena (o tema devolve a duração).
  Presentation-only: nada toca a sim ⇒ replays/Diário byte-idênticos
  (`verifyReplay` verde, 405 testes). Falta só a conferência visual manual com
  `npm run dev`. Ver TD-28, `docs/issues/P10-02-abstracao-tema-de-render.md`.

- ✅ **P10-03** **Abstração de tema de áudio (`AudioTheme`/`SynthAudioTheme`).**
  Implementado: nova pasta `src/services/audio/` com a **interface** `AudioTheme`
  (`playCue`/`startMusic`/`setLayerTargets`/`stopMusic`/`setMusicPreset`, recebendo
  o `AudioBackend` transversal: ctx/master/musicGain/noiseBuffer) e a 1ª
  implementação **`SynthAudioTheme`** = a síntese procedural atual **realocada**
  (blip/sweep/arp/noiseBurst, trilha em 4 camadas, `MUSIC_PRESETS`) — **sem
  mudança audível**. O `AudioService` virou **fachada**: concentra o transversal
  (contexto, master, **mute** persistido, **ducking**, `SfxPolicy`, ruído
  pré-gerado, autoplay/gesto) e **delega** ao tema; a interface de consumo
  (`play`, `startMusic`, `setLayerTargets`, `setMusicPreset`, `previewMusic`,
  `toggleMute`) não mudou. Preset é por-tema (o de samples definirá os seus em
  P10-12). Presentation-only: nada toca a sim ⇒ determinismo intacto (410 testes,
  novo `tests/AudioService.dom.test.ts` cobre no-op sem Web Audio + delegação com
  tema spy). Falta só a conferência audível manual com `npm run dev`. Ver TD-29,
  `docs/issues/P10-03-abstracao-tema-de-audio.md`.

- ✅ **P10-04** **Seletor de tema + persistência + carregamento condicional.**
  Registro único `config/themes` (dado puro: id/rótulo/renderer/áudio/assets;
  factories `render/createRenderer` + `services/audio/createAudioTheme` resolvem
  id→implementação). Chave `hairline.theme.v1` no `SaveService` (estado do
  jogador, fora da sim; inválido ⇒ default arcade). Seletor no Menu (linha de
  utilidades). `PreloadScene` carrega assets **apenas do tema ativo** — vetorial =
  nenhum (protege o "Arcade" de peso de bundle/PWA). `GameScene`/áudio resolvem o
  tema uma vez no `create()`. **Bloco A (fundação) completo.** Ver TD-30 e
  `docs/issues/P10-04-seletor-de-tema.md`.

### Bloco B — Nível 1: "Arcade anos 80" deliberado (vetorial, sem assets)

- ✅ **P10-05** **Nave como silhueta coesa.** `makeShip` (no `VectorTheme`)
  redesenhado para uma **silhueta única** (`shipSilhouette` em `ui/shapes` —
  caça com nariz/ombros/asas em flecha/pods de motor com entalhe), em vez de 5
  primitivos soltos. Glow integrado segue a silhueta; o cosmético (P6-01)
  continua aplicado — **cor** tinge o casco, **forma** vira **acento de
  cockpit**. Mesma geometria pura usada no jogo e no **preview do Hangar**
  (`HangarScene.drawShip`) ⇒ preview honesto. **Hitbox ≠ sprite** (ponto pequeno
  nítido), tamanho estável entre naves, anel de graze/chama/i-frames/Foco
  intactos. Render-only ⇒ determinismo/replay/hash intactos (422 testes; novo
  `shipSilhouette` coberto em `tests/shapes.test.ts`). Falta só a conferência
  visual manual com `npm run dev`. Ver `docs/issues/P10-05-nave-vetorial-coesa.md`.

- ✅ **P10-06** **Inimigos e chefes vetoriais com identidade.** O chefe deixou de
  ser `fillCircle` puro: corpo = casco da `shape` do JSON + glow seguindo a forma
  + **núcleo estelar contra-rotativo** (`starPoints` em `ui/shapes`) + olho
  pulsante; **cor do JSON clareando por fase** ⇒ "fica mais perigoso" óbvio. Todas
  as leituras de mecânica (barra de vida, telegraph, aro de núcleo invulnerável,
  pods, escudo) preservadas e desenhadas à parte; fill contido (não encobre
  balas). Inimigos ganharam **acento interno contra-rotativo + núcleo claro**
  mantendo a leitura por tipo/cor. Gerativo (conteúdo novo no JSON ganha visual);
  `BossSystem` expõe `shape`/`color` só para apresentação. Render-only ⇒
  determinismo/replay/hash intactos (425 testes; `starPoints` coberto em
  `tests/shapes.test.ts`). Falta a conferência visual manual (`npm run dev`,
  cobrir os 5 chefes). Ver `docs/issues/P10-06-inimigos-chefes-vetoriais.md`.

- ✅ **P10-07** **Fundo de espaço procedural rico + parallax multicamada.**
  Implementado: módulo PURO `src/render/background.ts` (campo de estrelas
  multicamada + nebulosa; criação/avanço/reciclagem sem Phaser, sem
  `Math.random`, sem alocação por frame), dirigido por dados na nova seção
  `effects.json → background` (cor base, `starLayers` de profundidade, `nebula`),
  validada no carregamento (`validateEffects`). O `VectorTheme` (`drawField`/
  `updateBackground`) passou a desenhar a nebulosa (anéis concêntricos baratos —
  sem blur) sob estrelas com cor/tamanho/alpha por camada (parallax). Render-only
  ⇒ determinismo/replay/hash intactos (438 testes; novos `tests/background.test.ts`
  + cobertura de `background` em `tests/effects.test.ts`). Contraste baixo
  preserva a legibilidade de balas/anel. Falta só a conferência visual manual
  (`npm run dev`). Ver `docs/issues/P10-07-fundo-espaco-procedural.md`.

- ✅ **P10-08** **Áudio "Arcade" melhorado.** Síntese do `SynthAudioTheme`
  elevada **sem assets** (TD-09): SFX de impacto agora em camadas (transiente +
  `thump` grave com queda de pitch + cauda de ruído com lowpass **descendente**) —
  explosão/kill, hit, pulso e entrada de chefe com peso; trilha mais musical (pad
  por lowpass + vozes destoadas em leque, rítmica filtrada, tensão com vibrato,
  perigo com quinta de shimmer). Tuning por dados na nova seção `audio.json →
  synth` (validada em `validateAudioConfig`). A *decisão* de som
  (`AudioCues`/`MusicDirector`/`SfxPolicy`) e a interface `play(cue)` ficam
  intactas; presets de trilha (cosmético `music`) e `previewMusic` preservados.
  Presentation-only ⇒ determinismo intacto (440 testes; integridade de `synth`
  em `tests/effects.test.ts`). **Decisão:** identidade sonora própria do **menu**
  deixada fora de escopo (opcional na issue; risco de UX/autoplay) — a API
  (`startMusic`/`setLayerTargets`/`previewMusic`) segue disponível. Falta a
  conferência audível manual (`npm run dev`). Ver
  `docs/issues/P10-08-audio-arcade-melhorado.md`.

### Bloco C — Nível 2: tema "Polido" (arte raster + áudio real, produção incremental)

- ✅ **P10-09** **`SpriteTheme` (código) com fallback vetorial.** `SpriteTheme`
  herda o `VectorTheme` e sobrescreve só os *seams* por entidade (nave/inimigos/
  chefe): desenha **sprites** lendo as mesmas posições da sim e, onde faltar asset,
  **cai no `VectorTheme`** (resolução pura em `render/spriteFallback`). Balas e anel
  seguem vetoriais. Pooling de sprites (`render/SpritePool`, nunca `new` no loop);
  carga condicional no `PreloadScene` + PWA por tema (`globIgnores: sprites/**`).
  Tema **"Polido"** registrado (placeholder da nave ⇒ prova do fallback parcial).
  Sem nova lógica de jogo. Ver TD-31, `docs/issues/P10-09-sprite-theme-fallback.md`.

- ✅ **P10-10** **Arte raster incremental:** nave → chefes → inimigos (nesta
  ordem), cada peça substituível sem quebrar o jogo (o que não tem arte continua
  vetorial). Mapear estados visuais aos dados já existentes (dano/i-frames, fase do
  chefe, partes, escudo). **Fluxo + nave** — sprite no mesmo container da
  silhueta (chama + hitbox/anel vetoriais por cima), feel idêntico via função pura
  compartilhada (`render/shipVisual`, testada headless), fallback comprovado.
  **Contrato de asset** documentado (`docs/ASSET_CONTRACT.md`). **Inimigos** (pool
  de sprites, tint/rotação) e **chefe** (corpo+rotação; barra/escudo/partes/
  telegraph seguem vetoriais) integrados pelo mesmo fluxo; arte final das três
  categorias substituiu os placeholders sem mudar código. Única nuance pendente:
  `phaseIndex`→variação visual do corpo do chefe (mecânica segue vetorial). Ver
  TD-31, `docs/issues/P10-10-arte-raster-incremental.md`.

- ✅ **P10-11** **Fundo de espaço em arte (parallax raster).** Camadas ilustradas
  (`TileSprite`) com tiling vertical + parallax por dados (`data/
  polishedBackground.json`; offset via função pura `render/parallaxBackground`,
  testada headless) substituem o procedural **só** no tema Polido; sem os assets,
  cai no procedural (P10-07) sem erro. Carga condicional + fora do precache PWA
  (path `sprites/`). Placeholders tileáveis (sem emenda em 720×1280). Ver TD-31,
  `docs/issues/P10-11-fundo-espaco-raster.md`.

- ✅ **P10-12** **Áudio real (samples).** `SampleAudioTheme` atrás de `play(cue)`
  (par sonoro do "Polido"): SFX por `AudioBufferSource` e trilha por faixas em loop
  com cross-fade (camadas do `MusicDirector` → `trackMix` calm/intense). **Híbrido:
  cai no `SynthAudioTheme` por cue/trilha** onde faltar buffer (sem samples ⇒
  fallback, sem erro). Manifesto puro (`audio/sampleManifest`, chaves `aud-*`),
  ponte Phaser→`sampleBank` no `PreloadScene`, carga condicional + fora do precache
  PWA (path `audio/`). Mute/ducking/`SfxPolicy`/gesto seguem na fachada (P10-03).
  Placeholders (`scripts/gen-placeholder-audio.mjs`) validam o fluxo; conteúdo final
  troca os mesmos arquivos. Presentation-only ⇒ determinismo intacto (475 testes).
  Ver TD-32, `docs/issues/P10-12-audio-samples.md`.

- ✅ **P10-13** **Cruzamento tema × cosméticos.** Decisão e implementação: a
  **cor** (nave/tiro) herda nos dois temas (preenchimento no vetorial, `setTint`
  no sprite); a **forma** da nave segue uma cadeia de fallback no sprite —
  variante de arte **curada** (`spr-ship-<id>`) → arte default tingida → silhueta
  vetorial (função pura `resolveShipSprite`, evita exigir arte por cosmético).
  **Balas e anel de graze seguem neon vetorial nos dois temas** (já valia, TD-31).
  Preview do Hangar **consciente do tema** (`hangarPreview`, puro). Presentation-
  only: nada toca a sim ⇒ determinismo intacto (484 testes verdes). Ver TD-33,
  `docs/issues/P10-13-tema-x-cosmeticos.md`.

---

## Como abrir uma sessão por ID

1. Escolha um item `Pn-mm` com status ⬜/🟡.
2. Leia os docs de memória: `PRODUCT_VISION`, `GAME_DESIGN`, `ARCHITECTURE`,
   `TECH_DECISIONS`, `TEST_STRATEGY`.
3. Siga o fluxo teste-primeiro (`03-processo-de-desenvolvimento.md`).
4. Ao concluir, marque o item aqui (✅) e atualize a contagem/notas.
