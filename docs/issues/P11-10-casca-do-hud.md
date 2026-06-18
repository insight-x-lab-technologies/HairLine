# [P11-10] Casca do HUD de gameplay — moldura com o toolkit (ponte p/ Fase 12)

## Objetivo

Aplicar o toolkit da Fase 11 **só à moldura (chrome) do HUD** de gameplay: **pílula
de score**, **botões hexagonais** de pausa/música e o **botão + barra de PULSO**.
É **presentation-only** e theme-agnóstico — o **playfield** (balas, nave,
inimigos, fundo) **não é tocado** (isso é a Fase 12). Mantém o HUD legível e
respeita safe-areas (`hudLayout`). **Nada toca a simulação.**

## Contexto

- Alvo visual: `ref/v1_GamePlay1.png` (moldura de HUD com pílula de score no topo,
  hexágonos de pausa/música, e o botão/barra de PULSO embaixo). O playfield desse
  mockup é a **Fase 12**; aqui é **só a casca**.
- HUD atual na `GameScene` (driver de apresentação): `hud` (texto de score,
  top-left, `GameScene.ts:190`), `pauseBtn` (❚❚, `:199`), `muteBtn` (♪, `:205`),
  `pulseBtn` (◎ PULSO, `:193`), posicionados por `layoutHud()` (`:258`) com
  `hudPadding` (safe-areas). Toolkit pronto: tokens/tipografia/FX/`ui/panel`/
  `ui/button`/ícones (P11-01→05).
- **Decisão estrutural (a registrar — TD) — a barra de PULSO/Foco hoje vive no
  tema.** A barra é desenhada pelo **renderer** (`VectorTheme.drawFocusBar`,
  `VectorTheme.ts:351`, com blip ao ganhar Foco, marca do custo e cor de "pronto"),
  e o `SpriteTheme` a herda. Para a casca do HUD ser **theme-agnóstica** e estilizada
  pelo toolkit (mesmo HUD no Arcade e no Polido), a recomendação desta SDD é
  **mover a barra do `GameRenderer`/`VectorTheme` para a casca do HUD na
  `GameScene`** (a cena já lê `sim.state.focus`/`pulseCost`). Isso **muda a fronteira
  da camada de render** ⇒ **exige TD** (a interface `GameRenderer` deixa de desenhar
  a barra de Foco; a cena passa a desenhá-la, igual para todos os temas). A
  Fase 12 cuida do **playfield**, não do HUD — então a barra sair do tema é coerente
  com a divisão de fases. Alternativa (manter a barra no tema e só reestilizar o
  resto) fica registrada como descartada por acoplar a barra ao tema.

## Requisitos funcionais

1. **Pílula de score** (`ui/panel`/pílula): substitui o texto de score top-left,
   mantendo o conteúdo legível (score e demais campos textuais hoje em `this.hud`),
   posicionada por `layoutHud`/safe-areas.
2. **Botões hexagonais de pausa e música** (`ui/button`, formato hex, ícones
   `pause`/`sound` de P11-05): substituem `pauseBtn`/`muteBtn`, preservando os
   callbacks (`pauseGame`, `toggleMute`) e os atalhos (ESC/P), e o estado do mute
   (♪/♪̸).
3. **Botão + barra de PULSO** (`ui/button` primário + barra do toolkit): o botão
   dispara `requestPulse` (como hoje); a **barra** mostra `focus/focusMax`, a
   **marca do custo** (`pulseCost`), a **cor de "pronto"** (`focus ≥ pulseCost`,
   cue `focusready`) e o **blip** ao ganhar Foco — reproduzindo o comportamento de
   `drawFocusBar`, agora na casca do HUD, **theme-agnóstico**.
4. **Relocar a barra para fora do tema** (conforme a decisão): remover
   `drawFocusBar` (e os campos de blip/estado) do `VectorTheme`/interface
   `GameRenderer`; a cena passa a desenhá-la lendo o estado da sim. **SpriteTheme**
   deixa de herdar a barra (passa a ser chrome único). **Registrar o TD.**
5. **Indicadores textuais** que ficam (estágio "n/m", anúncios "ONDA/CHEFE", dica
   inicial) seguem legíveis no novo acabamento; **não** repaginar a barra de vida
   do chefe nem nada do playfield.
6. **Layout/safe-areas**: tudo continua posicionado por `layoutHud`/`hudPadding`,
   reagindo a resize/rotação como hoje.

## Requisitos não funcionais

- **Presentation-only / determinismo**: nada toca `src/sim`/replay/`hashState()`/
  ranking. A barra lê estado já exposto (`focus`/`pulseCost`); mover seu desenho
  **não** altera a sim (mesmos inputs ⇒ mesmo hash; `verifyReplay` verde).
- **Theme-agnóstico**: a casca do HUD é a **mesma** no Arcade e no Polido (não passa
  pelo sistema de temas) — só o **render do playfield** é theme-gated (Fase 12).
- **Playfield intocado**: nenhuma mudança em balas/nave/inimigos/fundo/partículas.
- **Perf**: chrome estático assado (P11-02); a barra (dinâmica) atualiza sem `new`
  por frame; nada de FX por frame caro no celular.
