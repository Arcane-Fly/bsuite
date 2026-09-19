import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardPaddingBoundary, useCardPadding } from '../cardPadding.js';
import { PageGridLayout } from '../PageGridLayout.js';
import { DEFAULT_CARD_STYLE } from '../cardStyle.js';

function Card({ id, children }: { id: string; children?: React.ReactNode }) {
  const padding = useCardPadding();
  return <CardPaddingBoundary><div data-testid={id} style={{ padding: padding ?? 24 }}>{children}</div></CardPaddingBoundary>;
}

function Grid({ id, padding, chrome = false, children }: {
  id: string; padding: number | null; chrome?: boolean; children: React.ReactNode;
}) {
  return <PageGridLayout pageKey={id} itemChrome={chrome}
    preferenceAdapter={<T,>(key: string, fallback: T) => ({
      value: key.endsWith('_card_style') ? { ...DEFAULT_CARD_STYLE, padding } as T : fallback,
      setValue: () => undefined, loaded: true,
    })}
    defaultLayouts={{ lg: [{ i: 'card', x: 0, y: 0, w: 12, h: 4 }] }}
    widgets={{ card: children }} />;
}

describe('app Card padding ownership', () => {
  it('reaches the first Card through wrappers and gives nested grids independent defaults', () => {
    render(<Grid id="outer" padding={8}><section><Card id="outer-card">
      <Card id="inner-panel" />
      <Grid id="nested" padding={16}><Card id="nested-card" /></Grid>
      <Grid id="unset" padding={null}><Card id="unset-card" /></Grid>
    </Card></section></Grid>);
    expect(screen.getByTestId('outer-card').style.padding).toBe('8px');
    expect(screen.getByTestId('inner-panel').style.padding).toBe('24px');
    expect(screen.getByTestId('nested-card').style.padding).toBe('16px');
    expect(screen.getByTestId('unset-card').style.padding).toBe('24px');
  });

  it('keeps a chrome-owned grid inset out of its child Card', () => {
    render(<Grid id="chrome" padding={8} chrome><Card id="child" /></Grid>);
    expect(screen.getByTestId('child').style.padding).toBe('24px');
  });

  it('updates the same mounted Card for explicit zero and resets to its own spacing', () => {
    const view = render(<Grid id="changing" padding={8}><Card id="changing-card" /></Grid>);
    const card = screen.getByTestId('changing-card');
    expect(card.style.padding).toBe('8px');
    view.rerender(<Grid id="changing" padding={0}><Card id="changing-card" /></Grid>);
    expect(screen.getByTestId('changing-card')).toBe(card);
    expect(card.style.padding).toBe('0px');
    view.rerender(<Grid id="changing" padding={null}><Card id="changing-card" /></Grid>);
    expect(card.style.padding).toBe('24px');
  });
});
