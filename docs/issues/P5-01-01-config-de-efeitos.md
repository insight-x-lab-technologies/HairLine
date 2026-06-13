# [P5-01-01] Config de efeitos em dados (`effects.json`)

## Objetivo

Tirar do código os parâmetros de juice hardcoded (shake, flash, anel do pulso)
e centralizá-los em `src/data/effects.json`, criando a fundação de configuração
que as demais issues do épico P5-01 (partículas, hit-stop) vão consumir.

## Contexto

- Hoje `GameScene.reactToCue()` tem durações/amplitudes de `cam.shake()` e
  cores/durações de `cam.flash()` hardcoded por cue (`hit`, `gameover`,
  `pulse`, `victory`).
- `GameScene.drawReflectFx()` tem `FLASH_TICKS = 18` hardcoded.
- O princípio "dados separados de código" (CLAUDE.md §3) vale também para
  apresentação: tuning de feel vai ser iterado com frequência na Fase 5 e o
  feedback pré-lançamento pediu "visual muito melhor" — iterar em JSON é mais
  rápido e seguro que tocar a cena.

## Requisitos funcionais

1. Criar `src/data/effects.json` com seções `shake` e `flash` indexadas por cue
   (`hit`, `gameover`, `pulse`, `victory`), com os **valores atuais** migrados
   (sem mudança de comportamento), e seção `reflectFx` (`durationTicks`).
2. Tipagem e acesso via `src/content/` (ex.: `getEffects()`), no mesmo padrão
   de `getPattern`/`getBoss` — sem `import` direto de JSON espalhado pela cena.
3. Validação de integridade: cues referenciadas existem no tipo `AudioCue`;
   números são finitos e não-negativos.
4. `GameScene.reactToCue()` e `drawReflectFx()` passam a ler do config.
5. O schema deve aceitar extensão futura (seções `particles` e `hitStop` serão
   adicionadas pelas issues P5-01-03 e P5-01-04 — não criar agora).

## Requisitos não funcionais

- Zero mudança de comportamento visual nesta issue (refactor de dados).
- Nenhuma leitura do config dentro do loop por lookup repetido caro — resolver
  referências uma vez no `create()` da cena.
- Nada disso entra na simulação (`src/sim/` não conhece `effects.json`).

## Critérios de aceite

- [ ] `src/data/effects.json` existe com os valores atuais migrados 1:1.
- [ ] `GameScene` não contém mais números mágicos de shake/flash/anel do pulso.
- [ ] Teste de integridade de dados cobre o novo JSON (cues válidas, números
      sãos), no estilo de `tests/content.test.ts`.
- [ ] Conferência manual no `npm run dev`: hit, pulso, game over e vitória com
      o mesmo feel de antes.
- [ ] `npm test`, `npm run build`, `npm run lint` verdes.

## Arquivos/módulos provavelmente afetados

- `src/data/effects.json` (novo)
- `src/content/types.ts`, `src/content/index.ts` (tipo + getter + validação)
- `src/scenes/GameScene.ts` (`reactToCue`, `drawReflectFx`)
- `tests/content.test.ts` (ou novo `tests/effects.test.ts`)

## Fora de escopo

- Qualquer efeito novo (partículas, hit-stop, juice de kill) — issues seguintes.
- Mudar valores/feel dos efeitos atuais.
- Config de áudio (`AudioService` continua como está).

## Documentação a atualizar

- `docs/GAME_DESIGN.md` §Feedback/juice (apontar `src/data/effects.json`).
- `docs/ROADMAP.md` (progresso P5-01).

## Riscos técnicos

- Migração com valor trocado (ex.: amplitude de shake) muda o feel sem ninguém
  notar no diff — copiar os números com conferência lado a lado.
- Acoplar o schema cedo demais às necessidades das issues seguintes — manter
  mínimo; cada issue evolui o schema quando precisar.

## Sugestão de testes (escrever primeiro)

- `getEffects()` retorna config com todas as cues esperadas e valores válidos.
- Toda chave de `shake`/`flash` corresponde a uma `AudioCue` existente.
- Validação rejeita (ou acusa) duração/amplitude negativa ou `NaN`.
