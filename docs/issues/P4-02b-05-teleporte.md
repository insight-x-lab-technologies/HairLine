# [P4-02b-05] Movimento por teleporte (com telegraph)

## Objetivo

Dar a uma fase de chefe um modo de movimento alternativo ao vaivém senoidal:
**teleporte determinístico com telegraph** (aviso visual antes de reaparecer),
mudando a leitura do encontro de "esquiva contínua" para "antecipação".

## Contexto

- Depende de **P4-02b-01**. Hoje o movimento (vaivém) é único e hardcoded no
  `BossSystem.update`.
- `BossSystem` não recebe `Rng`; o destino do teleporte precisa de aleatoriedade
  **semeada** (CLAUDE.md: `Math.random` proibido).
- Aplicar ao **spinner** na fase 2, como primeiro uso real.

## Requisitos funcionais

1. Campo opcional por fase:
   `movement: { type: "sweep" } | { type: "teleport", intervalTicks, telegraphTicks, regionPadPx }`.
   Ausente ⇒ `sweep` (comportamento atual, default).
2. Ciclo do teleporte: a cada `intervalTicks`, sorteia destino via `Rng` da
   simulação dentro da faixa superior do campo (limitada por `regionPadPx` e
   `homeY`); durante `telegraphTicks` o destino é exposto no estado (para o
   render avisar); ao fim, o chefe reposiciona instantaneamente.
3. Durante o telegraph o chefe continua vulnerável e emitindo o padrão da fase
   (decisão simples; mudar depois é balanceamento via JSON).
4. Estado do ciclo (fase do teleporte, destino) entra no `hashState()`.
5. Render (GameScene): marcador neon pulsante no destino durante o telegraph,
   flash curto no reaparecimento; cue de áudio via `AudioCues`.
6. `spinner.json` ganha `movement.teleport` na fase 2.

## Requisitos não funcionais

- Consumo de `Rng` em ponto fixo da ordem do tick (determinismo).
- Cadências em ticks; headless; render só lê estado.
- Destino sempre dentro do campo jogável (clamp com `regionPadPx`).

## Critérios de aceite

- [ ] Headless: ciclo intervalo → telegraph → reposicionamento nas contagens
      exatas de ticks; destino dentro dos limites.
- [ ] Mesma seed ⇒ mesma sequência de destinos (duas runs, mesmo hash).
- [ ] Fase com `sweep` (ou sem `movement`) se comporta exatamente como hoje.
- [ ] `verifyReplay` ok numa run com spinner fase 2.
- [ ] Telegraph visível e legível no `npm run dev` (dá para reagir).
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/content/types.ts`, `src/content/index.ts` (schema `movement` + validação)
- `src/systems/BossSystem.ts` (modos de movimento; passar a receber `Rng`)
- `src/sim/Simulation.ts` (injetar `Rng` no chefe; hash)
- `src/scenes/GameScene.ts`, `src/systems/AudioCues.ts` (telegraph/flash/som)
- `src/data/bosses/spinner.json`
- `tests/BossSystem.test.ts`, `tests/Simulation.test.ts`

## Fora de escopo

- Outros modos de movimento (dash, perseguição) — o schema `movement` abre a
  porta, mas só `sweep` e `teleport` entram aqui.
- Teleporte que atravessa o jogador / spawn em cima do jogador (proibir por
  distância mínima fica para balanceamento futuro se incomodar).

## Documentação a atualizar

- `docs/GAME_DESIGN.md` §Chefes (campo `movement`).
- `docs/TECH_DECISIONS.md` — `BossSystem` passa a depender de `Rng` (mudança de
  contrato; registrar).
- `docs/ROADMAP.md` (progresso P4-02b).

## Riscos técnicos

- **Maior risco de determinismo da fase 4**: consumir `Rng` condicionalmente
  (só em fases com teleporte) é correto, mas a ordem relativa aos outros
  consumidores no tick precisa ser fixa e testada.
- Justiça: reaparecer colado no jogador = morte barata; `telegraphTicks` mínimo
  sensato e teste de clamp.
- Replays antigos continuam válidos? Sim, desde que chefes sem `movement` não
  consumam `Rng` — cobrir com teste de regressão de hash.

## Sugestão de testes (escrever primeiro)

- Linha do tempo do ciclo (intervalo/telegraph/salto) tick a tick.
- Sequência de destinos reproduzível com mesma seed; diferente com outra seed.
- Clamp: destinos sempre em `[pad, width-pad] × [padTop, homeY]`.
- Regressão: chefe `sweep` não consome `Rng` (hash de run antiga inalterado).
- Replay/verify com spinner fase 2.
