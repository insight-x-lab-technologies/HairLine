# PRODUCT_VISION — HAIRLINE

> Doc de memória para novas sessões. Define **o quê** e **por quê**. Fonte
> original: `01-escopo-do-projeto.md` (mais detalhado). Aqui é o resumo vivo.

## Pitch (uma frase)

Um **bullet hell vertical para celular, jogável com um dedo**, onde **chegar
perto das balas inimigas (graze) é recompensado** e a coragem vira poder — com
um **Desafio Diário de seed única para todos**.

## O diferenciador (wedge) — 3 camadas

1. **Mecânica Graze-to-Charge:** voar perto das balas enche o **Foco**; o Foco
   vira um **pulso refletor** que limpa balas próximas. Empurra o jogador *para
   dentro* do perigo — o oposto do instinto. É a alma do jogo.
2. **Controle one-thumb / mobile-native:** arrastar para mover, tiro automático,
   modo Foco (precisão), pulso. Hitbox real << sprite.
3. **Estética neon vetorial/geométrica:** formas, glow, partículas. Barata de
   produzir, escala proceduralmente, parece polida — evita pipeline de pixel-art.

## Loop do jogador

Entrar numa run → desviar e fazer graze para carregar Foco → soltar o pulso em
momentos críticos → escalar dificuldade/ondas → chefe → morrer → ver placar →
"só mais uma run". O gancho de retorno é o **Desafio Diário** (mesma seed para
todos no dia) + **Evento Semanal** (modificadores de regra).

## Modos (estado atual)

- **Endless** (padrão): procedural, dificuldade crescente, chefes periódicos.
- **Desafio Diário:** seed do dia, ranking, replay verificável.
- **Boss Rush:** todos os chefes em sequência.
- **Evento Semanal:** Endless com modificadores determinísticos da semana.
- *(Campaign — onda autoral + chefe — existe internamente, base para estágios curados.)*

## Plataforma / restrições

Web / PWA, mobile-first (retrato primário), responsivo (celular/tablet/desktop).
Serverless no cliente; backend mínimo só para ranking. Stack gratuita/free-tier.

## Monetização (expectativa realista: baixa)

Hobby. Caminhos não-invasivos: doação → cosméticos (não afetam jogo) → "pro"/
sem-anúncios. **Regra de ouro:** nada de pay-to-win; o Diário é sagrado.

## Métrica que importa

**Retenção D1/D7 do Desafio Diário.** Se voltam no dia seguinte, o gancho pegou.
(Depende de lançar — P2-06 — e instrumentar — P3-07.)

## O que NÃO é

Sem narrativa pesada; não é survivors-like (jogador posiciona ativamente); sem
RPG complexo na v1; sem multiplayer em tempo real; favorece conteúdo
procedural + curado por dados, não catálogo manual gigante.

## Estado atual (memória)

MVP jogável completo + Diário + ranking local (backend remoto pronto, não
deployado) + profundidade de conteúdo em andamento (Fase 4). **Ainda não
lançado** por decisão deliberada (amadurecer visual/feel antes). Ver `ROADMAP.md`.
