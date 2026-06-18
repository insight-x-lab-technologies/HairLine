# [P11-04] `ui/button` — botão (hexagonal e retangular, primário/secundário, com estados)

## Objetivo

Entregar o **componente de botão** do toolkit de UI da Fase 11: um **modelo de
layout PURO** (`ui/button`, testável headless) + a função de **desenho no Phaser**
que o materializa — formatos **hexagonal** (recorte via polígono/`fillPoints`) e
**retangular**, glow, estados de interação (toque/hover/press), rótulo +
sub-rótulo + slot de ícone, nos estilos **primário** (JOGAR, APLICAR) e
**secundário** (VOLTAR). Coerente com `useHandCursor`. É o irmão do card
(`ui/panel`, P11-03) no vocabulário reusável da fase. **Nada toca a simulação.**

## Contexto

- A Fase 11 fica **no Phaser 4.1** (sem DOM/CSS); botões são desenhados
  proceduralmente. Os mockups confirmam a linguagem: `ref/v1_MenuPrincipal.png`
  traz o **JOGAR** como botão **hexagonal** primário em destaque; `ref/v1_Hangar.png`
  traz **VOLTAR** (secundário) e **APLICAR** (primário) como botões largos com
  ícone/chevron; `ref/v1_GamePlay1.png` (ponte P11-10) traz **hexágonos pequenos**
  de pausa/música no HUD.
- **Reuso é a tese**: o mesmo botão serve Home, Hangar, Conquistas, Stats, Results
  e a casca do HUD (P11-10). Construir o componente **agora**; aplicá-lo às telas é
  P11-06+.
- Espírito de implementação igual a `ui/panel`/`ui/home`: **modelo puro/headless**
  (caixa/posições/estado resolvido) que a cena só **desenha**.
- **Reaproveita helpers existentes**: `ui/shapes.polygonPoints` já gera um hexágono
  (6 lados) — base do recorte hexagonal; `useHandCursor` é o padrão de
  interatividade já usado na `MenuScene`.
- **Depende de P11-01-01** (tokens: paleta primária/secundária/perigo/esmaecido,
  raios, espaçamentos, bordas, presets de glow) e **P11-02** (helper de FX: glow
  com fallback e caminho estático/assado). O botão consome tokens e desenha o glow
  pelo helper.

## Requisitos funcionais

1. **Modelo de layout PURO** (`src/ui/button.ts`): dada uma **spec** (caixa
   `x/y/w/h` ou centro+raio para o hex, formato, estilo, rótulo, sub-rótulo
   opcional, ícone opcional, estado) + tokens, calcula as **posições internas**
   (vértices do recorte, rótulo, sub-rótulo, slot de ícone) e a **hit-area** — sem
   Phaser, testável.
2. **Formatos**: **hexagonal** (recorte via `polygonPoints`/`fillPoints`) e
   **retangular** (cantos arredondados via tokens). Mesmo modelo, parâmetro de
   formato.
3. **Estilos**: **primário** (preenchimento/realce forte — JOGAR, APLICAR) e
   **secundário** (contorno/menos peso — VOLTAR), derivados dos papéis de cor dos
   tokens.
4. **Estados de interação** (refletidos no modelo + no desenho): **normal**,
   **hover** (desktop), **press/ativo** (toque/clique) e **desabilitado**
   (esmaecido, não interativo). Transições de realce/glow por estado.
5. **Conteúdo**: **rótulo** (obrigatório) + **sub-rótulo** (opcional, ex.: "UM
   TOQUE, CONTROLE TOTAL") + **slot de ícone** (opcional; o glifo vem de P11-05 —
   aqui o **slot/posição**, com placeholder de símbolo até lá).
6. **Interatividade**: hit-area correta para o **formato** (hexágono não pode usar
   bounding-box retangular ingênuo para o toque), `useHandCursor` no desktop,
   callback de clique/toque exposto ao chamador; feedback de press.
7. **Assar quando estático**: a moldura/glow do botão (parte que não muda por
   frame) pode ser desenhada uma vez (objeto estático/`RenderTexture`) reusando o
   caminho estático de P11-02; só o realce de estado é dinâmico. **Nunca**
   redesenhar a moldura por frame.

## Requisitos não funcionais

- **Modelo puro/headless**: `ui/button` sem Phaser, sem DOM, sem `Math.random`,
  sem estado mutável global. Não importável pela sim.
- **Determinismo/replay/`hashState()`/ranking intactos** (presentation-only).
- **Perf**: moldura/glow assados; zero alocação por frame; reusar o caminho assado
  de P11-02.
- **Mobile-first / acessibilidade de toque**: alvo de toque confortável (tamanho
  mínimo), hit-area fiel ao formato, legível em retrato; respeita safe-areas (a
  cena passa a caixa já resolvida).
- **Consistência**: cores/raios/espaçamentos **só** dos tokens — nada mágico no
  `button`.

