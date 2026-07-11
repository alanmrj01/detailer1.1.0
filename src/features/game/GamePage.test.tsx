import { act, create } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultConfig } from '../../data/defaultConfig';

vi.mock('../../context/AppConfigContext', () => ({
  useAppConfig: () => ({
    config: defaultConfig,
    theme: 'dark',
    setTheme: vi.fn(),
  }),
}));

import { GamePage } from './GamePage';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return Array.from(this.data.keys())[index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  });
});

describe('GamePage', () => {
  it('inicia a partida sem quebrar a ordem dos hooks do React', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(<GamePage />);
    });

    const startButton = renderer!.root.findAllByType('button')[0];

    expect(startButton).toBeTruthy();

    expect(() => {
      act(() => {
        startButton!.props.onClick();
      });
    }).not.toThrow();

    expect(renderer!.root.findAllByType('h1')[0].children.join('')).toContain('Onde sua operação vai começar?');
  });
});
