import Phaser from 'phaser';
import { createGameConfig } from './config/gameConfig';
import { readSafeAreaInsets } from './services/SafeArea';

/**
 * main.ts — ponto de entrada do cliente (docs/02 §2).
 *
 * Apenas instancia o Phaser com o Scale Manager configurado. Toda a LÓGICA de
 * jogo é determinística e vive na simulação headless (src/sim), separada deste
 * boot de render. O service worker do PWA é registrado pelo vite-plugin-pwa
 * (registerType: 'autoUpdate').
 */
const parent = document.getElementById('game');
if (!parent) {
  throw new Error('Elemento #game não encontrado no index.html');
}

// Lê os insets de área segura uma vez no boot (docs/02 §5.3). Por ora apenas
// registra; o consumo fino por formato entra com o HUD definitivo (Fase 1+).
readSafeAreaInsets();

new Phaser.Game(createGameConfig(parent));
