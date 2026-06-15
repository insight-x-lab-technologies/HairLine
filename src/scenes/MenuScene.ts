import Phaser from 'phaser';
import { SceneKeys } from '../config/sceneKeys';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../config/layout';
import { neonText, pulse } from '../ui/neonText';
import { getAudio } from '../services/AudioService';
import { getSave } from '../services/SaveService';
import { getHaptics } from '../services/HapticsService';
import { getControlsConfig } from '../config/controls';
import { dailySeed, dayKey } from '../services/DailySeed';
import { getIdentity } from '../services/PlayerIdentity';
import { pickWeeklyModifiers, combineMods, weeklySeed, weekKey } from '../systems/Modifiers';
import { STAGE_IDS, getShips, getShipOrDefault, DEFAULT_SHIP_ID } from '../content';
import { stagePayload, stageRows } from '../ui/stageSelect';
import { hudPadding } from '../ui/hudLayout';
import { readSafeAreaInsets } from '../services/SafeArea';
import { homeLayout, type HomeLayout } from '../ui/home';
import { listThemes, resolveTheme } from '../config/themes';
import { heroBackground } from '../ui/heroBackground';
import { shareTargets, shareGame, openExternal } from '../ui/socialLinks';
import {
  GAME_URL,
  SHARE_TEXT,
  DONATIONS,
  versionLine,
  copyrightLine,
  supportLinks,
} from '../config/about';
import type { GameSceneData } from './GameScene';

/**
 * MenuScene — home profissional (P6-06): hero neon + fundo procedural, acesso aos
 * modos (Endless, Estágios, Desafio Diário, Boss Rush, Evento Semanal), atalhos
 * de meta-jogo (Hangar/Conquistas/Estatísticas), seleção de nave (P6-04) e um
 * rodapé discreto com compartilhamento social, doação e versão + copyright.
 *
 * O posicionamento vem do modelo PURO `ui/home` (responsivo, safe-areas); a cena
 * só desenha. Nada aqui toca a simulação/replay/ranking.
 */
export class MenuScene extends Phaser.Scene {
  /** Rótulo "NAVE: …" no menu; atualizado quando a escolha muda (P6-04). */
  private shipLabel?: Phaser.GameObjects.Text;

  constructor() {
    super(SceneKeys.Menu);
  }

