import Phaser from 'phaser';
import { SceneKeys } from '../config/sceneKeys';

/**
 * BootScene — primeira cena. Apenas inicializa o mínimo e encadeia para o
 * Preload (docs/02 §2). Sem assets aqui; carregamento pesado fica no Preload.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  create(): void {
    this.scene.start(SceneKeys.Preload);
  }
}
