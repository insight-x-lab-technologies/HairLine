# [P5-01-04] Hit-stop (congelamento breve em momentos de impacto)

## Objetivo

Adicionar **hit-stop**: um congelamento de poucos milissegundos do avanço da
simulação em momentos de alto impacto (dano ao jogador, kill/troca de fase de
chefe), que dá peso físico ao acerto — o clássico "soco que para o tempo".

## Contexto

- Depende de **P5-01-01** (config em `effects.json`). Combina com P5-01-03
  (os mesmos eventos disparam partículas e hit-stop), mas não depende dele:
  pode usar as cues existentes de `AudioCues` (`hit`) e estado do chefe.
- **Determinismo é preservado por construção**: a simulação é dirigida a
  ticks, não a relógio de parede. Hit-stop = a `GameScene` **não alimentar**
  `loop.advance(deltaMs)` por N ms. A sequência de ticks/inputs fica idêntica;
  replays e `verifyReplay` não veem o hit-stop (re-simulação é por tick).
  Mesmo princípio do `justResumed` que já existe na cena.
- Implementação fica 100% no driver do loop (cena), **fora** de `src/sim/` —
  `FixedStepLoop` e `Simulation` não mudam.

## Requisitos funcionais

1. Estado na `GameScene`: `hitStopMsRemaining`. Enquanto > 0, o frame desconta
   o delta e **pula** `loop.advance()` (e não acumula o tempo congelado — sem
   "catch-up" de ticks ao retomar).
2. Disparo por evento, com duração configurável por tipo em
   `src/data/effects.json` (seção `hitStop`), valores iniciais sugeridos:
   dano ao jogador ~90 ms, troca de fase de chefe ~60 ms, morte de chefe
   ~140 ms, kill comum **0** (sem hit-stop; bullet hell mata dezenas/segundo).
3. Política de sobreposição: novo hit-stop **não soma** — vale
   `max(restante, novo)`, com teto global (`maxMs`, ex.: 200) no JSON.
4. Durante o hit-stop o render continua (frame "congelado" desenhado), o
   `InputService` continua atualizando (arrasto não dá salto ao retomar) e as
   partículas decorativas congelam junto (coerência visual).
5. Pausa (`PauseScene`) e game over têm precedência: hit-stop não interfere —
   zerar `hitStopMsRemaining` ao pausar/terminar.
6. Flag de desativação no JSON (`enabled`), preparando a opção de
   acessibilidade da P5-05.

## Requisitos não funcionais

- `src/sim/`, `src/systems/` e o formato de replay **não mudam**.
- Sem alocação por frame (estado é um número na cena).
- Hit-stop total ≤ teto configurado mesmo em cadeia de eventos (morrer no
  mesmo instante em que o chefe troca de fase).

## Critérios de aceite

- [ ] Headless (lógica extraível): função/objeto puro que decide
      pular-ou-avançar dado (deltaMs, restante, evento, config) — testado em
      Vitest (sem Phaser).
- [ ] Sem catch-up: após hit-stop de 90 ms, a sim **não** executa ~5 ticks de
      uma vez no frame seguinte.
- [ ] Replays gravados antes da feature continuam verificando
      (`verifyReplay`); testes de determinismo passam sem edição.
- [ ] Manual no `npm run dev`: dano ao jogador e morte de chefe têm
      congelamento perceptível mas não incômodo; kills comuns não travam o
      fluxo; pausar durante hit-stop funciona.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/scenes/GameScene.ts` (estado + skip do `advance`, hook nos eventos)
- `src/ui/HitStop.ts` ou similar (novo — lógica pura testável do
  decide-pular-ou-avançar)
- `src/data/effects.json` (seção `hitStop`) + `src/content/` (tipo/validação)
- `tests/HitStop.test.ts` (novo)

## Fora de escopo

- Slow-motion / time-scale parcial (só congela-ou-anda nesta issue).
- Hit-stop "dentro" da simulação (timestep variável) — rejeitado: complexidade
  e risco de determinismo sem ganho; registrar a decisão em
  `TECH_DECISIONS.md`.
- Haptics/vibração (P5-04).
- UI de acessibilidade para desligar (P5-05; aqui só a flag no JSON).

## Documentação a atualizar

- `docs/TECH_DECISIONS.md` (TD novo: hit-stop no driver do loop, fora da sim;
  alternativa de timestep variável rejeitada).
- `docs/GAME_DESIGN.md` §Feedback/juice.
- `docs/ROADMAP.md` (progresso P5-01 — com 01–04 feitas, marcar ✅).

## Riscos técnicos

- **Catch-up acidental**: se o tempo congelado entrar no acumulador do
  `FixedStepLoop`, a sim "corre atrás" e o efeito vira um soluço + rajada de
  ticks — o teste de não-catch-up é o coração da issue.
- Hit-stop frequente demais irrita (especialmente o de dano, que já tem shake
  + flash) — valores no JSON para iterar rápido; na dúvida, mais curto.
- Interação com `justResumed` (pós-pausa) — caminhos de skip do advance devem
  compor sem pular input.

## Sugestão de testes (escrever primeiro)

- Disparo de 90 ms ⇒ pelos próximos frames somando 90 ms, zero ticks
  executados; depois, ticks voltam ao ritmo normal (1 por ~16,7 ms, sem
  rajada).
- Sobreposição: restante 40 ms + evento de 140 ms ⇒ 140 ms (max), respeitando
  teto global.
- `enabled: false` ⇒ eventos não congelam nada.
- Determinismo: run com e sem hit-stop (mesma seed/inputs por tick) ⇒ mesmo
  `hashState()` final.
