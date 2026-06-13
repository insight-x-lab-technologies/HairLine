# [P5-04-01] Trilha dinâmica por intensidade (camadas musicais)

## Objetivo

Evoluir a trilha procedural de pad estático para **camadas que entram e saem
conforme a intensidade da run** (nível de dificuldade, chefe ativo, perigo),
fazendo a música contar a história da run sem assets de áudio.

## Contexto

- `AudioService.startMusic()` toca hoje um único pad (A1/E2/A2 + LFO) com
  ganho fixo — igual no menu, na onda 1 e no chefe.
- A sim já expõe tudo que a música precisa, de forma observável e read-only:
  nível do `DifficultySystem`, chefe ativo (`BossSystem`), vidas, Foco.
- Padrão do projeto para "estado → apresentação" é o do `AudioCues`: lógica
  pura testável decide, o serviço só executa (TD-09).

## Requisitos funcionais

1. Módulo puro `MusicDirector` (sem Web Audio): recebe um snapshot de estado
   (nível, chefe ativo, vidas, gameOver) e devolve **ganhos-alvo por camada**
   (0..1). Transições suaves ficam a cargo do serviço (ramps), a decisão é
   instantânea e determinística.
2. Camadas procedurais no `AudioService` (todas criadas no `startMusic`, com
   `GainNode` próprio iniciando em 0): base-pad (a atual), **camada rítmica**
   (pulso/arpejo curto que entra com o nível), **camada de tensão** (intervalo
   dissonante/tremolo para chefe), e variação de brilho (ex.: filtro/oitava)
   para perigo (vida baixa).
3. Mapeamento intensidade→camadas dirigido por dados em `src/data/audio.json`
   (novo): limiares de nível, ganhos por camada, tempos de ramp.
4. `GameScene` alimenta o director por frame (ou a cada N frames) com o
   snapshot; `AudioService.setLayerTargets()` aplica com
   `linearRampToValueAtTime` (sem cliques/estalos).
5. Menu volta ao estado base (só pad); game over esvazia camadas com fade.

## Requisitos não funcionais

- A simulação não sabe que música existe; fluxo unidirecional sim → director →
  serviço. Determinismo/replay intactos.
- Sem alocação por frame (nós de áudio criados uma vez; targets são números).
- Resiliente a ambiente sem Web Audio (no-op, como hoje); mute continua
  cobrindo tudo via `master`.
- CPU de áudio modesta (≤ ~8 osciladores somados) — alvo é celular fraco.

## Critérios de aceite

- [ ] Headless: `MusicDirector` coberto por testes (nível baixo ⇒ só base;
      nível ≥ limiar ⇒ rítmica; chefe ⇒ tensão; vida ≤ 1 ⇒ variação de
      perigo; gameOver ⇒ tudo a zero).
- [ ] Integridade de dados: `audio.json` validado (ganhos em [0,1], limiares
      crescentes, ramps positivos).
- [ ] Manual no `npm run dev`: progressão audível ao longo de uma run Endless;
      entrada de chefe muda a música de forma clara; sem estalos nas
      transições; mute funciona.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/services/MusicDirector.ts` (novo — lógica pura)
- `src/services/AudioService.ts` (camadas + `setLayerTargets`)
- `src/data/audio.json` (novo) + `src/content/` (tipo/validação)
- `src/scenes/GameScene.ts`, `src/scenes/MenuScene.ts` (alimentar/resetar)
- `tests/MusicDirector.test.ts` (novo)

## Fora de escopo

- SFX (P5-04-02) e haptics (P5-04-03).
- Trilhas alternativas selecionáveis (cosmético — P6-01).
- Sincronização rítmica jogo↔música (beat-matching) — fora da Fase 5.
- Assets de áudio externos (mantém-se 100% procedural, TD-09).

## Documentação a atualizar

- `docs/GAME_DESIGN.md` §Feedback/juice (música dinâmica e seus gatilhos).
- `docs/TECH_DECISIONS.md` (TD: arquitetura director puro + camadas com gain,
  dirigida por `audio.json`).
- `docs/ROADMAP.md` (progresso P5-04).

## Riscos técnicos

- Estalos/zipper noise ao mudar ganho sem ramp — sempre `linearRamp`/
  `setTargetAtTime`, nunca atribuição direta no caminho audível.
- Camadas somando volume demais (clipping) — head-room no `musicGain` e teto
  validado no JSON.
- Oscilação de intensidade no limiar (nível sobe, chefe morre…) causando
  liga-desliga irritante — histerese ou ramps lentos de saída no JSON.
- `AudioContext` suspenso em background (mobile) — já há resume no gesto;
  conferir retomada ao voltar de pausa.

## Sugestão de testes (escrever primeiro)

- Tabela de casos do director: (nível, chefe, vidas, gameOver) ⇒ vetor de
  ganhos esperado, incluindo bordas dos limiares.
- Monotonicidade: subir nível nunca *remove* camada (até o teto definido).
- Snapshot igual ⇒ mesmo resultado (função pura, sem estado escondido).
- Validação do `audio.json` rejeita ganho > 1 e limiares fora de ordem.
