# [P11-05] Iconografia — conjunto de ícones do toolkit (vetor desenhado + fallback)

## Objetivo

Entregar o **conjunto de ícones** do toolkit de UI da Fase 11: um **registro único
por chave** que materializa cada ícone como **vetor desenhado** (`Graphics`/
`ui/shapes`), preenchendo os **slots de ícone** que `ui/panel` (P11-03) e
`ui/button` (P11-04) já reservam. Cobre ícones de **modo** (Endless ∞, Estágios ◆,
Diário ◎, Boss Rush ☠, Evento ⚡), **meta** (Hangar/Conquistas/Stats), **conquista**
(★/🔒) e **utilidades** (engrenagem, som, pausa). Mantém o **orçamento de imagens
≈0**. **Nada toca a simulação.**

## Contexto

- A Fase 11 fica **no Phaser 4.1** com **orçamento de imagens ≈0**: ícones devem
  ser **vetor desenhado** (sem atlas raster), coerentes com a estética neon e com
  `ui/shapes` (que já tem `polygonPoints`, `starPoints`, `arrowPoints`,
  `shapePoints`). Os mockups mostram os ícones: `ref/v1_MenuPrincipal.png`
  (∞/◆/◎/☠/⚡ nos cards de modo + engrenagem + meta), `ref/v1_Conquistas.png`
  (★/🔒) e `ref/v1_Hangar.png` (meta + som/nota).
- **Decisão p/ esta SDD (recomendada): vetor desenhado** via `Graphics`/`ui/shapes`
  como caminho primário (controle total de cor/glow/escala, zero imagem, fiel ao
  neon), com **fallback para glifo de fonte/texto** onde um ícone ainda não tiver
  vetor. Promover a **1 atlas SVG** fica **fora de escopo** (só se quiser mais
  capricho depois) — registrar a porta aberta, não implementar.
- `ui/panel` (P11-03) e `ui/button` (P11-04) já reservam um **slot/posição** de
  ícone com placeholder de símbolo; esta issue preenche esses slots com ícones de
  verdade, **por chave**.
- **Depende de P11-01-01** (tokens: cor por papel/estado, p/ tingir os ícones) e
  usa **P11-02** (glow opcional). **Não bloqueia** P11-03/04 (que funcionam com
  placeholder), mas é o que lhes dá acabamento.

## Requisitos funcionais

1. **Registro único por chave** (ex.: `src/ui/icons.ts`): mapa `chave → desenho`
   estável e tipado (union de chaves), de modo que `panel`/`button`/cenas peçam um
   ícone **pela chave**, nunca por geometria solta. Chaves cobrem:
   - **modo**: `endless` (∞), `stages` (◆), `daily` (◎), `bossrush` (☠),
     `weekly` (⚡);
   - **meta**: `hangar`, `achievements`, `stats`;
   - **conquista**: `star` (★), `lock` (🔒);
   - **utilidades**: `settings` (engrenagem), `sound` (som), `pause`.
2. **Desenho vetorial** de cada ícone via `Graphics`/`ui/shapes`, parametrizado por
   **centro, tamanho e cor** (cor vinda dos tokens) — inscrito num tamanho de
   referência para alinhar entre ícones; reusar/estender `ui/shapes` para as formas
   que faltarem (ex.: anel de Diário, raio do Evento, caveira do Boss Rush,
   engrenagem) **sem** introduzir `Math.random`.
3. **Fallback por chave**: se uma chave não tiver vetor próprio, cai num **glifo de
   fonte/texto** (símbolo Unicode equivalente) sem quebrar — o registro resolve
   vetor-ou-glifo de forma uniforme para o chamador.
4. **Integração com os slots**: `ui/panel`/`ui/button` passam a aceitar uma **chave
   de ícone** (em vez do placeholder), e ao menos um consumidor real exibe ícones
   de verdade (prova).
5. **Tamanho/cor consistentes**: todos os ícones respeitam um tamanho de referência
   e tingem pela cor do papel/estado (esmaecido quando travado, destaque no Diário
   etc.).

## Requisitos não funcionais

- **Orçamento de imagens ≈0**: nenhum atlas raster nesta issue; só `Graphics`/
  `ui/shapes` (+ glifos de fonte no fallback).
- **Lógica de geometria PURA quando aplicável**: as **formas** novas (pontos/
  vértices) ficam em `ui/shapes` (puro, testável headless); o `Graphics` só pinta.
- **Determinismo/replay/`hashState()`/ranking intactos** (presentation-only); sem
  `Math.random`.
- **Perf**: ícones estáticos podem ser assados (caminho de P11-02); zero alocação
  por frame.
- **Mobile-first**: legíveis em tamanho pequeno (badge de card, hex de HUD).

## Critérios de aceite

