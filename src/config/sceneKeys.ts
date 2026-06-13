/** Chaves de cena centralizadas (evita strings mágicas espalhadas). */
export const SceneKeys = {
  Boot: 'Boot',
  Preload: 'Preload',
  Menu: 'Menu',
  Game: 'Game',
  Pause: 'Pause',
  Results: 'Results',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
