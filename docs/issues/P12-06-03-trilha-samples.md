# [P12-06-03] Trilha em samples — stems calm/intense (`default` obrigatório, `pulse` opcional)

## Objetivo

Produzir a **trilha definitiva em samples** do tema "Polido": os dois stems
`calm`/`intense` do preset **`default`** (slots já registrados — drop-in), e,
**opcionalmente**, o preset **`pulse`** (registrar +2 chaves). A dinâmica em 4
camadas do `MusicDirector` é mapeada para um **cross-fade** entre os dois stems, então
eles precisam ser **duas mixagens do mesmo loop** (mesma duração/andamento/tom,
loop sem clique). **A máquina já existe (P10-12) — produção musical + (no `pulse`)
um pequeno registro de manifesto.**

## Contexto

- `SampleAudioTheme` (P10-12) toca a trilha por **duas faixas em loop com
  cross-fade**: `sampleManifest.trackMix(LayerGains)` reduz as 4 camadas do
  `MusicDirector` (base/rítmica/tensão/perigo) a `{ calm, intense }`
  (`base=0`⇒silêncio; tensão/perigo⇒intensa; rítmica⇒meio-termo; só base⇒calma).
  As chaves são `aud-music-<preset>-calm` / `-intense` (`musicKey`).
- O `themes.ts` **já registra** `aud-music-default-calm`/`-intense` →
  `audio/music-default-*.wav` (placeholders de 2 s). Esta issue troca esses dois
  por conteúdo final (**drop-in**). O preset **`pulse`** (cosmético de trilha)
  **não** está registrado ⇒ hoje toca synth; produzi-lo é **opcional** e exige
  registrar +2 chaves.
- **Stems casados** (`§5.2`): `calm` e `intense` devem ter **mesma duração,
  andamento e tom** e **loopar sem emenda** (início/fim casados, sem clique) —
  "duas mixagens de um loop", não duas músicas. Se um stem de um preset faltar,
  **aquele preset toca synth** (par obrigatório por preset).
- **Por-tema**: o mesmo preset soa como **síntese no Arcade** e **samples no
  Polido** (TD-32) — não mexer no synth (P10-08); aqui só o conteúdo de samples.
- O preset é o **cosmético de trilha** (P6-01): `default` e `pulse` são os ids
  atuais. Produzir só `default` é suficiente; `pulse` cai no synth se ausente.

## Requisitos funcionais

1. **Produzir `default-calm` e `default-intense`** (`§5.2/§10`): mesma peça em duas
   intensidades (pad/ambiente vs. com rítmica/tensão), neon/retro-synthwave, **mesma
   duração/andamento/tom**, **loop sem clique**; comprimento musicalmente completo
   (ex.: 8–32 s, melhor que o placeholder de 2 s).
2. **Drop-in nos slots existentes**: `public/audio/music-default-calm.wav` e
   `music-default-intense.wav` (chaves já no manifesto) — **sem mudar código**.
3. **(Opcional) preset `pulse`**: produzir `music-pulse-calm.wav` /
   `music-pulse-intense.wav` e **registrar** `aud-music-pulse-calm`/`-intense` no
   `themes.ts`. **Ambos os stems** ou nada (par obrigatório); ausente ⇒ `pulse` toca
   synth.
4. **Cross-fade limpo**: validar que a transição calm↔intense (chefe, vida baixa,
   game over) soa contínua, sem salto de fase/volume perceptível, e que cada stem
   **loopa sem emenda**.
5. **Formato**: WAV PCM, 44.1 kHz, **estéreo ok**.

## Requisitos não funcionais

- **Presentation-only / determinismo**: trilha nunca toca sim/replay/`hashState()`/
  ranking.
- **Fallback é lei**: stem faltando ⇒ aquele preset toca synth (P10-12), sem erro.
- **Loop/cross-fade sem artefato**: emendas casadas; os ramps de `setLayerTargets`
  (in/out) são os mesmos do synth — o conteúdo deve aguentá-los sem clique.
