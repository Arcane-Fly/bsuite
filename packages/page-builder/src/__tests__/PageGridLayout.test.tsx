import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageGridLayout } from '../PageGridLayout.js';
import type { GridLayouts } from '../types.js';

const layouts: GridLayouts = {
  lg: [{ i: 'alpha', x: 0, y: 0, w: 12, h: 4 }],
};

describe('PageGridLayout', () => {
  it('renders known widget content', () => {
    render(
      <PageGridLayout
        pageKey="test"
        defaultLayouts={layouts}
        widgets={{ alpha: <div>Alpha widget</div> }}
      />,
    );

    expect(screen.getByText('Alpha widget')).toBeTruthy();
  });
});
