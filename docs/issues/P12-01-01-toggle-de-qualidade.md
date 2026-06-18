# [P12-01-01] Toggle de qualidade gráfica (bloom on/off) + persistência + settings

## Objetivo

Criar o **gate de qualidade gráfica** que o bloom do gameplay (P12-01-02/03) lê
para ligar/desligar os efeitos pesados: uma preferência **alto/baixo** persistida
no aparelho (estado do jogador, como tema/controle/haptics), exposta no **painel
de settings** da Home (P11-06-03) e lida **uma vez** pelo `GameRenderer` no
`create()`. É a fundação que torna o bloom **desligável** em celular fraco /
redução de flashes (alinha com P5-05/06). **Nada toca a simulação.**

## Contexto

- O ROADMAP (P12-01) exige que o bloom de gameplay seja **desligável** em
  "qualidade baixa" e que isso **alinhe com P5-06** (modo de qualidade alto/baixo,
  orçamento de frame). P5-06 ainda é ⬜; esta issue entrega o **flag canônico** que
  ela vai reusar/expandir — não o orçamento de frame em si.
- As preferências presentation-only já seguem um padrão claro no `SaveService`:
  chaves versionadas separadas, lidas pela cena, **fora da sim/replay/hash**
  (ex.: `hairline.theme.v1`, `hairline.controlScheme.v1`, `hairline.haptics`).
  Esta opção segue o mesmo molde (ex.: `hairline.quality.v1`).
- O **painel de settings** (P11-06-03) já consolida tema/controle/haptics/apelido
  atrás de uma engrenagem; a opção de qualidade entra como **mais uma linha** ali,
  sem inventar nova UI.
- A acessibilidade (P5-05: redução de flashes / alto contraste) e a perf (P5-06)
  convergem no mesmo controle: "qualidade baixa" reduz o glow/flash. Manter o
  vocabulário simples (alto/baixo) para não pré-comprometer P5-06.

## Requisitos funcionais

1. **Preferência persistida** de qualidade gráfica no `SaveService` (ex.: chave
   `hairline.quality.v1`, valores `'high' | 'low'`), com getter/setter no mesmo
   estilo dos toggles existentes; valor ausente/inválido cai no **default**
   (recomendado: `'high'` — o bloom é o destaque da fase; `'low'` para celular
   fraco / redução de flashes).
2. **Linha no painel de settings** (P11-06-03): um toggle/seletor ALTO×BAIXO que lê
   e grava a preferência, com o estado atual visível, usando o toolkit
   (`ui/panel`/`ui/button`/ícones). Se P11-06-03 ainda não estiver concluída,
   adicionar a opção onde as utilidades vivem hoje (`MenuScene.drawUtilities`),
   mantendo o mesmo padrão das outras.
3. **Leitura única pelo renderer**: o `GameRenderer`/`GameScene` resolve a
   qualidade **uma vez** no `create()` (sem lookup no loop) e expõe o valor para o
   tema (ex.: campo/flag `quality` ou método `setQuality(level)`), de modo que
   P12-01-02/03 só **leiam** esse gate. Nesta issue o gate ainda **não liga bloom**
   (não há bloom ainda) — só fica disponível e comprovadamente lido.
4. **Sem efeito colateral hoje**: trocar a qualidade não muda nada visível ainda
   (o bloom chega em P12-01-02/03); o critério é que o flag exista, persista e
   esteja acessível ao renderer.

## Requisitos não funcionais

- **Presentation-only**: nada toca `src/sim`/replay/`hashState()`/ranking;
  qualidade é estado do jogador, fora da sim (como tema/controle/haptics).
- **Persistência robusta**: chave versionada separada; corrupção/ausência ⇒
  default limpo, nunca quebra o jogo (padrão do `SaveService`).
- **Perf/zero alocação por frame**: o flag é lido no `create()`, não no loop.
- **Mobile-first**: alvo de toque confortável no painel; rótulo claro (ALTO×BAIXO).

## Critérios de aceite

