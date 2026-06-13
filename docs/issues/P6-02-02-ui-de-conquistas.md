# [P6-02-02] UI de conquistas (toast no resultado + galeria)

## Objetivo

Dar visibilidade às conquistas: **anúncio no fim da run** (toast/banner na
`ResultsScene` para cada desbloqueio novo) e uma **galeria** consultável
(desbloqueadas + bloqueadas com a condição visível) — transformar o motor da
P6-02-01 em motivo de retorno.

## Contexto

- Depende de **P6-02-01** (motor + persistência; o fluxo de fim de run já
  devolve `newlyUnlockedIds`).
- Combina com a `StatsScene` (P6-03-02): se ela existir, a galeria pode ser
  uma aba/seção lá ou cena irmã — decidir na implementação pelo espaço;
  se não existir ainda, cena própria acessível do Menu.
- Padrões visuais prontos: `neonText`, safe-areas (`hudLayout`), navegação
  Menu⇄cena das telas existentes.

## Requisitos funcionais

1. `ResultsScene`: para cada conquista recém-desbloqueada, banner "CONQUISTA —
   {title}" com animação discreta (fade/slide) e SFX curto (cue nova
   `achievement` no `AudioCues`/`AudioService`, ou reuso do `victory` —
   decidir na implementação). Vários desbloqueios ⇒ empilhar/sequenciar, sem
   cobrir o placar.
2. Galeria: lista de todas as conquistas do JSON — desbloqueadas (título +
   data) acesas; bloqueadas apagadas com a **descrição da condição** visível
   (sem mistério nesta versão; conquistas "secretas" ficam fora de escopo).
3. Contador "X/Y" no topo da galeria; entrada no Menu (ou na StatsScene).
4. Ordem estável: a ordem do JSON é a ordem de exibição (curadoria manual).
5. Estado vazio digno para jogador novo (0/Y, tudo apagado, sem erro).

## Requisitos não funcionais

- Apresentação pura; nenhum dado novo além do que a P6-02-01 já persiste.
- Mobile-first retrato; lista de ~10 itens sem scroll sofisticado (se passar
  de uma tela, scroll simples por arrasto ou paginação — o mais barato).
- Toast não interativo e não bloqueante (Results continua navegável).

## Critérios de aceite

- [ ] Headless: lógica pura extraível testada — sequenciamento dos toasts
      (N desbloqueios ⇒ N anúncios em fila) e mapeamento def+perfil ⇒ modelo
      de exibição da galeria (acesa/apagada/contador).
- [ ] Manual no `npm run dev`: desbloquear conquista mostra o banner no
      resultado; galeria reflete o perfil; bloqueadas mostram a condição;
      mobile legível.
- [ ] Navegação ida e volta sem vazamento de listeners.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/scenes/ResultsScene.ts` (toasts)
- `src/scenes/StatsScene.ts` ou nova `AchievementsScene.ts` (+ registro)
- `src/scenes/MenuScene.ts` (entrada de navegação, se cena própria)
- `src/systems/AudioCues.ts` / `src/services/AudioService.ts` (cue
  `achievement`, se adotada)
- Helper puro de modelo de exibição (ex.: `src/services/Achievements.ts`)
- `tests/Achievements.test.ts` (modelo de exibição/fila de toasts)

## Fora de escopo

- Conquistas secretas/ocultas; raridades; porcentagem global de jogadores.
- Progresso parcial por conquista ("742/1000 grazes") — exigiria expor o
  cálculo da condição na UI; fica para evolução futura se fizer falta.
- Notificação em tempo real durante a run (motor avalia pós-run, P6-02-01).
- Compartilhar conquista (ShareCard já cobre score; integração fica para P8).

## Documentação a atualizar

- `docs/GAME_DESIGN.md` (onde as conquistas aparecem).
- `docs/ROADMAP.md` (progresso P6-02 — com 01–02 feitas, avaliar marcar ✅).

## Riscos técnicos

- Poluir a `ResultsScene` (que já tem placar, recorde, share, ranking) — o
  toast deve ser pequeno e temporário; se a tela estiver cheia, ancorar no
  topo e sequenciar.
- Decisão StatsScene-aba vs cena própria depende da ordem de implementação
  real (P6-03-02 pode não existir ainda) — a issue cobre os dois caminhos,
  registrar a escolha no PR.
- Texto da condição duplicado entre `desc` e a condição declarativa — usar a
  `desc` do JSON como fonte única (escrita já pensando em "como desbloquear").

## Sugestão de testes (escrever primeiro)

- Fila de toasts: 3 desbloqueios ⇒ 3 anúncios na ordem do JSON, com duração
  configurada; 0 desbloqueios ⇒ nenhum.
- Modelo da galeria: perfil com 2/10 ⇒ 2 acesas com data, 8 apagadas com
  condição, contador "2/10".
- Conquista no perfil ausente do JSON ⇒ ignorada na galeria sem erro (caso
  de conteúdo removido, coberto no motor).
