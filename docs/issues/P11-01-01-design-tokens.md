# [P11-01-01] Design tokens — paleta, raios, espaçamentos e presets de sombra/glow (módulo puro)

## Objetivo

Criar a **fonte única de design tokens** do toolkit de UI da Fase 11: um módulo
**PURO** (sem Phaser) que centraliza paleta neon por papel/estado, raios de canto,
espaçamentos, larguras de borda e presets de sombra/glow. É a fundação reusável
sobre a qual `ui/panel` (P11-03), `ui/button` (P11-04), a iconografia (P11-05) e a
repaginação das telas (P11-06+) se apoiam — e que substitui as cores/medidas
mágicas hoje espalhadas em `MenuScene`, `ui/home`, `ui/neonText` etc. **Nada toca
a simulação.**

## Contexto

- A Fase 11 é **presentation-only** e a decisão macro é **ficar no Phaser 4.1**
  (sem DOM/CSS): cards, botões, glow, gradientes são desenhados proceduralmente.
  Hoje as constantes visuais (ex.: `#39f5e8` neon, dourado do destaque, rosa de
  perigo, raios, paddings) aparecem repetidas e literais em várias cenas/módulos.
- A tese da fase é **reuso**: o mesmo vocabulário serve Home, Conquistas, Hangar,
  Stats e Results. Tokens são o primeiro tijolo desse vocabulário.
- Espírito de implementação igual a `ui/home`/`ui/hudLayout`: **modelo puro,
  testável headless**, que as cenas só consomem ao desenhar.
- Vocabulário de cores já em uso (alinhar, não inventar): primária/ciano
  (`#39f5e8` aprox.), destaque/dourado (Diário em destaque), perigo/rosa,
  esmaecido (texto/bordas apagadas, itens travados). Conferir os literais atuais
  em `MenuScene`, `ui/home`, `ui/neonText`, `ui/hangar`, `ui/achievements`,
  `ui/stats` e consolidar nos tokens.

## Requisitos funcionais

1. **Módulo de tokens puro** (ex.: `src/ui/tokens.ts`), sem importar Phaser nem
   tocar `src/sim`. Exporta um objeto/const tipado e congelado (`as const`/
   readonly) que sirva de fonte única.
2. **Paleta por papel e estado**: cores nomeadas por **função** (primária/ciano,
   destaque/dourado, perigo/rosa, sucesso opcional, esmaecido/desabilitado,
   fundo/superfície, texto primário/secundário), não por valor solto. Onde fizer
   sentido, variações por **estado** (normal / selecionado / travado / destaque).
   Formato utilizável tanto como string `#hex` (para `Text`/CSS-like) quanto como
   número `0xRRGGBB` (para `Graphics`) — prover ambos ou um helper de conversão.
3. **Raios de canto** (ex.: sm/md/lg/pill) para `fillRoundedRect`.
4. **Espaçamentos** (escala de espaçamento/padding/gaps, ex.: xs…xl) coerente com
   o layout responsivo (mundo virtual 720×1280, safe-areas via `hudLayout`).
5. **Larguras de borda** (fina/média/grossa) para bordas neon.
6. **Presets de sombra/glow**: parâmetros nomeados (cor, alpha, blur/raio, nº de
   camadas para o fallback de glow por alpha empilhado) — **dados**, consumidos
   depois pelo helper de FX (P11-02) e pelo `ui/panel`/`ui/button`. Aqui é só o
   **dado**; o desenho do glow não é desta issue.
7. **Tipografia: apenas os SLOTS de tamanho/peso** (ex.: escala display/título/
   corpo/legenda como tokens numéricos). A **escolha da fonte** e a evolução do
   `neonText` ficam em **P11-01-02** — aqui não se adota fonte nem se mexe no
   `neonText`.

## Requisitos não funcionais

- **Puro/headless**: sem Phaser, sem DOM, sem `Math.random`, sem estado mutável
  global. Determinismo/replay/`hashState()`/ranking intactos por construção (não
  importável pela sim).
- **Tipado e à prova de erro**: chaves fechadas (union types), sem strings soltas
  de cor no resto do código depois da adoção.
