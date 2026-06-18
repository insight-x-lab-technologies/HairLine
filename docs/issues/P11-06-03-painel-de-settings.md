# [P11-06-03] Home — painel de settings atrás de uma engrenagem (consolidar utilidades)

## Objetivo

Consolidar as **utilidades hoje dispersas** na Home (apelido, esquema de controle
OFFSET×DIRETO, tema de apresentação, vibração/haptics) atrás de uma **engrenagem**
que abre um **painel de settings** desenhado com o toolkit (`ui/panel`/`ui/button`/
ícones). Limpa o bloco de menu da Home e dá um lugar único e organizado para as
opções. **Nada toca a simulação.**

## Contexto

- Hoje `MenuScene.drawUtilities` (`MenuScene.ts:209`) e `showThemes`
  (`MenuScene.ts:259`) espalham essas opções como textos/togglers soltos na Home;
  os mockups (`ref/v1_MenuPrincipal.png`) mostram uma **engrenagem** no canto, não
  os controles soltos.
- Depende da estrutura da Home (P11-06-01) e do toolkit. Esta issue **move** as
  utilidades existentes para um painel — **sem mudar o que elas fazem**:
  - **apelido**: `PlayerIdentity` (`getIdentity().setName`);
  - **esquema de controle**: toggle OFFSET×DIRETO persistido (P10-01,
    `controlScheme`);
  - **tema de apresentação**: seletor do registro `config/themes` (P10-04),
    persistido em `hairline.theme.v1`;
  - **haptics**: toggle de vibração persistido (P5-04, `getHaptics`).
- O **seletor de classe de nave** (P6-04) pode entrar no painel **ou** permanecer
  no header — decisão registrável na SDD; em ambos os casos a função e a regra
  (Diário força default) permanecem.

## Requisitos funcionais

1. **Botão de engrenagem** (`ui/button`, ícone `settings` de P11-05) num canto da
   Home, abrindo/fechando o painel de settings (overlay).
2. **Painel de settings** (`ui/panel` + linhas/togglers com `ui/button`): reúne
   apelido, esquema de controle, tema e haptics, cada um com seu controle e estado
   atual visível; fechar volta para a Home.
3. **Comportamento idêntico ao atual** para cada opção: editar apelido persiste em
   `PlayerIdentity`; toggle de controle persiste no `SaveService`; trocar tema
   persiste e aplica o áudio na hora (vale já no menu) + visual na próxima run
   (como `showThemes` hoje); toggle de haptics persiste e respeita ausência de API.
4. **Acessibilidade do overlay**: tocável, fecha por botão e/ou toque fora;
   respeita safe-areas; não deixa estado pendente (ex.: amostra de áudio de tema
   parada ao fechar, como o cuidado atual).
5. **Remoção da poluição na Home**: as utilidades soltas saem do bloco de menu
   (substituídas pela engrenagem), mantendo o layout de P11-06-01 limpo.

## Requisitos não funcionais

- **Presentation-only**: nada toca `src/sim`/replay/`hashState()`/ranking; tema/
  controle/haptics/apelido são **estado do jogador**, fora da sim (como já são).
- **Persistência inalterada**: mesmas chaves do `SaveService`/`PlayerIdentity`; só
  muda **onde** se acessa, não o formato.
- **Perf**: painel assado quando estático (P11-02/03); zero alocação por frame.
- **Mobile-first**: alvos de toque confortáveis; overlay legível em retrato.
- **Sem regressão**: todas as opções continuam funcionando e persistindo igual.

## Critérios de aceite

- [ ] Há uma **engrenagem** na Home que abre um **painel de settings** com apelido,
      controle (OFFSET×DIRETO), tema e haptics, fiel ao espírito do mockup
      (conferência manual `npm run dev`).
- [ ] Cada opção mantém o **comportamento e a persistência atuais** (apelido,
      controle, tema com áudio aplicado na hora, haptics defensivo).
- [ ] As utilidades soltas saíram do bloco de menu da Home (consolidadas no painel).
- [ ] Fechar o painel não deixa estado pendente (ex.: amostra de áudio parada).
- [ ] Decisão sobre o **seletor de classe de nave** (no painel ou no header)
      registrada e funcionando, com o Diário ainda forçando a default.
- [ ] Headless: modelo do painel (linhas/estado dos togglers) testado onde puro;
      regressão das persistências (SaveService) verde.
- [ ] `npm test`, `npm run build`, `npm run lint`, `npm run typecheck` verdes.
- [ ] Regressão de determinismo: mesma seed/inputs ⇒ mesmo `hashState()`/replay.

## Arquivos/módulos provavelmente afetados

- `src/scenes/MenuScene.ts` (engrenagem + overlay; remover utilidades soltas de
  `drawUtilities`/`showThemes`, migrando o comportamento)
- `src/ui/panel.ts`, `src/ui/button.ts`, `src/ui/icons.ts`, `src/ui/tokens.ts`
  (consumidos)
- `src/ui/home.ts` (posição da engrenagem; remover âncora de utilidades soltas)
- `src/services/SaveService.ts`, `src/services/PlayerIdentity.ts`,
  `src/services/HapticsService`, `config/themes` (consumidos — **sem mudar formato**)
- `tests/home-ui.test.ts` / teste do modelo do painel (se puro) + regressão de
  `SaveService`

## Fora de escopo

- **Estrutura da Home** (cards/botão/meta/rodapé) — P11-06-01.
- **Hero-ship centerpiece** — P11-06-02.
- **Novas opções** de configuração (só consolidar as existentes; nada de features
  novas como volume granular, idioma etc.).
- Mudar formato/chaves de persistência.

## Documentação a atualizar

- `docs/GAME_DESIGN.md` (utilidades consolidadas num painel de settings via
  engrenagem; comportamento inalterado).
- `docs/ARCHITECTURE.md` (Home: overlay de settings com toolkit; estado do jogador
  fora da sim, persistência inalterada).
- `docs/ROADMAP.md` (progresso P11-06 — parte settings; fechar P11-06 ao concluir
  01+02+03).

## Riscos técnicos

- **Regredir persistência/comportamento** ao mover as opções — reusar os mesmos
  serviços/chaves; cobrir por regressão do `SaveService` e conferência manual.
- **Estado de áudio do tema** ao abrir/fechar (osciladores/amostra pendente) —
  parar/reiniciar com disciplina, como o `showThemes` atual já cuida.
- **Overlay e navegação** (foco/toque fora, voltar) — garantir fechar limpo, sem
  travar a Home.
- **Haptics sem API** — manter defensivo (no-op), como hoje.
- **Realocação do seletor de nave** — não perder a função nem a regra do Diário.

## Sugestão de testes (escrever primeiro)

- (headless) modelo do painel: linhas/estado dos togglers (controle on/off, tema
  atual marcado, haptics on/off) refletem o `SaveService`/perfil.
- (regressão) persistências de apelido/controle/tema/haptics inalteradas (mesmas
  chaves, ida-e-volta).
- Regressão de determinismo (reexecutar): settings não muda hash/replay.
- Abrir/fechar overlay, aplicar tema com áudio, vibração: **manual** (checklist no
  PR, `TEST_STRATEGY.md`).
