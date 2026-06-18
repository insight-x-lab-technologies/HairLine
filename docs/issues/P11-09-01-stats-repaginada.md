# [P11-09-01] Stats repaginada — cards/pílulas/botões do toolkit

## Objetivo

Repaginar a `StatsScene` aplicando o vocabulário do toolkit da Fase 11 (cards,
pílulas, botões, tokens) aos três blocos existentes — **totais**, **recordes por
modo** e **histórico recente** — além do **estado vazio** amigável e do botão
**VOLTAR**. Reusa o modelo puro `ui/stats` **intacto**. **Sem novo dado/lógica.
Nada toca a simulação.**

## Contexto

- A `StatsScene` (101 linhas) hoje desenha tudo como `neonText`/linhas soltas. O
  dado vem de `ui/stats.statsModel(totals, bestByMode, history)` → `StatsModel`
  (totais formatados, `BestRow[]`, `HistoryRow[]`), com formatação **derivada**
  (`formatDuration` ticks⇒mm:ss, `formatDateShort`). Esta issue troca só o
  **desenho**.
- Toolkit pronto: tokens (P11-01-01), tipografia (P11-01-02), FX (P11-02),
  `ui/panel` (P11-03), `ui/button` (P11-04), ícones (P11-05).
- É consistência visual com Conquistas/Hangar/Home — mesma linguagem de card/
  pílula. Sem mockup dedicado nos `ref/v1_*`; seguir o vocabulário das telas já
  repaginadas.
- O perfil que isto lê é **estado do jogador**, fora da sim/replay/ranking (TD-24).

## Requisitos funcionais

1. **Bloco de totais**: cartão/pílulas com runs, vitórias, abates, grazes e tempo
   jogado (valores formatados de `statsModel`), com tipografia/tokens.
2. **Bloco de recordes por modo**: linha/cartão por `BestRow` (label + score) — só
   os modos que existem (como hoje).
3. **Bloco de histórico recente**: lista das últimas runs (`HistoryRow`: data
   curta, modo, score, vitória/derrota, duração) com o acabamento do toolkit;
   rolagem se exceder a altura útil.
4. **Estado vazio**: jogador sem runs vê o convite amigável atual ("jogue uma run
   para começar") no novo estilo, sem números quebrados.
5. **Botão VOLTAR** (`ui/button`, secundário) → `SceneKeys.Menu` (mantém ESC).

## Requisitos não funcionais

- **Presentation-only**: nada toca `src/sim`/replay/`hashState()`/ranking; `ui/
  stats`/`SaveService` **sem mudança** (formatação continua derivada, não
  armazenada).
- **Perf**: cards/pílulas estáticos assados (P11-02/03); zero alocação por frame;
  rolagem fluida (reposicionar, não recriar).
- **Mobile-first**: legível em retrato, alvos de toque confortáveis, safe-areas.
- **Consistência**: cores/raios/espaçamentos só dos tokens; mesma linguagem das
  outras telas.

## Critérios de aceite

- [ ] Stats mostra totais, recordes por modo e histórico com cards/pílulas do
      toolkit + VOLTAR, e o estado vazio amigável — consistente com Conquistas/
      Hangar (conferência manual `npm run dev`).
- [ ] Os valores vêm de `statsModel` **sem alteração** (formatação derivada
      preservada).
- [ ] Histórico longo é percorrível (rolagem/paginação) sem cortar header/VOLTAR;
      ESC e botão voltam ao Menu.
- [ ] `ui/stats`/`SaveService` sem mudança de formato (regressão verde).
- [ ] `npm test`, `npm run build`, `npm run lint`, `npm run typecheck` verdes.
- [ ] Regressão de determinismo: mesma seed/inputs ⇒ mesmo `hashState()`/replay.

## Arquivos/módulos provavelmente afetados

- `src/scenes/StatsScene.ts` (desenhar via `ui/panel`/`ui/button`/ícones; rolagem)
- `src/ui/panel.ts`, `src/ui/button.ts`, `src/ui/tokens.ts`, `src/ui/fx.ts`
  (consumidos)
- `src/ui/stats.ts` (consumido **sem alterar**; só helper de layout/rolagem puro se
  necessário)
- `tests/stats-ui.test.ts` (estender se houver layout puro novo)

## Fora de escopo

- **Results** (placar/ranking/share/toasts) — **P11-09-02**.
- **Mudar o dado/lógica** de stats/perfil (P6-03) — só repaginar.
- Novos números/estatísticas (a fase ignora economia/rank/nível dos mockups).
- Componentes do toolkit (P11-01→05) — apenas consumidos.

## Documentação a atualizar

- `docs/ARCHITECTURE.md` (Stats: `StatsScene` desenha via toolkit; `ui/stats`
  intacto).
- `docs/ROADMAP.md` (progresso P11-09 — parte Stats).
- `docs/TECH_DECISIONS.md`: **não** abrir TD (consome a virada de P11-06-01).

## Riscos técnicos

- **Histórico não cabe** (até 20 runs) — rolagem/paginação respeitando safe-areas.
- **Perf de glow por card** — assar estáticos (P11-02).
- **Regressão do dado** — não tocar `statsModel`/`SaveService`; conferir formatação
  (mm:ss, data curta).
- **Estado vazio** — não quebrar com perfil sem runs.

## Sugestão de testes (escrever primeiro)

- (headless) se houver layout/rolagem puro: posições dos blocos, faixa visível,
  clamp do scroll.
- (regressão) `statsModel`/formatação inalterados (totais, `BestRow`, `HistoryRow`).
- Regressão de determinismo (reexecutar): Stats não muda hash/replay.
- Fidelidade visual, rolagem, estado vazio e voltar: **manual** (checklist no PR,
  `TEST_STRATEGY.md`).
