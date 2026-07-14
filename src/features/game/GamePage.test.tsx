import { act, create } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultConfig } from '../../data/defaultConfig';
import { removeJson, storageKeys } from '../../utils/storage';

vi.mock('../../context/AppConfigContext', () => ({
  useAppConfig: () => ({
    config: defaultConfig,
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
  removeJson(storageKeys.RUN_KEY);
  removeJson(storageKeys.DEMO_RUN_COUNT_KEY);
});

describe('GamePage', () => {
  it('inicia a partida sem quebrar a ordem dos hooks do React', () => {
    const renderer = startGame();
    expect(renderer.root.findAllByType('h1')[0].children.join('')).toContain('Onde sua operação vai começar?');
  });

  it('avança da primeira para a segunda decisão mesmo quando o armazenamento é bloqueado', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem() { throw new Error('blocked'); },
        setItem() { throw new Error('blocked'); },
        removeItem() { throw new Error('blocked'); },
        clear() { throw new Error('blocked'); },
        key() { return null; },
        length: 0,
      },
    });
    const renderer = startGame();
    const choiceButton = renderer.root.findAllByType('button').find((button) =>
      renderedText(button).includes('Adaptar a garagem'),
    );
    act(() => choiceButton!.props.onClick());

    const confirmButton = renderer.root.findAllByType('button').find((button) =>
      renderedText(button).includes('Confirmar escolha'),
    );
    act(() => confirmButton!.props.onClick());

    const continueButton = renderer.root.findAllByType('button').find((button) =>
      renderedText(button).includes('Continuar'),
    );
    expect(continueButton).toBeTruthy();
    act(() => continueButton!.props.onClick());

    expect(renderer.root.findAllByType('h1')[0].children.join('')).toContain('Qual conjunto de equipamentos comprar?');
  });

  it('substitui os deltas numéricos por medidores visuais na consequência', () => {
    const renderer = startGame();
    const choiceButton = renderer.root.findAllByType('button').find((button) =>
      renderedText(button).includes('Adaptar a garagem'),
    );
    act(() => choiceButton!.props.onClick());

    const confirmButton = renderer.root.findAllByType('button').find((button) =>
      renderedText(button).includes('Confirmar escolha'),
    );
    act(() => confirmButton!.props.onClick());

    const gauges = renderer.root.findAll((node) => node.props['data-testid'] === 'impact-gauge');
    expect(gauges).toHaveLength(3);
    expect(gauges.every((gauge) => String(gauge.props['aria-label']).includes('impacto'))).toBe(true);
  });

  it('começa visualmente com saúde da operação em 0 estrelas', () => {
    const renderer = startGame();
    const text = renderedText(renderer.root);
    expect(text).toContain('0,0');
    expect(text).toContain('0.0');
    expect(text).toContain('saúde da operação');
  });

  it('bloqueia a segunda partida e apresenta o piloto de 14 dias', () => {
    writeDemoRunCount(1);

    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(<GamePage />);
    });

    const startButton = renderer!.root.findAllByType('button').find((button) =>
      renderedText(button).includes('Iniciar desafio'),
    );
    act(() => startButton!.props.onClick());

    expect(renderedText(renderer!.root)).toContain('Agora teste a ferramenta com o seu próprio método');
    expect(renderedText(renderer!.root)).toContain('piloto gratuito de 14 dias');
    expect(renderer!.root.findAllByType('h1')[0].children.join('')).toContain('Primeiros 90 dias');
  });

  it('só revela a consequência completa depois que a decisão é confirmada', () => {
    const renderer = startGame();
    const consequence = 'Você preserva capital de giro e reduz o ponto de equilíbrio';

    expect(renderedText(renderer.root)).not.toContain(consequence);

    const choiceButton = renderer.root.findAllByType('button').find((button) =>
      renderedText(button).includes('Adaptar a garagem'),
    );
    expect(choiceButton).toBeTruthy();

    act(() => choiceButton!.props.onClick());
    expect(renderedText(renderer.root)).not.toContain(consequence);
    expect(renderedText(renderer.root)).toContain('A consequência completa será revelada depois da confirmação.');

    const confirmButton = renderer.root.findAllByType('button').find((button) =>
      renderedText(button).includes('Confirmar escolha'),
    );
    act(() => confirmButton!.props.onClick());

    expect(renderedText(renderer.root)).toContain(consequence);
  });
});

function writeDemoRunCount(count: number) {
  localStorage.setItem(storageKeys.DEMO_RUN_COUNT_KEY, JSON.stringify(count));
}

function startGame() {
  let renderer: ReturnType<typeof create>;
  act(() => {
    renderer = create(<GamePage />);
  });

  const startButton = renderer!.root.findAllByType('button').find((button) =>
    button.children.some((child) => child === 'Iniciar desafio'),
  );
  expect(startButton).toBeTruthy();
  act(() => startButton!.props.onClick());
  return renderer!;
}

function renderedText(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(renderedText).join(' ');
  if (node && typeof node === 'object' && 'children' in node) {
    return renderedText((node as { children?: unknown[] }).children ?? []);
  }
  return '';
}
