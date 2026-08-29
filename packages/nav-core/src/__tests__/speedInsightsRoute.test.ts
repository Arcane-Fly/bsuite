import { describe, expect, it } from 'vitest';

import { speedInsightsRoute } from '../speedInsightsRoute.js';

describe('speedInsightsRoute', () => {
  it('collapses a uuid segment, which is the case that fragments the report', () => {
    expect(speedInsightsRoute('/apprentices/9f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f')).toBe(
      '/apprentices/:uuid',
    );
  });

  it('maps two different records to ONE route — the whole point', () => {
    const a = speedInsightsRoute('/apprentices/9f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f/placements');
    const b = speedInsightsRoute('/apprentices/3ab74f10-1111-2222-3333-444455556666/placements');
    expect(a).toBe(b);
    expect(a).toBe('/apprentices/:uuid/placements');
  });

  it('collapses a numeric id', () => {
    expect(speedInsightsRoute('/invoices/40912')).toBe('/invoices/:id');
  });

  it('collapses an ISO date rather than calling it an id', () => {
    expect(speedInsightsRoute('/reports/2026-08-29')).toBe('/reports/:date');
  });

  it('collapses an opaque token id', () => {
    expect(speedInsightsRoute('/share/V1StGXR8Z5jdHi6BmyT')).toBe('/share/:id');
  });

  it('leaves a static path completely alone', () => {
    expect(speedInsightsRoute('/settings/hiring-divisions')).toBe('/settings/hiring-divisions');
  });

  it('does NOT collapse a long alphabetic word — over-collapsing is the worse error', () => {
    // "Administration" is 14 chars and has no digit. A helper that ate this
    // would merge unrelated pages into one p75 that describes neither.
    expect(speedInsightsRoute('/admin/Administration')).toBe('/admin/Administration');
    expect(speedInsightsRoute('/vet/qualifications')).toBe('/vet/qualifications');
  });

  it('does not collapse a short slug that merely contains digits', () => {
    expect(speedInsightsRoute('/awards/ma000025')).toBe('/awards/ma000025');
  });

  it('handles the root and empty input without inventing a route', () => {
    expect(speedInsightsRoute('/')).toBe('/');
    expect(speedInsightsRoute('')).toBe('/');
  });

  it('strips query and hash so one page is not split by its parameters', () => {
    expect(speedInsightsRoute('/leads?status=open')).toBe('/leads');
    expect(speedInsightsRoute('/leads#top')).toBe('/leads');
  });

  it('collapses several parameters in one path', () => {
    expect(
      speedInsightsRoute('/tenants/11111111-2222-3333-4444-555555555555/invoices/40912'),
    ).toBe('/tenants/:uuid/invoices/:id');
  });

  it('preserves a trailing slash rather than merging two distinct rows', () => {
    expect(speedInsightsRoute('/leads/')).toBe('/leads/');
  });
});
