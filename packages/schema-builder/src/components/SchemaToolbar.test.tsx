import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SchemaToolbar } from './SchemaToolbar.js';

describe('SchemaToolbar', () => {
  it('renders visible action labels and search result feedback', () => {
    const onSearchChange = vi.fn();

    render(
      <SchemaToolbar
        onTidyUp={vi.fn()}
        onFitView={vi.fn()}
        onExportPng={vi.fn()}
        onSearchChange={onSearchChange}
        searchQuery="contact"
        resultCount={2}
        totalCount={35}
      />,
    );

    expect(screen.getByRole('button', { name: /tidy up layout/i })).toBeTruthy();
    expect(screen.getByText('Tidy')).toBeTruthy();
    expect(screen.getByText('Fit')).toBeTruthy();
    expect(screen.getByText('PNG')).toBeTruthy();
    expect(screen.getByText('2 of 35 entities matched')).toBeTruthy();

    fireEvent.change(screen.getByRole('textbox', { name: /search entities/i }), {
      target: { value: 'training' },
    });
    expect(onSearchChange).toHaveBeenCalledWith('training');
  });
});
