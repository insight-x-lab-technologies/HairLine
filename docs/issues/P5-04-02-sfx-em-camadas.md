# [P5-04-02] SFX em camadas (timbre rico, variação e mixagem)

## Objetivo

Engordar a paleta de SFX procedural: cada cue passa a ser **composto por
camadas** (oscilador + ruído + sub), com **variação sutil por disparo** e
regras de mixagem (polifonia limitada, ducking da trilha em eventos grandes) —
o jogo soa "produzido" continuando 100% sintetizado.

## Contexto

- Hoje cada cue é um único oscilador com envelope (`blip`/`sweep`/`arp` no
  `AudioService`); repetido idêntico, soa "de teste" — e kill/graze tocam
  dezenas de vezes por minuto.
- Não há fonte de ruído (essencial para impacto/explosão) nem prioridade
  entre sons simultâneos; o throttle existe só para `graze`.
- O ESLint barra `Math.random()`: variação de pitch/timing usa instância
  local de `Rng` decorativa (mesmo padrão do `ParticlePool`, P5-01-02) —
  fora da sim, não entra no replay.
- Independente de P5-04-01, mas o ducking conversa com as camadas de música
  (se a 01 já existir, duckar o `musicGain` agregado).

## Requisitos funcionais

1. Camada de ruído: buffer de ruído branco **pré-gerado uma vez** no `start()`
   (com `Rng` local), tocado via `AudioBufferSourceNode` + filtro — base para
   impacto (`kill`, `hit`) e textura do `pulse`.
2. Redesenho dos cues principais em 2–3 camadas cada (ex.: `kill` = ruído
   curto filtrado + sub-blip; `hit` = sweep atual + ruído grave + silêncio
   curto pós-som; `pulse` = sweep + shimmer; `victory`/`gameover` mantêm
   arp/sweep com camada extra).
3. Variação por disparo: pitch ±~4% e ganho ±~10% via `Rng` decorativo
   (graze/kill deixam de soar metralhados); `graze` mantém throttle.
4. Polifonia/prioridade: teto de vozes simultâneas por cue e global
   (contagem por janela de tempo, sem alocação extra); `hit`/`gameover` têm
   prioridade sobre `graze`/`kill`.
5. Ducking: eventos grandes (`hit`, `gameover`, `victory`, kill de chefe)
   abaixam o ganho da música por ~300 ms com recuperação em ramp.
6. Parâmetros (camadas, variação, teto de vozes, ducking) em
   `src/data/audio.json` (seção `sfx`), não hardcoded.

## Requisitos não funcionais

- Apresentação pura: sim/replay/`hashState()` intactos.
- Sem alocação pesada por disparo (nós Web Audio por som são inevitáveis e
  baratos; o buffer de ruído é único e reutilizado).
- Resiliente sem Web Audio (no-op); mute global continua valendo.
- Volume total com head-room (sem clipping com tela cheia de kills).

## Critérios de aceite

- [ ] Headless: lógica pura extraível testada — política de polifonia/
      prioridade (o que toca, o que é descartado) e variação determinística
      com `Rng` semeado.
- [ ] Integridade de dados: seção `sfx` do `audio.json` validada.
- [ ] Manual no `npm run dev`: kills em sequência soam variados; dano "abre
      espaço" na mixagem (ducking audível); densidade alta não vira parede de
      ruído; comparação A/B com a versão atual soa claramente melhor.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/services/AudioService.ts` (ruído, camadas, vozes, ducking)
- `src/services/SfxPolicy.ts` ou similar (novo — polifonia/prioridade puros)
- `src/data/audio.json` + `src/content/` (seção `sfx`, validação)
- `tests/SfxPolicy.test.ts` (novo)

## Fora de escopo

- Trilha dinâmica (P5-04-01) e haptics (P5-04-03).
- Sons novos para cues que ainda não existem (ex.: `focusready` entra na
  P5-02-03; escudo de chefe na P4-02b-02).
- Áudio posicional/estéreo por posição na tela.
- Assets externos (continua procedural, TD-09).

## Documentação a atualizar

- `docs/TECH_DECISIONS.md` (atualizar TD-09: camadas, ruído, política de
  vozes; Rng decorativo no áudio).
- `docs/ROADMAP.md` (progresso P5-04).

## Riscos técnicos

- Clipping com muitos sons ricos simultâneos — o teto de polifonia é parte do
  design; testar no pior caso (pulso limpando tela cheia).
- Variação demais vira inconsistência sonora (jogador perde o "vocabulário"
  dos sons) — variar pouco; a identidade de cada cue é sagrada.
- CPU de áudio em celular fraco com muitos nós — medir; na dúvida, menos
  camadas no `graze`/`kill` (os mais frequentes).
- iOS/Safari e `AudioBufferSourceNode` re-trigger — um source novo por
  disparo (descartável), nunca reusar source tocado.

## Sugestão de testes (escrever primeiro)

- Política de vozes: 10 `kill` no mesmo instante com teto 4 ⇒ 4 tocam; `hit`
  chegando com teto cheio ⇒ desloca um `kill` (prioridade).
- Variação: mesmo `Rng` semeado ⇒ mesma sequência de pitches; pitch sempre
  dentro de ±limite do JSON.
- Ducking: evento grande ⇒ alvo de ganho da música reduz e agenda
  recuperação (testável na lógica pura que calcula os alvos).
- Validação do JSON: tetos ≥ 1, variações em faixa sã.