  create(): void {
    const pad = hudPadding(
      VIRTUAL_WIDTH,
      VIRTUAL_HEIGHT,
      window.innerWidth,
      window.innerHeight,
      readSafeAreaInsets(),
    );
    const L = homeLayout(VIRTUAL_WIDTH, VIRTUAL_HEIGHT, pad);
    const cx = L.cx;

    this.drawBackground();
    this.drawHeroTitle(cx, L.title);

    neonText(this, cx, L.tagline, 'bullet hell · graze · daily', 20, '#5a6b7a');

    const best = getSave().getBestScore();
    if (best > 0) neonText(this, cx, L.record, `recorde  ${best}`, 22, '#ffd166');

    // Classe de nave (P6-04): muda regras de jogo (não é cosmético). Toca para
    // escolher; o Diário ignora a escolha (força a default, ranking justo).
    this.shipLabel = neonText(this, cx, L.ship, this.shipLabelText(), 22, '#a78bfa').setInteractive(
      {
        useHandCursor: true,
      },
    );
    this.shipLabel.on('pointerdown', () => this.showShips());

    // Ação primária em destaque.
    const endlessBtn = neonText(this, cx, L.endless, '▶ ENDLESS', 38, '#0bd3c6').setInteractive({
      useHandCursor: true,
    });
    pulse(this, endlessBtn);
    endlessBtn.on('pointerdown', () => this.start({}));

    const stagesBtn = neonText(this, cx, L.stages, '◆ ESTÁGIOS', 28, '#3df5a5').setInteractive({
      useHandCursor: true,
    });
    stagesBtn.on('pointerdown', () => this.showStages());

    const today = new Date();
    const daily = neonText(this, cx, L.daily, '◎ DESAFIO DIÁRIO', 30, '#ffd166').setInteractive({
      useHandCursor: true,
    });
    daily.on('pointerdown', () =>
      this.start({ seed: dailySeed(today), daily: true, dayKey: dayKey(today) }),
    );
    neonText(this, cx, L.dayKey, dayKey(today), 16, '#5a6b7a');

    const rush = neonText(this, cx, L.bossrush, '☠ BOSS RUSH', 26, '#ff5d8f').setInteractive({
      useHandCursor: true,
    });
    rush.on('pointerdown', () => this.start({ mode: 'bossrush' }));

    // Evento semanal: modificadores de regra iguais para todos na semana.
    const weeklyDefs = pickWeeklyModifiers(today, 2);
    const weekly = neonText(this, cx, L.weekly, '⚡ EVENTO SEMANAL', 26, '#9af7ef').setInteractive({
      useHandCursor: true,
    });
    weekly.on('pointerdown', () =>
      this.start({
        seed: weeklySeed(today),
        mode: 'endless',
        mods: combineMods(weeklyDefs),
        modLabels: weeklyDefs.map((m) => m.label),
      }),
    );
    neonText(
      this,
      cx,
      L.weeklyLabel,
      `${weekKey(today)}: ${weeklyDefs.map((m) => m.label).join(' · ')}`,
      14,
      '#5a6b7a',
    );

    // Atalhos de meta-jogo numa fileira: Hangar (P6-01) · Conquistas (P6-02) ·
    // Estatísticas (P6-03).
    const hangar = neonText(this, cx - 190, L.meta, '✦ HANGAR', 20, '#a78bfa').setInteractive({
      useHandCursor: true,
    });
    hangar.on('pointerdown', () => this.scene.start(SceneKeys.Hangar));

    const ach = neonText(this, cx, L.meta, '★ CONQUISTAS', 20, '#ffd166').setInteractive({
      useHandCursor: true,
    });
    ach.on('pointerdown', () => this.scene.start(SceneKeys.Achievements));

    const stats = neonText(this, cx + 190, L.meta, '▦ STATS', 20, '#9af7ef').setInteractive({
      useHandCursor: true,
    });
    stats.on('pointerdown', () => this.scene.start(SceneKeys.Stats));

    this.drawUtilities(cx, L.utilities);
    this.drawFooter(cx, L);

    this.input.keyboard?.once('keydown-ENTER', () => this.start({}));
    this.input.keyboard?.once('keydown-SPACE', () => this.start({}));
  }

