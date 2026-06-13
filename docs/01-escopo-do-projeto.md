# 01 — Escopo do Projeto

> **Status do documento:** rascunho inicial / vivo.
> **Natureza:** este documento define *o quê* e *por quê*. Não define *como* (ver `02-arquitetura-de-referencia.md`).
> **Aviso de honestidade:** o gancho, o nome e a direção de arte abaixo são uma **proposta de partida**, não uma decisão fechada. O diferenciador ("wedge") é a variável que mais determina se o projeto encontra audiência. Valide-o antes de investir meses.

---

## 1. Resumo em uma frase (o "elevator pitch")

> Um bullet hell vertical para celular, jogável com **um dedo**, onde **chegar perto das balas inimigas é recompensado** (graze) e a coragem vira poder — com um **desafio diário com seed única para todos**.

Se você não conseguir reescrever esta frase com suas próprias palavras e ainda achá-la interessante, o projeto ainda não está pronto para começar.

## 2. Nome de trabalho

**Codinome: `GRAZE`** (provisório). Escolhido porque nomeia a mecânica central. Substituível a qualquer momento — não amarre código a esse nome (ver convenções de arquitetura).

## 3. Objetivo do jogador (o que ele está tentando fazer)

- **Sobreviver** ao maior número de ondas/estágios possível.
- **Maximizar pontuação** — e a pontuação é fortemente influenciada pelo risco assumido (graze), não só por matar inimigos.
- **Competir no desafio diário** contra outras pessoas que receberam exatamente o mesmo cenário.

O objetivo emocional (o que faz voltar para "só mais uma run"): a tensão de *querer* chegar perto do perigo porque o perigo é o que gera poder. O loop premia bravura, não cautela.

## 4. O diferenciador (o "wedge")

Shmup/bullet hell é um gênero **menos saturado que survivors-like, mas de público total menor**. Entrar sem diferencial = invisibilidade. O diferencial proposto tem três camadas:

### 4.1. Mecânica: Graze-to-Charge
- Voar **próximo** de uma bala inimiga sem ser atingido enche um medidor de **Foco/Overdrive**.
- Esse medidor é gasto em uma ação poderosa (proposta: um **pulso refletor** que devolve as balas próximas como dano, limpando parte da tela).
- Consequência de design: o jogador é *empurrado para dentro* do perigo, não para longe dele. Isso é o oposto do instinto natural e é o que torna o jogo memorável.
- Precedentes: a mecânica de *graze* existe (Touhou, DoDonPachi). **O novo é a embalagem**: feita para uma mão, no celular, com desafio diário.

### 4.2. Controle: one-thumb / mobile-native
- **Arrastar para mover** (a nave segue o dedo).
- **Tiro automático** (não se toca para atirar — padrão em shmup mobile bem-feito).
- **Modo Foco** (precisão): segurar/segundo toque reduz a velocidade da nave e estreita a hitbox visível — herança direta do gênero, essencial para bullet hell.
- A hitbox real da nave é **muito menor que o sprite** (convenção do gênero; o jogador "cabe" entre as balas).

### 4.3. Estética: neon vetorial / geométrico
- **Decisão deliberada e honesta sobre produção:** sprites pixel-art consistentes gerados por IA ainda são um gargalo real (mesma nave em várias animações, paleta coerente). Arte **vetorial/geométrica neon** (formas, brilho, partículas, glow) é barata de produzir, escala bem proceduralmente e parece polida com pouco esforço.
- Isso reduz a dependência de um pipeline de arte que provavelmente seria o maior atrito do projeto.
- Trade-off assumido: menos "personalidade de personagem", mais "estilo abstrato". Aceitável e até virtude no gênero.

## 5. Jogabilidade — descrição do loop

1. Jogador entra em uma run (modo Endless **ou** Desafio Diário).
2. Inimigos surgem em **ondas** com padrões de bala roteirizados por dados (não hardcoded).
3. Jogador desvia, faz *graze* para carregar Foco, dispara o pulso refletor em momentos críticos.
4. A cada N ondas, um **chefe** com fases e padrões próprios.
5. Dificuldade escala (densidade de balas, velocidade, variedade de padrões).
6. Run termina ao perder todas as vidas. Tela de resultado: pontuação, graze total, melhor combo, posição no ranking (se diário).
7. "Só mais uma run."

## 6. Modos previstos (escopo da v1 vs. depois)

| Modo | Descrição | Versão alvo |
|---|---|---|
| Endless | Run infinita com dificuldade crescente | **v1 (MVP)** |
| Desafio Diário | Mesma seed para todos, ranking | **v1 (MVP)** — núcleo do gancho social |
| Estágios fixos | Fases curadas com chefes específicos | Pós-v1 |
| Modos de mutação | Modificadores semanais, regras alternativas | Futuro |

## 7. Plataforma e restrições técnicas (resumo; detalhe em doc 02)

- **Web / PWA**, mobile-first (retrato como orientação primária).
- **Serverless** no cliente; backend mínimo apenas para ranking (ver doc 02 sobre o problema de anti-cheat).
- Sem investimento inicial relevante. Stack gratuita/free-tier.
- Suporte responsivo: celular retrato (primário), celular paisagem, tablet, desktop widescreen.

## 8. Monetização (expectativa realista, sem dourar)

- **Probabilidade de receita relevante: baixa.** Isto é um hobby; a meta primária é aprender e, talvez, conquistar uma audiência pequena.
- Caminhos possíveis, do menos ao mais invasivo:
  1. Doação / "pague o quanto quiser" (itch.io, Ko-fi).
  2. Cosméticos (skins de nave/balas) — não afetam jogabilidade, preservam justiça do ranking.
  3. Remoção de anúncios / versão "pro" com modos extras.
- **Anúncios intersticiais são hostis** a um jogo de reflexo. Evitar, ou limitar a "rewarded ads" opcionais (ex.: continuar a run).
- **Regra de ouro:** monetização **nunca** pode comprometer a justiça do Desafio Diário (nada de "pay-to-win" no ranking).

## 9. O que este jogo **NÃO** é (escopo negativo — tão importante quanto o positivo)

- Não tem história/narrativa profunda (decisão consciente: foco no loop, não em conteúdo narrativo caro).
- Não é um survivors-like (sem auto-ataque em horda; o jogador mira/posiciona ativamente).
- Não tem progressão de RPG complexa na v1 (sem árvores de habilidade extensas).
- Não tem multiplayer em tempo real (apenas competição assíncrona via ranking).
- Não busca catálogo gigante de conteúdo manual; favorece **conteúdo procedural + curado por dados**.

## 10. Critérios de sucesso (para você medir honestamente)

- **Mínimo (técnico/pessoal):** um MVP jogável e divertido, publicado, que *você* queira rejogar.
- **Pequeno sucesso (audiência):** algumas centenas de jogadores; um punhado retorna ao Desafio Diário por vários dias.
- **Sucesso improvável (receita):** qualquer receita que pague o domínio/hospedagem já é vitória.

A métrica que mais importa cedo: **retenção D1/D7 do Desafio Diário**. Se as pessoas voltam no dia seguinte, o gancho funcionou.
