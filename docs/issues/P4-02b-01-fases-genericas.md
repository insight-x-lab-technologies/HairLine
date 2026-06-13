# [P4-02b-01] Fases de chefe genéricas e data-driven (N fases, thresholds configuráveis)

## Objetivo

Substituir o modelo rígido de "2 fases, troca em 50% de HP" (hardcoded em
`Boss.onHit`) por um schema de fases declarativo em JSON, suportando **N fases**
com thresholds de HP configuráveis. É o alicerce de todas as mecânicas de
P4-02b (escudo, adds, partes, teleporte).

## Contexto

- `BossDef.phasePatternIds: string[]` só permite trocar o padrão de bala; a
  transição em `maxHp / 2` está fixa em `src/systems/BossSystem.ts` (`Boss.onHit`).
- ROADMAP P4-02b pede "fases ≥3". GAME_DESIGN §Chefes registra a limitação atual.
- As mecânicas das próximas issues (escudo/adds/partes/teleporte) serão campos
  **opcionais por fase** neste novo schema — esta issue define só o contêiner.

## Requisitos funcionais

1. Novo campo `phases` em `src/data/bosses/*.json`: lista ordenada de objetos
   `{ patternId: string, untilHpPct: number }` (a fase vale enquanto
   `hp/maxHp > untilHpPct`; a última usa `0`). Mínimo 2, sem máximo.
2. `Boss`/`BossSystem` trocam de fase ao cruzar cada threshold, reiniciando
   `phaseAge` (comportamento atual preservado).
3. Migrar os 4 chefes (warden, spinner, gunner, vortex) para o novo formato,
   **mantendo o comportamento atual** (2 fases, threshold 0.5).
4. Remover `phasePatternIds` (formato antigo) de tipos, dados e `content/index.ts`
   — sem suporte duplo; o jogo ainda não lançou.
5. Validação no registro (`src/content/index.ts`): thresholds estritamente
   decrescentes, última fase com `untilHpPct === 0`, `patternId` existente.

## Requisitos não funcionais

- Determinismo intacto: mesma seed/inputs ⇒ mesmo `hashState()` (transição de
  fase é função pura do HP).
- Sem alocação no loop: fases resolvidas/cacheadas na construção do `BossSystem`.
- Dados em JSON, nunca hardcoded (CLAUDE.md §3).

## Critérios de aceite

- [ ] Um chefe de teste com 3 fases (thresholds 0.66/0.33/0) troca de padrão nos
      pontos corretos em teste headless.
- [ ] Os 4 chefes migrados jogam exatamente como antes (testes existentes de
      `BossSystem`/`BossDirector`/`BossRushDirector`/`Simulation` passam, ajustados
      apenas no formato dos dados de fixture, com justificativa no commit).
- [ ] JSON inválido (threshold fora de ordem, patternId inexistente) falha no
      teste de validação de conteúdo (`tests/content.test.ts`).
- [ ] `npm run build`, `npm test`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/content/types.ts` (`BossDef` → `BossPhaseDef[]`), `src/content/index.ts`
- `src/systems/BossSystem.ts` (Boss.onHit, resolução de fase)
- `src/data/bosses/*.json` (4 arquivos)
- `tests/BossSystem.test.ts`, `tests/content.test.ts`

## Fora de escopo

- Qualquer mecânica nova (escudo, adds, partes, teleporte) — issues seguintes.
- Chefe novo de 3+ fases "de verdade" (P4-02b-06).
- Mudança de movimento (vaivém continua igual).

## Documentação a atualizar

- `docs/GAME_DESIGN.md` §Chefes (novo schema de fases).
- `docs/TECH_DECISIONS.md` — **registrar a decisão do schema** (CLAUDE.md exige).
- `docs/ROADMAP.md` (nota de progresso em P4-02b).

## Riscos técnicos

- Quebra silenciosa de replays/verificação se a ordem de avaliação da transição
  mudar (hoje a troca acontece dentro de `onHit`; manter o mesmo ponto).
- Fixtures de teste espalhadas usando `phasePatternIds` — migrar todas de uma vez.

## Sugestão de testes (escrever primeiro)

- `Boss` com 3 fases: HP 100 → dano até 65 ⇒ fase 1; até 32 ⇒ fase 2; `phaseAge`
  zera a cada transição.
- Dano que atravessa dois thresholds num golpe ⇒ cai direto na fase correta.
- Determinismo: duas simulações com chefe de 3 fases ⇒ hashes idênticos.
- Validação: thresholds não decrescentes ⇒ erro no registro de conteúdo.