  /**
   * Fundo da home (P6-06-02): gradiente neon estático + campo de estrelas e
   * "vigas" horizontais sutis (geometria procedural de `ui/heroBackground`, seed
   * do relógio — decorativo, fora da simulação), com um leve shimmer.
   */
  private drawBackground(): void {
    const grad = this.add.graphics().setDepth(-30);
    grad.fillGradientStyle(0x0a0f1d, 0x0a0f1d, 0x05060a, 0x05060a, 1);
    grad.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    const seed = Date.now() & 0xffff || 1;
    const bg = heroBackground(VIRTUAL_WIDTH, VIRTUAL_HEIGHT, seed);
    const layer = this.add.graphics().setDepth(-20);
    for (const beam of bg.beams) {
      layer.fillStyle(0x0bd3c6, beam.alpha);
      layer.fillRect(0, beam.y, VIRTUAL_WIDTH, 2);
    }
    for (const s of bg.stars) {
      layer.fillStyle(0x9af7ef, s.alpha);
      layer.fillCircle(s.x, s.y, s.r);
    }
    this.tweens.add({
      targets: layer,
      alpha: { from: 0.8, to: 1 },
      duration: 4200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Título "HAIRLINE" tratado como hero: camadas de glow atrás do núcleo claro
   * (estética neon vetorial, sem assets raster), com pulso/scale sutil.
   */
  private drawHeroTitle(cx: number, y: number): void {
    neonText(this, cx, y, 'HAIRLINE', 78, '#0bd3c6').setAlpha(0.16).setScale(1.06);
    const glow = neonText(this, cx, y, 'HAIRLINE', 78, '#39f5e8').setAlpha(0.3).setScale(1.03);
    const main = neonText(this, cx, y, 'HAIRLINE', 78, '#d8fffb');
    this.tweens.add({
      targets: main,
      scaleX: { from: 1, to: 1.02 },
      scaleY: { from: 1, to: 1.02 },
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.3, to: 0.55 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Apelido editável (ranking diário) + toggle de controle de toque (P10-01) +
   * seletor de tema de apresentação (P10-04) + toggle de vibração (onde houver API).
   */
  private drawUtilities(cx: number, y: number): void {
    const me = getIdentity();
    const haptics = getHaptics(getSave());
    const nameBtn = neonText(this, cx - 200, y, `nome: ${me.name}  ✎`, 18, '#5a6b7a').setInteractive(
      { useHandCursor: true },
    );
    nameBtn.on('pointerdown', () => {
      const novo = typeof window !== 'undefined' ? window.prompt('Seu apelido:', me.name) : null;
      if (novo !== null) {
        me.setName(novo);
        nameBtn.setText(`nome: ${me.name}  ✎`);
      }
    });

    // Esquema de controle de toque: relativo (offset) × absoluto (segue o dedo).
    const scheme = (): 'relative' | 'absolute' =>
      getSave().getControlScheme() ?? getControlsConfig().scheme;
    const ctrlLabel = (): string => `🎮 ${scheme() === 'relative' ? 'OFFSET' : 'DIRETO'}`;
    const ctrlBtn = neonText(this, cx - 45, y, ctrlLabel(), 18, '#5a6b7a').setInteractive({
      useHandCursor: true,
    });
    ctrlBtn.on('pointerdown', () => {
      getSave().setControlScheme(scheme() === 'relative' ? 'absolute' : 'relative');
      ctrlBtn.setText(ctrlLabel());
    });

    // Tema de apresentação (P10-04): abre o seletor; estado do jogador, fora da sim.
    const themeBtn = neonText(this, cx + 95, y, '🎨 TEMA', 18, '#5a6b7a').setInteractive({
      useHandCursor: true,
    });
    themeBtn.on('pointerdown', () => this.showThemes());

    if (haptics.isSupported) {
      const label = (): string => `📳 ${haptics.isEnabled ? 'ON' : 'OFF'}`;
      const hapticBtn = neonText(this, cx + 210, y, label(), 18, '#5a6b7a').setInteractive({
        useHandCursor: true,
      });
      hapticBtn.on('pointerdown', () => {
        haptics.toggle();
        hapticBtn.setText(label());
      });
    }
  }

  /**
   * Seletor de TEMA de apresentação (P10-04): overlay listando os temas do
   * registro com o atual marcado. Tocar persiste a escolha (`SaveService`), aplica
   * o tema de áudio (vale já no menu/preview) e fecha — passa a valer na próxima
   * run. É apresentação pura: nada aqui toca a simulação/replay/ranking.
   */
  private showThemes(): void {
    const cx = VIRTUAL_WIDTH / 2;
    const overlay = this.add.container(0, 0).setDepth(100);
    const bg = this.add
      .rectangle(cx, VIRTUAL_HEIGHT / 2, VIRTUAL_WIDTH, VIRTUAL_HEIGHT, 0x05060a, 0.97)
      .setInteractive();
    overlay.add(bg);
    overlay.add(neonText(this, cx, 150, 'TEMA', 48, '#0bd3c6'));
    overlay.add(neonText(this, cx, 200, 'estilo de apresentação (visual + áudio)', 18, '#5a6b7a'));

    const current = resolveTheme(getSave().getSelectedThemeId()).id;
    listThemes().forEach((t, i) => {
      const y = 320 + i * 90;
      const chosen = t.id === current;
      const label = neonText(
        this,
        cx,
        y,
        `${chosen ? '▶' : '·'} ${t.label}`,
        34,
        chosen ? '#ffd166' : '#9af7ef',
      ).setInteractive({ useHandCursor: true });
      overlay.add(label);
      label.on('pointerdown', () => {
        getSave().setSelectedThemeId(t.id);
        getAudio().useAudioTheme(t.audioThemeId);
        overlay.destroy();
      });
    });

    const back = neonText(this, cx, VIRTUAL_HEIGHT - 90, '‹ VOLTAR', 28, '#ff5d8f').setInteractive({
      useHandCursor: true,
    });
    overlay.add(back);
    back.on('pointerdown', () => overlay.destroy());
  }

  /**
   * Rodapé discreto (P6-06-03/04): ícones de compartilhar o jogo (Web Share /
   * deep links), links de doação (Ko-fi / Buy Me a Coffee) e a linha de versão +
   * copyright do estúdio.
   */
  private drawFooter(cx: number, L: HomeLayout): void {
    // Compartilhar o jogo — ícones pequenos e discretos.
    const targets = shareTargets(GAME_URL, SHARE_TEXT);
    const spacing = 52;
    const startX = cx - ((targets.length - 1) * spacing) / 2;
    targets.forEach((t, i) => {
      const icon = neonText(
        this,
        startX + i * spacing,
        L.footer.social,
        t.glyph,
        18,
        '#5a6b7a',
      ).setInteractive({ useHandCursor: true });
      icon.on('pointerdown', () => shareGame(t, GAME_URL, SHARE_TEXT));
    });

    // Doação (P6-06-04).
    const [kofi, bmc] = supportLinks();
    if (kofi) {
      const k = neonText(
        this,
        cx - 130,
        L.footer.donate,
        `${kofi.glyph} ${kofi.label}`,
        18,
        '#ff5d8f',
      ).setInteractive({ useHandCursor: true });
      k.on('pointerdown', () => openExternal(DONATIONS.kofi));
    }
    if (bmc) {
      const b = neonText(
        this,
        cx + 80,
        L.footer.donate,
        `${bmc.glyph} ${bmc.label}`,
        18,
        '#ffd166',
      ).setInteractive({ useHandCursor: true });
      b.on('pointerdown', () => openExternal(DONATIONS.bmc));
    }

    // Versão + copyright.
    neonText(this, cx, L.footer.legal, `${versionLine()}  ·  ${copyrightLine()}`, 13, '#3a4654');
  }

  /**
   * Seletor de estágios (P4-04b-04): overlay com a lista de estágios, status de
   * desbloqueio (✔ concluído / ▶ disponível / 🔒 travado) e melhor score. Tocar
   * num disponível inicia a run; travado é ignorado (sem interatividade).
   */
  private showStages(): void {
    const cx = VIRTUAL_WIDTH / 2;
    const overlay = this.add.container(0, 0).setDepth(100);
    // Fundo opaco interativo: cobre o menu e absorve toques em área vazia.
    const bg = this.add
      .rectangle(cx, VIRTUAL_HEIGHT / 2, VIRTUAL_WIDTH, VIRTUAL_HEIGHT, 0x05060a, 0.97)
      .setInteractive();
    overlay.add(bg);
    overlay.add(neonText(this, cx, 150, 'ESTÁGIOS', 48, '#0bd3c6'));

    stageRows(STAGE_IDS, getSave()).forEach((r, i) => {
      const y = 300 + i * 110;
      const status = r.unlocked ? (r.completed ? '✔' : '▶') : '🔒';
      const color = r.unlocked ? (r.completed ? '#3df5a5' : '#ffd166') : '#5a6b7a';
      const label = neonText(this, cx, y, `${status} ${r.name}`, 36, color);
      const sub = r.unlocked
        ? r.bestScore > 0
          ? `melhor ${r.bestScore}`
          : 'disponível'
        : 'bloqueado';
      const subText = neonText(this, cx, y + 38, sub, 18, '#5a6b7a');
      overlay.add(label);
      overlay.add(subText);
      if (r.unlocked) {
        label.setInteractive({ useHandCursor: true });
        label.on('pointerdown', () => this.start(stagePayload(r.id)));
      }
    });

    const back = neonText(this, cx, VIRTUAL_HEIGHT - 90, '‹ VOLTAR', 28, '#ff5d8f').setInteractive({
      useHandCursor: true,
    });
    overlay.add(back);
    back.on('pointerdown', () => overlay.destroy());
  }

  /** Classe de nave escolhida (resolvida contra o roster; default se inválida). */
  private selectedShip(): ReturnType<typeof getShipOrDefault> {
    return getShipOrDefault(getSave().getSelectedShipId() ?? undefined);
  }

  private shipLabelText(): string {
    return `✈ NAVE: ${this.selectedShip().name}`;
  }

  /**
   * Seletor de classe de nave (P6-04): overlay listando o roster com a escolha
   * atual marcada e o trade-off de cada uma. Tocar seleciona, persiste e fecha.
   * São sidegrades (sem desbloqueio) — todas tocáveis.
   */
  private showShips(): void {
    const cx = VIRTUAL_WIDTH / 2;
    const overlay = this.add.container(0, 0).setDepth(100);
    const bg = this.add
      .rectangle(cx, VIRTUAL_HEIGHT / 2, VIRTUAL_WIDTH, VIRTUAL_HEIGHT, 0x05060a, 0.97)
      .setInteractive();
    overlay.add(bg);
    overlay.add(neonText(this, cx, 150, 'NAVE', 48, '#a78bfa'));
    overlay.add(neonText(this, cx, 200, 'regras diferentes, não mais fortes', 18, '#5a6b7a'));

    const current = getSave().getSelectedShipId() ?? DEFAULT_SHIP_ID;
    getShips().forEach((s, i) => {
      const y = 300 + i * 150;
      const chosen = s.id === current || (current === DEFAULT_SHIP_ID && s.default === true);
      const label = neonText(
        this,
        cx,
        y,
        `${chosen ? '▶' : '·'} ${s.name}`,
        36,
        chosen ? '#ffd166' : '#9af7ef',
      ).setInteractive({ useHandCursor: true });
      const desc = neonText(this, cx, y + 40, s.desc, 16, '#5a6b7a');
      desc.setWordWrapWidth(VIRTUAL_WIDTH - 120);
      overlay.add(label);
      overlay.add(desc);
      label.on('pointerdown', () => {
        getSave().setSelectedShipId(s.id);
        this.shipLabel?.setText(this.shipLabelText());
        overlay.destroy();
      });
    });

    const back = neonText(this, cx, VIRTUAL_HEIGHT - 90, '‹ VOLTAR', 28, '#ff5d8f').setInteractive({
      useHandCursor: true,
    });
    overlay.add(back);
    back.on('pointerdown', () => overlay.destroy());
  }

  /**
   * Inicia uma run (gesto satisfaz autoplay do áudio). Injeta a classe de nave
   * escolhida, EXCETO no Diário, que força a default (mesma seed E mesmas regras
   * para todos — ranking justo, P6-04). A default é omitida (≡ identidade).
   */
  private start(data: GameSceneData): void {
    getAudio().start();
    const shipId = data.daily ? DEFAULT_SHIP_ID : (data.shipId ?? this.selectedShip().id);
    const payload: GameSceneData = shipId !== DEFAULT_SHIP_ID ? { ...data, shipId } : data;
    this.scene.start(SceneKeys.Game, payload);
  }
}
