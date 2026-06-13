# [P5-02-03] Barra de Foco no HUD + estado "pulso pronto"

## Objetivo

Transformar o Foco de número em **barra gráfica que reage ao graze**, com um
estado visual (e sonoro) inconfundível de **"pulso pronto"** quando
`focus ≥ pulseCost`. Fecha o loop de feedback do wedge: risco → ganho visível
→ poder na mão.

## Contexto

- Hoje o Foco aparece só como texto no HUD (`FOCO ${s.focus}` em
  `GameScene.hud`) e o botão `◎ PULSO` é estático — nada comunica progresso
  nem prontidão. O jogador descobre que pode pulsar "tentando".
- Já existem: `state.focus`/`focusMax`/`pulseCost` (`combat.json` via sim),
  `hudLayout.ts` (safe-areas), `neonText`, e a barra de vida de chefe como
  precedente de barra desenhada por `Graphics` na cena.
- `AudioCues` é o padrão para "estado → som" testável headless; ganhar a cue
  de prontidão ali mantém a cena sem lógica.
- Usa `effects.json` (P5-01-01) para tuning visual. Independente das outras
  issues de P5-01/P5-02.

## Requisitos funcionais

1. Barra de Foco gráfica no HUD (posição via `layoutHud`, respeitando
   safe-areas), preenchimento = `focus / focusMax`, com marca visual no ponto
   de `pulseCost` (se `pulseCost < focusMax`).
2. Reação ao ganho: ao crescer o Foco (graze), a barra dá um "blip" (brilho
   curto no preenchimento) — feedback contínuo de que o risco está pagando.
3. Estado **pronto** (`focus ≥ pulseCost`): barra muda de cor/glow para a
   identidade do pulso, e o botão `◎ PULSO` acende (cor/alpha/escala leve
   pulsante); abaixo do custo, botão visivelmente "apagado".
4. Nova cue em `AudioCues`: `focusready`, emitida na **transição** de
   `focus < pulseCost` para `focus ≥ pulseCost` (uma vez por cruzamento; gastar
   o pulso e recarregar emite de novo). SFX correspondente no `AudioService`.
5. Após gastar o pulso, barra esvazia para o valor real e os estados voltam
   ao normal (sem animação que minta sobre o valor disponível).
6. Cores/durações/intensidades em `effects.json` (seção `focusHud`); o texto
   `FOCO n` pode permanecer ou sair — decidir na implementação pelo espaço em
   tela (mobile primeiro).

## Requisitos não funcionais

- Render/HUD-only + cue derivada de estado: determinismo, replay e
  `hashState()` intactos.
- Sem alocação por frame (barra redesenhada via `Graphics` existente; estados
  são números na cena).
- Mobile-first: barra e botão legíveis com polegar em cima; nada de hover.

## Critérios de aceite

- [ ] Headless: `diffCues` emite `focusready` exatamente na transição de
      cruzamento do custo (incluindo re-cruzamento após gastar o pulso); sem
      repetição enquanto permanece acima.
- [ ] Barra reflete `focus/focusMax` e a marca de `pulseCost` deriva dos JSONs
      (mudar `pulseCost` move a marca sem tocar código).
- [ ] Manual no `npm run dev` (desktop + mobile): dá para saber *sem ler
      número* quanto Foco há e se o pulso está pronto; o botão "chama" quando
      pronto.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/systems/AudioCues.ts` (snapshot ganha `focus`/limiar; cue `focusready`)
- `src/services/AudioService.ts` (SFX da prontidão)
- `src/scenes/GameScene.ts` (barra, estados do botão, layout)
- `src/ui/hudLayout.ts` (se a barra precisar de slot próprio)
- `src/data/effects.json` + `src/content/` (seção `focusHud`, validação)
- `tests/AudioCues.test.ts`

## Fora de escopo

- Faísca de graze (P5-02-01) e anel na nave (P5-02-02).
- Redesenho geral do HUD; placar/vidas seguem como estão.
- Haptics na prontidão (P5-04); opções de acessibilidade (P5-05).
- Mudar custo/economia do pulso (`combat.json` intocado).

## Documentação a atualizar

- `docs/GAME_DESIGN.md` §Feedback/juice (e §Controles, estado do botão).
- `docs/ROADMAP.md` (progresso P5-02 — com 01–03 feitas, avaliar marcar ✅).

## Riscos técnicos

- Cue de prontidão "metralhando" se o Foco oscilar no limiar (ex.: mods que
  multiplicam ganho) — emitir por transição com histerese simples se preciso
  (decidir no teste).
- O snapshot de `AudioCues` ganha campos novos — conferir que cues existentes
  não mudam de comportamento (testes atuais como regressão).
- Barra + botão pulsante competindo com o campo de jogo por atenção — animar
  pouco e devagar; o "pronto" é estado, não alarme.

## Sugestão de testes (escrever primeiro)

- `focus` 96→100 com `pulseCost` 100 ⇒ `focusready`; permanecer em 100 ⇒ nada;
  pulsar (focus 0) e recarregar até 100 ⇒ `focusready` de novo.
- `livesOverride`/mods não afetam a emissão (só o limiar importa).
- Snapshot novo não altera cues existentes para uma sequência conhecida de
  estados (regressão).
- Integridade de dados: seção `focusHud` validada.
