# [P10-03] Abstração de tema de áudio (`AudioTheme`) + `SynthAudioTheme`

## Objetivo

Isolar a síntese procedural atual atrás de uma **interface de tema de áudio**,
mantendo o `AudioService` como fachada estável. Primeira (e única, por ora)
implementação: **`SynthAudioTheme`** = o áudio atual, **sem mudança audível**.
Prepara o tema de áudio por **samples** (P10-12), selecionável pela mesma chave de
tema (P10-04) — **sem tocar a simulação**.

## Contexto

- Hoje o `AudioService` é monolítico: contexto Web Audio, master/mute, ducking,
  trilha em camadas (base/rhythm/tension/danger), presets de música (cosmético
  `music`), `SfxPolicy`, `buildNoiseBuffer` e a síntese de cada cue em `play()`.
- A "decisão de que som tocar" já é pura e testada (`AudioCues`, `MusicDirector`,
  `SfxPolicy`); esta issue mexe só no **backend de apresentação**.
- A interface de consumo não muda: `getAudio().play(cue)`, `startMusic`,
  `setLayerTargets`, `setMusicPreset`, `toggleMute`. Quem chama (`GameScene`,
  cenas) não deve perceber.

## Requisitos funcionais

1. Definir `AudioTheme` (nome a confirmar) cobrindo o que varia por tema:
   `playCue(cue, ctx, …)`, construção/gestão da **trilha** (start/stop, camadas,
   ramps) e **preset**. O que é transversal — contexto, master gain, **mute**,
   **ducking**, `SfxPolicy`, política de autoplay/gesto — fica na fachada
   `AudioService` (não duplicar por tema).
2. `SynthAudioTheme` implementa a interface movendo a síntese atual (blip/sweep/
   arp/noiseBurst, camadas, `MUSIC_PRESETS`), **sem alteração audível**.
3. `AudioService` vira fachada: mantém o singleton `getAudio()`, o estado de
   mute/started, e **delega** ao tema ativo. `setMusicPreset`/`previewMusic`
   continuam funcionando (preset é do tema synth; ver interação com cosmético
   `music`).
4. Resiliência preservada: ambiente sem Web Audio ⇒ no-op; só inicia após gesto;
   mute persistido. Haptics (`HapticsService`) é à parte e não muda.
5. Definir como o **preset de trilha** (cosmético `music`, P6-01) convive com a
   troca de tema de áudio — por ora só o `SynthAudioTheme` tem presets; o de
   samples definirá os seus em P10-12. Documentar a regra.

## Requisitos não funcionais

- **Paridade audível** total com o estado atual após o refactor.
- Determinismo intacto (áudio nunca tocou a sim; manter assim).
- Sem regressão de robustez: jsdom/sem-Web-Audio continua no-op silencioso.
- Contrato pensado para a implementação por **samples** futura (carregar/tocar
  buffers, música em loop) sem reescrever a fachada.

## Critérios de aceite

- [ ] Jogo soa **idêntico** ao atual (manual no `npm run dev`: SFX de graze/kill/
      hit/pulse/gameover/victory/boss*, trilha em camadas subindo/descendo,
      ducking, preset de trilha do Hangar).
- [ ] Mute, ducking e `SfxPolicy` continuam centralizados na fachada (não
      duplicados no tema).
- [ ] Sem Web Audio (jsdom) ⇒ no-op, sem exceção.
- [ ] Testes puros existentes (`MusicDirector`, `SfxPolicy`) seguem verdes sem
      alteração.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/services/audio/AudioTheme.ts` (novo — interface)
- `src/services/audio/SynthAudioTheme.ts` (novo — síntese atual realocada)
- `src/services/AudioService.ts` (vira fachada; mantém singleton/mute/ducking)
- `tests/` (novo teste de contrato da fachada/tema em jsdom; existentes intactos)

## Fora de escopo

- Implementação por **samples** e qualquer asset de áudio (P10-12).
- Seletor de tema + persistência + carga condicional (P10-04).
- Abstração de render (P10-02) e qualquer mudança de SFX/música em si (a melhoria
  do synth "arcade" é P10-08).

## Documentação a atualizar

- `docs/ARCHITECTURE.md` (`AudioService` como fachada + temas de áudio).
- `docs/TECH_DECISIONS.md` **(obrigatório)**: TD registrando a abstração de tema
  de áudio (o que é transversal × por-tema; relação com TD-09). Mudança de
  arquitetura.
- `docs/ROADMAP.md` (progresso P10-03).

## Riscos técnicos

- Quebrar a robustez do autoplay/gesto/mute ao redistribuir responsabilidades —
  manter mute/started/contexto na fachada, não no tema.
- Vazar o ciclo de vida dos osciladores (parar no `stopMusic`/shutdown) ao mover
  a trilha para o tema — preservar a disciplina atual.
- Preset de trilha (cosmético) ficar órfão se o conceito migrar pro tema sem
  ponte — manter `setMusicPreset` funcionando.
- Excesso de abstração: não criar uma interface grande demais; cobrir só o que
  realmente varia entre synth e samples.

## Sugestão de testes (escrever primeiro)

- (jsdom) fachada sem Web Audio ⇒ `play`/`startMusic`/`setLayerTargets` no-op sem
  lançar; mute persiste.
- Contrato: a fachada delega `playCue` ao tema ativo (com um tema fake/spy) e
  aplica mute/ducking centralmente.
- Paridade audível é **manual** — checklist no PR.
