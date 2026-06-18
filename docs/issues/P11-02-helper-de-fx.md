# [P11-02] Helper de FX (glow/blur/shadow) com fallback — spike + wrapper único

## Objetivo

Entregar um **wrapper único** para efeitos visuais (glow, blur, shadow, gradient)
sobre objetos do Phaser **4.1**, com **fallback obrigatório** por camadas de alpha
empilhadas onde a API de FX divergir/pesar. Inclui um **spike** para confirmar o
uso real da API de FX do Phaser 4.1 (≠ Phaser 3). É a fundação de "brilho" reusada
pelo toolkit de UI da Fase 11 (cards/botões/título) **e** pelo bloom de gameplay
da Fase 12 (P12-01). **Nada toca a simulação.**

## Contexto

- A Fase 11 fica **no Phaser** (sem DOM/CSS). O acabamento "neon" depende de glow
  consistente em título, cards (`ui/panel`, P11-03), botões (`ui/button`, P11-04)
  e, depois, no bloom do gameplay (P12-01) — todos devem reusar **um só** helper.
- **⚠️ Phaser 4 ≠ 3** (já registrado no `CLAUDE.md`: `setTintFill()` é no-op,
  etc.). A API de FX (`preFX`/`postFX` com `addGlow`/`addBlur`/`addShadow`/
  `addGradient`) precisa ser **validada no build real** — não copiar de tutoriais
  de Phaser 3. O ROADMAP afirma que `addGlow/addBlur/addShadow/addGradient` foram
  "confirmados no build"; este spike fecha *como* invocar (preFX vs postFX, custo,
  limites em texto/`Graphics`/`RenderTexture`).
- **Fallback já existe na prática**: `MenuScene.drawHeroTitle` faz glow por **3
  cópias de texto empilhadas** com alpha/escala decrescentes
  (`src/scenes/MenuScene.ts:182`). O helper deve **generalizar** essa técnica como
  fallback determinístico onde o FX nativo não servir.
- **Perf é requisito de design**: FX aplicado a objetos **estáticos** / assados em
  `RenderTexture`, **nunca por frame** no menu. No gameplay (P12-01) haverá toggle
  de qualidade (alinhar com P5-06) — o helper deve permitir desligar o glow.
- Consome os **presets de sombra/glow** definidos como dados em **P11-01-01**
  (tokens): cor, alpha, blur/raio, nº de camadas do fallback.

## Requisitos funcionais

1. **Spike documentado**: confirmar, no build real (Phaser 4.1), como aplicar
   glow/blur/shadow/gradient — `preFX` vs `postFX`, assinatura real dos métodos,
   em quais GameObjects funciona (Text/Image/Graphics/RenderTexture) e o custo
   aproximado. Registrar o achado (comentário no módulo + nota no PR/TD curto).
2. **Wrapper único** (ex.: `src/ui/fx.ts`) com funções por intenção, recebendo um
   GameObject e um **preset de glow/sombra dos tokens** (P11-01-01):
   - `applyGlow(obj, preset)` (o efeito principal da fase);
   - `applyShadow`/`applyBlur`/`applyGradient` conforme o que o spike confirmar
     ser viável/útil — os não viáveis podem ficar de fora com nota.
3. **Fallback obrigatório de glow** por **camadas de alpha empilhadas** (técnica do
   `drawHeroTitle`): quando o FX nativo divergir, pesar ou não existir para aquele
   objeto, o helper produz o glow empilhando cópias com alpha/escala derivadas do
   preset. A **escolha FX-nativo × fallback** deve ser controlável (flag/param e/ou
   detecção), não silenciosamente fixa num caminho.
4. **Modo "assar"/estático**: caminho para aplicar o efeito uma vez (em objeto
   estático ou `RenderTexture`), sem custo por frame. O helper não deve incentivar
   uso por-frame no menu.
5. **Desligável**: um modo "sem FX" (qualidade baixa / acessibilidade redução de
   flashes — alinhar com P5-05/06) em que `applyGlow` vira no-op barato ou um
   realce mínimo, sem quebrar layout.
6. **Lógica pura testável**: a **derivação dos parâmetros** do fallback (quantas
   camadas, alpha/escala de cada uma a partir do preset) deve ser uma **função
   pura** testável headless, separada da aplicação Phaser.

## Requisitos não funcionais

- **Presentation-only**: nada toca `src/sim`/replay/`hashState()`/ranking.
- **Perf**: zero alocação por frame no caminho estático; FX em objetos estáticos/
  assados; o helper documenta o custo e o caminho recomendado.
- **Determinismo do desenho**: o fallback por camadas é **determinístico** (sem
  `Math.random`; sem tweens obrigatórios para existir — animação é opcional e do
  chamador).
- **Reuso**: a mesma API serve UI (Fase 11) e bloom de gameplay (Fase 12). Não
  acoplar a uma cena específica.
