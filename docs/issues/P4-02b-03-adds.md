# [P4-02b-03] Lacaios (adds) invocados pelo chefe

## Objetivo

Permitir que uma fase de chefe **invoque inimigos comuns (adds)** em cadência,
forçando o jogador a dividir atenção entre o chefe e a tela — mecânica clássica
de bullet hell que aumenta a pressão sem precisar de mais HP.

## Contexto

- Depende de **P4-02b-01** (campo opcional por fase).
- Já existem `EnemyPool`, defs de 7 inimigos e `Formations` (P4-03) — reusar.
- Durante encontro de chefe no Endless o spawn procedural pausa; os adds são a
  fonte de inimigos controlada **pelo chefe**.
- Aplicar ao **gunner** na fase 2 (invoca drones), como primeiro uso real.

## Requisitos funcionais

1. Campo opcional por fase:
   `adds: { enemyId: string, count: number, intervalTicks: number, maxAlive: number }`.
2. A cada `intervalTicks` da fase, o chefe invoca `count` inimigos do tipo
   `enemyId` via `EnemyPool` (sem `new`), respeitando `maxAlive` (adds vivos
   invocados pelo chefe).
3. Posições de spawn determinísticas: derivadas do `Rng` da simulação (injetado —
   `BossSystem` hoje não recebe `Rng`) ou de offsets fixos do chefe; decidir na
   implementação e registrar no commit.
4. Adds são inimigos normais: atiram seu `patternId`, morrem, pontuam, colidem.
5. Morte do chefe ⇒ adds restantes são limpos (mesmo comportamento de fim de
   encontro já usado no Endless/boss rush).
6. `gunner.json` ganha adds na fase 2; quantidade/cadência no JSON.

## Requisitos não funcionais

- Pooling obrigatório (`EnemyPool`); nenhuma alocação no loop.
- Ordem de update determinística: invocação acontece num ponto fixo do
  `Simulation.tick` (dentro do update do chefe, antes da integração de balas).
- Headless; render não muda (adds são inimigos comuns).

## Critérios de aceite

- [ ] Headless: fase com `adds` invoca na cadência certa e respeita `maxAlive`.
- [ ] `enemyId` inexistente falha na validação de conteúdo.
- [ ] Adds invocados pontuam e contam como kills normais.
- [ ] Chefe derrotado ⇒ nenhum add restante ativo no tick seguinte.
- [ ] Determinismo: duas runs com gunner ⇒ mesmo hash; `verifyReplay` ok.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/content/types.ts`, `src/content/index.ts` (campo `adds` + validação)
- `src/systems/BossSystem.ts` (cadência de invocação; talvez receber `Rng`/`EnemyPool`)
- `src/sim/Simulation.ts` (fiação: pool/Rng no update do chefe; limpeza na derrota)
- `src/data/bosses/gunner.json`
- `tests/BossSystem.test.ts`, `tests/Simulation.test.ts`

## Fora de escopo

- Adds em formação (`Formations`) — possível evolução, não agora.
- Adds que curam/protegem o chefe.
- Tipos de inimigo novos (usa os 7 existentes).

## Documentação a atualizar

- `docs/GAME_DESIGN.md` §Chefes (campo `adds`).
- `docs/ROADMAP.md` (progresso P4-02b).
- `docs/TECH_DECISIONS.md` **se** `BossSystem` passar a receber `Rng`/`EnemyPool`
  (mudança de contrato do sistema).

## Riscos técnicos

- Determinismo: posição de spawn via `Rng` precisa consumir o gerador num ponto
  fixo da ordem do tick — qualquer condicional que pule consumo quebra o hash.
- Saturação do `EnemyPool` (adds + onda residual) — `maxAlive` e teste de
  esgotamento do pool.
- Dificuldade: adds + padrão do chefe pode estourar a pressão; começar conservador
  (feedback registrado: início mais fácil).

## Sugestão de testes (escrever primeiro)

- Cadência: fase com `intervalTicks=120, count=2, maxAlive=4` ⇒ invoca em t=120,
  240; com 4 vivos, não invoca; ao matar 2, volta a invocar.
- Pool cheio ⇒ invocação falha graciosamente (sem crash, sem alocação).
- Limpeza na derrota do chefe.
- Determinismo/replay com gunner fase 2.
