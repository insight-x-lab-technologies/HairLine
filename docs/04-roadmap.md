# 04 — Roadmap (visão/narrativa original)

> ⚠️ **Rastreador canônico com IDs e status: ver [`ROADMAP.md`](./ROADMAP.md).**
> Este documento guarda a narrativa e o "porquê" de cada fase. O progresso vivo
> e os IDs por item (`P4-04`, `P5-02`, …) ficam em `ROADMAP.md`.
> **Snapshot (2026-06):** Fases 0–1 ✅; Fase 2 ✅ exceto lançar; Fase 3 ✅ exceto
> deploy do backend; **Fase 4 em andamento** (ver abaixo).
>
> **Status:** vivo. Reordene livremente conforme a realidade (hobby, horas vagas).
> **Leia com honestidade:** este roadmap é deliberadamente **ambicioso e amplo** — anos de trabalho potencial. A maior parte das fases tardias **provavelmente nunca será feita**, e tudo bem. O valor de um roadmap longo não é cumpri-lo: é dar **direção** às decisões de hoje (não fechar portas para o futuro) e te dar um horizonte. **A única coisa que importa de verdade é a Fase 0 e a Fase 1.** O resto é visão.
> **Anti-armadilha:** não construa infraestrutura para a Fase 6 enquanto a Fase 1 não está divertida. A maioria dos projetos morre por escopo, não por falta de visão.

---

## Mapa geral

```
FASE 0  Fundação técnica            ── semanas
FASE 1  MVP jogável (vertical slice)── o marco que decide tudo
FASE 2  Loop completo + 1º lançamento
FASE 3  Desafio Diário + ranking
FASE 4  Profundidade de conteúdo
FASE 5  Polimento, juice, áudio
FASE 6  Progressão & meta-jogo
FASE 7  Monetização leve
FASE 8  Comunidade & social
FASE 9+ Visão de longo prazo (talvez nunca)
```

---

## FASE 0 — Fundação técnica
**Meta:** o esqueleto roda. Nada divertido ainda; tudo no lugar certo.

- [ ] Repo, Vite + TypeScript + Phaser 4, ESLint/Prettier.
- [ ] `CLAUDE.md` / `AGENTS.md` e os docs 01–03 no repo.
- [ ] Cenas vazias: Boot → Preload → Menu → Game → Results.
- [ ] Scale Manager com resolução virtual (retrato) funcionando em celular, tablet e desktop.
- [ ] `Rng` semeável + **teste de determinismo** passando.
- [ ] Loop de fixed timestep separável do render (simulação "tickável" headless).
- [ ] CI (lint + typecheck + test) verde.
- [ ] Deploy automático de um "hello world" navegável (PWA instalável).

**Critério de saída:** existe uma nave que se move com o dedo/mouse numa tela responsiva, e o pipeline de build→deploy→teste funciona.

---

## FASE 1 — MVP jogável (vertical slice) ⭐ O MARCO QUE DECIDE TUDO
**Meta:** provar que o loop é **divertido**. Se não for, repense o jogo *aqui*, antes de investir meses.

- [ ] Nave: movimento (arrastar), tiro automático, hitbox pequena, **modo Foco**.
- [ ] `BulletPool` + `EnemyPool` (pooling de verdade).
- [ ] 2–3 padrões de bala definidos em JSON (`/data/patterns`).
- [ ] `SpawnSystem` lê uma onda de JSON e a executa.
- [ ] `CollisionSystem` (bala↔nave por hitbox; tiro↔inimigo).
- [ ] **`GrazeSystem`** — a mecânica central. Proximidade carrega Foco.
- [ ] Pulso refletor (gasta Foco, limpa balas próximas).
- [ ] 1 chefe simples com 2 fases.
- [ ] `ScoreSystem` (pontos + bônus de graze).
- [ ] Tela de resultado (score, graze total).
- [ ] Game over / reiniciar.

**Critério de saída (o mais importante do projeto):** você joga "só mais uma run" sem perceber o tempo passar. Se isso **não** acontece, pare e ajuste a mecânica — não avance.

---

## FASE 2 — Loop completo + primeiro lançamento público
**Meta:** algo que estranhos consigam jogar e entender sozinhos.

- [ ] Modo Endless com `DifficultySystem` (escala densidade/velocidade/variedade).
- [ ] 5–8 padrões de bala, 4–6 tipos de inimigo, 2–3 chefes.
- [ ] Menu, tutorial mínimo (ensinar graze sem texto, via design), pausa.
- [ ] HUD legível em todos os formatos; áudio básico (SFX + 1 trilha).
- [ ] PWA polido (ícone, splash, offline).
- [ ] **Lançar** em itch.io / domínio próprio. Pedir feedback honesto.

**Critério de saída:** publicado e jogável por terceiros sem você ao lado.

---

## FASE 3 — Desafio Diário + ranking (o gancho social)
**Meta:** dar motivo de **voltar amanhã**.

- [ ] Geração de cenário a partir da seed do dia (mesma para todos).
- [ ] `ReplayRecorder` (grava inputs + seed).
- [ ] Backend mínimo (Supabase/Cloudflare) + `LeaderboardService`.
- [ ] Ranking diário; identidade anônima/leve.
- [ ] Resultado compartilhável (imagem/emoji-card — o "fator Wordle").
- [ ] v1 do anti-cheat: validação de plausibilidade.