- **Robustez Phaser 4.1**: se um método de FX não existir/lançar, cair no fallback
  sem quebrar (defensivo) — importante porque o ambiente headless/jsdom não tem o
  pipeline de FX.

## Critérios de aceite

- [ ] Existe um wrapper único de FX com `applyGlow` (+ os demais que o spike
      validar), recebendo presets dos tokens (P11-01-01).
- [ ] `applyGlow` tem **dois caminhos**: FX nativo (Phaser 4.1) e **fallback por
      camadas de alpha**, selecionáveis; o fallback reproduz o efeito do
      `drawHeroTitle` de forma generalizada.
- [ ] A derivação de parâmetros do fallback é **pura** e coberta por teste
      headless (nº de camadas, alpha/escala por camada a partir do preset).
- [ ] Caminho "assar/estático" disponível e documentado; nenhum uso por-frame
      introduzido no menu.
- [ ] Modo "sem FX" (no-op/realce mínimo) disponível para qualidade baixa/redução
      de flashes.
- [ ] Pelo menos um consumidor real migrado como prova (ex.: `drawHeroTitle` passa
      a chamar `applyGlow`), **sem regressão visual** (conferência manual
      `npm run dev`).
- [ ] O spike está registrado (comentário no módulo + nota no PR; TD curto se for
      decisão estrutural).
- [ ] `npm test`, `npm run build`, `npm run lint`, `npm run typecheck` verdes.
- [ ] Regressão de determinismo: mesma seed/inputs ⇒ mesmo `hashState()`/replay.

## Arquivos/módulos provavelmente afetados

- `src/ui/fx.ts` (novo — wrapper + derivação pura do fallback)
- `src/ui/tokens.ts` (consumir os presets de glow/sombra de P11-01-01)
- `src/scenes/MenuScene.ts` (`drawHeroTitle` migrado para `applyGlow` — prova de
  reuso, sem regressão)
- `tests/fx.test.ts` (novo — derivação pura do fallback)

## Fora de escopo

- Definir os **presets** de glow/sombra (são **dados** de P11-01-01; aqui só se
  consome).
- `ui/panel` (P11-03), `ui/button` (P11-04), iconografia (P11-05) e a aplicação às
  telas (P11-06+) — apenas reusarão este helper.
- **Bloom de gameplay** (P12-01) — esta issue entrega só o helper; a aplicação às
  balas/motor/anel e o toggle de qualidade do gameplay são da Fase 12.
- Otimização de performance no celular em si (orçamento de frame) — P5-06; aqui só
  o "ligar/desligar" e o caminho estático.

## Documentação a atualizar

- `docs/ARCHITECTURE.md` (`src/ui/`: helper de FX único, FX nativo + fallback por
  camadas, caminho estático/assado; reusado por Fases 11 e 12).
- `docs/TECH_DECISIONS.md`: **TD curto** registrando o resultado do spike (como a
  API de FX do Phaser 4.1 é usada de verdade; quando cai no fallback) — é decisão
  estrutural que orienta P11-03/04 e P12-01.
- `docs/ROADMAP.md` (progresso P11-02).
- `docs/TEST_STRATEGY.md` (checklist manual de conferência visual de glow, se
  couber).

## Riscos técnicos

- **API de FX diferente do esperado** (Phaser 4 ≠ 3): assinaturas/comportamento de
  `addGlow`/`addBlur`/`addShadow`/`addGradient` podem divergir de tutoriais — por
  isso o spike valida no build real e o fallback é obrigatório.
- **FX não disponível em headless/jsdom**: testes não podem depender do pipeline de
  FX — manter a parte testável **pura** (derivação do fallback) e o resto
  defensivo (no-op quando a API falta).
- **Custo de performance**: FX por frame ou em muitos objetos pesa no celular —
  forçar caminho estático/assado e documentar; oferecer desligar.
- **Divergência visual FX × fallback**: os dois caminhos podem não bater
  pixel-a-pixel — calibrar o fallback pelo preset para ficar "próximo o suficiente"
  e documentar a diferença; a UI não deve depender de paridade exata.
- **Acoplar o helper a uma cena/uso** — manter genérico (recebe GameObject +
  preset), pois a Fase 12 reusa para bloom de gameplay.

## Sugestão de testes (escrever primeiro)

- (headless) derivação pura do fallback: dado um preset (cor/alpha/blur/nº de
  camadas), retorna a lista esperada de camadas (alpha/escala por camada),
  determinística e sem `Math.random`.
- (headless) modo "sem FX": a derivação retorna vazio/no-op.
- (headless/defensivo) o wrapper não lança quando a API de FX está ausente (cai no
  fallback) — na medida do simulável em jsdom.
- Regressão de determinismo (reexecutar): FX não muda hash/replay.
- Conferência visual de glow (nativo vs fallback) e perf: **manual** (checklist no
  PR, `TEST_STRATEGY.md`).
