# [P6-03-02] Histórico de runs + tela de estatísticas

## Objetivo

Guardar as **últimas N runs** no perfil e dar ao jogador uma tela de
**Estatísticas** (acessível do Menu) com totais, recordes por modo e o
histórico recente — a curva de maestria visível que alimenta o "só mais uma
run".

## Contexto

- Depende de **P6-03-01** (perfil + `RunSummary` + `recordRun`).
- O Menu já navega entre cenas e a `ResultsScene` já formata números de run;
  a tela nova segue os padrões visuais existentes (`neonText`, `hudLayout`/
  safe-areas).
- Mobile-first: lista curta e legível com polegar, sem scroll complexo.

## Requisitos funcionais

1. Perfil ganha `history: RunSummary[]` (anel das últimas **20** runs, mais
   recente primeiro); `recordRun` passa a inserir e podar — runs antigas saem,
   totais/recordes (P6-03-01) preservam o agregado de sempre.
2. Nova `StatsScene` (ou painel no Menu — decidir na implementação pelo
   espaço): totais (runs, kills, grazes, tempo jogado formatado, vitórias),
   recordes por modo, e lista do histórico (data curta, modo, score,
   vitória/derrota, duração).
3. Formatação derivada, não armazenada: `durationTicks` ⇒ mm:ss via
   `TICK_RATE_HZ`; data via `dateIso`. Helper puro de formatação reutilizável
   (Results pode usar o mesmo).
4. Entrada "ESTATÍSTICAS" no Menu; voltar retorna ao Menu (padrão das outras
   cenas).
5. Perfil vazio (jogador novo) ⇒ tela amigável ("jogue uma run para começar"),
   sem NaN/undefined.

## Requisitos não funcionais

- Apresentação pura: nada novo na sim; perfil continua fora de replay/hash.
- Perfil permanece pequeno (20 runs × ~10 campos ≈ KB) — teto fixo, nunca
  cresce sem limite.
- Layout responsivo retrato (celular primeiro), respeitando safe-areas.

## Critérios de aceite

- [ ] Headless: anel de histórico testado (inserção, ordem, poda no 21º,
      agregados não regridem com a poda).
- [ ] Headless: helpers de formatação testados (ticks⇒mm:ss, bordas).
- [ ] Manual no `npm run dev` (desktop + mobile): tela legível, histórico
      ordenado, estado vazio digno, navegação Menu⇄Stats sem vazamento de
      handlers (resize/eventos limpos no shutdown da cena).
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/services/SaveService.ts` (history no perfil + poda)
- `src/scenes/StatsScene.ts` (novo) + registro da cena no jogo
- `src/scenes/MenuScene.ts` (entrada de navegação)
- `src/ui/` (helper de formatação; possivelmente `neonText` reuso)
- `tests/SaveService.test.ts` (history), teste do helper de formatação

## Fora de escopo

- Gráficos/curvas de evolução (lista basta nesta issue).
- Filtros, busca, paginação além das 20 runs.
- Replay/assistir runs do histórico (P8-01).
- Comparação com outros jogadores (ranking já cobre; ligas são P8-02).

## Documentação a atualizar

- `docs/GAME_DESIGN.md` (nota curta: tela de estatísticas e o que mostra).
- `docs/ROADMAP.md` (progresso P6-03 — com 01–02 feitas, avaliar marcar ✅).

## Riscos técnicos

- Inflar o perfil guardando demais por run — o `RunSummary` da P6-03-01 já é
  enxuto; resistir a adicionar campos "para o futuro".
- Cena nova esquecendo limpeza de listeners de resize (o `GameScene` mostra o
  padrão correto com `Phaser.Scale.Events.RESIZE`).
- Datas: `dateIso` em UTC vs exibição local — exibir local, armazenar ISO;
  cuidado com o Diário (o "dia" do desafio é UTC, a data da run é só
  informativa).

## Sugestão de testes (escrever primeiro)

- 21 runs gravadas ⇒ history com 20, a mais antiga caiu, a mais recente é a
  primeira; totais contam 21.
- Formatação: 0 ticks ⇒ "0:00"; 3600 ticks (60 s) ⇒ "1:00"; valores grandes
  não quebram.
- Perfil sem `history` (gravado pela P6-03-01 antes desta issue) ⇒ leitura
  tolera e inicializa vazio (compatibilidade dentro da mesma `version`).
