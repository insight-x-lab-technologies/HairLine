# [P6-03-01] Perfil persistente + estatísticas acumuladas (fundação da Fase 6)

## Objetivo

Evoluir o `SaveService` para um **perfil local versionado** que acumula
estatísticas de todas as runs (totais e recordes por modo). É a fundação de
dados de toda a Fase 6: conquistas (P6-02) leem essas estatísticas e
cosméticos (P6-01) desbloqueiam por elas.

## Contexto

- `SaveService` hoje persiste **um número** (`hairline.bestScore`), com store
  injetável e fallback em memória — base certa, escopo mínimo.
- Ao fim da run, `GameState` já tem `score`, `kills`, `grazeCount`, `won`;
  a `Simulation` tem o tick corrente (duração) e a cena sabe modo, seed e
  mods. Falta só consolidar isso num resumo e acumular.
- Perfil é estado do **jogador**, não do jogo: nada disso entra na simulação,
  no replay ou no `hashState()`.

## Requisitos funcionais

1. Tipo `RunSummary`: `mode`, `score`, `kills`, `grazeCount`, `durationTicks`,
   `won`, `dateIso`, `seed` (campos disponíveis hoje; nada que exija
   instrumentar a sim).
2. Perfil versionado em uma chave única (`hairline.profile`, JSON com campo
   `version: 1`): `totals` (runs, kills, grazes, ticks jogados, vitórias) e
   `bestByMode` (melhor score por modo: endless, daily, bossrush, weekly).
3. `SaveService.recordRun(summary)`: acumula totais, atualiza recordes,
   grava. Retorna o que mudou (ex.: `{ newBest: boolean }`) para a UI usar.
4. Migração: na primeira leitura sem perfil, importar `hairline.bestScore`
   legado para `bestByMode.endless` (manter a chave antiga intacta — rollback
   barato).
5. Robustez de leitura: JSON corrompido/versão desconhecida ⇒ perfil novo
   zerado (nunca quebrar o jogo por save ruim); dado inválido não derruba a
   gravação seguinte.
6. Integração: ao terminar a run (transição para `ResultsScene`), montar o
   `RunSummary` e chamar `recordRun` — substituindo o uso atual de
   `setBestScore` (que fica como fachada ou é absorvido).

## Requisitos não funcionais

- 100% headless e testável (store injetável já existente).
- Gravação síncrona e pequena (perfil é KB); uma escrita por fim de run, nunca
  durante o gameplay.
- Determinismo/replay/leaderboard intocados (perfil é leitura/UI).
- Schema pensado para extensão (P6-02 guardará conquistas, P6-01 desbloques e
  seleção, P6-03-02 o histórico) — campos novos não devem exigir `version` 2.

## Critérios de aceite

- [ ] Headless: `recordRun` acumula totais corretamente em sequência de runs
      e atualiza `bestByMode` só quando supera.
- [ ] Migração do `bestScore` legado coberta por teste (com e sem valor).
- [ ] Perfil corrompido ⇒ reset limpo sem exceção (teste com JSON inválido).
- [ ] Fim de run real grava perfil (conferência manual: jogar, recarregar a
      página, melhor score por modo presente).
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/services/SaveService.ts` (perfil, `recordRun`, migração)
- `src/scenes/GameScene.ts` ou `src/scenes/ResultsScene.ts` (montar
  `RunSummary` no fim da run — onde o fluxo de fim já vive)
- `tests/SaveService.test.ts`

## Fora de escopo

- Histórico de runs individuais e tela de estatísticas (P6-03-02).
- Conquistas (P6-02) e cosméticos (P6-01) — só o solo onde vão plantar.
- Sincronização remota de perfil / export-import.
- Estatísticas que exigem instrumentar a sim (ex.: balas grazeadas por tipo).

## Documentação a atualizar

- `docs/ARCHITECTURE.md` (perfil local: o que é, o que nunca contém).
- `docs/TECH_DECISIONS.md` (TD: perfil JSON versionado único vs N chaves;
  política de corrupção = reset).
- `docs/ROADMAP.md` (progresso P6-03).

## Riscos técnicos

- Schema mal pensado agora custa migrações depois — revisar contra as
  necessidades já conhecidas de P6-01/02/03b antes de fechar o tipo.
- Gravar em pontos múltiplos (game over, vitória, sair no meio) pode duplicar
  ou perder runs — definir **um** ponto canônico de `recordRun` (a transição
  para Results) e tratar abandono de run como "não conta" (documentar).
- `durationTicks` de runs abandonadas/pausadas — só contar runs finalizadas
  nesta issue; refinar depois se necessário.

## Sugestão de testes (escrever primeiro)

- Duas runs endless + uma daily ⇒ totais somados, `bestByMode` correto por
  modo, vitórias contadas.
- Run com score menor não rebaixa recorde.
- Migração: store com `hairline.bestScore=5000` ⇒ perfil nasce com
  `bestByMode.endless = 5000`.
- JSON lixo na chave do perfil ⇒ perfil zerado, `recordRun` seguinte funciona.
- `version` desconhecida ⇒ tratado como corrompido (reset), sem exceção.
