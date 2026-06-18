# [P12-06-02] SFX restantes — 7 cues nice-to-have (produzir + registrar)

## Objetivo

Produzir os **7 SFX restantes** do tema "Polido" e **registrá-los no manifesto**:
`focusready`, `bossentry`, `bossshield`, `bossteleport`, `gameover`, `victory`,
`achievement`. Hoje essas cues **não estão registradas** ⇒ tocam pelo synth; com os
WAVs + as chaves no `themes.ts`, passam a tocar samples (com fallback automático ao
synth se faltarem). **Nice-to-have** (`§5.1`/`§9`): qualquer uma pulada segue como
synth, sem erro. **Produção de áudio + um pequeno registro de manifesto.**

## Contexto

- `SampleAudioTheme` (P10-12) cai no synth **por cue**. O `themes.ts` hoje só
  registra as 4 cues núcleo (P12-06-01) — as outras 7 não têm chave, então tocam
  synth. Para usar samples, é preciso **(a)** produzir o WAV e **(b)** adicionar a
  entrada `{ key: 'aud-sfx-<cue>', url: 'audio/sfx-<cue>.wav', type: 'audio' }` no
  manifesto do tema "polido". A convenção de chave é fixa em `sampleManifest`
  (`sfxKey(cue)` ⇒ `aud-sfx-<cue>`).
- Diferente de P12-06-01 (slots já existiam), aqui há um **pequeno passo de config**
  (registrar as chaves) além do áudio — não é lógica de jogo, é manifesto.
- Lista e caráter das cues (`§5.1`):

  | Cue | Dispara em | Duração | Caráter |
  | --- | --- | --- | --- |
  | `focusready` | Foco atinge o custo do pulso | 0.10–0.25 s | chime suave de "pronto" |
  | `bossentry` | chefe aparece | 0.30–0.80 s | stinger ameaçador |
  | `bossshield` | escudo do chefe liga/desliga | 0.20–0.40 s | shimmer metálico |
  | `bossteleport` | chefe teleporta | 0.15–0.30 s | blip de warp |
  | `gameover` | run termina (morte) | 0.5–1.5 s | tom de falha descendente |
  | `victory` | run vencida | 0.5–1.5 s | motivo de sucesso ascendente |
  | `achievement` | conquista desbloqueada | 0.3–0.8 s | jingle de recompensa |

- Transversal (mute/ducking/`SfxPolicy`/pitch/gain) segue na fachada (TD-29) — valem
  as mesmas regras de headroom/secura de P12-06-01.

## Requisitos funcionais

1. **Produzir os WAV** (`§5.1/§10`) das 7 cues no caráter/duração da tabela —
   curtos/secos com headroom (os "longos" gameover/victory ainda assim limpos, sem
   cauda que atropele).
2. **Salvar** em `public/audio/sfx-<cue>.wav` (ex.: `sfx-focusready.wav`,
   `sfx-bossentry.wav`, …).
3. **Registrar as chaves** no `assets` do tema "polido" em `src/config/themes.ts`
   (`aud-sfx-<cue>` → `audio/sfx-<cue>.wav`, `type: 'audio'`), uma por cue
   produzida. **Só registrar o que existir** (chave sem arquivo quebraria a carga).
4. **Formato**: WAV PCM, 44.1 kHz / 16-bit, mono aceitável.
5. **Incremental/opcional**: pode-se entregar um **subconjunto**; cada cue não
   produzida segue no synth, sem erro.

## Requisitos não funcionais

- **Presentation-only / determinismo**: nada toca sim/replay/`hashState()`/ranking.
- **Fallback é lei**: cue sem chave/arquivo ⇒ synth (já garantido por P10-12).
- **Carga robusta**: **não** registrar chave de arquivo inexistente (o
  `PreloadScene` tentaria carregar e falharia) — registrar par a par com o arquivo.
- **Peso/PWA**: fora do precache; manter WAVs enxutos.

## Critérios de aceite

- [ ] Para cada cue **produzida**, existe o WAV em `public/audio/` **e** a chave
      correspondente no manifesto do tema "polido" (par completo).
- [ ] Em jogo (tema Polido), as cues registradas tocam samples; as não produzidas
      seguem no synth, **sem erro** (conferência manual `npm run dev`).
- [ ] Nenhuma chave registrada sem arquivo (carga não falha); `npm run build` verde
      (precache sem `.wav`).
- [ ] Regressão de determinismo verde (trocar/registrar áudio não muda hash/replay).

## Arquivos/módulos provavelmente afetados

- `public/audio/sfx-<cue>.wav` (novos — entrega principal)
- `src/config/themes.ts` (registrar as novas chaves `aud-sfx-<cue>` — config, não
  lógica)
- *(conferência)* `src/services/audio/SampleAudioTheme.ts`, `sampleManifest.ts`
- `tests/themes.test.ts` (se houver integridade do manifesto, manter verde)

## Fora de escopo

- **SFX núcleo** (hit/kill/graze/pulse) — P12-06-01.
- **Trilha (música)** — P12-06-03.
- **Mudar `AudioCues`/`SfxPolicy`/ducking** — TD-20/29, inalterados (a *decisão* de
  quando tocar já existe; aqui só o **conteúdo**).

## Documentação a atualizar

- `docs/THEME_ASSET_GUIDE`/`docs/ASSET_CONTRACT.md` (nota: cues adicionais com
  samples; manifesto atualizado).
- `docs/ROADMAP.md` (progresso P12-06 — parte SFX restantes).
- `docs/TEST_STRATEGY.md` (checklist manual: cada cue registrada tocando sample; as
  ausentes no synth).
- *(não abrir TD — manifesto é dado/config; arquitetura inalterada.)*

## Riscos técnicos

- **Chave sem arquivo**: registrar uma chave cujo WAV não foi produzido faz a carga
  falhar — registrar **par a par**.
- **Cauda longa (gameover/victory)**: mesmo sendo mais longos, evitar reverb que
  atropele o próximo estado (ex.: tela de resultado).
- **Inconsistência de volume entre cues**: equalizar percepção de loudness (com
  headroom) para não ter cue gritando e outra sumindo.
- **bossshield/teleport repetitivos**: tocam várias vezes por luta — manter curtos
  e não fatigantes.

## Sugestão de testes (escrever primeiro)

- (headless) integridade do manifesto de áudio do "polido" (se houver teste em
  `tests/themes.test.ts`): chaves novas batem com `sfxKey(cue)`.
- (headless) `SampleAudioTheme.dom`: cue com buffer ⇒ sample; sem buffer ⇒ synth
  (já coberto; estender se útil).
- (regressão) determinismo reexecutado: trivial.
- Conferência manual (o grosso): cada cue em jogo (incl. as longas no fim de run) —
  **checklist no PR** (`TEST_STRATEGY.md`).
