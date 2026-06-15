# [P10-08] Áudio "Arcade" melhorado (síntese), sem assets

## Objetivo

Elevar o `SynthAudioTheme` a um "Arcade anos 80" **intencional**: trilha de menu +
gameplay mais musicais e SFX (especialmente **explosão/kill** e impacto) mais
encorpados — **continuando 100% procedural** (sem assets), reduzindo a sensação de
"Atari 2600".

## Contexto

- Depende de **P10-03** (`SynthAudioTheme` existe; a síntese mora lá).
- Hoje os SFX são blips/sweeps/noiseBurst simples e a trilha é pad+rítmica+tensão+
  perigo em camadas. A "decisão de que som tocar" é pura (`AudioCues`/`SfxPolicy`/
  `MusicDirector`) e **não muda** aqui — só a **síntese**.
- TD-09 mantém a opção procedural; esta issue valoriza o synth sem virar o tema de
  samples (esse é P10-12).

## Requisitos funcionais

1. Melhorar a síntese dos SFX de maior impacto (kill/explosão, hit, pulse) com
   envelopes/camadas mais ricos (ex.: corpo + transiente + cauda de ruído
   filtrado), mantendo a interface `play(cue)` e a `SfxPolicy`/ducking.
2. Trilha mais musical: refinar timbres/relações das camadas (base/rhythm/tension/
   danger) e, se couber, uma identidade de **menu** distinta do gameplay
   (a `MenuScene` pode pedir uma cama sonora própria via API existente).
3. Parâmetros sonoros tunáveis por **dados** onde fizer sentido (`src/data/
   audio.json` já existe) em vez de constantes mágicas novas.
4. Preservar presets de trilha do cosmético `music` (P6-01) e o `previewMusic` do
   Hangar.
5. Sem assets, sem tocar a sim, sem mudar `AudioCues`/`MusicDirector`/`SfxPolicy`
   (lógica pura) além de tuning de dados.

## Requisitos não funcionais

- Determinismo intacto (áudio é apresentação).
- Robusto sem Web Audio (no-op) e após gesto; mute/ducking preservados.
- Sem custo que cause estouro de polifonia (respeitar `SfxPolicy`).
- Coerência com o tema "Arcade": estilizado, não tentando soar realista.

## Critérios de aceite

- [ ] SFX de kill/explosão e impacto soam claramente melhores que hoje (manual no
      `npm run dev`), mantendo-se procedurais.
- [ ] Trilha de gameplay mais musical; menu com identidade sonora própria (se
      adotado).
- [ ] Tuning relevante vem de `audio.json` (mudar sem recompilar lógica).
- [ ] Cosmético `music` e preview do Hangar continuam funcionando.
- [ ] Testes puros (`MusicDirector`/`SfxPolicy`) seguem verdes.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/services/audio/SynthAudioTheme.ts` (síntese de SFX/trilha)
- `src/data/audio.json` + `src/content/` (parâmetros novos, validação)
- `src/scenes/MenuScene.ts` (se o menu pedir cama sonora própria via API existente)

## Fora de escopo

- Áudio por **samples** (P10-12) e qualquer asset.
- Mudar o que dispara cada cue (`AudioCues`) ou a dinâmica (`MusicDirector`).
- Acessibilidade de áudio (redução de intensidade etc. — P5-05).

## Documentação a atualizar

- `docs/GAME_DESIGN.md` §áudio (identidade "Arcade" do tema synth).
- `docs/ROADMAP.md` (progresso P10-08).

## Riscos técnicos

- Síntese mais rica = mais nós Web Audio por disparo; vigiar polifonia/CPU em
  celular (a `SfxPolicy` deve continuar protegendo).
- Cliques/pops por envelopes mal rampados — usar ramps como o código atual.
- Trilha "encher demais" e mascarar SFX — equilibrar ganhos/ducking.

## Sugestão de testes (escrever primeiro)

- Integridade de `audio.json` (novos parâmetros em faixa válida).
- Testes puros existentes reexecutados (sem regressão na decisão de som).
- Qualidade sonora é manual — checklist no PR.
