# [P6-04-01] Naves com regras de jogo distintas (classes, não cosméticos)

> **Origem da issue.** Não havia spec escrita para P6-04 — apenas a linha do
> `ROADMAP.md`: *"Naves com regras de jogo distintas (diferentes, não mais
> fortes)."* Este arquivo registra a ambiguidade e a **menor implementação
> segura** escolhida pelo agente Dev (contrato do `/implement-issue`).

## Objetivo

Permitir que o jogador escolha uma **classe de nave** que muda **regras de
jogo** (mobilidade, cadência de tiro, vidas, economia de graze) — *diferentes,
não mais fortes*: cada nave é um **sidegrade** com trade-off explícito. É
ortogonal aos **cosméticos** (P6-01), que só mudam aparência/áudio.

## Decisões de escopo (ambiguidade resolvida)

1. **Classe de nave afeta a simulação** → ao contrário do cosmético, é **entrada
   determinística**: entra em `SimulationOptions.shipId`, no `Replay` e na
   linhagem do `hashState()`. Sem isso, o anti-cheat/Diário não cobririam a
   escolha.
2. **A nave `default` é identidade pura.** Suas regras são todas neutras
   (multiplicadores 1, `livesDelta` 0) e a simulação **não dobra nada no hash**
   para ela ⇒ replays e Diário já gravados continuam **byte-idênticos**. A
   validação exige exatamente um default e que ele seja identidade.
3. **O Desafio Diário força a nave default.** A promessa do Diário é "mesma seed,
   mesmas regras para todos"; deixar a classe variar quebraria a comparação do
   ranking. Endless/Estágios/Boss Rush/Evento Semanal usam a nave escolhida.
4. **Sem desbloqueio nesta issue.** Como são sidegrades (não poder), todas as
   naves ficam disponíveis desde o início. O schema não impede um `unlock`
   futuro (P6-05/P7).
5. **Sem distinção visual da classe** (a aparência continua sendo cosmético,
   P6-01). Render fica fora de escopo; a classe é só regra.

## Requisitos funcionais

1. `src/data/ships.json`: roster data-driven. Cada nave: `id`, `name`, `desc`,
   `default?`, `rules` (parcial, faltantes ⇒ identidade): `maxSpeedMul`,
   `focusSpeedFactorMul`, `hitboxRadiusMul`, `fireIntervalMul`, `shotSpeedMul`,
   `focusPerGrazeMul`, `grazeMarginMul`, `invulnMul`, `livesDelta`.
2. `src/sim/Ships.ts` (puro/headless): tipos, `IDENTITY_RULES`, `shipRules(def)`,
   `applyShipToPlayer/AutoFire/Combat` (puras) e `validateShips`.
3. Registro/validação no `content/index.ts`: `getShip`, `getShipOrDefault`,
   `getShips`, `SHIP_IDS`, `DEFAULT_SHIP_ID`, validação no load.
4. `Simulation` aplica as regras (compostas com os `mods` do evento semanal) e
   dobra o ordinal da nave **não-default** no checksum.
5. `Replay`/`verifyReplay` gravam e re-simulam o `shipId`.
6. `SaveService` persiste a seleção (`hairline.ship.v1`); seleção inválida
   resolve para default.
7. Menu: seletor de nave + a run carrega a nave escolhida (Diário força default).

## Critérios de aceite

- [ ] Nave default ⇒ hash idêntico ao de hoje (sem `shipId` == default).
- [ ] Naves distintas ⇒ hashes distintos; regras aplicadas corretamente.
- [ ] Replay com `shipId` verifica; adulterar a classe falha a verificação.
- [ ] Roster validado (1 default, default = identidade, muls > 0, `livesDelta`
      inteiro).
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Fora de escopo

- Desbloqueio de naves; balanceamento fino (tuning de JSON + teste manual).
- Distinção visual por classe (aparência é cosmético, P6-01).
- Ranking segmentado por classe; curva de maestria (P6-05).

## Documentação a atualizar

`ROADMAP.md` (P6-04), `GAME_DESIGN.md` (classes de nave), `ARCHITECTURE.md`
(nave como config determinístico de run), `TECH_DECISIONS.md` (TD-25).
