import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BreakpointSwitcher } from '../components/BreakpointSwitcher.js';

describe('BreakpointSwitcher', () => {
  it('renders Desktop/Tablet/Mobile segments and invokes onChange', () => {
    const onChange = vi.fn();
    render(<BreakpointSwitcher value="desktop" onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'Desktop' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tablet' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mobile' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Mobile' }));
    expect(onChange).toHaveBeenCalledWith('mobile');
  });
});
