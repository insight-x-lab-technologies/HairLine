# [P10-01] Controle mobile relativo (offset/drag) — tirar o dedo de cima da nave

## Objetivo

Corrigir a dor de jogabilidade no celular: hoje o dedo fica **em cima** da nave e
da hitbox, escondendo se o jogador está desviando. Trocar o controle por toque de
**absoluto** para **relativo (offset/drag)**: a nave se move pelo **delta** do
arraste do dedo (com sensibilidade), mantendo o dedo afastado do ponto de hitbox.

## Contexto

- Hoje o `InputService` emite a posição **absoluta** do dedo (`emitMove` no
  `pointerdown`/`pointermove` com coords do mundo via `toWorld`) e a `GameScene`
  seta `this.target` direto nesse ponto; a `Player.step` (sim) persegue o alvo.
  No mouse isso funciona (cursor naturalmente deslocado); no toque, o dedo cobre
  a nave.
- **Independe da abstração de temas (P10-02/03/04)** — é correção de jogabilidade
  pura, presentation-side. Deve ser feita **primeiro** do Bloco A.
- A sim **continua recebendo `moveX/moveY` absoluto** (o contrato de `SimInput`
  não muda). Muda apenas *como* a cena/serviço calculam esse alvo. O
  `ReplayRecorder` grava o input já resolvido (o `{moveX,moveY,...}` final), então
  replays antigos seguem válidos e novos gravam o alvo resultante — **determinismo
  e `verifyReplay` intactos**.

## Requisitos funcionais

1. **Modo relativo no `InputService`** (para toque): no `pointerdown`, **não**
   pular a nave para o dedo — ancorar (guardar o ponto de toque e o alvo corrente
   como base). No `pointermove`, emitir `move` = `alvoBase + (posAtual − posToque)
   × sensibilidade`. A `GameScene` segue clampando o alvo à área jogável.
2. **Sensibilidade configurável por dados** (presentation-only, **fora da sim**):
   ex. `src/data/controls.json` (não consumido por `src/sim`). Modo Foco reduz a
   sensibilidade (precisão), coerente com o `focusSpeedFactor` da nave.
3. **Toggle de esquema de controle** (relativo × absoluto) **persistido**
   (`SaveService`), com default **relativo no toque**. Decidir na sessão se o
   **mouse no desktop** permanece absoluto (recomendado) ou também respeita o
   toggle — registrar a decisão.
4. **Re-ancoragem** a cada novo toque (novo `pointerdown` reancora; soltar e tocar
   de novo não dá salto). `pointerup`/`pointercancel` encerram o arraste sem
   reposicionar a nave.
5. Teclado e botão de pulso seguem como estão; modo Foco (2º toque/tecla)
   inalterado exceto pela redução de sensibilidade no item 2.

## Requisitos não funcionais

- Zero impacto em determinismo/replay/`hashState()`: a sim recebe o mesmo formato
  de `SimInput`; a sensibilidade **não** pode entrar na sim nem no replay.
- Sem alocação por frame (estado de âncora = números no serviço).
- Mobile-first: jogável com um polegar; o dedo nunca precisa cobrir a nave para
  desviar em distâncias curtas.

## Critérios de aceite

- [ ] No celular (manual no `npm run dev` em device/emulador), arrastar move a
      nave por offset; o dedo fica visivelmente afastado da nave/hitbox.
- [ ] Sensibilidade vem de `controls.json` (mudar o JSON muda o feel sem tocar
      código); modo Foco reduz a sensibilidade.
- [ ] Toggle de esquema de controle persiste entre sessões.
- [ ] Regressão de determinismo: um replay **gravado antes desta mudança**
      continua verificando (`verifyReplay`) com hash/score idênticos.
- [ ] Aritmética de offset coberta por teste headless (jsdom) no `InputService`.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/services/InputService.ts` (modo relativo: âncora + delta + sensibilidade)
- `src/scenes/GameScene.ts` (instanciar o serviço com o esquema/sensibilidade;
  o clamp do alvo já existe)
- `src/data/controls.json` (novo, presentation-only) + leitura via `src/content/`
  **ou** carga local (decidir; não pode ser importado por `src/sim`)
- `src/services/SaveService.ts` (chave do esquema de controle + sensibilidade)
- `src/scenes/MenuScene.ts` ou tela de opções (toggle), se couber nesta issue

## Fora de escopo

- Opções de acessibilidade amplas (P5-05) e zona morta avançada/curva de
  aceleração de input (pode virar issue própria se o feel pedir).
- Refinos de multitoque do Foco (`isSecondaryTouch` segue placeholder).
- Qualquer mudança visual de nave/hitbox (Bloco B — P10-05).

## Documentação a atualizar

- `docs/GAME_DESIGN.md` §Controles (esquema relativo no toque + sensibilidade).
- `docs/ARCHITECTURE.md` (nota: config de controle é presentation-only, fora da
  sim) — se introduzir `controls.json`/registro.
- `docs/ROADMAP.md` (progresso P10-01).
- `docs/TECH_DECISIONS.md` **se** a decisão de esquema/local da config merecer um
  TD curto (ex.: por que a sensibilidade não entra na sim).

## Riscos técnicos

- **Vazar a sensibilidade para a sim/replay** ⇒ quebraria o Diário e a
  verificação. O alvo já resolvido é o único que pode chegar à sim.
- Âncora obsoleta após pausa/resize: reancorar no próximo `pointerdown` e ao
  reatachar o input (`RESUME`).
- Sensibilidade alta perto da borda: o clamp do alvo pode "comer" movimento;
  validar que o feel não trava contra as paredes.
- Desktop: se o mouse virar relativo sem querer, o controle piora — manter
  decisão explícita e testada.

## Sugestão de testes (escrever primeiro)

- (jsdom, `InputService`) `pointerdown` em modo relativo **não** emite `move`
  absoluto para o dedo; sequência de `pointermove` emite alvo = base + Σdeltas ×
  sensibilidade; novo `pointerdown` reancora.
- Modo Foco aplica o fator de sensibilidade reduzido.
- Regressão: replay legado (fixture existente) re-simula com mesmo hash/score.
- Demais verificações (feel no device) são manuais — checklist no PR
  (`TEST_STRATEGY.md`).
