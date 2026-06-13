# [P6-01-02] Hangar (seletor de cosméticos) + aplicação visual e sonora

## Objetivo

Fechar o loop dos cosméticos: uma tela **Hangar** para ver e escolher nave,
cor de tiro e trilha (bloqueados visíveis com a condição), e a **aplicação**
do loadout no jogo — nave desenhada com a forma/cor escolhida, tiros do
jogador na cor escolhida, trilha no preset escolhido.

## Contexto

- Depende de **P6-01-01** (catálogo, desbloqueio, loadout persistido).
- Aplicação é só apresentação: `GameScene` desenha a nave e os tiros — hoje
  com forma/cor fixas; `AudioService`/`MusicDirector` (P5-04-01) toca a
  trilha. A sim continua cega a tudo isso.
- Padrões prontos: navegação de cenas, `neonText`, `ui/shapes` (formas por
  nome), galeria de conquistas (P6-02-02) como referência de lista
  acesa/apagada.

## Requisitos funcionais

1. `HangarScene` acessível do Menu: três grupos (NAVE / TIRO / TRILHA), itens
   como cartões/linhas — desbloqueados selecionáveis (seleção atual marcada),
   bloqueados apagados exibindo a condição (reusar `desc` da conquista ou
   texto da condição, fonte única).
2. Preview imediato no Hangar: trocar nave redesenha um preview da forma/cor;
   trocar cor de tiro mostra amostra; trocar trilha toca alguns segundos do
   preset (respeitando mute).
3. Aplicação em jogo: `GameScene` resolve o loadout no `create()` via
   `Cosmetics.getLoadout()` — forma/cor da nave, cor dos tiros do jogador,
   preset de trilha repassado ao áudio. Zero leitura de perfil no loop.
4. Identidade visual coerente: glow/efeitos existentes (e os da Fase 5)
   herdam a cor do cosmético onde fizer sentido (ex.: partículas do tiro na
   cor do tiro).
5. Compartilhamento (`ShareCard`/`ShareImage`) e ranking **não** mudam por
   cosmético (sem vazamento de loadout para fora do aparelho nesta fase).

## Requisitos não funcionais

- Sim/replay/`hashState()`/leaderboard intactos — critério com teste de
  regressão, não só promessa.
- Sem custo novo no loop: cores/formas resolvidas uma vez por cena.
- Mobile-first: cartões tocáveis com polegar; sem hover.
- Legibilidade: preview honesto (a cor no Hangar é a cor em jogo).

## Critérios de aceite

- [ ] Headless: modelo de exibição do Hangar testado (agrupamento por tipo,
      acesa/apagada/selecionada, condição visível) — mesma técnica da galeria
      de conquistas.
- [ ] Selecionar cosmético no Hangar e iniciar run ⇒ nave/tiro/trilha
      aplicados (manual no `npm run dev`).
- [ ] Regressão de determinismo: run com loadout não-default produz o mesmo
      `hashState()`/replay que com o default (mesma seed/inputs).
- [ ] Item bloqueado não é selecionável; condição legível; estado de jogador
      novo (só defaults) digno.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/scenes/HangarScene.ts` (novo) + registro da cena
- `src/scenes/MenuScene.ts` (entrada "HANGAR")
- `src/scenes/GameScene.ts` (resolver/aplicar loadout no create)
- `src/ui/shapes.ts` (desenho parametrizado da nave, se necessário)
- `src/services/AudioService.ts` / `MusicDirector` (preset de trilha)
- `src/services/Cosmetics.ts` (modelo de exibição, se ficar lá)
- `tests/Cosmetics.test.ts` (modelo do Hangar), `tests/Simulation.test.ts`
  (regressão de hash — se já não cobrir)

## Fora de escopo

- Cosméticos novos além do catálogo inicial da P6-01-01.
- Animações elaboradas de preview (rotação 3D etc.) — preview estático basta.
- Loadout visível no ranking/share (P8).
- Compra/moeda (P7-02).

## Documentação a atualizar

- `docs/GAME_DESIGN.md` (Hangar: onde se escolhe, o que muda).
- `docs/ROADMAP.md` (progresso P6-01 — com 01–02 feitas, avaliar marcar ✅).

## Riscos técnicos

- Cor de tiro do jogador conflitando com balas inimigas em algum padrão —
  além da curadoria do catálogo, conferir manualmente os piores casos
  (densidade alta) com cada cor.
- Vazamento sutil de gameplay: ex. cosmético de nave com `shape` maior
  *parecer* hitbox maior — hitbox real é invariável (hitbox ≠ sprite já é
  princípio); manter tamanhos visuais próximos entre naves.
- Preview de trilha deixando osciladores tocando ao sair do Hangar — parar
  no shutdown da cena (mesma disciplina dos listeners de resize).

## Sugestão de testes (escrever primeiro)

- Modelo do Hangar: catálogo + perfil ⇒ grupos corretos, selecionada marcada,
  bloqueadas com condição.
- Loadout inválido no perfil ⇒ Hangar e jogo caem nos defaults sem erro.
- Determinismo: mesma seed/inputs com dois loadouts diferentes ⇒ hashes
  idênticos (o teste central da issue).