- **Peso/PWA**: fora do precache; manter o comprimento/qualidade num WAV razoável
  (loops longos pesam — equilibrar duração × peso; cogitar duração menor bem
  loopável).
- **Mobile/iOS**: faixas em loop por `AudioBufferSource` — sem nada especial além de
  evitar arquivos gigantes.

## Critérios de aceite

- [ ] `music-default-calm.wav` e `music-default-intense.wav` são conteúdo final,
      stems casados (duração/andamento/tom), looping sem clique.
- [ ] Em jogo (tema Polido) a trilha toca samples e o **cross-fade** calm↔intense
      (chefe/vida baixa/silêncio no game over) soa contínuo (conferência manual
      `npm run dev`).
- [ ] Se o preset `pulse` for produzido: **ambos** os stems existem **e** estão
      registrados; selecionando o cosmético `pulse`, toca samples; senão, synth.
- [ ] **Nenhuma mudança de código** no `default` (só arquivos); o `pulse` só
      acrescenta chaves de manifesto (config).
- [ ] `npm run build` verde (precache sem `.wav`); regressão de determinismo verde.

## Arquivos/módulos provavelmente afetados

- `public/audio/music-default-calm.wav`, `music-default-intense.wav`
  (**substituídos** — entrega principal)
- *(opcional)* `public/audio/music-pulse-calm.wav`, `music-pulse-intense.wav`
  (novos) + `src/config/themes.ts` (registrar as 2 chaves do `pulse`)
- *(conferência)* `src/services/audio/SampleAudioTheme.ts`, `sampleManifest.ts`
  (`trackMix`/`musicKey`)

## Fora de escopo

- **SFX** (núcleo e restantes) — P12-06-01 / P12-06-02.
- **Mudar o mapeamento de camadas→cross-fade** (`trackMix`) ou o `MusicDirector` —
  TD-32/TD-20, inalterados (aqui só conteúdo).
- **Novos presets** além de `default`/`pulse` — conteúdo futuro.
- **Trilha do menu/Home** — fora do escopo desta issue (foco é a trilha de
  gameplay/preset).
- **Áudio synth do Arcade** — P10-08, inalterado.

## Documentação a atualizar

- `docs/THEME_ASSET_GUIDE`/`docs/ASSET_CONTRACT.md` (nota: trilha `default` com
  samples finais; `pulse` se produzido).
- `docs/ROADMAP.md` (progresso P12-06 — parte trilha; **fechar P12-06** ao concluir
  01+02+03, lembrando que 02/`pulse` são opcionais).
- `docs/TEST_STRATEGY.md` (checklist manual: loop sem emenda, cross-fade calm↔
  intense, preset `pulse` se houver).
- *(não abrir TD — conteúdo/manifesto; arquitetura em TD-32 inalterada.)*

## Riscos técnicos

- **Stems descasados**: duração/andamento/tom diferentes fazem o cross-fade soar
  "duas músicas" — produzir como duas mixagens de **um** loop (`§5.2`).
- **Clique no loop**: emenda início/fim mal casada — conferir o wrap em loop longo.
- **Par incompleto no `pulse`**: registrar só um stem faz o preset cair no synth (ou
  pior, falhar a carga se a chave apontar arquivo inexistente) — produzir/registrar
  **os dois juntos**.
- **Peso de loops longos**: equilibrar comprimento × tamanho do WAV (fora do
  precache, mas baixado sob demanda).
- **Salto no cross-fade**: validar a transição nos gatilhos reais (entrada de chefe,
  vida baixa, game over).

## Sugestão de testes (escrever primeiro)

- (headless) `trackMix(LayerGains)` já é coberto (P10-12): confirmar o mapeamento
  camadas→{calm,intense} verde; `musicKey(preset, track)` para `pulse` se incluído.
- (headless) integridade do manifesto (chaves de música batem com `musicKey`).
- (regressão) determinismo reexecutado: trilha não muda hash/replay (trivial).
- Conferência manual (o grosso): loop sem emenda, cross-fade nos gatilhos reais,
  preset `pulse` se produzido — **checklist no PR** (`TEST_STRATEGY.md`).
