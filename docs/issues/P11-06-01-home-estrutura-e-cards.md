# [P11-06-01] Home repaginada — estrutura, cards de modo, botão primário, meta e rodapé

## Objetivo

Repaginar a **estrutura** da tela inicial (`MenuScene`) aplicando o toolkit da
Fase 11 (tokens, FX, `ui/panel`, `ui/button`, ícones): **5 cards de modo**
(Endless / Estágios / **Diário em destaque dourado** / Boss Rush / Evento Semanal)
com ícone + título + subtítulo + chevron, **botão primário** de início, **fileira
de meta** (Hangar/Conquistas/Stats) como botões e **rodapé** (share/doação/versão)
no acabamento novo. Estende o modelo puro `ui/home` com as **caixas dos cards** e
**mantém intacta** a lógica de `start()`/payloads e o gating do Diário. **Registra
o novo TD** (supersede TD-26). **Nada toca a simulação.**

## Contexto

- Alvo visual: `ref/v1_MenuPrincipal.png`. A Home atual (`ref/v0_MenuPrincipal.jpeg`)
  é "programmer-art" com botões de texto soltos (`MenuScene.create` desenha cada
  modo como `neonText` interativo).
- O toolkit já existe: tokens (P11-01-01), tipografia (P11-01-02), FX (P11-02),
  `ui/panel` (P11-03), `ui/button` (P11-04), ícones (P11-05). **Esta issue é
  aplicação** — montar a Home com esses componentes.
- O modelo puro `ui/home` hoje produz **âncoras de linha** (`endless`, `stages`,
  `daily`, …). Para cards é preciso estendê-lo com **caixas** (`x/y/w/h`) por card
  de modo, por botão de meta e pelo botão primário — mantendo o fluxo responsivo
  (header → bloco de menu → rodapé reservado) e a compressão em telas curtas.
- **Linha vermelha — comportamento intacto**: a lógica de `start(data)` e os
  payloads de cada modo (`MenuScene.ts:457-461`) **não mudam**; em particular o
  **gating do Diário força a nave default** (`data.daily ? DEFAULT_SHIP_ID : …`).
  Esta issue troca **como** os modos são apresentados/tocados, não o que disparam.
- **Hero-ship centerpiece** (slot de nave + anel de graze + rastros + callouts
  GRAZE/PODER) é **P11-06-02**; o **painel de settings** (engrenagem consolidando
  nome/controle/tema/haptics) é **P11-06-03**. Aqui o **hero** é o título display +
  glow (reusa/eleva o `drawHeroTitle` atual) + tagline, e as **utilidades** podem
  permanecer no formato atual até a P11-06-03 consolidá-las.

## Requisitos funcionais

1. **Estender `ui/home`** (puro) com as **caixas** dos elementos repaginados:
   5 cards de modo, botão primário de início, 3 botões de meta e as linhas do
   rodapé — preservando o cálculo responsivo/safe-areas e a compressão atual.
2. **5 cards de modo** via `ui/panel` (variante card de modo grande): ícone (chave
   de P11-05: ∞/◆/◎/☠/⚡) + título + subtítulo + chevron. O **Diário** usa o estado
   **destaque (dourado)**.
3. **Botão primário** de início (JOGAR) via `ui/button` (estilo primário,
   hexagonal conforme o mockup) — dispara o mesmo `start({})` do Endless atual.
4. **Fileira de meta** (Hangar/Conquistas/Stats) como **botões** (`ui/button`,
   ícones de P11-05) navegando para as cenas atuais (`SceneKeys.Hangar/
   Achievements/Stats`).
5. **Rodapé** (share/doação/versão+©) no acabamento novo, **reusando** a lógica
   existente (`ui/socialLinks`, `config/about`, `drawFooter`) — só repaginar, não
   reescrever o comportamento.
6. **Hero**: título "HAIRLINE" display + glow em camadas (reusar/elevar
   `drawHeroTitle` com o helper de FX P11-02 e a tipografia P11-01-02) + tagline.
   O **slot de nave-herói** fica para P11-06-02 (pode reservar o espaço).
7. **Preservar `start()`/payloads/gating**: cada card/botão chama exatamente o
   payload atual (Endless `{}`, Estágios via `showStages`/`stagePayload`, Diário
   com seed/dayKey + nave default, Boss Rush `{mode:'bossrush'}`, Evento Semanal
   com mods). O seletor de **classe de nave** (P6-04) e as utilidades continuam
   **acessíveis** (no formato atual até a P11-06-03; se relocados, sem perder a
   função — decisão registrável na SDD).

## Requisitos não funcionais

