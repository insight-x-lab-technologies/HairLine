# GAME_DESIGN — HAIRLINE

> Doc de memória: regras concretas do jogo e onde ajustá-las. Tudo que é
> balanceamento mora em **JSON** (`src/data/`), nunca hardcoded.

## Campo e tempo

- Mundo virtual fixo: **720×1280** (retrato 9:16), `src/config/layout.ts`.
- Lógica em **fixed timestep 60 Hz** (`TICK_RATE_HZ`), separada do render.
- A hitbox da nave é um **ponto pequeno** (raio ~5px), muito menor que o sprite.

## Nave (jogador) — `src/data/player.json`

- `maxSpeedPxPerSec`, `focusSpeedFactor` (modo Foco reduz velocidade),
  `hitboxRadiusPx`, `marginPx` (limite do campo), `startX/Y`.
- `autoFire`: `{ intervalTicks, speedPxPerSec, radiusPx }` — tiro automático
  para cima, cadência em **ticks** (determinístico).
- Movimento: a nave **persegue** o alvo do dedo, limitada pela velocidade máx.

## Combate — `src/data/combat.json`

- `lives`, `invulnTicks` (i-frames após dano), `focusMax`, `focusPerGraze`,
  `grazeMarginPx` (anel de graze), `scorePerKill`, `scorePerGraze`.
- Pulso refletor: `pulseCost` (Foco), `pulseRadiusPx`, `scorePerReflected`.

## Mecânica central: Graze → Foco → Pulso

1. Bala inimiga passa no **anel** (hitbox < dist ≤ hitbox+margem) sem acertar →
   `+focusPerGraze`, conta graze e pontua. Cada bala conta **uma vez** (`grazed`).
2. Com Foco ≥ `pulseCost`, o **pulso** limpa balas no raio e pontua por bala.
3. Ordem no tick (determinística): pulso → graze → colisões. Ver `Simulation.tick`.

## Inimigos — `src/data/enemies/*.json`

