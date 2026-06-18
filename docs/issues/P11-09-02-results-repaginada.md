# [P11-09-02] Results repaginada — placar, ranking, share, verify e toasts com o toolkit

## Objetivo

Repaginar a `ResultsScene` aplicando o vocabulário do toolkit da Fase 11 (cards,
pílulas, botões, tokens) aos blocos existentes — **placar** (score/graze/nível,
★ novo recorde), **toasts de conquista**, **bloco de estágio**, **bloco do Desafio
Diário** (verificação anti-cheat + envio/listagem do ranking) e **share** — por
consistência visual. **Sem novo dado/lógica; toda a lógica de Results permanece
intacta. Nada toca a simulação.**

## Contexto

- A `ResultsScene` (243 linhas) é a mais densa: além do placar, dispara
  `setBestScore`, `recordAndUnlock`+`toastQueue` (toasts), `recordStageResult`
  (estágio), `verifyReplay` + envio/listagem de ranking (Diário) e share
  (`shareCard`/`shareResult`). Tudo isso **continua igual** — esta issue troca só o
  **desenho**.
- **Linha vermelha — lógica intacta**: `verifyReplay` (anti-cheat), o gating do
  Diário, o registro de recorde/perfil, as conquistas e o share **não mudam**.
  Repaginar não pode alterar o que é submetido/verificado.
- Toolkit pronto: tokens (P11-01-01), tipografia (P11-01-02), FX (P11-02),
  `ui/panel` (P11-03), `ui/button` (P11-04), ícones (P11-05). Os **toasts de
  conquista** já têm modelo puro (`ui/achievements.toastQueue`) — reusar, só
  repaginar o banner.
- Sem mockup dedicado de Results nos `ref/v1_*`; seguir o vocabulário das telas já
  repaginadas (e o `ref/v0_GameOver.jpeg` como referência do conteúdo atual).

## Requisitos funcionais

1. **Placar** num card/pílulas: título (vitória/derrota), `SCORE`, `GRAZE`/`NÍVEL`,
   e o realce **★ NOVO RECORDE** vs. "recorde {best}" — mesmos valores/condições de
   hoje (`setBestScore`/`getBestScore`).
2. **Toasts de conquista**: o banner sequenciado no topo (cue `achievement`) no
   acabamento do toolkit, alimentado por `toastQueue(recordAndUnlock(...))`
   **inalterado**; não cobrir o placar.
3. **Bloco de estágio** (modo `stage`): "concluído/desbloqueado/recorde do estágio"
   via `recordStageResult` **inalterado**, repaginado.
4. **Bloco do Desafio Diário**: indicador de **verificação** (`verifyReplay().ok`),
   `DIÁRIO {dayKey}`, estado de carregamento e listagem do ranking — comportamento
   e textos preservados, só repaginados (cards/pílulas).
5. **Share** (texto `shareCard` + imagem `shareResult`) e **navegação de saída**
   (toque/ENTER → Menu) como botões/affordances do toolkit, mantendo o
   comportamento atual.
6. **Botões** (`ui/button`) onde hoje há `neonText` interativo (voltar/share),
   coerentes com o restante.

## Requisitos não funcionais

- **Presentation-only**: nada toca `src/sim`/replay/`hashState()`/ranking de forma
  a mudar resultado; `verifyReplay`/submissão/`SaveService`/`Cosmetics`/share
  **sem mudança de comportamento**.
- **Perf**: cards/pílulas estáticos assados (P11-02/03); toasts/animação por tempo
  de parede; zero alocação por frame.
- **Mobile-first**: legível em retrato, safe-areas, alvos de toque confortáveis.
- **Robustez assíncrona**: o bloco de ranking continua assíncrono (carregando →
  lista/erro) sem travar a cena.
- **Consistência**: mesma linguagem das outras telas; cores/tokens.

## Critérios de aceite

- [ ] Results mostra placar, toasts de conquista, bloco de estágio, bloco do Diário
      (verify + ranking) e share no estilo do toolkit, consistente com as demais
      telas (conferência manual `npm run dev`).
- [ ] **Toda a lógica permanece**: recorde, conquistas, `verifyReplay`, gating do
      Diário, `recordStageResult`, envio/listagem do ranking e share funcionam como
      antes (mesmos valores submetidos/verificados).
- [ ] Toasts sequenciados não cobrem o placar; cue `achievement` mantido.
- [ ] Saída (toque/ENTER) e share continuam funcionando.
- [ ] `verifyReplay`/`SaveService`/`Cosmetics`/share sem mudança de comportamento
      (regressão verde).
- [ ] `npm test`, `npm run build`, `npm run lint`, `npm run typecheck` verdes.
- [ ] Regressão de determinismo: mesma seed/inputs ⇒ mesmo `hashState()`/replay;
      `verifyReplay` continua verde nos cenários cobertos.

## Arquivos/módulos provavelmente afetados

- `src/scenes/ResultsScene.ts` (desenhar via `ui/panel`/`ui/button`/ícones;
  preservar toda a lógica)
- `src/ui/panel.ts`, `src/ui/button.ts`, `src/ui/icons.ts`, `src/ui/tokens.ts`,
  `src/ui/fx.ts` (consumidos)
- `src/ui/achievements.ts` (`toastQueue` consumido **sem alterar**)
- serviços consumidos **sem alterar**: `SaveService`, `Replay`/`verifyReplay`,
  `LeaderboardService`, `ShareCard`/`ShareImage`, `Achievements`
- `tests/achievements-ui.test.ts` / regressão de Results (na medida do testável)

## Fora de escopo

- **Stats** — **P11-09-01**.
- **Mudar anti-cheat/ranking/share/conquistas** — só repaginar.
- **HUD de gameplay** (casca) — P11-10.
- Componentes do toolkit (P11-01→05) — apenas consumidos.

## Documentação a atualizar

- `docs/ARCHITECTURE.md` (Results: `ResultsScene` desenha via toolkit; lógica de
  recorde/conquistas/verify/ranking/share intacta).
- `docs/GAME_DESIGN.md` (nota: Results repaginado — visual, sem mudança de
  comportamento).
- `docs/ROADMAP.md` (progresso P11-09 — parte Results; fechar P11-09 ao concluir
  01+02).
- `docs/TECH_DECISIONS.md`: **não** abrir TD (consome a virada de P11-06-01).

## Riscos técnicos

- **Regredir a lógica densa** (recorde/conquistas/verify/ranking/share) ao mexer no
  desenho — manter as chamadas idênticas; cobrir por regressão e conferência.
- **Quebrar a verificação anti-cheat/gating do Diário** — não tocar `verifyReplay`
  nem o que é submetido; é a parte mais sensível.
- **Toasts cobrindo o placar / ordem de animação** — preservar a sequência e o não
  sobrepor.
- **Bloco de ranking assíncrono** — preservar estados carregando/lista/erro sem
  travar.
- **Perf de glow** — assar cards estáticos (P11-02).

## Sugestão de testes (escrever primeiro)

- (regressão) `toastQueue`/`recordAndUnlock`, `setBestScore`, `recordStageResult`,
  `verifyReplay` inalterados (mesmas saídas).
- (headless) se houver layout puro novo: posições dos blocos/cards.
- Regressão de determinismo + `verifyReplay` verde (reexecutar).
- Fidelidade visual, toasts, bloco do Diário (verify + ranking), share e saída:
  **manual** (checklist no PR, `TEST_STRATEGY.md`).
