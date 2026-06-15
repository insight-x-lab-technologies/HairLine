# [P10-04] Seletor de tema + persistência + carregamento condicional de assets

## Objetivo

Dar ao jogador a escolha do **tema de apresentação** ("Arcade anos 80" hoje;
"Polido" quando existir), persistir a escolha e carregar assets **apenas do tema
ativo**. Esta issue entrega o **mecanismo** (registro de temas + seleção +
persistência + gancho de carga no `PreloadScene`); o tema "Polido" em si (arte/
áudio reais) chega no Bloco C. **Nada toca a simulação.**

## Contexto

- Depende de P10-02 (`GameRenderer`/`VectorTheme`) e P10-03 (`AudioTheme`/
  `SynthAudioTheme`): o tema selecionado escolhe *qual* renderer e *qual* áudio o
  jogo usa.
- O `PreloadScene` é hoje um placeholder com comentário reservando o lugar de
  "atlas/áudio" — é exatamente o gancho desta carga condicional. O tema vetorial/
  synth **não precisa de nenhum asset** (protege o jogador "Arcade" de peso de
  bundle/PWA).
- Tema é **estado do jogador** (como mute/cosméticos): mora no `SaveService`,
  **fora da sim/replay/hash/Diário**. Não afeta justiça do ranking.

## Requisitos funcionais

1. **Registro de temas**: uma fonte única lista os temas disponíveis (id, rótulo,
   renderer associado, tema de áudio associado, manifesto de assets — vazio para o
   vetorial). Inicialmente só o tema **arcade** (vetorial + synth) é registrado e
   selecionável; o registro é a costura para "polido" aparecer sozinho no seletor
   quando o Bloco C registrar seus assets/implementações.
2. **Persistência** no `SaveService`: chave do tema escolhido, default = arcade.
   Save corrompido/valor desconhecido ⇒ cai no default sem quebrar (padrão dos
   outros campos do perfil).
3. **Seletor** acessível ao jogador (Menu ou tela de opções), listando os temas
   do registro, com o atual marcado; selecionar persiste e passa a valer na
   próxima run (e no áudio do menu, se aplicável). Mobile-first, tocável.
4. **Carregamento condicional** no `PreloadScene`: carregar somente o manifesto de
   assets do tema ativo; vetorial ⇒ nada além do que já existe. Estrutura pronta
   para o tema "polido" registrar atlas/áudio depois.
5. `GameScene` (e o áudio do menu, se houver) resolvem o tema ativo **uma vez** e
   instanciam o `GameRenderer`/`AudioTheme` correspondentes — sem lookup no loop.

## Requisitos não funcionais

- Determinismo/replay/`hashState()`/leaderboard intactos (tema é presentation
  state, jamais entra na sim).
- Sem custo no loop: tema resolvido no `create()`/preload.
- Trocar de tema não pode exigir recarregar a página (resolver na entrada da cena
  de jogo é aceitável); estado novo (sem save) ⇒ default digno.
- Não regredir o tempo de carga do tema vetorial (não carregar assets de outro
  tema "por via das dúvidas").

## Critérios de aceite

- [ ] Selecionar o tema persiste entre sessões; valor inválido ⇒ default arcade.
- [ ] Com só o tema arcade registrado, o seletor mostra-o como atual e o jogo
      usa `VectorTheme` + `SynthAudioTheme` (manual no `npm run dev`).
- [ ] `PreloadScene` carrega apenas os assets do tema ativo (vetorial = nenhum
      novo) — verificável (sem requests de assets de "polido").
- [ ] Headless: modelo do registro/seleção testado (lista de temas, atual
      marcado, fallback no desconhecido).
- [ ] Regressão de determinismo: mesma seed/inputs com qualquer tema ⇒ mesmo
      `hashState()`/replay.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/render/themes.ts` (novo — registro: id/rótulo/renderer/áudio/assets) ou
  `src/config/`
- `src/services/SaveService.ts` (chave do tema + leitura/escrita defensiva)
- `src/scenes/PreloadScene.ts` (carga condicional pelo manifesto do tema ativo)
- `src/scenes/MenuScene.ts` (ou tela de opções) — seletor de tema
- `src/scenes/GameScene.ts` (resolver o tema ativo → renderer/áudio)
- `tests/SaveService.test.ts` + teste do registro/modelo de seleção

## Fora de escopo

- A implementação do tema "Polido" (sprite/áudio real) e seus assets (Bloco C —
  P10-09 a P10-12).
- Carregamento sob demanda elaborado (streaming/parcial) — manifesto simples por
  tema basta nesta fase.
- Cruzamento tema × cosméticos (P10-13).

## Documentação a atualizar

- `docs/GAME_DESIGN.md` (escolha de tema: o que é, onde se troca).
- `docs/ARCHITECTURE.md` (registro de temas + carga condicional no Preload; tema
  é estado do jogador, fora da sim).
- `docs/TECH_DECISIONS.md` (se o registro/manifesto for decisão estrutural — TD
  curto; pode anexar ao TD criado em P10-02/03).
- `docs/ROADMAP.md` (progresso P10-04; com Bloco A completo, avaliar nota de
  fundação concluída).

## Riscos técnicos

- Tema vazar para a sim (ex.: alguém passar `themeId` à `Simulation`) — barrar por
  revisão/teste; o tema só chega ao renderer/áudio.
- Carregar assets de "polido" mesmo no arcade (regressão de peso) — o manifesto
  precisa ser estritamente por tema ativo.
- Estado do áudio do menu ao trocar de tema (osciladores/loop pendentes) — parar/
  reiniciar com disciplina ao aplicar a troca.
- Acoplar o seletor a só dois temas fixos no código — usar o registro como fonte
  única para o futuro "polido" entrar sem editar o seletor.

## Sugestão de testes (escrever primeiro)

- (headless) registro lista os temas; seleção desconhecida ⇒ default; persistência
  via `SaveService` ida-e-volta.
- `SaveService` com valor de tema corrompido ⇒ reset limpo no default.
- Regressão de determinismo (reexecutar): tema não muda hash.
- Carga condicional e feel são **manuais** — checklist no PR (`TEST_STRATEGY.md`).