Campos: `hp`, `radiusPx`, `speedYPxPerSec`, `patternId`, `shape`
(triangle/diamond/hex/circle), `color` (#hex). Atuais: drone, sniper, turret,
weaver, bomber, lancer, orbiter (**7**). Idade (`ageTicks`) controla a emissão.

No tema **Arcade** (P10-06) o inimigo é o casco da `shape` + glow, com um
**acento interno contra-rotativo** e um **núcleo claro** — mais caráter sem
perder a leitura por tipo/cor. Render-only, gerativo a partir dos dados.

## Padrões de bala (emitters declarativos) — `src/data/patterns/*.json`

Um padrão = lista de **emitters**. Campos por emitter:
- `type`: `ring` | `fan` | `aimed`.
- `count`, `speed`, `bulletRadius`, `startTick`, `intervalTicks`, `repeat`.
- `angleDeg` (base), `spreadDeg` (abertura fan/aimed).
- `angleStepDeg` (rotação por salva → espirais), `accel` (px/s² na direção),
  `speedStep`/`radiusStep` (variação por bala → camadas), `aimOffsetDeg`.
- Convenção de ângulo: **0°=baixo**, horário; `vx=speed·sinθ, vy=speed·cosθ`.
Atuais: ring, fan, aimed, spiral, wall, accel-ring, layered-fan, spiral-aimed,
cross (**9**).

## Chefes — `src/data/bosses/*.json`

Campos base: `hp`, `radiusPx`, `enterTick`, `homeY`, `sweepAmplitudePx`,
`sweepPeriodTicks`, `defeatScore`, `scorePerPartDefeat?`, `shape?`, `color?`.

**Fases data-driven (P4-02b-01).** `phases: BossPhaseDef[]` — lista ordenada,
mínimo 2, sem máximo. Cada fase: `{ patternId, untilHpPct, ... }`. A fase vale
enquanto `hp/maxHp > untilHpPct`; thresholds **estritamente decrescentes** e a
última fase usa `untilHpPct === 0`. A transição zera `phaseAge` (o padrão da nova
fase recomeça). Validação no registro (`src/content/index.ts`, `validateBossDef`).

**Mecânicas opcionais por fase (P4-02b-02..05):**
- `shield: { hp, rechargeTicks? }` — invulnerabilidade quebrável: os tiros gastam
  o HP do escudo, não o do chefe. Com `rechargeTicks`, volta cheio após o
  intervalo dentro da mesma fase; sem ele, fica quebrado até a fase trocar.
- `adds: { enemyId, count, intervalTicks, maxAlive }` — invoca inimigos comuns
  (via `EnemyPool`, offsets fixos) na cadência da fase, até `maxAlive` vivos;
  limpos ao derrotar o chefe.
- `parts: [{ offsetXPx, offsetYPx, radiusPx, hp, patternId?, scorePerDefeat? }]` —
  sub-alvos presos ao corpo (acompanham o movimento). Enquanto houver parte viva,
  o **núcleo é invulnerável**. Cada parte pode emitir seu padrão e pontua ao cair.
- `movement: { type:"sweep" } | { type:"teleport", intervalTicks, telegraphTicks,
  regionPadPx }` — ausente ⇒ `sweep` (vaivém senoidal, default). `teleport`:
  ciclo intervalo → telegraph (destino exposto p/ aviso) → salto, destino sorteado
  por um `Rng` semeado isolado (ver TD-17).

Atuais: warden (escudo), spinner (teleporte), gunner (adds), vortex (partes) e
**colossus** — clímax de 3 fases (partes → escudo+adds → teleporte) (**5**).

**Corpo vetorial com identidade (P10-06).** No tema Arcade o chefe deixou de ser
`fillCircle` puro: o corpo é o **casco da `shape`** do JSON (fallback círculo) com
glow que segue a forma, um **núcleo estelar contra-rotativo** (`starPoints`, dá
"cara de máquina") e um **olho pulsante**. A **cor** vem do `color` do JSON e
**clareia por fase** (`phaseIndex`) — "fica mais perigoso" continua óbvio — e as
pontas do núcleo crescem com a fase. O preenchimento é **contido** (não encobre as
balas) e os elementos de leitura das mecânicas (barra de vida, telegraph de
teleporte, aro de núcleo invulnerável, pods de partes, anel de escudo) seguem
desenhados à parte, inalterados. Render-only, gerativo (chefe novo no JSON ganha
visual sem código): `BossSystem` expõe `shape`/`color` só para apresentação.

## Dificuldade (Endless) — `src/data/difficulty.json`

- `rampTicks` (ticks/nível), `baseSpawnIntervalTicks`, `minSpawnIntervalTicks`,
  `spawnIntervalDecayPerLevel`, `enemySpeedMulPerLevel`, `enemyHpBonusPerLevel`.
- `tiers`: desbloqueio de inimigos por nível (cumulativo).
- Chefe no Endless: `bossFirstLevel`, `bossEveryLevels` (rotação por seed).
- **Formações** (P4-03): `formationFromLevel`, `formationChance`,
  `formationSizeMin/Max`, `formationSpacingPx` (line/vee/column).
- Início **deliberadamente fácil** (feedback do usuário): rampa suave.

## Modos

- `endless` (padrão), `stage` (estágio curado), `bossrush` (chefes em sequência
  → vitória ao vencer todos).

### Estágios curados (`stage`) — `src/data/stages/*.json` (P4-04b)

Um **estágio** é uma sequência autoral declarada em JSON:
`{ id, name, sections: StageSection[] }`, onde cada seção é
`{ type: 'wave', waveId }` ou `{ type: 'boss', bossId }` (ordem do array = ordem
de execução). O `StageDirector` (headless) executa as seções: uma de onda
termina quando a onda spawnou tudo **e** não há inimigo vivo; uma de chefe, ao
derrotá-lo (some o `defeatScore`). O **chefe entra por limpeza de seção**, não
por `enterTick`. Concluir a última seção = vitória. Substitui o antigo
`campaign` (sem suporte duplo — o jogo não lançou).

- **Progresso (P4-04b-02):** a sim expõe `stageProgress`
  (`{ section, total, kind, stageName }`, 1-based; `null` fora de `stage`). O
  render anuncia "ONDA n/m"/"CHEFE" na troca de seção e mantém um indicador
  "n/m" no HUD — tudo na cena, nada vaza para a sim (hash inalterado).
- **Curva (P4-04b-03):** `stage-001` é o tutorial (densidade baixa); a rampa
  fica **entre** estágios, não dentro do primeiro. Balanceamento só em JSON.
- **Seletor + desbloqueio (P4-04b-04):** o Menu lista os estágios; o primeiro
  está sempre aberto e vencer o N destrava o N+1 (ordem de `STAGE_IDS` é
  contrato). Recordes locais por estágio via `SaveService` (meta-jogo, fora da
  sim).

## Modificadores (Evento Semanal) — `src/systems/Modifiers.ts`

`RunMods` (multiplicadores/overrides): `scorePerGrazeMul`, `scorePerKillMul`,
`focusPerGrazeMul`, `playerSpeedMul`, `spawnIntervalMul`, `livesOverride`.
Escolhidos por **seed da semana ISO** (mesmos para todos). Fazem parte do estado
determinístico (entram no replay).

## Controles

Toque: arrastar = mover; (2º toque/botão direito = Foco — refinar mobile);
botão PULSO. Teclado: WASD/setas, Shift/Z = Foco, Espaço/X = pulso, ESC/P =
pausa. Abstraídos em `InputService` → eventos `move`/`focus`/`pulse`.

**Controle relativo no toque (P10-01).** No celular o controle é **relativo
(offset/drag)** por default: a nave anda pelo **delta** do arraste, então o dedo
fica **afastado** da nave/hitbox (antes o dedo cobria a nave). O feel
(sensibilidade + fator no Foco, que reduz a sensibilidade para precisão) vem de
`src/data/controls.json` — presentation-only, fora da sim. O **mouse no desktop
segue absoluto** (cursor naturalmente deslocado). Toggle OFFSET×DIRETO no Menu,
persistido no `SaveService`. A sim **continua recebendo `moveX/moveY` absoluto**
(o alvo já resolvido) ⇒ determinismo/replay/Diário intactos. Ver TD-27.

## Feedback / juice (estado)

Tuning de feel em `src/data/effects.json` (P5-01-01) e `src/data/audio.json`
(P5-04); nada hardcoded na cena. Componentes:
- **Câmera (P5-01-01):** screen shake + flash por cue, lidos do JSON. Dano =
  shake + flash vermelho + nave piscando (i-frames).
- **Partículas (P5-01-02/03):** `ParticlePool` decorativo (render-side, fora da
  sim). Faísca no impacto (`shotHit`), explosão na cor do inimigo ao morrer
  (`kill`/`bossKill`), estilhaço no dano ao jogador (`playerHit`). Disparadas
  pelo buffer `Simulation.fxEvents` (posição+cor por evento), fora do `hashState`.
- **Hit-stop (P5-01-04):** congelamento de poucos ms no dano/kill de chefe/troca
  de fase. Vive no driver do loop (cena pula `loop.advance`); replay intacto.
- **Graze (P5-02):** faísca no ponto do raspão + bala grazeada "vencida"
  (brilho); **anel de graze** visível na nave (deriva de
  `hitboxRadius + grazeMarginPx`), discreto fora do Foco, claro no Foco, com
  "ping" a cada graze; **barra de Foco** no HUD com marca no custo e estado
  "pulso pronto" (cor + botão aceso + cue `focusready`).
- **Áudio (P5-04):** trilha dinâmica em camadas por intensidade
  (`MusicDirector`: base→rítmica→tensão→perigo), SFX em camadas (ruído +
  variação de pitch/ganho + polifonia/ducking via `SfxPolicy`), **haptics** no
  celular por evento (toggle persistido; `graze`/`kill` não vibram).
- **Síntese "Arcade" intencional (P10-08):** o `SynthAudioTheme` continua 100%
  procedural (sem assets — TD-09), mas com timbres mais encorpados: SFX de
  impacto em camadas (transiente + **corpo grave caindo** + cauda de ruído com
  lowpass descendente) — explosão/kill, hit, pulso e entrada de chefe ganham
  peso; a trilha tem pad **mais largo/quente** (vozes destoadas + lowpass),
  rítmica filtrada (menos aspereza), tensão com **vibrato** e perigo com quinta
  de shimmer. Tuning de timbre vem de `audio.json` → `synth` (sem constantes
  mágicas). A *decisão* de som (`AudioCues`/`MusicDirector`/`SfxPolicy`) e a
  interface `play(cue)` não mudam; presets de trilha (cosmético `music`) e o
  preview do Hangar seguem válidos. Identidade sonora própria do **menu** fica
  para adoção futura (API já existe; fora do escopo desta issue).
- **Fundo de espaço procedural (P10-07):** parallax **multicamada** — camadas de
  estrelas em profundidades distintas (distantes lentas/pequenas/fracas →
  próximas rápidas/maiores/brilhantes) sobre uma **nebulosa** procedural (blobs
  suaves derivando devagar). Tudo render-side, dirigido por dados
  (`effects.json` → `background`: cor base, `starLayers`, `nebula`), com `Rng`
  **decorativo** (sem `Math.random`, sem afetar a sim) e reciclagem das
  estrelas/blobs ao sair da tela (sem `new` por frame). Contraste propositalmente
  baixo: **fundo é fundo** — nunca disputa com balas/anel de graze.

## Cosméticos — `src/data/cosmetics.json` (P6-01)

Desbloqueáveis puramente visuais/sonoros: **naves** (forma + cor), **cores de
tiro** e **trilhas** (presets). **Regra de ouro:** cosmético *nunca* muda
jogabilidade — só render/áudio. A simulação é cega a eles; replay, ranking e
Diário ficam idênticos com ou sem loadout. Cada tipo tem exatamente **um
default** (o visual atual) sempre disponível; os demais abrem por condição:
`achievement` (uma conquista, P6-02) ou `totalAtLeast` (um total de perfil, ex.:
graze acumulado, P6-03). A seleção (loadout) é persistida no aparelho; escolher
item bloqueado é rejeitado na camada de serviço (`Cosmetics.selectCosmetic`),
e um loadout inválido cai graciosamente nos defaults (`Cosmetics.getLoadout`).
Cores de tiro são curadas para **não** confundir com balas inimigas
(legibilidade é sagrada).

O **Hangar** (`HangarScene`, acessível do Menu — P6-01-02) fecha o loop: três
grupos (NAVE / TIRO / TRILHA), itens desbloqueados tocáveis com a seleção atual
marcada e bloqueados apagados exibindo a **condição** (texto da `ui/hangar` —
mesma `desc` da conquista quando o desbloqueio é por conquista, rótulo curto
para `totalAtLeast`). Preview honesto embaixo (a nave/tiro como aparecem no
jogo); tocar uma trilha toca uma amostra do preset (respeitando o mudo, parada
no `shutdown` da cena). O modelo de exibição é puro/headless (`ui/hangar.ts`,
testado). A aplicação em jogo é resolvida **uma vez** no `create()` da
`GameScene` (`Cosmetics.getLoadout`): a nave é desenhada com a forma/cor
escolhidas (tamanho constante entre naves — hitbox ≠ sprite), os tiros e suas
faíscas usam a cor escolhida, e o preset de trilha é repassado ao
`AudioService` (`setMusicPreset`, variação só de síntese). Nada disso chega à
simulação — determinismo coberto por teste de regressão (`tests/hangar.test.ts`).

## Temas de apresentação — `src/config/themes.ts` (P10-04)

Acima dos cosméticos individuais, o **tema de apresentação** escolhe o *estilo
inteiro* do jogo — qual **renderer** (visual) e qual **áudio** o jogo usa.
Hoje há dois: **"Arcade anos 80"** (neon vetorial + síntese), o visual/áudio
atual; e **"Polido"** (sprites, P10-09/10), que **herda o Arcade** e desenha
arte raster onde houver asset, caindo no vetorial onde faltar — então é jogável
mesmo com a arte ainda chegando peça por peça. (Samples de áudio do "Polido"
ficam para P10-12.) Como o cosmético, o tema é **só apresentação**: nunca
toca a simulação/replay/ranking/Diário (mesma seed/inputs ⇒ mesmo resultado em
qualquer tema). A escolha é **persistida no aparelho** e cai graciosamente no
default `arcade` se ausente/inválida.

O seletor fica no **Menu** (linha de utilidades, ao lado de controle/vibração):
um overlay lista os temas do registro com o atual marcado; tocar persiste, aplica
o áudio na hora (vale já no menu) e passa a valer no visual na próxima run. O
`PreloadScene` carrega **só** os assets do tema ativo (o vetorial não tem
nenhum — não pesa o bundle de quem joga "Arcade"). Ver TD-30. Assets do "Polido"
ficam **fora do precache** do PWA (carregados sob demanda) para não pesar o
Arcade. Ver TD-31.

### Nave no tema "Polido" (P10-10)

No tema **Polido**, a nave é **arte raster** (um sprite) no lugar da silhueta
vetorial — mas com **o mesmo feel**: encolhe no Foco, pisca em i-frames e tem a
chama do motor pulsando atrás do casco, tudo derivado dos mesmos estados da sim
por uma função pura compartilhada com o Arcade. O **ponto de hitbox e o anel de
graze continuam vetoriais por cima** do sprite (hitbox ≠ sprite): a arte nunca
esconde a zona de risco nem compete com as balas (que também seguem neon). Sem a
arte registrada, a nave volta ao vetorial sem erro. O **contrato de asset**
(chave, centro = posição da sim, escala de referência, estados→variação) está em
`docs/ASSET_CONTRACT.md`; chefe e inimigos seguem o mesmo fluxo.

### Fundo de espaço raster (P10-11)

No tema **Polido** o fundo procedural (P10-07) dá lugar a **camadas de arte
ilustrada** — espaço distante, nebulosa e estrelas próximas — empilhadas sobre a
cor base e com **parallax** (a camada distante desce devagar; a próxima, rápida),
desenhadas como `TileSprite` que **rolam verticalmente** para dar a sensação de
avanço. As camadas e velocidades vêm de dados (`data/polishedBackground.json`,
presentation-only). O contraste é **baixo de propósito**: balas, anel e nave ficam
sempre por cima e legíveis. No tema **Arcade** nada muda — segue o procedural. Sem
os assets de fundo, o "Polido" **cai no procedural** sem erro (fallback). Os assets
carregam só no "Polido" e ficam fora do precache do PWA (não pesam o Arcade).

### Cosméticos × tema (P10-13)

Cosméticos (P6-01) e tema (P10-04) são camadas independentes que se cruzam — a
regra mantém legibilidade e evita multiplicar conteúdo:

- **Cor** (nave e tiro): herda **sempre**, nos dois temas. No vetorial, é o
  preenchimento/contorno; no sprite, é `setTint` sobre a arte. **Faíscas** do tiro
  herdam a cor do tiro nos dois temas.
- **Balas e anel de graze**: **sempre neon vetorial** nos dois temas. São a zona de
  perigo/risco — independem do cosmético de arte (legibilidade > beleza).
- **Forma da nave** (a parte que **não** mapeia 1:1 para arte): no **Arcade** vira o
  acento de cockpit, como hoje. No **Polido**, segue uma cadeia de fallback clara:
  **(1)** variante de arte **curada** `spr-ship-<idDoCosmético>` se registrada →
  **(2)** senão a arte **default** da nave (`spr-ship`) tingida pela cor →
  **(3)** senão a **silhueta vetorial** (com o acento de forma). Ou seja, a
  silhueta só muda no sprite quando alguém **curou** uma variante; sem ela, todas
  as naves usam a arte default tingida. Assim a arte é exigida **só** para os
  cosméticos que se escolhe curar — nunca para a combinação cosmético×tema inteira
  (sem explosão combinatória). Hoje não há variante curada registrada ⇒ o Polido
  prova o fallback (default tingida).
- **Trilha** (preset `music`): aplicada pelo áudio, **por tema** — o mesmo preset
  soa como síntese no Arcade e como samples no Polido (TD-32).

O **preview do Hangar é consciente do tema ativo**: como o `PreloadScene` só
carrega os assets do tema escolhido, a simples presença (ou ausência) da textura
de nave decide o preview — sprite tingido (variante curada ou default) no Polido,
silhueta vetorial no Arcade. O modelo do preview é puro/headless (`hangarPreview`
em `ui/hangar.ts`, testado). Ver TD-33.

### Nave vetorial coesa (P10-05, Bloco B)

No tema **Arcade**, a nave é uma **silhueta única** — um caça com nariz, ombros,
asas em flecha e dois pods de motor com entalhe central por onde sai a chama —
não mais 5 primitivos soltos. A geometria é pura e testável
(`shipSilhouette` em `src/ui/shapes.ts`, inscrita no raio, simétrica), usada
**igual** no jogo (`VectorTheme.makeShip`) e no **preview do Hangar**
(`HangarScene.drawShip`) ⇒ a nave em jogo = a nave do preview. O **glow** segue
a silhueta (integrado, não um círculo solto). O cosmético (P6-01) continua
aplicado: a **cor** tinge todo o casco e a **forma** vira um **acento de
cockpit** perto do nariz (mantém a identidade do loadout). Princípios intactos:
**hitbox ≠ sprite** (o ponto central vermelho continua pequeno e nítido),
**tamanho visual estável entre naves**, anel de graze por baixo, chama pulsante,
piscar em i-frames e encolher (0.7) no Foco. Render-only — nada toca a sim.

## Classes de nave — `src/data/ships.json` (P6-04)

Ao contrário do cosmético (P6-01, só aparência), a **classe de nave** muda
**regras de jogo** — *diferentes, não mais fortes*: cada nave é um **sidegrade**
com trade-off explícito. Cada classe é um conjunto de **multiplicadores** sobre
as configs base (`maxSpeedMul`, `focusSpeedFactorMul`, `hitboxRadiusMul`,
`fireIntervalMul`, `shotSpeedMul`, `focusPerGrazeMul`, `grazeMarginMul`,
`invulnMul`) mais `livesDelta`. Campos omitidos no JSON ⇒ identidade.

Como a classe **afeta a simulação**, é **entrada determinística**: entra em
`SimulationOptions.shipId`, é gravada no `Replay`/`verifyReplay` e dobrada na
linhagem do `hashState()` (só a nave **não-default**). A nave **default é
identidade pura** (regras neutras) ⇒ comportamento atual byte-idêntico, então
replays e o Diário já gravados continuam válidos. O roster e suas regras são
validados no load (`validateShips`: exatamente 1 default = identidade, muls > 0,
`livesDelta` inteiro). Tuning mora no JSON.

Roster inicial: **vanguard** (baseline), **glaive** (cadência alta + tiro veloz,
mas 2 vidas e graze curto — ataque, pouca margem) e **bulwark** (4 vidas, graze
largo e mais Foco, porém lenta e de cadência baixa). São **sidegrades sem
desbloqueio** (todos disponíveis). A seleção é persistida (`SaveService`) e há
um seletor no Menu. **Regra de justiça:** o **Desafio Diário força a nave
default** — mesma seed *e* mesmas regras para todos; os demais modos usam a nave
escolhida. (Distinção visual por classe fica para depois; a aparência continua
sendo cosmético.) Ver TD-25.

## Conquistas — `src/data/achievements.json` (P6-02)

Metas declarativas avaliadas **ao fim de cada run** (nunca durante; a sim não as
conhece). Cada conquista tem `id` (estável/imutável — cosméticos o referenciam),
`title`, `desc` (= como desbloquear, texto único) e uma `condition` de tipo
enumerado: `totalAtLeast` (total acumulado), `runStat` (resultado da run, com
modo opcional), `bestAtLeast` (recorde por modo) ou `winMode` (vencer num modo,
opcionalmente **sem tomar dano**). ~10 conquistas iniciais cobrem primeiras
(1ª run, 1ª vitória), volume (1k/10k grazes, 1k abates), habilidade (200 grazes
numa run, vitória impecável), modos (Boss Rush, Diário) e recorde (50k no
Endless). Desbloqueio é **histórico**: persiste no perfil com a data, sobrevive a
conquistas removidas do JSON, e nunca dá vantagem de jogo. Conquistas servem de
condição de desbloqueio de cosméticos (P6-01).

Visibilidade (P6-02-02): ao fim da run, cada desbloqueio novo vira um **toast**
sequenciado no topo da `ResultsScene` (banner "CONQUISTA — {title}", fade/slide,
SFX `achievement`), sem cobrir o placar. A **galeria** (`AchievementsScene`,
acessível do Menu) lista todas as conquistas na ordem do JSON: desbloqueadas
acesas com a data, bloqueadas apagadas com a `desc` (fonte única do texto da
condição), e contador `X/Y` no topo. O modelo de exibição é puro
(`src/ui/achievements.ts`) — a cena só desenha.

## Estatísticas pessoais (P6-03)

A `StatsScene` (acessível do Menu) torna **visível a curva de maestria** que
alimenta o "só mais uma run". Mostra os **totais** acumulados (runs, vitórias,
abates, grazes, tempo jogado), os **recordes por modo** (só os que existem) e o
**histórico recente** — anel das últimas **20** runs, mais recente primeiro, cada
linha com data curta, modo, score, vitória/derrota e duração. Jogador novo (sem
runs) vê um convite amigável, sem números quebrados. Toda formatação é **derivada,
não armazenada** (`durationTicks` ⇒ mm:ss; `dateIso` UTC ⇒ data local) num helper
puro `src/ui/stats.ts`; a cena só desenha. O perfil que isso lê é estado do
jogador, fora da simulação/replay/ranking (ver `ARCHITECTURE.md`, TD-24).

## Home (P6-06)

A tela inicial é a vitrine do jogo: **hero neon** (título HAIRLINE em camadas de
glow + fundo procedural mais rico que o starfield, tudo render-side, **sem assets
raster** — fiel à estética vetorial), acesso a todos os modos com a ação primária
(Endless) em destaque, atalhos de meta-jogo (Hangar/Conquistas/Estatísticas),
seleção de nave (P6-04) e um **rodapé discreto**: ícones de **compartilhar o
jogo** (deep links de WhatsApp/Telegram/X; Instagram/TikTok via Web Share nativa
com fallback de copiar link), **links de doação** (Ko-fi e Buy Me a Coffee) e a
linha de **versão + © Insight X Lab Game Studio**. O layout é responsivo e
respeita safe-areas (modelo puro `ui/home`); a versão tem fonte única
(`config/about`, injetada do `package.json` no build). Nada disso toca a
simulação. Ver TD-26.

## Princípios de design inegociáveis

Determinismo (justiça do Diário), dados separados de código, hitbox ≠ sprite,
legibilidade do perigo > beleza, monetização nunca afeta o ranking.
