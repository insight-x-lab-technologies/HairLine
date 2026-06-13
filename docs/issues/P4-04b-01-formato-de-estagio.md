# [P4-04b-01] Formato de estágio data-driven + `StageDirector` (modo `stage`)

## Objetivo

Criar o formato declarativo de **estágio curado** (sequência autoral
onda→onda→chefe em JSON) e o `StageDirector` headless que o executa, como novo
modo de jogo `stage`. O modo `campaign` atual (1 onda fixa + chefe por
`enterTick`) é absorvido por este formato e removido. É o alicerce de todas as
issues de P4-04b.

## Contexto

- ROADMAP P4-04 entregou o boss rush; falta a sequência autoral
  (onda→onda→chefe) prevista em "Modos". Item derivado: P4-04b.
- Hoje o modo `campaign` é rígido: `SpawnSystem` roda **uma** onda
  (`wave-001`) e o `BossSystem` entra por `enterTick` fixo, em paralelo —
  não há noção de "seções" nem de fim de onda (`src/sim/Simulation.ts`,
  branches `mode === 'campaign'`).
- `BossRushDirector` já estabelece o precedente de diretor de sequência
  determinístico (cria `BossSystem` sob demanda na transição, `spawnNow()`).
- O jogo não lançou: **sem suporte duplo** — `campaign` sai, `stage` entra
  (mesma decisão tomada em P4-02b-01 para `phasePatternIds`).

## Requisitos funcionais

1. Novo schema `StageDef` em `src/data/stages/*.json`:
   `{ id, name, sections: StageSection[] }`, onde `StageSection` é
   `{ type: 'wave', waveId }` **ou** `{ type: 'boss', bossId }`. Mínimo 1
   seção; ordem do array = ordem de execução.
2. `StageDirector` (`src/systems/StageDirector.ts`, headless):
   - executa as seções **em sequência**;
   - seção `wave` termina quando a onda spawnou tudo (`SpawnSystem.isFinished`)
     **e** não há inimigos vivos (`enemies.activeCount === 0`);
   - seção `boss` usa `BossSystem` com `spawnNow()` (sem `enterTick`); termina
     ao derrotar, somando `defeatScore` (como no `BossRushDirector`);
   - `completed` fica `true` ao fim da última seção → a `Simulation` converte
     em vitória (`state.win()`).
3. `GameMode` passa a ser `'endless' | 'stage' | 'bossrush'`; `campaign` é
   removido de `types.ts`, `Simulation`, `ShareCard` (label "Estágio") e
   fixtures.
4. `SimulationOptions.stageId?: string` (default `stage-001`); `waveId`/`bossId`
   deixam de existir como opções públicas (eram só da campanha).
5. `Replay`/`ReplayRecorder`/`verifyReplay` gravam e re-simulam `stageId`
   (campo opcional, presente quando `mode === 'stage'`).
6. Migrar a campanha atual para `src/data/stages/stage-001.json`
   (wave-001 → chefe warden) e registrar stages em `src/content/index.ts`
   (`getStage`, `STAGE_IDS`) com validação: `waveId`/`bossId` existentes,
   `sections` não vazia, `type` válido.

## Requisitos não funcionais

- Determinismo intacto: transição de seção é função pura do estado
  (spawner esgotado + pool vazio / chefe derrotado); mesma seed + inputs ⇒
  mesmo `hashState()`. Dobrar o índice da seção atual no checksum.
- Sem alocação no loop quente: criar `SpawnSystem`/`BossSystem` **na
  transição** de seção é aceitável (precedente do `BossRushDirector`).
- Dados em JSON, nunca hardcoded (CLAUDE.md §3).

## Critérios de aceite

- [ ] Estágio de teste com 2 ondas + chefe: seções avançam nos pontos certos e
      derrotar o chefe encerra com vitória (teste headless).
- [ ] Chefe **não** entra enquanto houver inimigo vivo da onda anterior.
- [ ] `verifyReplay` de uma run de estágio reproduz hash e score.
- [ ] `campaign` não existe mais em `src/` nem em `tests/` (grep limpo);
      testes que o usavam migram para `stage` com justificativa no commit.
- [ ] JSON de estágio inválido (waveId inexistente, sections vazia) falha na
      validação de conteúdo (`tests/content.test.ts`).
- [ ] `npm run build`, `npm test`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/content/types.ts` (+`StageDef`, `StageSection`), `src/content/index.ts`
- `src/systems/StageDirector.ts` (novo)
- `src/sim/types.ts` (`GameMode`, `SimulationOptions`), `src/sim/Simulation.ts`,
  `src/sim/Replay.ts`
- `src/data/stages/stage-001.json` (novo)
- `src/services/ShareCard.ts` (label do modo)
- `tests/Simulation.test.ts`, `tests/ShareCard.test.ts`, `tests/ShareImage.test.ts`,
  `tests/content.test.ts`, `tests/StageDirector.test.ts` (novo)

## Fora de escopo

- HUD/anúncios de progresso de onda/chefe (P4-04b-02).
- Estágios novos além da migração do atual (P4-04b-03).
- Seletor de estágios no Menu e desbloqueio (P4-04b-04) — o Menu continua
  iniciando o `stage-001` onde hoje inicia a campanha.
- Mecânicas novas de chefe (P4-02b) — `StageDirector` usa `BossSystem` como está.

## Documentação a atualizar

- `docs/GAME_DESIGN.md` §Modos (descrever `stage` e o schema de seções).
- `docs/ARCHITECTURE.md` (mapa de pastas: `src/data/stages/`, `StageDirector`).
- `docs/TECH_DECISIONS.md` — **registrar**: (a) schema de estágio; (b) remoção
  do modo `campaign`; (c) chefe de estágio entra por limpeza de seção, não por
  `enterTick` (mudança de comportamento vs. campanha).
- `docs/ROADMAP.md` (nota de progresso em P4-04b).

## Riscos técnicos

- O fim de seção depende de `enemies.activeCount === 0`: inimigo que sai da
  tela precisa contar como removido do pool (verificar `EnemyPool`/`advance`),
  senão a seção trava para sempre.
- `enterTick`/ordem de update mudam o hash de runs antigas de campanha — não há
  replays persistidos em produção (jogo não lançou), mas fixtures "golden" de
  teste precisarão de novos hashes, com justificativa no commit (CLAUDE.md
  proíbe ajustar teste para acomodar bug — aqui é mudança de comportamento
  **especificada**; citar esta issue).
- `BossDef.enterTick` fica sem uso no modo stage; **não** remover do schema
  nesta issue (o modo Endless/`BossDirector` pode depender — conferir antes).

## Sugestão de testes (escrever primeiro)

- `StageDirector` com `[wave, boss]`: não spawna chefe enquanto há inimigo;
  ao limpar, chefe entra no tick seguinte; derrotar ⇒ `completed`.
- Estágio `[wave, wave]` (sem chefe): segunda onda começa após limpar a
  primeira; fim da segunda ⇒ vitória.
- Determinismo: duas `Simulation(mode:'stage')` com mesma seed/inputs ⇒ hashes
  idênticos; replay gravado e verificado (`verifyReplay.ok === true`).
- Validação de conteúdo: `waveId` inexistente / `sections: []` ⇒ erro no registro.
