# [P12-01-03] Bloom nos tiros do jogador e na chama do motor (vetorial, ambos os temas)

## Objetivo

Aplicar **bloom/glow** aos elementos do **jogador** — **tiros automáticos** e
**chama do motor** — via o helper de FX (P11-02), gated pelo toggle de qualidade
(P12-01-01). É **aqui** (com P12-01-02) que mora o **"novo estilo de tiro"**: forma
vetorial + bloom, **não imagem**. O cosmético de TIRO continua sendo **cor
procedural** (P10-13). **Render-only ⇒ determinismo intacto. Vale para Arcade e
Polido.**

## Contexto

- No `VectorTheme`, os tiros do jogador são desenhados por **um único `Graphics`**
  (`shotsGfx`, redesenhado por frame) e a chama do motor é o `engine`
  (`Phaser.GameObjects.Triangle`) dentro do container `ship`, pulsando via
  `shipVisual` (P10-10). Aplicar o glow **uma vez** a cada objeto (no `init`/
  criação) reusa o **padrão por camada** estabelecido em P12-01-02 — sem custo
  por-tiro/por-frame.
- **Tiros do jogador e motor seguem vetoriais nos dois temas**: o `SpriteTheme`
  herda o `VectorTheme` e a nave sprite vive no mesmo container (chama + sprite +
  hitbox; P10-10), então o bloom aplicado no `VectorTheme` cobre Arcade e Polido.
  Não duplicar no `SpriteTheme`.
- A **cor** do tiro/faíscas herda do cosmético nos dois temas (P10-13); o bloom
  **engrossa o brilho** dessa cor, sem trocar a cor nem exigir arte.
- Consome o helper de FX (P11-02) + o preset de glow dos tokens (P11-01-01) e
  respeita o **gate de qualidade** (P12-01-01): em **baixa**, no-op (tiro/chama
  planos como hoje).
- A chama do motor já pulsa (P10-10): o glow deve **somar** ao pulso existente sem
  brigar com ele (o pulso é transform/alpha; o glow é brilho).

## Requisitos funcionais

1. **Bloom nos tiros do jogador**: aplicar glow à camada `shotsGfx` (uma vez), de
   modo que todos os tiros brilhem sem custo por-tiro; o núcleo do tiro continua
   nítido e a **cor do cosmético** (P10-13) é preservada.
2. **Bloom na chama do motor**: aplicar glow ao `engine` (triângulo no container da
   nave), reforçando o "rastro quente" sem encobrir a silhueta/sprite nem o ponto
   de hitbox (hitbox ≠ sprite continua nítido por cima).
3. **Gate de qualidade**: em qualidade **baixa** (P12-01-01) o bloom de tiros e
   chama é **desligado** (no-op) — visual plano atual, sem regressão.
4. **Preset de glow dos tokens**: parâmetros do bloom vêm do preset (P11-01-01),
   calibrados para o tiro do jogador (brilho do "novo estilo", sem borrar).
5. **Ambos os temas por herança**: confirmar (conferência manual) que Arcade e
   Polido ganham o bloom de tiros/chama via o `VectorTheme` herdado, sem código
   duplicado no `SpriteTheme`.

## Requisitos não funcionais

- **Presentation-only**: nada toca `src/sim`/replay/`hashState()`/ranking.
- **Perf**: FX **uma vez** por objeto (camada de tiros + triângulo da chama),
  nunca por-tiro/por-frame; zero alocação no loop. Em "baixa", o custo some.
- **hitbox ≠ sprite**: o glow da chama não pode encobrir nem o ponto de hitbox nem
  o anel de graze (que ficam por cima e seguem com seu próprio tratamento).
- **Cosmético preservado**: a cor do tiro/faíscas (P10-13) continua valendo nos
  dois temas; o bloom só intensifica o brilho dessa cor.
- **Robustez Phaser 4.1/headless**: helper cai no fallback/no-op sem lançar quando
  o pipeline de FX falta.

## Critérios de aceite

- [ ] Tiros do jogador e chama do motor exibem bloom em qualidade **alta**, com o
      brilho aplicado **por objeto** (uma vez), preservando núcleo nítido e a cor
      do cosmético (conferência manual `npm run dev`).
