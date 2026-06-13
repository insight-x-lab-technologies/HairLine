# [P4-04b-04] Seletor de estágios no Menu + desbloqueio e recordes locais

## Objetivo

Fechar o P4-04b para o jogador: opção "Estágios" no Menu listando os estágios
registrados, com desbloqueio progressivo (vencer o N destrava o N+1) e melhor
pontuação local por estágio, persistidos via `SaveService`.

## Contexto

- Depende de **P4-04b-01** (modo `stage`) e fica bem melhor após **P4-04b-03**
  (≥3 estágios — um seletor de 1 item não se sustenta).
- ROADMAP P4-04b pede explicitamente "formato de 'stage' autoral + **seletor
  de fases**".
- Hoje o `MenuScene` inicia modos com `GameSceneData` fixo (endless, bossrush,
  diário); o estágio entra no mesmo fluxo com `stageId` no payload.
- `SaveService` já persiste recorde (localStorage); `STAGE_IDS` em
  `src/content/index.ts` dá a lista canônica e a **ordem** dos estágios.

## Requisitos funcionais

1. `MenuScene`: entrada "Estágios" abre uma lista (na própria cena ou subcena
   simples) com, por estágio: nome, estado (✔ concluído / disponível / 🔒
   travado) e melhor score. Tocar num disponível inicia
   `GameScene` com `{ mode: 'stage', stageId }`.
2. Desbloqueio: `stage-001` sempre aberto; vencer o estágio i destrava o i+1
   (ordem de `STAGE_IDS`). Derrota não destrava nada.
3. Persistência via `SaveService`: por estágio, `{ completed, bestScore }`.
   Migração suave: save antigo sem o bloco de estágios ⇒ só o primeiro aberto.
4. `ResultsScene`: em vitória de estágio, gravar conclusão + best score e
   mostrar "NOVO RECORDE" / "Estágio X concluído" (reusar o padrão visual de
   recorde existente); em derrota, gravar apenas best score se aplicável.
5. `ShareCard`/`ShareImage`: o texto do modo inclui o estágio (ex.:
   "Estágio 2") — campo já tocado em P4-04b-01, aqui só o nome/número.

## Requisitos não funcionais

- Nada disso entra na simulação: desbloqueio/recorde são meta-jogo
  (render/serviços). `hashState()` inalterado.
- Seletor utilizável com **um dedo** em retrato, alvos de toque ≥ ~64px,
  respeitando safe-areas (`hudLayout`).
- localStorage indisponível (modo privado) não pode quebrar o Menu: cair para
  "tudo na memória da sessão" como o `SaveService` já fizer (conferir e seguir
  o comportamento atual).

## Critérios de aceite

- [ ] Testes (jsdom) do estado de desbloqueio: save vazio ⇒ só stage-001;
      concluir stage-001 ⇒ stage-002 abre; best score só sobe.
- [ ] Iniciar um estágio pelo seletor cria `Simulation` com o `stageId` certo
      e o replay gravado o referencia (teste de fluxo headless do payload).
- [ ] Estágio travado não inicia (toque ignorado, feedback visual).
- [ ] Verificação manual no navegador: ciclo completo
      seleciona → vence → destrava → recorde aparece (roteiro no PR).
- [ ] `npm run build`, `npm test`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/scenes/MenuScene.ts` (lista/seleção), `src/scenes/GameScene.ts`
  (`GameSceneData.stageId`), `src/scenes/ResultsScene.ts` (gravar/mostrar)
- `src/services/SaveService.ts` (progresso por estágio)
- `src/services/ShareCard.ts`, `ShareImage.ts` (nome do estágio)
- `src/content/index.ts` (só leitura de `STAGE_IDS`/nomes)
- `tests/SaveService.test.ts` (ou novo `tests/stage-progress.test.ts`)

## Fora de escopo

- Ranking remoto por estágio (leaderboard fica como está; é evolução de
  P3-03b pós-deploy).
- Estrelas/medalhas/objetivos secundários por estágio (meta-jogo, Fase 6).
- Seleção de estágio no Desafio Diário (Diário continua no modo atual).
- Conteúdo novo (P4-04b-03) e anúncios in-game (P4-04b-02).

## Documentação a atualizar

- `docs/GAME_DESIGN.md` §Modos (desbloqueio e recordes por estágio).
- `docs/ROADMAP.md` — marcar **P4-04b ✅** (e P4-04 ✅) quando esta fechar.
- `docs/TECH_DECISIONS.md` — formato do save de progresso (versionamento do
  bloco no localStorage), se o `SaveService` ainda não tiver convenção.

## Riscos técnicos

- Esquema de save sem versão dificulta evolução futura (Fase 6 vai mexer
  aqui de novo) — definir o bloco já com `version` ou seguir a convenção
  existente do `SaveService`.
- Ordem de desbloqueio acoplada à ordem de `STAGE_IDS`: inserir um estágio no
  meio da lista re-trava progresso de quem já passou — documentar que a ordem
  do registro é contrato (ids nunca mudam de posição relativa após lançados).
- UI de lista em Phaser sem scroll: com 3 estágios cabe na tela; se crescer,
  paginação simples (fora de escopo dimensionar para 10+ agora).

## Sugestão de testes (escrever primeiro)

- `SaveService`: progressão (vazio → conclui 1 → 2 aberto, 3 travado),
  best score monotônico, round-trip de serialização.
- Payload: dado um item do seletor, `GameSceneData` resultante tem
  `mode:'stage'` e `stageId` correto (função pura extraída da cena, se
  preciso, para testar sem Phaser).
- Replay de run iniciada via seletor contém o `stageId` (amarra com P4-04b-01).
