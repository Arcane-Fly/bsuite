/*
 * The assertion that matters is the LAST one: a page with a real layout must
 * never render JSON at a user. Two of the estate's four renderers did exactly
 * that, on live routed screens, and this component exists to make it the harder
 * thing to do rather than the easier one.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  CustomPageView,
  flattenSections,
  layoutIsEmpty,
  renderStructuredLayout,
  type StoredLayout,
} from '../CustomPageView.js';

const PAGE = {
  title: 'Apprentice onboarding',
  description: 'Everything a new apprentice needs on day one.',
  layout: {
    sections: [
      {
        id: 's1',
        title: 'Personal details',
        fields: [{ fieldKey: 'given_name' }, { fieldKey: 'family_name', label: 'Surname' }],
      },
    ],
  } as StoredLayout,
};

describe('layoutIsEmpty', () => {
  it('treats null, undefined and a non-object as empty', () => {
    expect(layoutIsEmpty(null)).toBe(true);
    expect(layoutIsEmpty(undefined)).toBe(true);
    expect(layoutIsEmpty('not a layout')).toBe(true);
  });

  it('treats {} and { sections: [] } as empty', () => {
    expect(layoutIsEmpty({})).toBe(true);
    expect(layoutIsEmpty({ sections: [] })).toBe(true);
  });

  it('is NOT empty when it has sections, or tabs alone', () => {
    expect(layoutIsEmpty({ sections: [{ id: 'a' }] })).toBe(false);
    expect(layoutIsEmpty({ tabs: [{ id: 't', sections: [] }] })).toBe(false);
  });
});

describe('flattenSections', () => {
  it('returns top-level sections and sections nested in tabs, in that order', () => {
    const out = flattenSections({
      sections: [{ id: 'top' }],
      tabs: [{ id: 't1', sections: [{ id: 'nested' }] }],
    });
    expect(out.map((s) => s.id)).toEqual(['top', 'nested']);
  });

  it('survives a layout whose sections/tabs are not arrays', () => {
    const bad = { sections: 'nope', tabs: 42 } as unknown as StoredLayout;
    expect(flattenSections(bad)).toEqual([]);
  });
});

describe('CustomPageView states', () => {
  it('renders nothing while loading on an embedded mount', () => {
    const { container } = render(<CustomPageView page={undefined} isLoading />);
    expect(container.innerHTML).toBe('');
  });

  it('says so while loading when the page IS the route', () => {
    render(<CustomPageView page={undefined} isLoading onMissing="message" />);
    expect(screen.getByText('Loading…')).toBeTruthy();
  });

  it('stays silent on a miss when embedded, so it cannot break a working page', () => {
    const { container } = render(<CustomPageView page={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('says "Page not found" on a miss when the page IS the route', () => {
    render(<CustomPageView page={null} onMissing="message" />);
    expect(screen.getByText('Page not found')).toBeTruthy();
  });

  it('shows the error message only when the page IS the route', () => {
    const { container } = render(<CustomPageView page={null} error={{ message: 'boom' }} />);
    expect(container.innerHTML).toBe('');
    render(<CustomPageView page={null} error={{ message: 'boom' }} onMissing="message" />);
    expect(screen.getByText('boom')).toBeTruthy();
  });

  it('renders the title and description, and says a layout is unconfigured', () => {
    render(<CustomPageView page={{ title: 'Blank page', layout: {} }} />);
    expect(screen.getByText('Blank page')).toBeTruthy();
    expect(screen.getByText('This page has no layout configured yet.')).toBeTruthy();
  });

  it('hands the layout to an app widget catalogue when one is supplied', () => {
    const renderLayout = vi.fn(() => <div>catalogue output</div>);
    render(<CustomPageView page={PAGE} renderLayout={renderLayout} />);
    expect(renderLayout).toHaveBeenCalledTimes(1);
    expect(screen.getByText('catalogue output')).toBeTruthy();
  });
});

describe('the structural default', () => {
  it('renders section titles and field labels a person can read', () => {
    render(<CustomPageView page={PAGE} />);
    expect(screen.getByText('Personal details')).toBeTruthy();
    // an explicit label wins
    expect(screen.getByText('Surname')).toBeTruthy();
    // and a bare key is humanised rather than shown raw
    expect(screen.getByText('Given name')).toBeTruthy();
    expect(screen.queryByText('given_name')).toBeNull();
  });

  it('says a section has no fields rather than rendering an empty list', () => {
    render(<CustomPageView page={{ title: 'T', layout: { sections: [{ id: 'a', title: 'A' }] } }} />);
    expect(screen.getByText('No fields in this section.')).toBeTruthy();
  });

  /*
   * THE REGRESSION GUARD. business-suite-unified and braden both shipped
   * `<pre>{JSON.stringify(page.layout, null, 2)}</pre>` on live routed screens.
   * Whatever else changes here, a page with a real layout must not put its raw
   * serialisation in front of a user.
   */
  it('NEVER renders raw JSON for a populated layout', () => {
    const { container } = render(<CustomPageView page={PAGE} />);
    expect(container.querySelector('pre')).toBeNull();
    const text = container.textContent ?? '';
    expect(text).not.toContain('fieldKey');
    expect(text).not.toContain('{');
    expect(text).not.toContain('[');
  });

  it('renderStructuredLayout is exported so an app can compose it beside its own widgets', () => {
    expect(typeof renderStructuredLayout).toBe('function');
  });
});