**Critério de saída:** pessoas competem na mesma seed e voltam em dias seguintes. **Meça retenção D1/D7** — é a métrica que diz se o jogo "pegou".

---

## FASE 4 — Profundidade de conteúdo  🟡 EM ANDAMENTO
**Meta:** dar o que mastigar a quem voltou. (IDs/escopo: ver `ROADMAP.md`.)

- [x] **P4-01** Biblioteca de padrões maior + sintaxe parametrizável (emitters com
  `angleStepDeg/accel/speedStep/radiusStep/aimOffsetDeg`; 9 padrões).
- [~] **P4-02** Mais chefes (4, 2 fases cada) — falta mecânicas próprias (**P4-02b**).
- [x] **P4-03** Variedade de inimigos (7) + **formações** (line/vee/column).
- [~] **P4-04** Modos: **boss rush** ✅; **estágios curados** falta (**P4-04b**).
- [x] **P4-05** Eventos/modificadores semanais (mutadores de regra).
- [ ] **P4-06** Ferramenta interna de autoria de padrões (editor de bullet patterns).

**Critério de saída:** dá para jogar muitas runs sem repetir a sensação.

---

## FASE 5 — Polimento, "juice" e áudio
**Meta:** transformar "funciona" em "gostoso".

- [ ] Screen shake, hit-stop, flashes (atenção à API de tint da Phaser 4), partículas.
- [ ] Feedback claro de graze (o momento de risco precisa ser *sentido*).
- [ ] Clareza visual das balas (legibilidade > beleza — o jogador precisa ler o perigo).
- [ ] Trilha dinâmica; SFX em camadas; haptics no celular.
- [ ] Acessibilidade: daltonismo, redução de flashes, modo de balas de alto contraste.
- [ ] Otimização de performance em celular fraco.

**Critério de saída:** o jogo "sente bem" e é legível para qualquer um.

---

## FASE 6 — Progressão & meta-jogo
**Meta:** razões de longo prazo para voltar (sem virar pay-to-win nem RPG inchado).

- [ ] Desbloqueáveis cosméticos (naves, cores de bala, trilhas).
- [ ] Conquistas / desafios.
- [ ] Estatísticas pessoais e histórico de runs.
- [ ] Talvez: naves com regras de jogo distintas (não "mais fortes", mas *diferentes*).
- [ ] Curva de maestria visível (rankings de habilidade, não só pontuação).

**Critério de saída:** existe progressão que respeita a justiça do ranking.

---

## FASE 7 — Monetização leve (só se houver audiência)
**Meta:** talvez pagar a hospedagem. Sem distorcer o jogo.

- [ ] Doação (Ko-fi/itch "pay what you want").
- [ ] Cosméticos pagos (nunca afetam jogabilidade).
- [ ] Rewarded ads **opcionais** (ex.: continuar uma run no Endless — **nunca** no Diário).
- [ ] Versão "pro" (modos extras, sem anúncios).

**Critério de saída:** receita existe e ninguém sente que o jogo ficou pior.

---

## FASE 8 — Comunidade & social
**Meta:** que o jogo viva fora do jogo.

- [ ] Compartilhamento de replays (assistir a run de outra pessoa).
- [ ] Rankings de amigos / ligas semanais.
- [ ] Página/Discord; divulgação em comunidades de shmup.
- [ ] Localização (i18n) para alcançar mais públicos.

---

## FASE 9+ — Visão de longo prazo (provavelmente nunca, e tudo bem)
Ideias que dão norte sem compromisso. **Não construa nada hoje pensando nestas.**

- **Editor de fases compartilhável** — jogadores criam e publicam padrões/estágios (conteúdo gerado por usuário multiplica longevidade, mas exige moderação e backend sério).
- **"Daily" co-criado** — seeds enviadas pela comunidade.
- **Modo história opcional** — embrulhar o loop numa narrativa leve (volta ao seu amor original por JRPG, mas como camada opcional, não como base cara).
- **Multiplayer assíncrono avançado** — "fantasmas" de outros jogadores na mesma seed.
- **Multiplayer em tempo real** — co-op/versus. Tecnicamente caro e fora do escopo serverless; provável "nunca".
- **Port nativo** (Capacitor/Tauri) para lojas de app / Steam, se houver tração real.
- **Temporadas / battle pass cosmético** — só faz sentido com audiência grande e recorrente.
- **Variantes de gênero** reusando o engine de balas (ex.: um modo puzzle de padrões).
- **Procedural generativo de chefes** — chefes montados por regras a partir de "peças", aumentando variedade sem autoria manual.
- **Mod/API pública** de padrões de bala.

---

## Como usar este roadmap na prática (hobby, horas vagas)

1. **Só a Fase 0 e 1 são compromisso.** O resto é mapa, não contrato.
2. A cada fase, **relance a pergunta:** "isto ainda é divertido / vale meu tempo livre?". Se não, pare ou pivote sem culpa.
3. **Lance cedo** (Fase 2) e deixe o feedback real reordenar tudo daqui pra frente.
4. Resista a pular para fases brilhantes (editor, multiplayer) antes do núcleo estar sólido. Essa é a forma nº 1 de matar o projeto.
5. Marque com data o que você *de fato* fizer. Roadmap é para revisar, não para venerar.
