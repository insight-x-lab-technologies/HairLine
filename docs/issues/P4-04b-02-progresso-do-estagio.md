# [P4-04b-02] Progresso do estágio: exposição pela sim + anúncios no render

## Objetivo

Dar ao jogador leitura clara de onde está no estágio: a `Simulation` expõe o
progresso (seção atual / total / tipo) e a `GameScene` mostra anúncios curtos
("ONDA 2/3", "CHEFE") e um indicador discreto no HUD. Sem isso, as transições
de seção do P4-04b-01 são invisíveis e o estágio parece um Endless confuso.

## Contexto

- Depende de **P4-04b-01** (existem seções e `StageDirector.completed`, mas
  nada é comunicado ao jogador).
- Feedback pré-lançamento do usuário pede **clareza** (de dano e de estado do
  jogo) — transições de onda/chefe são o momento de maior ambiguidade.
- Precedente de separação: efeitos visuais/sonoros ficam em
  `scenes/GameScene`/`AudioService`, nunca na sim (`docs/ARCHITECTURE.md`,
  "Onde adicionar coisas"). A sim só expõe estado; o render reage.
- `AudioCues` já traduz estado→sons; `Simulation.lastReflect` é o precedente de
  "dica para o render".

## Requisitos funcionais

1. `Simulation` (modo `stage`) expõe `stageProgress` somente-leitura:
   `{ section: number, total: number, kind: 'wave' | 'boss', stageName: string }`
   (derivado do `StageDirector`; `null` nos outros modos).
2. `GameScene`: ao mudar a seção, anúncio central com fade ("ONDA n/m" para
   seções de onda; "CHEFE" para seção de chefe), reutilizando o estilo de texto
   neon existente (`src/ui/neonText`). O anúncio é puramente visual — não pausa
   nem altera a simulação.
3. HUD: indicador compacto e persistente do progresso (ex.: "2/3") posicionado
   via `hudLayout` (respeitando safe-areas), visível só no modo `stage`.
4. `AudioCues`: sting curto na entrada do chefe de estágio (reaproveitar o cue
   de chefe existente, se houver; senão, um novo cue procedural simples).

## Requisitos não funcionais

- **Zero** efeito na lógica: nada do anúncio/HUD entra em `src/sim/` ou
  `src/systems/`; `hashState()` de uma run não muda com esta issue.
- Sem alocação por frame no render: textos de anúncio criados uma vez e
  reutilizados (set text + tween), padrão das cenas atuais.
- Legível em retrato 720×1280 com densidade alta de balas (anúncio não pode
  cobrir a nave: posicionar no terço superior).

## Critérios de aceite

- [ ] Teste headless: `stageProgress` reflete a seção correta antes/depois de
      cada transição e é `null` em `endless`/`bossrush`.
- [ ] Teste de determinismo existente continua passando com hash inalterado
      (prova de que nada vazou para a sim).
- [ ] Jogando o `stage-001` no navegador: anúncio aparece na troca de seção e
      o indicador "n/m" atualiza (verificação manual, anotar no PR).
- [ ] `npm run build`, `npm test`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/sim/Simulation.ts` (getter `stageProgress`)
- `src/systems/StageDirector.ts` (expor índice/total/tipo da seção)
- `src/scenes/GameScene.ts` (anúncios + integração HUD)
- `src/ui/hudLayout.ts`, `src/ui/neonText.ts` (se precisar de variação)
- `src/systems/AudioCues.ts`, `src/services/AudioService.ts` (sting)
- `tests/Simulation.test.ts` ou `tests/StageDirector.test.ts`

## Fora de escopo

- Tela de intervalo/resumo entre seções (não há pausa entre seções na sim).
- Juice geral (hit-stop, partículas) — P5-01.
- Barra de vida do chefe (se já existe, não mudar; se não, é P5).
- Conteúdo novo de estágios (P4-04b-03) e seletor (P4-04b-04).

## Documentação a atualizar

- `docs/GAME_DESIGN.md` §Feedback / juice (anúncios de seção).
- `docs/ROADMAP.md` (nota de progresso em P4-04b).

## Riscos técnicos

- Tentação de "pausar" a sim entre seções para dar respiro — isso muda a
  lógica e o replay; se respiro for desejado, é um **gap em ticks no próprio
  estágio** (decisão de conteúdo, P4-04b-03), não um pause no render.
- Detectar "mudou de seção" no render por polling do getter: guardar o último
  valor visto na cena (não na sim) para disparar o anúncio uma única vez.

## Sugestão de testes (escrever primeiro)

- `stageProgress` em estágio `[wave, boss]`: `{section:1, kind:'wave'}` no
  início; após limpar a onda, `{section:2, kind:'boss'}`; `null` em `endless`.
- Hash golden: run de N ticks no `stage-001` produz o mesmo hash antes e depois
  desta issue (fixture criada em P4-04b-01).
- (Manual) Anúncio e indicador no navegador — roteiro no PR.