- [ ] Em qualidade **baixa** o bloom de tiros/chama é no-op — visual plano, sem
      regressão de layout/legibilidade.
- [ ] O glow da chama **não** encobre o ponto de hitbox nem o anel de graze.
- [ ] Arcade e Polido ganham o bloom por **herança** do `VectorTheme`, sem código
      duplicado no `SpriteTheme` (incl. com a nave sprite do Polido).
- [ ] Usa o **helper de FX (P11-02)** e o **preset de glow dos tokens (P11-01-01)**,
      sem constantes mágicas.
- [ ] `npm test`, `npm run build`, `npm run lint`, `npm run typecheck` verdes.
- [ ] Regressão de determinismo: mesma seed/inputs ⇒ mesmo `hashState()`/replay.

## Arquivos/módulos provavelmente afetados

- `src/render/VectorTheme.ts` (aplicar `applyGlow` em `shotsGfx` e no `engine`
  dentro de `makeShip`; respeitar o gate de qualidade de P12-01-01)
- `src/render/shipVisual.ts` (se o pulso da chama precisar conciliar com o glow —
  só se necessário; manter a função pura intacta)
- `src/ui/fx.ts` / `src/ui/tokens.ts` (consumidos)
- `tests/` (regressão de determinismo; pouco/none código puro novo)

## Fora de escopo

- **Bloom nas balas/anel/pulso** — P12-01-02.
- **Toggle de qualidade / persistência / settings** — P12-01-01 (aqui só se
  consome o gate).
- **Helper de FX** — P11-02 (aqui só se consome).
- **Tiro como sprite/arte** — o tiro é procedural/vetorial por design (P10-13,
  TD-31); o "novo estilo" é forma + bloom, não imagem. O cosmético de TIRO segue
  sendo cor procedural.
- **Bloom no corpo da nave/inimigos/chefe** — fora do escopo de P12-01 (a nave/
  inimigos viram sprite na Fase 12; o glow do corpo não está pedido aqui).

## Documentação a atualizar

- `docs/GAME_DESIGN.md` (feedback/juice: tiros e chama com bloom em alta, plano em
  baixa; "novo estilo de tiro" = forma vetorial + bloom; cor do cosmético mantida).
- `docs/ARCHITECTURE.md` (`src/render/`: bloom de tiros/chama reusa o padrão por
  objeto de P12-01-02, herdado pelo `SpriteTheme`).
- `docs/ROADMAP.md` (progresso P12-01 — parte tiros/motor; **fechar P12-01** ao
  concluir 01+02+03).
- `docs/TEST_STRATEGY.md` (checklist manual: bloom de tiro/chama, hitbox visível,
  qualidade alta×baixa, paridade Arcade×Polido).

## Riscos técnicos

- **Glow encobrindo hitbox/anel**: o glow da chama é tentador de exagerar; manter o
  ponto de hitbox e o anel de graze sempre legíveis por cima (princípio sagrado).
- **Conflito com o pulso da chama** (P10-10): o glow é brilho, o pulso é
  transform/alpha — conciliar para não "piscar feio"; ajustar o preset, não a
  função pura `shipVisual`.
- **Glow não persistir sobre redraw do `shotsGfx`**: mesmo risco de P12-01-02 —
  validar no build real; usar o caminho que P12-01-02 fixou (camada/objeto, não
  por-tiro).
- **Cor do cosmético "lavada" pelo glow**: garantir que o bloom intensifica, não
  substitui, a cor escolhida (P10-13).
- **Esquecer o gate**: em "baixa" o custo precisa sumir.

## Sugestão de testes (escrever primeiro)

- (headless) regressão de determinismo (reexecutar): bloom não muda hash/replay.
- (headless/defensivo) o renderer não lança ao aplicar glow sem pipeline de FX
  (jsdom) — cai no fallback/no-op.
- (headless) `shipVisual` permanece puro/testável; se mudar, cobrir a conciliação
  pulso×glow onde for derivação pura.
- Conferência manual: bloom de tiro/chama, hitbox/anel legíveis, qualidade
  alta×baixa, paridade Arcade×Polido (**checklist no PR**, `TEST_STRATEGY.md`).
