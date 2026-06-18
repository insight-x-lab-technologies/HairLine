# [P12-01-02] Bloom na camada de perigo — balas, anel de graze e pulso (vetorial, ambos os temas)

## Objetivo

Aplicar **bloom/glow** à **camada de perigo neon** do gameplay — **balas
inimigas**, **anel de graze** e **pulso refletor** — via o helper de FX (P11-02),
gated pelo toggle de qualidade (P12-01-01). É a parte mais sensível: essas são as
formas vetoriais que **definem o risco** e que **permanecem neon nos dois temas**
(TD-31), então o bloom deve **realçar sem prejudicar a legibilidade**. Estabelece
o **padrão de performance** do bloom (FX por **camada `Graphics`**, não por bala).
**Render-only ⇒ determinismo intacto. Vale para Arcade e Polido.**

## Contexto

- No `VectorTheme`, cada uma dessas leituras é desenhada por **um único objeto
  `Graphics` por camada**, redesenhado por frame: balas em `enemyBulletGfx`, anel
  de graze em `ringGfx` (`drawGrazeRing`), pulso em `fxGfx` (`drawReflectFx`).
  Aplicar o glow **uma vez** ao objeto da camada (no `init`) e deixá-lo valer
  enquanto o `Graphics` é limpo/redesenhado evita o custo proibitivo de FX
  **por bala** (centenas em tela). **Esse é o padrão a fixar.**
- **Balas e anel seguem vetoriais nos dois temas** (não são *seams* — TD-31):
  como o `SpriteTheme` herda o `VectorTheme`, aplicar o bloom no `VectorTheme`
  cobre **automaticamente** Arcade e Polido. Não duplicar no `SpriteTheme`.
- O helper de FX (P11-02) já entrega `applyGlow(obj, preset)` com **FX nativo
  Phaser 4.1 + fallback por camadas de alpha** e um **modo "sem FX"**; esta issue
  o **consome**, lendo o preset de glow dos tokens (P11-01-01).
- **Legibilidade > beleza** é princípio inegociável: o bloom não pode "borrar" o
  campo a ponto de balas se fundirem nem competir com o anel de graze. As cores de
  perigo/bala já são curadas; o glow só engrossa o brilho, com alpha contido.
- O **gate de qualidade** (P12-01-01) decide: em **baixa**, `applyGlow` vira no-op
  (camada neon "plana", como hoje) — sem quebra visual nem de layout.

## Requisitos funcionais

1. **Bloom nas balas inimigas**: aplicar glow à camada `enemyBulletGfx` (uma vez,
   no `init`/criação da camada), de modo que o brilho valha para todas as balas
   sem custo por-bala. Núcleo da bala continua nítido (a forma não pode sumir no
   glow).
2. **Bloom no anel de graze**: aplicar glow a `ringGfx` (`drawGrazeRing`),
   reforçando a leitura da zona de risco — discreto fora do Foco, mais aceso no
   Foco (mantendo o comportamento atual de alpha/ping).
3. **Bloom no pulso refletor**: aplicar glow a `fxGfx` (`drawReflectFx`), dando
   peso ao "flash" do pulso sem encobrir o que ele limpa.
4. **Gate de qualidade**: em qualidade **baixa** (P12-01-01) o bloom dessas três
   camadas é **desligado** (no-op do helper) — a camada de perigo volta ao neon
   plano atual, sem regressão de layout/legibilidade.
5. **Preset de glow dos tokens**: cor/alpha/raio/nº de camadas do bloom vêm do
   preset de glow (P11-01-01), não de constantes mágicas; calibrar para o gênero
   (brilho perceptível, sem borrão).
6. **Ambos os temas por herança**: confirmar (conferência manual) que Arcade e
   Polido ganham o bloom da camada de perigo via o `VectorTheme` herdado, sem código
   duplicado no `SpriteTheme`.

## Requisitos não funcionais

- **Presentation-only**: nada toca `src/sim`/replay/`hashState()`/ranking.
- **Perf (crítico)**: FX aplicado **por camada `Graphics`**, **uma vez** na
  criação — **nunca por bala nem por frame**. Zero alocação no loop. Medir FPS com
  campo denso de balas no celular (conferência manual) e garantir que "baixa"
  remove o custo.
- **Legibilidade do perigo > beleza** (princípio): balas não podem se fundir; anel
  de graze e núcleos de bala continuam distinguíveis. Conferir em densidade alta.
- **Determinismo do desenho**: glow é estático/derivado do preset (sem
  `Math.random`); o pulso pode animar, mas a animação é do desenho, fora da sim.