- **Sem regressão visual**: ao trocar literais por tokens nos pontos óbvios, o
  resultado deve ser **pixel-equivalente** (mesmos valores, só centralizados) —
  esta issue é refator de fundação, não redesign.
- **Mobile-first**: escala de espaçamento/tamanho pensada para retrato e toque.

## Critérios de aceite

- [ ] Existe um módulo de tokens puro, tipado e congelado, com paleta (papel +
      estado), raios, espaçamentos, larguras de borda e presets de sombra/glow,
      além dos slots de tamanho de tipografia.
- [ ] Cores disponíveis em `#hex` **e** `0xnumber` (ou helper de conversão
      testado), para servir `Text` e `Graphics`.
- [ ] Pelo menos um consumidor existente passa a ler tokens sem mudança visual
      (ex.: a cor neon padrão do `neonText`/`MenuScene` vem dos tokens) — prova de
      reuso, sem regressão.
- [ ] Headless: teste cobre forma/integridade dos tokens (chaves esperadas,
      conversão hex↔number, congelamento/imutabilidade).
- [ ] `npm test`, `npm run build`, `npm run lint`, `npm run typecheck` verdes.

## Arquivos/módulos provavelmente afetados

- `src/ui/tokens.ts` (novo — módulo puro)
- `src/ui/neonText.ts` (passar a cor default a ler token — sem mudar assinatura)
- `src/ui/home.ts`, `src/scenes/MenuScene.ts` (consumir tokens onde houver literal
  óbvio — escopo mínimo, só para provar reuso/sem-regressão)
- `tests/tokens.test.ts` (novo)

## Fora de escopo

- Escolha/adoção de fonte (BitmapText vs WebFont) e evolução do `neonText` —
  **P11-01-02**.
- Helper de FX/glow (desenho) — **P11-02** (aqui só os **dados** dos presets).
- Componentes `ui/panel`/`ui/button`/iconografia — P11-03/04/05.
- Migrar **todos** os literais de todas as cenas de uma vez (será incremental, à
  medida que cada tela é repaginada). Aqui só a fundação + 1 prova de consumo.

## Documentação a atualizar

- `docs/ARCHITECTURE.md` (`src/ui/`: tokens como fonte única do toolkit de UI da
  Fase 11, puro/headless).
- `docs/ROADMAP.md` (progresso de P11-01 — parte tokens).
- `docs/TECH_DECISIONS.md`: **não** abrir TD aqui (a virada arquitetural
  "toolkit procedural no Phaser, supersede TD-26" será registrada na SDD de
  P11-06, conforme a abertura da Fase 11). Tokens são fundação alinhada, não
  mudança de arquitetura.

## Riscos técnicos

- **Token vazar para a sim** — barrar por revisão; `src/sim` nunca importa
  `ui/tokens`.
- **Divergência de cor** ao consolidar literais (tons levemente diferentes
  espalhados) — escolher o valor canônico por papel e aceitar que alguns pontos
  mudem 1–2 tons; conferir visualmente os pontos tocados (não deve haver mudança
  perceptível nos consumidores migrados nesta issue).
- **Over-engineering**: criar tokens que ninguém usa. Manter ao que as telas da
  fase realmente pedem (ver mockups `ref/v1_*.png`); ampliar depois sob demanda.
- **Hex vs number**: esquecer um dos formatos quebra `Graphics` ou `Text` — cobrir
  a conversão por teste.

## Sugestão de testes (escrever primeiro)

- (headless) o objeto de tokens expõe as chaves esperadas de paleta/raios/
  espaçamentos/bordas/sombra-glow/tipografia.
- (headless) conversão `#hex` ↔ `0xnumber` ida-e-volta para todas as cores.
- (headless) imutabilidade: o objeto é congelado (tentativa de escrita não
  altera / falha em modo estrito).
- Regressão de determinismo: trivial por construção (não importável pela sim);
  registrar como verificação de não-importação se houver lint/teste de fronteira.
- Conferência visual dos consumidores migrados: **manual** (checklist no PR,
  `TEST_STRATEGY.md`).