## Critérios de aceite

- [ ] Existe `ui/button` puro que, dada uma spec + tokens, resolve posições
      internas, vértices (hex) e hit-area por formato/estilo/estado.
- [ ] A função de desenho materializa o botão no Phaser nos **2 formatos**
      (hexagonal/retangular) e **2 estilos** (primário/secundário), com glow via
      P11-02.
- [ ] Os **estados de interação** (normal/hover/press/desabilitado) mudam o realce
      e respeitam `useHandCursor`; o clique/toque dispara o callback do chamador.
- [ ] A **hit-area do hexágono** corresponde ao formato (não a um retângulo
      ingênuo) — toque fora dos vértices não aciona.
- [ ] Caminho "assar/estático" disponível; nenhum redesenho de moldura por frame.
- [ ] Prova de uso real: **um** botão de uma tela passa a usar `ui/button`
      (ex.: JOGAR na Home **ou** VOLTAR no Hangar), fiel ao mockup (conferência
      manual `npm run dev`) — sem mudar a lógica de `start()`/navegação.
- [ ] Headless: modelo coberto por teste (posições por formato/estilo, presença
      condicional de sub-rótulo/ícone, estado → papel de cor, hit-area do hex).
- [ ] `npm test`, `npm run build`, `npm run lint`, `npm run typecheck` verdes.
- [ ] Regressão de determinismo: mesma seed/inputs ⇒ mesmo `hashState()`/replay.

## Arquivos/módulos provavelmente afetados

- `src/ui/button.ts` (novo — modelo puro + desenho do botão)
- `src/ui/shapes.ts` (consumido — `polygonPoints` p/ o hexágono; estender só se
  faltar um helper de hit-test de polígono)
- `src/ui/tokens.ts` (consumido — P11-01-01) e `src/ui/fx.ts` (consumido — P11-02)
- **uma** cena de prova (ex.: `MenuScene` **ou** `HangarScene`) — só o botão de
  prova, sem repaginar a tela (isso é P11-06+)
- `tests/button.test.ts` (novo)

## Fora de escopo

- **Repaginar as telas** (Home/Hangar/Conquistas/Stats/Results) e a casca do HUD —
  P11-06 a P11-10; aqui só o componente + 1 prova de uso.
- **`ui/panel`** (P11-03) — card é outro componente.
- **Iconografia** (P11-05) — o botão só reserva o **slot** do ícone (placeholder de
  símbolo até lá).
- Definir **tokens** (P11-01-01) e o **helper de FX** (P11-02) — apenas consumidos.

## Documentação a atualizar

- `docs/ARCHITECTURE.md` (`src/ui/`: `button` como componente do toolkit — modelo
  puro + desenho, formatos/estilos/estados, consome tokens/FX/shapes, assado
  quando estático).
- `docs/ROADMAP.md` (progresso P11-04).
- `docs/TECH_DECISIONS.md`: **não** abrir TD próprio (segue a virada já prevista
  para o TD da Fase 11 em P11-06); registrar só se a API trouxer decisão estrutural
  inesperada.
- `docs/TEST_STRATEGY.md` (checklist manual de fidelidade do botão aos mockups +
  toque no hexágono).

## Riscos técnicos

- **Hit-area do hexágono**: usar a bounding-box retangular aciona o toque fora do
  recorte — precisa de hit-test por polígono (Phaser `Geom.Polygon.Contains` ou
  helper próprio); validar no toque real.
- **`fillPoints`/recorte no Phaser 4.1**: comportamento pode diferir do esperado
  (Phaser 4 ≠ 3) — validar no build; ter retângulo como fallback se o recorte
  divergir.
- **Perf de glow por botão**: forçar caminho assado/estático (P11-02); só o realce
  de estado é dinâmico.
- **Slot de ícone sem glifo ainda** (P11-05) — placeholder; a ausência de ícone não
  pode quebrar o layout.
- **Acoplar o botão a uma cena específica** — manter a spec genérica (caixa +
  textos + estado + callback).
- **Alvo de toque pequeno demais** no hex pequeno do HUD — respeitar tamanho mínimo
  de toque.

## Sugestão de testes (escrever primeiro)

- (headless) modelo por formato/estilo: caixa/centro → vértices (hex), posições de
  rótulo/sub-rótulo/ícone; sub-rótulo e ícone só quando pedidos.
- (headless) hit-area: um ponto dentro do hexágono acerta; um ponto no canto do
  bounding-box (fora dos vértices) **não** acerta.
- (headless) estado → resolução: primário/secundário e normal/hover/press/
  desabilitado mapeiam para os papéis de cor esperados.
- Regressão de determinismo (reexecutar): botão não muda hash/replay.
- Fidelidade visual + toque no hexágono: **manual** (checklist no PR,
  `TEST_STRATEGY.md`).