- **Robustez Phaser 4.1/headless**: se o FX nativo faltar (jsdom), o helper cai no
  fallback/no-op sem lançar.

## Critérios de aceite

- [ ] Balas, anel de graze e pulso exibem bloom em qualidade **alta**, com o
      brilho aplicado **por camada** (uma vez), não por bala (conferência manual
      `npm run dev`).
- [ ] Em qualidade **baixa** (P12-01-01) o bloom dessas camadas é no-op — visual
      neon plano, sem regressão de legibilidade/layout.
- [ ] **Legibilidade preservada** em campo denso: balas não se fundem, núcleos
      nítidos, anel distinguível (conferência manual, incl. daltonismo se possível).
- [ ] Arcade e Polido ganham o bloom por **herança** do `VectorTheme`, sem código
      duplicado no `SpriteTheme`.
- [ ] O bloom usa o **helper de FX (P11-02)** e o **preset de glow dos tokens
      (P11-01-01)**, sem constantes mágicas.
- [ ] `npm test`, `npm run build`, `npm run lint`, `npm run typecheck` verdes.
- [ ] Regressão de determinismo: mesma seed/inputs ⇒ mesmo `hashState()`/replay.

## Arquivos/módulos provavelmente afetados

- `src/render/VectorTheme.ts` (aplicar `applyGlow` em `enemyBulletGfx`, `ringGfx`,
  `fxGfx` no `init`; respeitar o gate de qualidade de P12-01-01)
- `src/ui/fx.ts` (consumido — helper de glow)
- `src/ui/tokens.ts` (consumido — preset de glow da camada de perigo)
- `tests/` (regressão de determinismo; o que for puro/derivado do preset coberto
  via P11-02 — aqui pouco código puro novo)

## Fora de escopo

- **Bloom nos tiros do jogador e na chama do motor** — P12-01-03.
- **Toggle de qualidade / persistência / settings** — P12-01-01 (aqui só se
  **consome** o gate).
- **O helper de FX em si** (FX nativo + fallback) — P11-02 (aqui só se consome).
- **Substituir balas por sprites/arte** — não há arte de bala; balas seguem
  vetoriais por design (TD-31). O "novo estilo" é forma vetorial + bloom.
- **Orçamento de frame adaptativo** — P5-06.

## Documentação a atualizar

- `docs/GAME_DESIGN.md` (feedback/juice: camada de perigo com bloom em qualidade
  alta, plana em baixa; legibilidade preservada; vale nos dois temas).
- `docs/ARCHITECTURE.md` (`src/render/`: padrão de bloom **por camada `Graphics`**,
  herdado pelo `SpriteTheme`; balas/anel/pulso seguem vetoriais com glow).
- `docs/ROADMAP.md` (progresso P12-01 — parte camada de perigo).
- `docs/TEST_STRATEGY.md` (checklist manual: FPS em campo denso, legibilidade,
  qualidade alta×baixa).

## Riscos técnicos

- **FX por frame/por bala = morte de perf**: garantir glow **uma vez por camada**;
  se o FX nativo não persistir sobre `clear()`/redraw do `Graphics`, avaliar
  caminho alternativo (camada aditiva assada / textura de bala com glow estampada
  por pool) e **registrar no TD do P11-02 ou TD curto próprio**.
- **Borrão prejudicando legibilidade**: calibrar alpha/raio do preset; se o glow
  fundir balas, reduzir — legibilidade vence. Conferir em densidade alta.
- **Glow não persistir sobre redraw do `Graphics`**: validar no build real
  (Phaser 4 ≠ 3); se postFX no `Graphics` redesenhado não servir, usar o fallback
  por camadas do helper ou repensar o objeto-alvo (container/layer).
- **Headless sem pipeline de FX**: manter defensivo (helper já cai no fallback/
  no-op); testes não dependem do FX nativo.
- **Esquecer o gate**: em "baixa" o custo precisa **sumir**, não só o visual.

## Sugestão de testes (escrever primeiro)

- (headless) regressão de determinismo (reexecutar): bloom não muda hash/replay.
- (headless/defensivo) o renderer não lança ao aplicar glow sem pipeline de FX
  (jsdom) — cai no fallback/no-op (na medida do simulável).
- (headless) se houver derivação pura nova (ex.: parâmetros do glow da camada a
  partir do preset+qualidade), cobrir — senão a derivação é a de P11-02.
- Conferência manual: bloom em campo denso (FPS + legibilidade), qualidade
  alta×baixa, paridade Arcade×Polido (**checklist no PR**, `TEST_STRATEGY.md`).