- **Mobile-first**: alvos de toque confortáveis (hex pequenos com área mínima),
  legível em retrato, respeita safe-areas.

## Critérios de aceite

- [ ] O HUD mostra pílula de score, hexágonos de pausa/música e botão + barra de
      PULSO no estilo do toolkit, fiel à **moldura** do `ref/v1_GamePlay1.png`
      (conferência manual `npm run dev`).
- [ ] A barra de PULSO reproduz fill/custo/"pronto"/blip do comportamento atual,
      agora na casca do HUD e **igual nos dois temas** (Arcade e Polido).
- [ ] Callbacks e atalhos preservados: pausa (botão + ESC/P), mute (botão + estado
      ♪/♪̸), pulso (botão + `requestPulse`).
- [ ] O **playfield não muda** (balas/nave/inimigos/fundo idênticos); a barra de
      vida do chefe e o ponto de hitbox seguem como estão.
- [ ] **TD registrado**: barra de Foco/PULSO movida do `GameRenderer`/`VectorTheme`
      para a casca do HUD da cena (theme-agnóstica).
- [ ] `verifyReplay` verde e mesma `hashState()` para a mesma seed/inputs
      (regressão de determinismo).
- [ ] `npm test`, `npm run build`, `npm run lint`, `npm run typecheck` verdes.

## Arquivos/módulos provavelmente afetados

- `src/scenes/GameScene.ts` (HUD via `ui/panel`/`ui/button`/ícones; `layoutHud`;
  passar a desenhar a barra de PULSO)
- `src/render/VectorTheme.ts` (remover `drawFocusBar` + campos de blip/estado)
- `src/render/GameRenderer.ts` (a interface deixa de prever a barra de Foco)
- `src/render/SpriteTheme.ts` (deixa de herdar a barra)
- `src/ui/panel.ts`, `src/ui/button.ts`, `src/ui/icons.ts`, `src/ui/tokens.ts`,
  `src/ui/fx.ts`, `src/ui/hudLayout.ts` (consumidos)
- `docs/TECH_DECISIONS.md` (novo TD da relocação da barra)
- `tests/` — regressão de determinismo/`verifyReplay`; teste do cálculo da barra se
  extraído como helper puro (fill/custo/ready/blip)

## Fora de escopo

- **Playfield / render de gameplay** (balas, nave, inimigos, fundo, bloom) —
  **Fase 12** (P12-01+). Esta issue é só a **moldura**.
- **Barra de vida do chefe**, telegraphs, anel de graze, ponto de hitbox — seguem
  como estão (legibilidade/Fase 12).
- **PauseScene** (tela de pausa) — não é a casca do HUD; fora daqui.
- Componentes do toolkit (P11-01→05) — apenas consumidos.

## Documentação a atualizar

- `docs/TECH_DECISIONS.md`: **novo TD** — barra de Foco/PULSO movida do tema/
  `GameRenderer` para a casca do HUD na cena (theme-agnóstica); motivação (HUD igual
  nos dois temas; Fase 12 cuida do playfield).
- `docs/ARCHITECTURE.md` (casca do HUD desenhada pela cena via toolkit; a interface
  `GameRenderer` não desenha mais a barra de Foco; HUD não é theme-gated, só o
  playfield é).
- `docs/GAME_DESIGN.md` (atualizar a seção de graze/Foco: a barra de Foco/PULSO
  agora é chrome da cena, não do tema — comportamento idêntico).
- `docs/ROADMAP.md` (progresso P11-10; com isto a Fase 11 fica especificada).

## Riscos técnicos

- **Regredir o feedback de Foco/PULSO** (blip/custo/"pronto"/cue `focusready`) ao
  mover de `drawFocusBar` para a cena — extrair o cálculo como **helper puro**
  testável e cobrir; conferência manual do feel.
- **Tocar o playfield sem querer** ao mexer na cena/tema — manter o escopo na casca;
  o `draw` do tema e o playfield não mudam.
- **Determinismo/replay** — a barra é só leitura de estado; garantir que nada novo
  entra na sim; `verifyReplay` verde.
- **Alvo de toque dos hexágonos pequenos** — área mínima de toque (reusar o hit-test
  de polígono de P11-04).
- **SpriteTheme/VectorTheme divergirem** após remover a barra — garantir que ambos
  perdem a barra e a cena a desenha para os dois.
- **Perf no celular** — chrome assado; a barra dinâmica sem FX caro por frame.

## Sugestão de testes (escrever primeiro)

- (headless) helper puro da barra (se extraído): fill = `focus/focusMax`, posição
  da marca de custo, flag "pronto" em `focus ≥ pulseCost`, gatilho de blip ao
  ganhar Foco — determinístico.
- (regressão) determinismo + `verifyReplay` verdes: mover a barra não muda hash/
  replay.
- (regressão) o `draw` do tema/playfield permanece inalterado (sem novos elementos
  de playfield).
- Fidelidade da moldura ao mockup, feel da barra/pulso, pausa/mute, toque nos
  hexágonos: **manual** (checklist no PR, `TEST_STRATEGY.md`).
