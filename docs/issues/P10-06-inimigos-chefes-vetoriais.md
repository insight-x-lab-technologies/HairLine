# [P10-06] Inimigos e chefes vetoriais com identidade (chefes deixam de ser círculo)

## Objetivo

Dar caráter visual aos inimigos e, principalmente, aos **chefes** — hoje
desenhados como `fillCircle` puro — compondo formas vetoriais com identidade por
tipo/fase, mantendo a legibilidade das mecânicas. Eleva o tema "Arcade anos 80".

## Contexto

- Depende de **P10-02** (`VectorTheme`).
- Inimigos hoje: polígono por `e.shape` (`shapePoints`) + glow, girando. Genérico,
  mas funcional.
- Chefes hoje: `drawBoss()` desenha `fillCircle` + barra de vida; e ainda
  telegraph de teleporte, núcleo invulnerável, partes destrutíveis e escudo (todos
  legíveis por convenção). O corpo é só um círculo — é o que mais destoa.
- Os dados já trazem `shape`/`color` para chefes (`GAME_DESIGN` §chefe) e fase
  (`boss.phaseIndex`); o desenho deve **derivar** desses dados.

## Requisitos funcionais

1. **Chefes:** substituir o corpo circular por uma forma composta com identidade
   (deriva de `shape`/fase do JSON do chefe), preservando **todos** os elementos
   de leitura existentes: barra de vida, mudança de cor na fase, telegraph de
   teleporte, aro de núcleo invulnerável, partes destrutíveis (pods) e escudo.
2. **Inimigos:** enriquecer a forma por tipo (acento/contorno/glow) mantendo a
   leitura por `shape`/cor dos dados; girar suave como hoje.
3. Distinção de **fase** continua óbvia (forma/cor evoluem com `phaseIndex`).
4. Sem mudança em `src/sim`/`src/systems`; o desenho lê só estado autoritativo.
5. Continua **gerativo**: um chefe/inimigo novo no JSON ganha visual sem código
   específico (cair na forma derivada de `shape`).

## Requisitos não funcionais

- Render-only; determinismo/replay/`hashState()` intactos.
- Sem `new` no loop (redesenho por `Graphics`, como hoje).
- Legibilidade sagrada: telegraphs, escudo e partes não podem ficar ambíguos; o
  corpo do chefe não pode "engolir" as balas.
- Performance: chefes com partes/escudo já desenham bastante — não explodir o
  custo por frame em celular (atenção à P5-06).

## Critérios de aceite

- [ ] Chefes têm corpo com identidade (não mais círculo puro), e todas as
      mecânicas continuam legíveis (manual no `npm run dev`, cobrir os 5 chefes).
- [ ] Mudança de fase é visualmente clara.
- [ ] Inimigos têm mais caráter mantendo a leitura por tipo.
- [ ] Conteúdo novo (JSON) ganha visual sem código dedicado (gerativo).
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/render/VectorTheme.ts` (corpo do chefe + inimigos)
- `src/ui/shapes.ts` (geometrias compostas reutilizáveis, se precisar)

## Fora de escopo

- Arte raster de inimigos/chefes (P10-10).
- Fundo (P10-07) e nave (P10-05).
- Novas mecânicas de chefe (Fase 4) — só apresentação.

## Documentação a atualizar

- `docs/GAME_DESIGN.md` §chefes/inimigos (identidade visual derivada de dados).
- `docs/ROADMAP.md` (progresso P10-06).

## Riscos técnicos

- Encobrir telegraph/escudo/partes ao enriquecer o corpo — testar os piores casos
  (colossus em 3 fases, vortex com partes, warden com escudo).
- Custo por frame em celular com chefe complexo — medir FPS no HUD existente.
- Forma derivada de `shape` inexistente para algum chefe — manter fallback
  (círculo) sem quebrar.

## Sugestão de testes (escrever primeiro)

- Geometria pura nova em `ui/shapes` (se houver) coberta em unidade.
- Regressão de determinismo (reexecutar): visual não toca a sim.
- Legibilidade por chefe/fase é manual — checklist no PR cobrindo os 5 chefes.
