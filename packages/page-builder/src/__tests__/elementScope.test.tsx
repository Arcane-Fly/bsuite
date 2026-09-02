import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import {
  ElementScopeProvider,
  describeElement,
  elementRef,
  parseElementRef,
  useElementScope,
} from '../elementScope';

const scope = { pageKey: '/contacts', cardKey: 'card3', cardLabel: 'Contacts', isEditing: true };

function Probe() {
  const s = useElementScope();
  return <span data-testid="probe">{s ? elementRef(s, 'add-contact') : 'no-scope'}</span>;
}

describe('elementScope', () => {
  it('gives an element an address that names its page and its card', () => {
    expect(elementRef(scope, 'add-contact')).toBe('page:/contacts|card:card3|el:add-contact');
  });

  it('round-trips through parse without losing a part', () => {
    expect(parseElementRef(elementRef(scope, 'add-contact'))).toEqual({
      pageKey: '/contacts',
      cardKey: 'card3',
      name: 'add-contact',
    });
  });

  it('refuses anything that is not an address, rather than half-parsing it', () => {
    expect(parseElementRef('add-contact')).toBeNull();
    expect(parseElementRef('page:/x|card:y')).toBeNull();
    expect(parseElementRef('page:|card:y|el:z')).toBeNull();
    expect(parseElementRef('nope:/x|card:y|el:z')).toBeNull();
  });

  it('survives a page key that contains the separator characters', () => {
    // Routes carry colons and slashes; the parser splits on | and slices by
    // prefix rather than splitting on : for exactly this reason.
    const r = elementRef({ ...scope, pageKey: '/workflows/:id' }, 'publish');
    expect(parseElementRef(r)?.pageKey).toBe('/workflows/:id');
  });

  it('describes an element as a sentence a person can read', () => {
    expect(describeElement(scope, 'Add contact button')).toBe(
      'Add contact button, in the Contacts card',
    );
  });

  it('falls back to "this card" rather than printing a key at a person', () => {
    expect(describeElement({ ...scope, cardLabel: undefined }, 'Export')).toBe(
      'Export, in this card',
    );
    expect(describeElement({ ...scope, cardLabel: '   ' }, 'Export')).toBe('Export, in this card');
  });

  it('reaches a descendant through the provider', () => {
    render(
      <ElementScopeProvider scope={scope}>
        <Probe />
      </ElementScopeProvider>,
    );
    expect(screen.getByTestId('probe').textContent).toBe('page:/contacts|card:card3|el:add-contact');
  });

  it('returns null OUTSIDE a grid page, because most of the estate is', () => {
    // A null scope is a normal answer, not an error. Most components render
    // outside PageGridLayout and simply cannot be addressed yet.
    render(<Probe />);
    expect(screen.getByTestId('probe').textContent).toBe('no-scope');
  });
});
