import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PageGridLayout } from '../PageGridLayout.js';
import type { GridLayouts, RelationshipCatalog, RelationshipWidgetDetail } from '../types.js';

const baseLayouts: GridLayouts = {
  lg: [{ i: 'header', x: 0, y: 0, w: 12, h: 4 }],
};

const CONTACT_TO_CLIENT_CATALOG: RelationshipCatalog = [
  { hostEntityType: 'contact', fkColumn: 'client_id', targetEntityType: 'client' },
];

function dispatchAddRelationshipWidget(detail: RelationshipWidgetDetail, eventName = 'crm7-add-relationship-widget') {
  act(() => {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PageGridLayout — relationship-field widget kind (W4-1/W4-2)', () => {
  it('adds a relationship widget when the requested FK is present in relationshipCatalog', async () => {
    const createRelationshipWidget = vi.fn((options) => (
      <div data-testid="relationship-widget">{`${options.hostEntityType}.${options.fkColumn} -> ${options.targetEntityType}`}</div>
    ));

    render(
      <PageGridLayout
        pageKey="contact-detail-test"
        defaultLayouts={baseLayouts}
        widgets={{ header: <div>Header</div> }}
        relationshipCatalog={CONTACT_TO_CLIENT_CATALOG}
        createRelationshipWidget={createRelationshipWidget}
      />,
    );

    dispatchAddRelationshipWidget({
      hostEntityType: 'contact',
      fkColumn: 'client_id',
      targetEntityType: 'client',
      label: 'Client',
    });

    await waitFor(() => expect(screen.getByTestId('relationship-widget')).toBeTruthy());
    // The factory is a render-time function inside a `useMemo`, so it can
    // legitimately be invoked more than once across the two state updates
    // (registering the config, then flipping into edit mode) — what matters
    // is that exactly one widget instance exists in the layout/DOM, not the
    // raw call count. Dedup is asserted separately below.
    expect(createRelationshipWidget).toHaveBeenCalled();
    expect(screen.getAllByTestId('relationship-widget')).toHaveLength(1);
    expect(screen.getByText('contact.client_id -> client')).toBeTruthy();
  });

  it('a record with no matching FK is not offered a relationship field — refused, not rendered', async () => {
    const createRelationshipWidget = vi.fn(() => <div data-testid="relationship-widget">rendered</div>);
    const onRelationshipWidgetRejected = vi.fn();

    render(
      <PageGridLayout
        pageKey="invoice-detail-test"
        defaultLayouts={baseLayouts}
        widgets={{ header: <div>Header</div> }}
        relationshipCatalog={CONTACT_TO_CLIENT_CATALOG}
        createRelationshipWidget={createRelationshipWidget}
        onRelationshipWidgetRejected={onRelationshipWidgetRejected}
      />,
    );

    // `invoices` has no `client_id` FK in the catalogue supplied above.
    dispatchAddRelationshipWidget({
      hostEntityType: 'invoice',
      fkColumn: 'client_id',
      targetEntityType: 'client',
      label: 'Client',
    });

    await waitFor(() =>
      expect(onRelationshipWidgetRejected).toHaveBeenCalledWith({
        hostEntityType: 'invoice',
        fkColumn: 'client_id',
        targetEntityType: 'client',
        label: 'Client',
      }),
    );
    expect(createRelationshipWidget).not.toHaveBeenCalled();
    expect(screen.queryByTestId('relationship-widget')).toBeNull();
  });

  it('fails closed when no relationshipCatalog prop is supplied at all', async () => {
    const createRelationshipWidget = vi.fn(() => <div data-testid="relationship-widget">rendered</div>);
    const onRelationshipWidgetRejected = vi.fn();

    render(
      <PageGridLayout
        pageKey="no-catalog-test"
        defaultLayouts={baseLayouts}
        widgets={{ header: <div>Header</div> }}
        createRelationshipWidget={createRelationshipWidget}
        onRelationshipWidgetRejected={onRelationshipWidgetRejected}
      />,
    );

    dispatchAddRelationshipWidget({
      hostEntityType: 'contact',
      fkColumn: 'client_id',
      targetEntityType: 'client',
    });

    await waitFor(() => expect(onRelationshipWidgetRejected).toHaveBeenCalledTimes(1));
    expect(createRelationshipWidget).not.toHaveBeenCalled();
  });

  it('threads tenantId through to the relationship widget factory', async () => {
    const createRelationshipWidget = vi.fn((options) => (
      <div data-testid="relationship-widget">{String(options.tenantId)}</div>
    ));

    render(
      <PageGridLayout
        pageKey="tenant-scoped-relationship-test"
        defaultLayouts={baseLayouts}
        widgets={{ header: <div>Header</div> }}
        tenantId="tenant-42"
        relationshipCatalog={CONTACT_TO_CLIENT_CATALOG}
        createRelationshipWidget={createRelationshipWidget}
      />,
    );

    dispatchAddRelationshipWidget({
      hostEntityType: 'contact',
      fkColumn: 'client_id',
      targetEntityType: 'client',
    });

    await waitFor(() => expect(screen.getByText('tenant-42')).toBeTruthy());
  });

  it('does not re-add a relationship widget already present on the layout', async () => {
    const createRelationshipWidget = vi.fn(() => <div data-testid="relationship-widget">rendered</div>);

    render(
      <PageGridLayout
        pageKey="dedupe-relationship-test"
        defaultLayouts={baseLayouts}
        widgets={{ header: <div>Header</div> }}
        relationshipCatalog={CONTACT_TO_CLIENT_CATALOG}
        createRelationshipWidget={createRelationshipWidget}
      />,
    );

    const detail: RelationshipWidgetDetail = {
      hostEntityType: 'contact',
      fkColumn: 'client_id',
      targetEntityType: 'client',
    };
    dispatchAddRelationshipWidget(detail);
    await waitFor(() => expect(screen.getAllByTestId('relationship-widget')).toHaveLength(1));

    const callsAfterFirstAdd = createRelationshipWidget.mock.calls.length;

    dispatchAddRelationshipWidget(detail);
    // Give the (no-op) second dispatch a tick to have taken effect, then
    // assert the layout still has exactly one relationship widget and the
    // factory was not invoked again for a "new" widget — the widgetId
    // already existed, so the handler takes the early-return branch.
    await waitFor(() => expect(screen.getAllByTestId('relationship-widget')).toHaveLength(1));
    expect(createRelationshipWidget.mock.calls.length).toBe(callsAfterFirstAdd);
  });
});

describe('PageGridLayout — entity-list widget tenant scoping (W4-3)', () => {
  it('threads the caller tenantId through to createEntityWidget by default', async () => {
    const createEntityWidget = vi.fn((options) => (
      <div data-testid="entity-widget">{String(options.tenantId)}</div>
    ));

    render(
      <PageGridLayout
        pageKey="entity-tenant-scope-test"
        defaultLayouts={baseLayouts}
        widgets={{ header: <div>Header</div> }}
        tenantId="tenant-caller"
        createEntityWidget={createEntityWidget}
      />,
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent('crm7-add-entity-widget', { detail: { entityType: 'client', label: 'Clients' } }),
      );
    });

    await waitFor(() => expect(screen.getByText('tenant-caller')).toBeTruthy());
  });

  it('passes tenantId as undefined (not a guessed value) when the caller omits it', async () => {
    const createEntityWidget = vi.fn((options) => (
      <div data-testid="entity-widget">{String(options.tenantId)}</div>
    ));

    render(
      <PageGridLayout
        pageKey="entity-no-tenant-test"
        defaultLayouts={baseLayouts}
        widgets={{ header: <div>Header</div> }}
        createEntityWidget={createEntityWidget}
      />,
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent('crm7-add-entity-widget', { detail: { entityType: 'client', label: 'Clients' } }),
      );
    });

    await waitFor(() => expect(screen.getByText('undefined')).toBeTruthy());
  });
});
