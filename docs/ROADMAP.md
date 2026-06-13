# ROADMAP — HAIRLINE (rastreador canônico com IDs)

> **Este é o rastreador VIVO do roadmap, com IDs estáveis por item.** Use os IDs
> (`P4-04`, `P5-02`, …) para abrir sessões de desenvolvimento focadas em uma
> funcionalidade. O documento `04-roadmap.md` mantém a narrativa/visão original;
> aqui ficam status e escopo curto de cada item.
>
> **Status:** ✅ feito · 🟡 parcial · ⬜ a fazer · ⏸️ adiado de propósito.
> **Atualizado:** 2026-06 (durante a Fase 4).
> **Convenção de ID:** `P{fase}-{nn}`. IDs nunca são reaproveitados.

## Resumo de progresso

| Fase | Tema | Status |
|---|---|---|
| 0 | Fundação técnica | ✅ completa |
| 1 | MVP jogável | ✅ completa |
| 2 | Loop completo + 1º lançamento | ✅ exceto lançar (⏸️ P2-06) |
| 3 | Desafio Diário + ranking | ✅ exceto deploy backend (⏸️ P3-03b) |
| 4 | Profundidade de conteúdo | 🟡 em andamento |
| 5–9+ | Polimento → visão | ⬜ a fazer |

Contagem atual de conteúdo: **9 padrões de bala, 7 inimigos, 4 chefes, 1 onda autoral**.
Testes: **204 passando** (32 arquivos). Ver `TEST_STRATEGY.md`.

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
- 🟡 **P4-02** Mais chefes com fases/mecânicas próprias. Feito: 4 chefes
   (warden, spinner, gunner, vortex), 2 fases cada, padrões distintos.
   **Falta**: mecânicas únicas (escudos, lacaios/adds, partes destrutíveis,
   teleporte). → abrir como **P4-02b**.
- ✅ **P4-03** Variedade de inimigos (7) + **formações** (`Formations`:
   line/vee/column, dirigidas por dados no Endless).
- 🟡 **P4-04** Modos: **boss rush** ✅ (`BossRushDirector`, mode `bossrush`).
   **Falta**: **estágios curados** (sequência autoral onda→onda→chefe). → **P4-04b**.
- ✅ **P4-05** Eventos/modificadores semanais (`Modifiers`: seed ISO da semana,
   `RunMods` aplicados à Simulation e ao replay; opção "Evento Semanal" no Menu).
- ⬜ **P4-06** **Ferramenta interna de autoria de padrões** (editor de bullet
   patterns) — preview ao vivo, exportar JSON para `src/data/patterns`.

### Itens derivados (abertos) da Fase 4
- ⬜ **P4-02b** Mecânicas próprias de chefe (escudo, adds, partes, fases ≥3).
  Especificado em 6 issues SDD: `docs/issues/P4-02b-*.md` (publicar com
  `docs/issues/publish.sh`).
- ⬜ **P4-04b** Estágios curados (formato de "stage" autoral + seletor de fases).
  Especificado em 4 issues SDD: `docs/issues/P4-04b-*.md` (publicar com
  `docs/issues/publish.sh`).

---

## FASE 5 — Polimento, "juice" e áudio ⬜

- 🟡 **P5-01** Screen shake / flash / hit-stop / partículas. Parcial: já há shake +
   flash de dano e glow; **falta** hit-stop, partículas de impacto, juice de kill.
   Especificado em 4 issues SDD: `docs/issues/P5-01-*.md` (publicar com
   `docs/issues/publish.sh`).
- 🟡 **P5-02** Feedback claro de graze (o risco precisa ser *sentido*). Há SFX +
   carga de Foco; **falta** efeito visual dedicado no momento do graze.
   Especificado em 3 issues SDD: `docs/issues/P5-02-*.md` (publicar com
   `docs/issues/publish.sh`).
- ✅/🟡 **P5-03** Clareza visual das balas (glow + núcleo). Revisar legibilidade
   em densidade alta e daltonismo (ver P5-05).
- ⬜ **P5-04** Trilha dinâmica; SFX em camadas; haptics no celular.
   Especificado em 3 issues SDD: `docs/issues/P5-04-*.md`.
- ⬜ **P5-05** Acessibilidade: daltonismo, redução de flashes, alto contraste.
- ⬜ **P5-06** Otimização de performance em celular fraco (orçamento de frame,
   modo de qualidade alto/baixo).

---

## FASE 6 — Progressão & meta-jogo ⬜

- ⬜ **P6-01** Desbloqueáveis cosméticos (naves, cores de bala, trilhas).
  Especificado em 2 issues SDD: `docs/issues/P6-01-*.md` (depende de P6-02/03).
- ⬜ **P6-02** Conquistas / desafios.
  Especificado em 2 issues SDD: `docs/issues/P6-02-*.md` (depende de P6-03-01).
- ⬜ **P6-03** Estatísticas pessoais e histórico de runs.
  Especificado em 2 issues SDD: `docs/issues/P6-03-*.md` (fundação da Fase 6).
- ⬜ **P6-04** Naves com regras de jogo distintas (diferentes, não mais fortes).
- ⬜ **P6-05** Curva de maestria visível (rankings de habilidade).

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

## Como abrir uma sessão por ID

1. Escolha um item `Pn-mm` com status ⬜/🟡.
2. Leia os docs de memória: `PRODUCT_VISION`, `GAME_DESIGN`, `ARCHITECTURE`,
   `TECH_DECISIONS`, `TEST_STRATEGY`.
3. Siga o fluxo teste-primeiro (`03-processo-de-desenvolvimento.md`).
4. Ao concluir, marque o item aqui (✅) e atualize a contagem/notas.
