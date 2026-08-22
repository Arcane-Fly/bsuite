/**
 * WHAT THIS DIALOG PROMISES MUST MATCH WHAT IT DOES.
 *
 * It writes a row to `tenant_entity_relations` — a documentation table nothing
 * else in the estate reads. It does not create a foreign key, add a column, or
 * change any query's behaviour. While the title said "Configure Relationship"
 * and the button said "Create Relationship", a reasonable user finished the
 * flow believing they had altered their database.
 *
 * That is a worse failure than visible confusion, because the user never learns
 * they were wrong. So the scope line is load-bearing product copy, not
 * decoration, and it gets a test.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { RelationshipConfigDialog } from '../components/RelationshipConfigDialog.js';

beforeAll(() => {
  // jsdom implements neither, and the component is a native <dialog>.
  HTMLDialogElement.prototype.showModal = vi.fn(function showModal(
    this: HTMLDialogElement,
  ) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function close(
    this: HTMLDialogElement,
  ) {
    this.open = false;
  });
});

function renderDialog(onConfirm = vi.fn()) {
  render(
    <RelationshipConfigDialog
      open
      onOpenChange={vi.fn()}
      sourceName="Client"
      targetName="Employer"
      onConfirm={onConfirm}
    />,
  );
  return onConfirm;
}

describe('RelationshipConfigDialog copy', () => {
  it('states that nothing about the database changes', () => {
    renderDialog();
    expect(screen.getByText(/diagram link only/i)).toBeTruthy();
    expect(
      screen.getByText(/does not change the\s+database or enforce anything/i),
    ).toBeTruthy();
  });

  it('does not promise to create a relationship in the database', () => {
    renderDialog();
    // The old submit label. If it comes back, so does the false belief.
    expect(
      screen.queryByRole('button', { name: /^create relationship$/i }),
    ).toBeNull();
    expect(screen.getByRole('button', { name: /create link/i })).toBeTruthy();
  });

  it('names both entities in the title', () => {
    renderDialog();
    expect(
      screen.getByRole('heading', { name: /link client to employer/i }),
    ).toBeTruthy();
  });

  it('describes the cardinality in the user’s own nouns', () => {
    renderDialog();
    // Not "Source has many targets" — the words on screen are the two entities.
    expect(screen.getByRole('option', { name: 'One Client → many Employer' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Many Client ↔ many Employer' })).toBeTruthy();
  });

  it('keeps the explanation out of the <option>, where it cannot wrap', () => {
    renderDialog();
    for (const option of screen.getAllByRole('option')) {
      // 62 characters of concatenated label + description used to be truncated
      // by a 430px select. Nothing here should be near that.
      expect(option.textContent!.length).toBeLessThan(45);
    }
    // The description is present, just not inside the select.
    expect(screen.getByText(/each client can be linked to any number/i)).toBeTruthy();
  });

  it('previews the direction using the labels as typed', () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText(/what client calls employer/i), {
      target: { value: 'Assigned Employers' },
    });
    expect(
      screen.getByText(/you.{0,3}ll see .{0,3}Assigned Employers/i),
    ).toBeTruthy();
  });

  it('sends the label the user typed for the source as source_label', () => {
    // Guards the thing that must NOT be "fixed": the persistence direction is
    // already correct, and only the wording was ever wrong. If someone swaps
    // the mapping to satisfy a caption, this fails.
    const onConfirm = renderDialog();
    fireEvent.change(screen.getByLabelText(/what client calls employer/i), {
      target: { value: 'Assigned Employers' },
    });
    fireEvent.change(screen.getByLabelText(/what employer calls client/i), {
      target: { value: 'Belongs to Client' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create link/i }));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        source_label: 'Assigned Employers',
        target_label: 'Belongs to Client',
      }),
    );
  });
});