- [ ] Existe uma preferência de qualidade gráfica persistida no `SaveService`
      (getter/setter), com default e fallback de valor inválido cobertos.
- [ ] Há um controle ALTO×BAIXO no painel de settings (ou nas utilidades atuais),
      refletindo e gravando a preferência (conferência manual `npm run dev`).
- [ ] O `GameRenderer`/`GameScene` lê a qualidade **uma vez** no `create()` e a
      expõe ao tema para consumo futuro (P12-01-02/03), sem lookup no loop.
- [ ] Headless: regressão do `SaveService` (ida-e-volta da chave, default,
      corrupção ⇒ reset) verde; modelo do painel (linha de qualidade) testado onde
      puro.
- [ ] `npm test`, `npm run build`, `npm run lint`, `npm run typecheck` verdes.
- [ ] Regressão de determinismo: mesma seed/inputs ⇒ mesmo `hashState()`/replay.

## Arquivos/módulos provavelmente afetados

- `src/services/SaveService.ts` (nova chave `hairline.quality.v1` + getter/setter)
- `src/scenes/MenuScene.ts` (linha de qualidade no painel de settings / utilidades)
- `src/ui/panel.ts`/`src/ui/button.ts`/modelo do painel (se P11-06-03 concluída)
- `src/render/GameRenderer.ts` (assinatura para receber/expor a qualidade, ex.:
  `setQuality`) + `src/scenes/GameScene.ts` (resolver no `create()`)
- `src/render/VectorTheme.ts` (armazenar o nível para uso em P12-01-02/03)
- `tests/SaveService.test.ts` + teste do modelo do painel (se puro)

## Fora de escopo

- **Aplicar bloom** às balas/anel/pulso (P12-01-02) e aos tiros/motor (P12-01-03) —
  aqui só o gate existe.
- **Orçamento de frame / modo de qualidade completo** (FPS adaptativo, qualidade de
  partículas/fundo) — P5-06. Esta issue entrega só o flag binário que P5-06 reusa.
- Acessibilidade ampla (alto contraste, daltonismo) — P5-05.
- Novas opções de configuração além de ALTO×BAIXO.

## Documentação a atualizar

- `docs/GAME_DESIGN.md` (seção feedback/juice ou settings: toggle de qualidade
  gráfica ALTO×BAIXO, desliga bloom em baixa; alinha P5-05/06).
- `docs/ARCHITECTURE.md` (`src/services/`: chave de qualidade como estado do
  jogador presentation-only; `src/render/`: renderer lê a qualidade no `create()`).
- `docs/TECH_DECISIONS.md`: **TD curto recomendado** — registrar o flag de
  qualidade como **gate compartilhado** de render (consumido por P12-01-02/03 e,
  depois, por P5-06), presentation-only, fora da sim.
- `docs/ROADMAP.md` (progresso P12-01 — parte gate de qualidade).

## Riscos técnicos

- **Acoplar o gate a um único efeito**: manter genérico (nível de qualidade), para
  P5-06 expandir sem reescrever a chave.
- **Vazar para a sim**: o flag nunca entra em `SimulationOptions`/replay/hash —
  barrar por revisão (é estado do jogador, como tema).
- **Painel de settings ainda não pronto** (P11-06-03 ⬜): colocar a opção onde as
  utilidades vivem hoje e migrá-la junto quando o painel chegar; não bloquear.
- **Default mal escolhido**: se `'high'` pesar em celular fraco, o usuário tem o
  toggle — mas registrar a decisão de default na SDD/PR para P5-06 revisitar.

## Sugestão de testes (escrever primeiro)

- (headless/regressão) `SaveService`: grava/lê `'high'`/`'low'`, valor ausente ⇒
  default, valor inválido/corrompido ⇒ default limpo.
- (headless) modelo do painel (se puro): a linha de qualidade reflete o
  `SaveService` e alterna corretamente.
- Regressão de determinismo (reexecutar): qualidade não muda hash/replay.
- Conferência manual do controle no painel e da leitura no `create()`: **manual**
  (checklist no PR, `TEST_STRATEGY.md`).
