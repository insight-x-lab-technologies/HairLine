import { describe, it, expect } from 'vitest';
import { classifyForm, VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../src/config/layout';

describe('layout — classificação de formato (docs/02 §5)', () => {
  it('a resolução virtual é retrato (mais alta que larga)', () => {
    expect(VIRTUAL_HEIGHT).toBeGreaterThan(VIRTUAL_WIDTH);
  });

  it('celular retrato é "portrait"', () => {
    expect(classifyForm(390, 844)).toBe('portrait');
  });

  it('quadrado (ratio 1) ainda conta como portrait', () => {
    expect(classifyForm(800, 800)).toBe('portrait');
  });

  it('celular/tablet em paisagem leve é "landscape"', () => {
    expect(classifyForm(1024, 768)).toBe('landscape');
  });

  it('desktop widescreen é "widescreen"', () => {
    expect(classifyForm(1920, 1080)).toBe('widescreen');
  });
});
