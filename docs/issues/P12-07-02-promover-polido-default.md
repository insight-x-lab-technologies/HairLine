# [P12-07-02] Promover "Polido" a tema default (Arcade segue selecionável)

## Objetivo

Tornar o **"Polido"** o **tema default** do jogo (visual de gameplay padrão para
quem nunca escolheu), mantendo o **"Arcade"** vetorial **selecionável** como
alternativa de acessibilidade/perf. É a virada final da Fase 12: uma mudança de
**uma constante** (`DEFAULT_THEME_ID`) + **um TD** registrando a decisão e suas
consequências (primeira carga/PWA, escape hatches). **Presentation-only ⇒
determinismo/Diário/ranking intactos.** Depende do **go** da QA (P12-07-01).

## Contexto

- O default vive em `src/config/themes.ts`: `export const DEFAULT_THEME_ID =
  'arcade';`, usado por `defaultTheme()`/`resolveTheme()` quando não há escolha
  persistida ou ela é inválida. A escolha do jogador fica em `hairline.theme.v1`
  (`SaveService`) e **tem precedência** — quem já escolheu um tema **não** é afetado.
- O ROADMAP (abertura da Fase 12) **já decidiu**: "promover o 'Polido' a tema
  default, mantendo o 'Arcade' vetorial como alternativa (acessibilidade/perf,
  P5-05/06)" e pede **registrar a decisão na SDD**. As **escape hatches** já existem:
  o **toggle de qualidade** (P12-01-01, desliga bloom) e o **Arcade selecionável**
  (seletor de tema / painel de settings).
- **Consequência de produto:** novos usuários (sem escolha) passam a **baixar sob
  demanda** os assets do Polido (`sprites/**`, `audio/**`) — que **seguem fora do
  precache PWA** (`globIgnores`), então não incham o app shell, mas mudam a
  **primeira experiência** (rede + fallback gracioso enquanto carrega). Isso deve
  estar coberto pelo "peso/PWA" do QA (P12-07-01).
- **Linha vermelha:** o **Desafio Diário** força a nave default por justiça (P6-04),
  mas o **tema é presentation-only** — mudar o default **não** altera seed/inputs/
  hash/replay/ranking. Mesma corrida, pele diferente.

## Requisitos funcionais

1. **Flip do default**: `DEFAULT_THEME_ID = 'polido'` em `src/config/themes.ts`,
   garantindo que `defaultTheme()`/`resolveTheme(null)` retornam o "Polido" e que o
   id é válido/registrado.
2. **Arcade selecionável e funcional**: o seletor de tema / painel de settings
   continua oferecendo o "Arcade", que aplica e persiste normalmente; quem escolher
   Arcade tem o vetorial+synth como hoje.
3. **Respeitar escolha persistida**: usuários com `hairline.theme.v1` já gravado
   **mantêm** sua escolha (o flip só muda o caso "sem escolha/ inválido").
4. **Fallback gracioso na primeira carga**: enquanto os assets do Polido carregam
   (ou se faltarem), o jogo permanece jogável (vetorial/synth por peça) — confirmar
   que o default novo não trava nem fica em branco.
5. **Determinismo/Diário**: confirmar por regressão que ativar o Polido como default
   **não** muda `hashState()`/replay; o Diário segue justo (tema é cosmético de
   apresentação, ≠ classe de nave).
6. **Registrar o TD**: documentar a decisão (Polido default; Arcade alternativa de
   acessibilidade/perf; escape hatches = toggle de qualidade + seletor; impacto de
   primeira carga/PWA; presentation-only).

## Requisitos não funcionais

- **Presentation-only / determinismo**: nada toca sim/replay/`hashState()`/Diário/
  ranking; só muda o **id de tema default**.
- **Reversível**: a virada é uma constante — fácil reverter se a telemetria/feedback
  pedir (registrar isso no TD).
- **Sem regressão de persistência**: chaves do `SaveService` inalteradas; só o
  **fallback** de tema muda.
- **Perf/acessibilidade**: o default mais pesado é mitigado pelo toggle de qualidade
  (P12-01-01) e pelo Arcade; idealmente **após** P5-06 fechar o orçamento de frame,
  mas não bloqueante se o QA (P12-07-01) deu **go** com a qualidade baixa aceitável.