- **Presentation-only**: nada toca `src/sim`/replay/`hashState()`/ranking/Diário.
- **Modelo puro/headless**: a extensão de `ui/home` permanece sem Phaser, testável.
- **Perf**: cards/botões/glow **assados** quando estáticos (P11-02/03/04); zero
  alocação por frame.
- **Responsivo/mobile-first**: respeita safe-areas (`hudLayout`), legível em
  retrato; comprime em telas curtas sem sobrepor o rodapé.
- **Sem regressão funcional**: todos os modos e navegações continuam funcionando
  exatamente como hoje.

## Critérios de aceite

- [ ] `ui/home` estendido expõe as **caixas** dos 5 cards, do botão primário, dos
      3 botões de meta e do rodapé, com layout responsivo coberto por teste.
- [ ] A Home desenha os 5 cards de modo via `ui/panel` (Diário em **destaque
      dourado**), o botão primário, a fileira de meta e o rodapé — fiel ao
      `ref/v1_MenuPrincipal.png` (conferência manual `npm run dev`).
- [ ] Cada card/botão dispara o **mesmo** payload/navegação de hoje; o **Diário
      ainda força a nave default**.
- [ ] Seletor de classe de nave (P6-04) e utilidades continuam acessíveis.
- [ ] Novo **TD registrado** em `TECH_DECISIONS.md` (supersede TD-26: toolkit
      procedural no Phaser + hero raster reusado da Fase 12).
- [ ] Headless: teste do layout estendido de `ui/home`.
- [ ] `npm test`, `npm run build`, `npm run lint`, `npm run typecheck` verdes.
- [ ] Regressão de determinismo: mesma seed/inputs ⇒ mesmo `hashState()`/replay.

## Arquivos/módulos provavelmente afetados

- `src/ui/home.ts` (estender com as caixas de cards/botões/meta — puro)
- `src/scenes/MenuScene.ts` (desenhar via `ui/panel`/`ui/button`/ícones; preservar
  `start()`/payloads/gating)
- `src/ui/panel.ts`, `src/ui/button.ts`, `src/ui/icons.ts`, `src/ui/tokens.ts`,
  `src/ui/fx.ts` (consumidos)
- `tests/home-ui.test.ts` (estender)
- `docs/TECH_DECISIONS.md` (novo TD, supersede TD-26)

## Fora de escopo

- **Hero-ship centerpiece** (slot de nave + anel de graze + rastros + callouts
  GRAZE/PODER) — **P11-06-02**.
- **Painel de settings** atrás da engrenagem (consolidar nome/controle/tema/
  haptics) — **P11-06-03**.
- Sprite real da nave-herói (vem da Fase 12; placeholder/reserva de espaço aqui).
- Repaginar Conquistas/Hangar/Stats/Results/HUD — P11-07 a P11-10.
- Barra de moeda/gemas, rank/nível, contadores de economia dos mockups (features
  ignoradas pela Fase 11).

## Documentação a atualizar

- `docs/TECH_DECISIONS.md`: **novo TD** (supersede TD-26) — Home repaginada com
  toolkit procedural no Phaser (cards/botões/glow), 1 hero raster reusado da Fase
  12; ainda presentation-only, fora da sim.
- `docs/ARCHITECTURE.md` (Home: `ui/home` estendido com caixas de cards; `MenuScene`
  desenha via toolkit).
- `docs/GAME_DESIGN.md` (nota da Home repaginada — supersede a descrição de TD-26).
- `docs/ROADMAP.md` (progresso P11-06 — parte estrutura).

## Riscos técnicos

- **Quebrar `start()`/payloads/gating do Diário** ao trocar a UI — manter os
  callbacks idênticos; cobrir por teste/conferência.
- **Layout responsivo** em telas curtas: 5 cards + botão + meta + rodapé podem não
  caber — reusar/estender a compressão proporcional já existente em `ui/home`.
- **Perf de glow por card/botão** — forçar caminho assado (P11-02).
- **Realocar utilidades/seletor de nave** sem perder função — se mover, garantir
  acesso (ou deixar para P11-06-03); registrar a decisão.
- **Divergência com o mockup** (proporções/escala) — conferência visual; o mockup é
  guia, não pixel-spec.

## Sugestão de testes (escrever primeiro)

- (headless) `ui/home` estendido: caixas dos 5 cards/botão/meta/rodapé coerentes,
  responsivas e comprimindo em telas curtas sem invadir o rodapé.
- (headless/regressão) os payloads de cada modo permanecem os de hoje (Diário ⇒
  nave default).
- Regressão de determinismo (reexecutar): Home não muda hash/replay.
- Fidelidade visual ao mockup e navegação de todos os modos: **manual** (checklist
  no PR, `TEST_STRATEGY.md`).
