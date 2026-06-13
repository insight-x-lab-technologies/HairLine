# [P6-02-01] Motor de conquistas (definições em dados + avaliação pura)

## Objetivo

Criar o sistema de conquistas: definições declarativas em
`src/data/achievements.json` e um **avaliador puro** que, ao fim de cada run,
cruza `RunSummary` + estatísticas do perfil e devolve o que foi desbloqueado.
Sem UI nesta issue (P6-02-02) — mas com persistência e teste completos.

## Contexto

- Depende de **P6-03-01** (perfil, `RunSummary`, `recordRun`).
- Princípio do projeto: dados separados de código — conquistas são conteúdo,
  vão para JSON como padrões/chefes; o avaliador é genérico.
- Conquistas também servirão de **condição de desbloqueio de cosméticos**
  (P6-01) — o ID estável de cada conquista é contrato público interno.
- Avaliação é **pós-run** (no mesmo ponto canônico do `recordRun`): nada de
  checagem por tick, nada na simulação.

## Requisitos funcionais

1. Schema da conquista: `id` (estável, kebab-case), `title`, `desc`, e uma
   `condition` declarativa de tipos enumerados — iniciais:
   `totalAtLeast` (campo de `totals` ≥ N), `runStat` (campo do `RunSummary`
   ≥/≤ N, com modo opcional), `bestAtLeast` (recorde por modo ≥ N),
   `winMode` (vencer em um modo). Sem expressões/eval — só dados.
2. Avaliador puro: `(defs, profile, run, unlockedIds) => newlyUnlockedIds`.
   Determinístico, sem I/O; idempotente (já desbloqueada nunca re-desbloqueia).
3. Persistência no perfil: `achievements: { [id]: dateIso }` (data do
   desbloqueio). Integrado ao fluxo de fim de run, após `recordRun`.
4. Conteúdo inicial: ~10 conquistas em JSON cobrindo o vocabulário do jogo —
   ex.: primeiras (1ª run, 1ª vitória), volume (1k/10k grazes totais),
   habilidade (run sem tomar dano e vencer; X grazes numa run só), modos
   (vencer boss rush; jogar um Diário), recorde (Y pontos no Endless).
   Balanceamento dos números é livre — são dados.
5. Validação de integridade: IDs únicos, condições com tipos/campos
   conhecidos, números finitos (no estilo `tests/content.test.ts`).
6. Conquistas removidas do JSON não somem do perfil (desbloqueada é histórico
   do jogador); conquista nova entra valendo nas próximas runs.

## Requisitos não funcionais

- 100% headless e testável; zero acoplamento com Phaser.
- Avaliação O(defs) uma vez por fim de run — custo irrelevante.
- Sim/replay/`hashState()`/leaderboard intactos (conquista nunca dá vantagem
  de gameplay — regra de ouro da visão).

## Critérios de aceite

- [ ] Headless: avaliador coberto para cada tipo de condição (satisfeita,
      não satisfeita, borda exata do limiar).
- [ ] Idempotência: rodar duas vezes com o mesmo estado não re-desbloqueia.
- [ ] Persistência: desbloqueio sobrevive a recarregar o perfil; data gravada.
- [ ] Integridade: JSON inicial validado (IDs únicos, condições sãs);
      condição com tipo desconhecido é acusada.
- [ ] Fluxo real: terminar uma run que satisfaz "primeira run" grava a
      conquista (conferência via perfil; UI é a P6-02-02).
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/data/achievements.json` (novo)
- `src/services/Achievements.ts` (novo — tipos + avaliador puro)
- `src/content/` (carregamento/validação, padrão `getPattern`)
- `src/services/SaveService.ts` (campo `achievements` no perfil)
- Ponto de fim de run (onde `recordRun` é chamado) — uma chamada a mais
- `tests/Achievements.test.ts` (novo)

## Fora de escopo

- Toda a UI: toasts, tela de conquistas, progresso parcial (P6-02-02).
- Condições em tempo real durante a run (ex.: "3 pulsos em 10 s") — exigiria
  instrumentação na sim; se algum dia entrar, é decisão de arquitetura para
  `TECH_DECISIONS.md`.
- Conquistas como moeda/recompensa além de desbloquear cosméticos.
- Sincronização/anti-cheat de conquistas (perfil é local e pessoal).

## Documentação a atualizar

- `docs/GAME_DESIGN.md` (seção curta: conquistas, tipos de condição).
- `docs/TECH_DECISIONS.md` (TD: condições declarativas enumeradas, avaliação
  pós-run apenas).
- `docs/ROADMAP.md` (progresso P6-02).

## Riscos técnicos

- Vocabulário de condições crescer caso a caso até virar linguagem — os 4
  tipos iniciais cobrem as ~10 conquistas; tipo novo só com conquista que
  justifique.
- IDs renomeados quebram desbloqueios antigos e referências de cosméticos —
  IDs são imutáveis (documentar no JSON).
- "Run sem tomar dano" precisa do dado no `RunSummary` (vidas perdidas ou
  flag) — se não existir na P6-03-01, adicionar campo barato aqui (derivável
  do `GameState.lives` final vs inicial).

## Sugestão de testes (escrever primeiro)

- `totalAtLeast`: total 999/1000/1001 vs limiar 1000 ⇒ falso/verdadeiro/
  verdadeiro.
- `runStat` com modo: graze alto em endless não desbloqueia conquista do
  daily.
- `winMode`: derrota não desbloqueia; vitória no modo certo sim.
- Conjunto: run que satisfaz 3 condições ⇒ 3 IDs novos, ordem estável.
- Perfil com conquista de ID que não existe mais no JSON ⇒ preservada, sem
  erro.
