/** Chaves de cena centralizadas (evita strings mágicas espalhadas). */
export const SceneKeys = {
  Boot: 'Boot',
  Preload: 'Preload',
  Menu: 'Menu',
  Hangar: 'Hangar',
  Achievements: 'Achievements',
  Stats: 'Stats',
  Game: 'Game',
  Pause: 'Pause',
  Results: 'Results',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
