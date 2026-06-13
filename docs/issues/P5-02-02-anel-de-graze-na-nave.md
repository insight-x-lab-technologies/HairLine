# [P5-02-02] Anel de graze visível na nave (zona de risco legível)

## Objetivo

Desenhar ao redor da nave a **zona de graze** — o anel entre a hitbox real e
`hitbox + grazeMarginPx` — para o jogador *ver* onde o risco vira recompensa,
com um "ping" do anel no instante de cada graze. Hoje a margem de 22px é
invisível: o jogador não sabe o quão perto precisa chegar.

## Contexto

- Independente das demais issues do épico (render-only, lê estado existente);
  combina com P5-02-01 (faísca) mas não depende dela. Usa `effects.json`
  (P5-01-01) para os parâmetros visuais.
- Valores vêm de dados já existentes: `hitboxRadiusPx` (`player.json`) e
  `grazeMarginPx` (`combat.json`) — o desenho deve **derivar** deles, nunca
  duplicar números.
- O modo Foco já reduz a velocidade e a escala do sprite
  (`GameScene`, `this.ship.setScale(this.focus ? 0.7 : 1)`); é o momento de
  precisão em que mostrar hitbox + anel importa mais (convenção do gênero).

## Requisitos funcionais

1. Desenhar via `Graphics`, centrado na posição da nave: o **ponto de hitbox**
   (núcleo pequeno e nítido) e o **anel de graze** (circunferência em
   `hitboxRadius + grazeMarginPx`), com estilo neon sutil.
2. Visibilidade por estado, configurável em `effects.json` (seção
   `grazeRing`): em modo Foco, sempre visível (alpha maior); fora do Foco,
   discreto ou ausente (decidir tuning no JSON, ex.: `alphaNormal: 0`–`0.15`,
   `alphaFocus: ~0.5`).
3. "Ping" no graze: quando o contador de graze do estado avança (ou via evento
   `graze`, se P5-02-01 já existir), o anel pulsa — flash de alpha/espessura
   decaindo em ~10–15 frames. Grazes em rajada renovam o pulso (não empilham).
4. Respeitar i-frames: durante invulnerabilidade (`state.invulnerable`), o
   anel acompanha o piscar da nave (não sugerir que dá para grazear de graça —
   graze continua funcionando, mas o visual de dano domina).
5. Nenhuma mudança em `src/sim/`/`src/systems/` (com P5-02-01 feita, nem isso;
   sem ela, a cena detecta o graze por delta de `grazeCount` entre frames).

## Requisitos não funcionais

- Render-only; zero impacto em determinismo, replay ou `hashState()`.
- Sem alocação por frame (estado do pulso = números na cena).
- Legibilidade: o anel não pode encobrir balas finas nem competir com elas —
  traço fino, alpha baixo, sem preenchimento sólido.

## Critérios de aceite

- [ ] Anel e núcleo derivam de `player.json`/`combat.json` (mudar
      `grazeMarginPx` no JSON muda o anel sem tocar código).
- [ ] Em modo Foco o anel é claramente visível; fora dele, não distrai.
- [ ] Graze dispara ping perceptível no anel; rajada de grazes não acumula
      brilho além do teto.
- [ ] Manual no `npm run dev` (desktop + mobile): jogador consegue "calibrar"
      a distância de graze olhando o anel; balas continuam legíveis por cima.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/scenes/GameScene.ts` (desenho do anel/núcleo + estado do ping)
- `src/data/effects.json` + `src/content/` (seção `grazeRing`, validação)
- `src/ui/shapes.ts` (se ganhar helper de anel neon reutilizável)

## Fora de escopo

- Faísca/partículas no ponto do graze (P5-02-01).
- HUD/barra de Foco e estado "pulso pronto" (P5-02-03).
- Tutorial explicando o anel (cabe à dica existente do tutorial, se preciso,
  em issue própria).
- Opções de acessibilidade do anel (P5-05).

## Documentação a atualizar

- `docs/GAME_DESIGN.md` §Mecânica central / §Controles (anel visível no Foco).
- `docs/ROADMAP.md` (progresso P5-02).

## Riscos técnicos

- Poluição visual: anel permanente pode "sujar" o campo em densidade alta —
  por isso alpha/estados ficam no JSON, para iterar rápido (e o default fora
  do Foco é quase invisível).
- Duplicar o raio de graze no código da cena em vez de derivar dos JSONs —
  divergência silenciosa se o balanceamento mudar.
- Detecção por delta de `grazeCount` entre frames perde o "onde" (ok — o anel
  é na nave) mas pode pingar uma vez para N grazes no mesmo frame — aceitável
  e até desejado (anti-strobo).

## Sugestão de testes (escrever primeiro)

- (Headless, se houver helper puro de ping) decaimento do pulso: dispara em
  t0, decai monotonicamente, novo graze renova sem ultrapassar o teto.
- Integridade de dados: seção `grazeRing` validada (alphas em [0,1], duração
  positiva).
- Demais verificações são manuais (feel/legibilidade), conforme
  `TEST_STRATEGY.md` — registrar checklist no PR.
