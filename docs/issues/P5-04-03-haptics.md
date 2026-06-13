# [P5-04-03] Haptics no celular (vibração por evento, com toggle)

## Objetivo

Adicionar vibração tátil nos momentos certos (dano, pulso, kill de chefe,
game over) via `navigator.vibrate`, com padrões por evento em dados e opção de
ligar/desligar persistida — mais um canal de "sentir" o jogo no aparelho onde
ele vive (mobile-first).

## Contexto

- Não há nenhum uso de `vibrate` no código hoje.
- `navigator.vibrate` funciona em Android (Chrome/Firefox); **iOS Safari não
  suporta** — o serviço precisa ser no-op gracioso (mesma filosofia do
  `AudioService` sem Web Audio).
- Os gatilhos já existem: cues do `AudioCues` consumidas pela `GameScene`
  (`hit`, `pulse`, `gameover`, `victory`) — haptics pega carona no mesmo
  fluxo, sem tocar a sim.
- Persistência de preferência segue o padrão do mute (`hairline.muted`) /
  `SaveService`.

## Requisitos funcionais

1. `HapticsService` (singleton, padrão `getAudio()`): `vibrate(cue)` mapeia
   cue → padrão (`number | number[]` ms); no-op se API ausente, desabilitado
   ou documento sem foco.
2. Padrões por cue em `src/data/effects.json` (seção `haptics`), iniciais
   sugeridos: `hit` ~[60], `pulse` ~[20], `gameover` ~[80, 60, 120],
   `victory` ~[30, 40, 30]; `graze` e `kill` comum **sem** vibração (frequência
   alta = dessensibiliza e drena bateria).
3. Throttle global (ex.: mínimo ~80 ms entre vibrações) — rajadas não viram
   zumbido contínuo.
4. Toggle "Vibração" na UI junto do mute (Menu e/ou Pause), persistido
   (`hairline.haptics` via `SaveService`/storage); default **ligado** onde a
   API existe.
5. `GameScene.reactToCue()` (ou ponto equivalente) chama o serviço — uma
   linha por integração, lógica toda no serviço.

## Requisitos não funcionais

- Apresentação pura: sim/replay/`hashState()` intactos.
- Zero erro em navegadores sem a API (feature-detect, nunca try/catch como
  fluxo normal).
- Sem alocação por chamada (padrões resolvidos uma vez do JSON).
- Respeitar o usuário: nunca vibrar fora de gameplay (menu parado, resultados).

## Critérios de aceite

- [ ] Headless (jsdom): serviço testado com `navigator.vibrate` mockado —
      mapeamento cue→padrão, throttle, toggle, ausência da API.
- [ ] Preferência persiste entre sessões (storage injetável testado).
- [ ] Integridade de dados: seção `haptics` validada (números positivos,
      padrões não vazios).
- [ ] Manual em Android real: dano e game over claramente sentidos; nada
      vibra com o toggle desligado; iOS não quebra (silenciosamente sem
      vibração).
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/services/HapticsService.ts` (novo)
- `src/scenes/GameScene.ts` (chamada no fluxo de cues)
- `src/scenes/MenuScene.ts` e/ou `src/scenes/PauseScene.ts` (toggle)
- `src/data/effects.json` + `src/content/` (seção `haptics`, validação)
- `src/services/SaveService.ts` (se a preferência entrar lá; senão storage
  direto no padrão do mute)
- `tests/HapticsService.dom.test.ts` (novo)

## Fora de escopo

- Haptics de alta fidelidade (Vibration API avançada / gamepad rumble).
- Vibração no graze ou em kill comum (decisão de design: reservar o canal).
- UI de acessibilidade completa (P5-05 — aqui só o toggle simples).
- Trilha e SFX (P5-04-01/02).

## Documentação a atualizar

- `docs/GAME_DESIGN.md` §Feedback/juice e §Controles (toggle).
- `docs/ROADMAP.md` (progresso P5-04 — com 01–03 feitas, avaliar marcar ✅).

## Riscos técnicos

- Chrome Android exige interação do usuário antes de vibrar (engagement) —
  primeiro `vibrate` pode ser ignorado; inofensivo, documentar.
- Vibração em momento errado é pior que nenhuma (ex.: vibrar no pulso *do
  jogador* é recompensa; vibrar no graze puniria a mecânica central) — o
  mapeamento é decisão de design, manter o JSON enxuto.
- Bateria/percepção: padrões longos demais incomodam — teto de duração total
  por padrão na validação (ex.: ≤ 400 ms).

## Sugestão de testes (escrever primeiro)

- Cue `hit` ⇒ `navigator.vibrate([60])`; cue sem padrão ⇒ nenhuma chamada.
- Toggle off ⇒ nenhuma chamada; religar ⇒ volta a vibrar; preferência
  sobrevive a novo serviço com o mesmo store.
- Ambiente sem `navigator.vibrate` ⇒ nenhuma exceção, `isSupported = false`.
- Throttle: duas cues em < 80 ms ⇒ uma vibração só.
- Validação: padrão com soma > teto ou valor ≤ 0 é rejeitado/acusado.
