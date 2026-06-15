# [P10-12] Áudio real por samples (`SampleAudioTheme`) — música + SFX

## Objetivo

Implementar o **tema de áudio "real"** com samples atrás de `play(cue)`: música de
menu + trilha de gameplay (mantendo a dinâmica do `MusicDirector`/camadas) e SFX de
explosão/impacto/pulso por amostras. Carregado **só quando ativo**. Sem tocar a
simulação. (Produzir as faixas/SFX finais é conteúdo; placeholders validam o
fluxo.)

## Contexto

- Depende de **P10-03** (`AudioTheme` + fachada) e **P10-04** (registro/carga
  condicional por tema). É o par sonoro do tema "Polido".
- A "decisão de que som tocar" e a dinâmica continuam puras (`AudioCues`/
  `SfxPolicy`/`MusicDirector`); este tema só fornece o **backend de reprodução**
  por buffers em vez de osciladores.
- Mute/ducking/política/gesto continuam na fachada `AudioService` (P10-03).

## Requisitos funcionais

1. `SampleAudioTheme` implementa `AudioTheme`: toca SFX por `AudioBufferSource`
   (samples decodificados) mapeados por cue; respeita `SfxPolicy`/ducking da
   fachada.
2. **Música**: faixa(s) em loop para menu e gameplay; mapear as camadas/intensidade
   do `MusicDirector` para as faixas (ex.: cross-fade por intensidade, ou stems se
   houver) — manter a API `setLayerTargets`/`startMusic` funcionando.
3. **Carga condicional**: decodificar os áudios via manifesto do tema (P10-04) só
   quando o tema de áudio real está ativo; precache PWA só nesse tema.
4. **Fallback**: sem os samples, cair no `SynthAudioTheme` (ou no-op) sem erro.
5. Resiliência: sem Web Audio ⇒ no-op; iniciar só após gesto; mute persistido.
6. Sem tocar `src/sim`/`src/systems` nem a lógica pura de áudio.

## Requisitos não funcionais

- Determinismo intacto (áudio é apresentação).
- Peso/PWA: samples só no tema ativo; vigiar tamanho (música é pesada) e tempo de
  decode no mobile.
- Sem `new` por disparo além do `AudioBufferSource` descartável (padrão Web Audio;
  nunca reusar source já tocado — iOS/Safari).
- Latência aceitável de SFX (pré-decodificar buffers no preload).

## Critérios de aceite

- [ ] Com o tema de áudio real ativo, SFX e música tocam por samples; menu e
      gameplay têm faixas próprias; intensidade reage como hoje (manual no
      `npm run dev`).
- [ ] Mute/ducking/`SfxPolicy` continuam centralizados (fachada), não duplicados.
- [ ] Sem samples ⇒ fallback (synth/no-op) sem erro.
- [ ] Áudios só carregam/precacheiam no tema ativo.
- [ ] Sem Web Audio (jsdom) ⇒ no-op silencioso.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/services/audio/SampleAudioTheme.ts` (novo) + registro do tema de áudio
- `src/services/AudioService.ts` (fachada já delega — ajuste mínimo se preciso)
- `src/scenes/PreloadScene.ts` + manifesto (decode dos samples por tema)
- `vite.config.ts` (PWA: precache de áudio por tema)
- `public/` ou `src/assets/audio/` (samples; placeholders aceitáveis)

## Fora de escopo

- Melhoria do tema **synth** (P10-08) e qualquer mudança em `AudioCues`/
  `MusicDirector`/`SfxPolicy`.
- Acessibilidade de áudio (P5-05).
- Mixagem/mastering profissional das faixas (conteúdo, não código).

## Documentação a atualizar

- `docs/ARCHITECTURE.md` (`SampleAudioTheme`, decode/carga por tema, PWA de áudio).
- `docs/TECH_DECISIONS.md` **(obrigatório)**: TD do áudio por samples (quando vale
  vs. synth, peso/PWA, mapeamento das camadas do `MusicDirector`; relaciona com
  TD-09 e o TD da abstração de áudio). Mudança de arquitetura.
- `docs/ROADMAP.md` (progresso P10-12).

## Riscos técnicos

- Peso das faixas inflando o PWA / decode lento em celular — comprimir, lazy-load
  por tema, pré-decodificar SFX curtos.
- Mapear a dinâmica em camadas do `MusicDirector` para faixas pré-mixadas pode
  perder granularidade — definir estratégia (stems vs. cross-fade) e aceitar o
  trade-off.
- iOS/Safari: políticas de autoplay/unlock e re-trigger de sources — seguir a
  disciplina já existente (gesto + source descartável).

## Sugestão de testes (escrever primeiro)

- (jsdom) sem Web Audio ⇒ no-op; fallback sem samples ⇒ não lança.
- Contrato: fachada delega ao tema de samples (spy) e aplica mute/ducking central.
- Mapeamento intensidade→faixa (função pura) coberto.
- Qualidade/latência/peso são manuais — checklist no PR.
