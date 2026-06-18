# [P12-06-01] SFX núcleo definitivos — `hit` / `kill` / `graze` / `pulse` (drop-in)

## Objetivo

Produzir os **4 SFX núcleo definitivos** do tema "Polido" (`aud-sfx-hit`,
`aud-sfx-kill`, `aud-sfx-graze`, `aud-sfx-pulse`), substituindo os placeholders nos
mesmos slots (`public/audio/sfx-*.wav`). São os sons de gameplay **mais valiosos** —
o "áudio mínimo viável" do tema (`§9`). **A máquina já existe (P10-12) e os slots já
estão registrados — esta issue é conteúdo de áudio + conferência, sem código.**

## Contexto

- O tema "Polido" usa `SampleAudioTheme` (P10-12): toca SFX por `AudioBufferSource`
  e **cai no `SynthAudioTheme` por cue** onde faltar buffer (híbrido). `themes.ts`
  **já registra** `aud-sfx-hit/kill/graze/pulse` → `audio/sfx-*.wav`; o
  `PreloadScene` decodifica e popula o `sampleBank`. Os WAVs atuais são
  **placeholders** (tons sintéticos, 22.05 kHz mono, de `scripts/gen-placeholder-
  audio.mjs`) só para validar o fluxo. Esta issue troca **só os arquivos** por
  conteúdo final.
- **Núcleo primeiro** (`§5.1/§9`): `hit`, `kill`, `graze`, `pulse` são as cues de
  gameplay disparadas o tempo todo e as mais valiosas; as outras 7 são
  nice-to-have (P12-06-02) e a trilha é P12-06-03.
- O transversal (mute, ducking, `SfxPolicy`, gesto, **pitch/gain por disparo**) fica
  na **fachada** `AudioService` (TD-29) — o tema só recebe o buffer e o
  `pitch`/`gain`. Portanto: **deixar headroom** (não estourar a 0 dBFS; o mixer
  aplica volume/ducking por cima) e evitar caudas longas de reverb que se atropelam
  quando a cue dispara rápido (kills, grazes).

## Requisitos funcionais

1. **Produzir os 4 WAV** conforme `THEME_ASSET_GUIDE §5.1/§10` — curtos, secos,
   punchy, com headroom:
   - `aud-sfx-hit` (dano ao jogador): 0.15–0.30 s, grave, contundente ("ouch").
   - `aud-sfx-kill` (inimigo destruído): 0.12–0.20 s, brilhante, "pop" seco.
   - `aud-sfx-graze` (raspão → poder): 0.05–0.10 s, mínimo, agudo, "tick"
     cintilante (dispara muito — bem curto).
   - `aud-sfx-pulse` (pulso refletor): 0.25–0.40 s, "release"/whoosh.
2. **Drop-in nos slots existentes**: salvar em `public/audio/sfx-hit.wav`,
   `sfx-kill.wav`, `sfx-graze.wav`, `sfx-pulse.wav` (mesmas chaves/paths) — **sem
   mudar `themes.ts` nem código**.
3. **Formato**: WAV PCM, **44.1 kHz / 16-bit** (subir dos 22.05 kHz do placeholder);
   mono é aceitável para SFX.
4. **Conviver com pitch/gain por disparo**: o som tolera variação de
   `playbackRate`/ganho (`SfxPolicy`) sem artefato desagradável; deixar headroom.

## Requisitos não funcionais

- **Presentation-only / determinismo**: áudio nunca toca `src/sim`/replay/
  `hashState()`/ranking (trocar WAV não muda hash/replay).
- **Fallback é lei**: removida a chave/arquivo, a cue cai no **synth** sem erro.
- **Peso/PWA**: assets só do tema ativo, fora do precache; SFX curtos são leves —
  ainda assim WAV enxuto.
- **Mobile/iOS**: o disparo cria um `AudioBufferSource` descartável por toque —
  nada a fazer no áudio, mas evitar arquivos longos que travariam polifonia.

## Critérios de aceite

- [ ] `public/audio/sfx-{hit,kill,graze,pulse}.wav` são conteúdo final (44.1 kHz/
      16-bit), curtos/secos/com headroom, no caráter de `§5.1`.
- [ ] Em jogo (tema Polido) as 4 cues tocam os samples (não o synth), legíveis sob
      ducking e variação de pitch, sem atropelo em sequência rápida (conferência
      manual `npm run dev`).
- [ ] **Nenhuma mudança de código** (só arquivos); removendo uma chave, a cue cai no
      synth sem erro (smoke test).
- [ ] `npm run build` verde (precache sem `.wav`); regressão de determinismo verde.

## Arquivos/módulos provavelmente afetados

- `public/audio/sfx-hit.wav`, `sfx-kill.wav`, `sfx-graze.wav`, `sfx-pulse.wav`
  (**substituídos** — a entrega principal)
- *(nenhum código)* — `themes.ts`, `sampleManifest`, `sampleBank`,
  `SampleAudioTheme` já integram (P10-12)
- *(conferência)* `src/services/audio/SampleAudioTheme.ts`

## Fora de escopo

- **7 SFX restantes** (focusready/bossentry/bossshield/bossteleport/gameover/
  victory/achievement) — P12-06-02.
- **Trilha (música)** — P12-06-03.
- **Mudar a fachada/`SfxPolicy`/ducking** — TD-29, inalterado.
- **Áudio do tema Arcade (synth)** — P10-08, inalterado.

## Documentação a atualizar

- `docs/THEME_ASSET_GUIDE`/`docs/ASSET_CONTRACT.md` (nota: SFX núcleo com conteúdo
  **final**).
- `docs/ROADMAP.md` (progresso P12-06 — parte SFX núcleo).
- `docs/TEST_STRATEGY.md` (checklist manual: 4 cues em jogo, ducking, pitch,
  sequência rápida).
- *(não abrir TD — sem mudança de arquitetura; máquina/contrato em TD-29/TD-32.)*

## Riscos técnicos

- **Sem headroom / estourar**: o mixer aplica volume+ducking por cima — deixar pico
  com folga (`§5.1`).
- **Cauda longa de reverb**: atropela em kills/grazes rápidos — manter seco.
- **Graze longo demais**: dispara muito; manter 0.05–0.10 s.
- **Artefato com pitch shift**: testar com a variação do `SfxPolicy`.

## Sugestão de testes (escrever primeiro)

- (headless) `sampleManifest`/`SampleAudioTheme.dom`: roteamento sample×synth e
  no-op sem samples já cobertos (P10-12) — confirmar verde.
- (regressão) determinismo reexecutado: trocar áudio não muda hash/replay (trivial).
- Conferência manual (o grosso): 4 cues em jogo, ducking/pitch, sequência rápida,
  headroom — **checklist no PR** (`TEST_STRATEGY.md`).