- [ ] Existe um registro único de ícones por **chave** (tipado), cobrindo modo
      (∞/◆/◎/☠/⚡), meta (Hangar/Conquistas/Stats), conquista (★/🔒) e utilidades
      (engrenagem/som/pausa).
- [ ] Cada ícone é **vetor desenhado** (`Graphics`/`ui/shapes`), parametrizado por
      centro/tamanho/cor (tokens); formas novas adicionadas a `ui/shapes` são puras.
- [ ] **Fallback por chave** para glifo de fonte/texto funciona sem quebrar quando
      um vetor faltar.
- [ ] `ui/panel`/`ui/button` aceitam **chave de ícone**; pelo menos um consumidor
      real exibe ícones de verdade, fiel ao mockup (conferência manual `npm run dev`).
- [ ] Headless: as **formas puras** novas em `ui/shapes` têm teste (vértices/
      contagem/inscrição no raio); o registro resolve a chave → vetor-ou-fallback.
- [ ] Orçamento de imagens ≈0: nenhum asset raster adicionado.
- [ ] `npm test`, `npm run build`, `npm run lint`, `npm run typecheck` verdes.
- [ ] Regressão de determinismo: mesma seed/inputs ⇒ mesmo `hashState()`/replay.

## Arquivos/módulos provavelmente afetados

- `src/ui/icons.ts` (novo — registro por chave + resolução vetor/fallback + desenho)
- `src/ui/shapes.ts` (estendido — formas novas puras: anel/Diário, raio/Evento,
  caveira, engrenagem etc.)
- `src/ui/tokens.ts` (consumido — cor por papel/estado)
- `src/ui/panel.ts` / `src/ui/button.ts` (aceitar chave de ícone no slot já
  reservado)
- **uma** cena de prova (ex.: `MenuScene`/`AchievementsScene`) — exibir ícones reais
- `tests/shapes.test.ts` (estender) + `tests/icons.test.ts` (novo, registro/
  fallback)

## Fora de escopo

- **Promover a atlas SVG/raster** (capricho futuro) — registrar a porta aberta, não
  implementar.
- **Repaginar as telas** inteiras (P11-06+) — aqui só o conjunto de ícones + slots +
  1 prova.
- Definir **tokens** (P11-01-01) e o **helper de FX** (P11-02) — apenas consumidos.
- Ícones específicos de **gameplay/HUD** além de pausa/som (a casca do HUD é P11-10).
- Barra de moeda/gemas, rank/nível e contadores de economia dos mockups (features
  ignoradas pela Fase 11) — não criar seus ícones.

## Documentação a atualizar

- `docs/ARCHITECTURE.md` (`src/ui/`: `icons` como registro por chave do toolkit —
  vetor desenhado + fallback de glifo; formas puras em `ui/shapes`).
- `docs/ROADMAP.md` (progresso P11-05).
- `docs/TECH_DECISIONS.md`: **não** abrir TD próprio (a decisão "vetor desenhado,
  imagens ≈0, atlas SVG adiado" alinha-se à virada já prevista para o TD da Fase 11
  em P11-06); registrar lá ou só se houver decisão estrutural inesperada.
- `docs/TEST_STRATEGY.md` (checklist manual de fidelidade dos ícones aos mockups).

## Riscos técnicos

- **Legibilidade em tamanho pequeno**: ícones vetoriais complexos (engrenagem,
  caveira) podem ficar ruidosos no badge/HUD — manter formas simples/simbólicas e
  conferir no tamanho real.
- **Cobertura de glifos no fallback**: símbolos Unicode (∞, ◎, ☠, ⚡, 🔒) podem não
  existir na fonte adotada (P11-01-02) — preferir o **vetor** para esses e usar o
  glifo só onde a fonte cobrir; validar.
- **Inconsistência de tamanho/peso** entre ícones desenhados à mão — inscrever todos
  num tamanho de referência comum e revisar lado a lado.
- **Espalhar geometria** fora de `ui/shapes` — manter as formas puras centralizadas
  e testadas; `Graphics` só pinta.
- **Acoplar ícone a uma cor fixa** — sempre tingir pelos tokens (papel/estado).

## Sugestão de testes (escrever primeiro)

- (headless) formas puras novas em `ui/shapes`: contagem de vértices, simetria,
  inscrição no raio, determinismo (sem `Math.random`).
- (headless) registro de ícones: toda chave esperada existe; chave com vetor
  resolve para vetor; chave sem vetor resolve para o glifo de fallback.
- (headless) integração `panel`/`button`: passar uma chave de ícone produz a
  posição/slot esperados.
- Regressão de determinismo (reexecutar): ícones não mudam hash/replay.
- Fidelidade visual e legibilidade em tamanho pequeno: **manual** (checklist no PR,
  `TEST_STRATEGY.md`).