## Critérios de aceite

- [ ] `DEFAULT_THEME_ID === 'polido'`; um jogador **sem escolha** entra no "Polido"
      (conferência manual `npm run dev` com `hairline.theme.v1` ausente).
- [ ] Um jogador com tema **já escolhido** mantém a escolha (Arcade ou Polido).
- [ ] O "Arcade" segue selecionável e aplica/persiste normalmente.
- [ ] Primeira carga com assets ainda baixando ⇒ jogo jogável (fallback por peça),
      sem tela branca/erro.
- [ ] **TD registrado** em `docs/TECH_DECISIONS.md` (Polido default + alternativa
      Arcade + escape hatches + impacto PWA + presentation-only + reversibilidade).
- [ ] `npm test`, `npm run build`, `npm run lint`, `npm run typecheck` verdes;
      regressão de determinismo/Diário verde (hash/replay byte-idênticos).

## Arquivos/módulos provavelmente afetados

- `src/config/themes.ts` (`DEFAULT_THEME_ID = 'polido'`)
- `tests/themes.test.ts` (atualizar expectativa do default; cobrir
  `resolveTheme(null)`→polido e precedência da escolha persistida)
- `docs/TECH_DECISIONS.md` (novo TD)
- *(conferência, sem alterar)* `src/services/SaveService.ts`,
  `src/scenes/PreloadScene.ts`, `src/scenes/MenuScene.ts` (seletor/painel)

## Fora de escopo

- **QA/conferência** do tema — P12-07-01 (gate desta issue).
- **Daltonismo/alto contraste** (P5-05) e **modo de qualidade/orçamento de frame
  completo** (P5-06) — o flip se apoia no toggle de P12-01-01 e no Arcade, sem
  esperar P5-05/06 fecharem (a menos que o QA dê no-go).
- **Mudar o que cada tema desenha/toca** — Fase 10/12, já entregue.
- **Remover/aposentar o Arcade** — ele permanece como alternativa.

## Documentação a atualizar

- `docs/TECH_DECISIONS.md` (**novo TD** — a decisão e consequências).
- `docs/GAME_DESIGN.md` / `docs/PRODUCT_VISION.md` (o visual padrão do jogo agora é
  o "Polido"; Arcade é alternativa de acessibilidade/perf).
- `docs/ARCHITECTURE.md` (nota: `DEFAULT_THEME_ID` = polido; precedência da escolha
  persistida; PWA/precache inalterado).
- `docs/ROADMAP.md` (**fechar P12-07 e a Fase 12** ao concluir 01+02; atualizar o
  resumo de progresso/Fase 12).

## Riscos técnicos

- **Primeira carga mais pesada/lenta** para novos usuários (assets sob demanda) —
  mitigado por fallback gracioso + fora do precache; confirmar no QA; reversível.
- **Promover cedo demais** (FPS ruim em celular fraco) — só flipar com **go** do QA
  (P12-07-01); o toggle de qualidade e o Arcade são as saídas.
- **Quebrar replays/Diário** — **não** deve acontecer (tema é presentation-only);
  blindar com regressão de hash/replay (linha vermelha).
- **Teste do default desatualizado** — `tests/themes.test.ts` provavelmente fixa
  `arcade`; atualizar para `polido` e cobrir precedência da escolha persistida.
- **Acessibilidade**: default mais "brilhante" pode incomodar sensíveis a flashes —
  encaminhar P5-05; o Arcade/qualidade baixa cobrem o caso enquanto isso.

## Sugestão de testes (escrever primeiro)

- (headless) `resolveTheme(null)`/`defaultTheme()` ⇒ `polido`; `resolveTheme('arcade')`
  ⇒ arcade; valor inválido ⇒ default (polido); precedência da escolha persistida.
- (regressão) determinismo/Diário: mesma seed/inputs ⇒ mesmo `hashState()`/replay
  com o novo default (byte-idêntico ao histórico — tema não entra no hash).
- Conferência manual: usuário sem escolha entra no Polido; com escolha mantém;
  Arcade selecionável; primeira carga jogável — **checklist no PR**
  (`TEST_STRATEGY.md`).
