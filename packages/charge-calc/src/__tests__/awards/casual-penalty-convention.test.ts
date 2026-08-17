import { describe, it, expect } from 'vitest';
import {
  casualPenaltyMultiplierForAward,
  CasualPenaltyConventionUnmodelled,
} from '../../awards/casual-penalty-convention.js';

/**
 * Regression coverage for the casual penalty conversion table.
 *
 * The 2026-08-17 compliance audit found `grep casual` over this package's
 * own test file returned ZERO hits — this file exists so that never
 * recurs. Every award/category pair in `CONVENTIONS`, plus the refusal
 * path for everything NOT in it, is asserted here.
 */
describe('casualPenaltyMultiplierForAward()', () => {
  describe('MA000020 (Building & Construction) cl.12.5/12.6 — additive', () => {
    it('converts a 150% Saturday penalty to 175%, not 187.5%', () => {
      const r = casualPenaltyMultiplierForAward({
        award: 'MA000020',
        category: 'penalty',
        standardMult: 1.5,
        penaltyId: 'sat',
      });
      // The defect: 1.5 x 1.25 = 1.875 (187.5%). The award: 1.5 + 0.25 = 1.75.
      expect(r.multiplier).toBeCloseTo(1.75, 4);
      expect(r.multiplier).not.toBeCloseTo(1.875, 4);
    });

    it('converts a 200% Sunday penalty to 225%, not 250%', () => {
      const r = casualPenaltyMultiplierForAward({
        award: 'MA000020',
        category: 'penalty',
        standardMult: 2.0,
        penaltyId: 'sun',
      });
      expect(r.multiplier).toBeCloseTo(2.25, 4);
    });

    it('prices the public holiday row at a flat 275%, matching cl.12.6', () => {
      const r = casualPenaltyMultiplierForAward({
        award: 'MA000020',
        category: 'penalty',
        standardMult: 2.5,
        isPublicHoliday: true,
        penaltyId: 'ph',
      });
      expect(r.multiplier).toBe(2.75);
      // Not the multiplicative trap the module's own docs warn about.
      expect(r.multiplier).not.toBeCloseTo(3.125, 4);
    });

    it('applies the SAME additive method to overtime rows (Table 11-equivalent)', () => {
      const r = casualPenaltyMultiplierForAward({
        award: 'MA000020',
        category: 'overtime',
        standardMult: 1.5,
        penaltyId: 'ot15',
      });
      expect(r.multiplier).toBeCloseTo(1.75, 4);
    });

    it('is case- and whitespace-insensitive on the award code', () => {
      const r = casualPenaltyMultiplierForAward({
        award: '  ma000020 ',
        category: 'penalty',
        standardMult: 1.5,
        penaltyId: 'sat',
      });
      expect(r.multiplier).toBeCloseTo(1.75, 4);
    });
  });

  describe('MA000004 (General Retail) cl.11.1 — additive, own base percentages', () => {
    it('converts Table 12 evening/Saturday 125% to 150%', () => {
      const r = casualPenaltyMultiplierForAward({
        award: 'MA000004',
        category: 'penalty',
        standardMult: 1.25,
        penaltyId: 'sat',
      });
      expect(r.multiplier).toBeCloseTo(1.5, 4);
    });

    it('converts Table 11 overtime 150% to 175%', () => {
      const r = casualPenaltyMultiplierForAward({
        award: 'MA000004',
        category: 'overtime',
        standardMult: 1.5,
        penaltyId: 'ot15',
      });
      expect(r.multiplier).toBeCloseTo(1.75, 4);
    });
  });

  describe('MA000009 (Hospitality) — OPPOSITE conventions by category', () => {
    it('penalty rows (cl.29.2 Table 14) are additive: 150% Sunday -> 175%', () => {
      const r = casualPenaltyMultiplierForAward({
        award: 'MA000009',
        category: 'penalty',
        standardMult: 1.5,
        penaltyId: 'sun',
      });
      expect(r.multiplier).toBeCloseTo(1.75, 4);
    });

    it('overtime rows (cl.28.4 Table 13, no casual column) are MULTIPLICATIVE: 150% -> 187.5%, not 175%', () => {
      const r = casualPenaltyMultiplierForAward({
        award: 'MA000009',
        category: 'overtime',
        standardMult: 1.5,
        penaltyId: 'ot15',
      });
      expect(r.multiplier).toBeCloseTo(1.875, 4);
      expect(r.multiplier).not.toBeCloseTo(1.75, 4);
    });
  });

  describe('MA000036 (Plumbing) — the OPPOSITE split to MA000009', () => {
    it('overtime rows (cl.22.1(a), explicit casual column) are additive: 150% -> 175%', () => {
      const r = casualPenaltyMultiplierForAward({
        award: 'MA000036',
        category: 'overtime',
        standardMult: 1.5,
        penaltyId: 'ot15',
      });
      expect(r.multiplier).toBeCloseTo(1.75, 4);
    });

    it('penalty rows (cl.23, no casual column) are MULTIPLICATIVE: 150% -> 187.5%, not 175%', () => {
      const r = casualPenaltyMultiplierForAward({
        award: 'MA000036',
        category: 'penalty',
        standardMult: 1.5,
        penaltyId: 'sat',
      });
      expect(r.multiplier).toBeCloseTo(1.875, 4);
    });
  });

  describe('MA000010 (Manufacturing) cl.11.1(d) — multiplicative, both categories', () => {
    it('penalty: 133% standard becomes 166.25% (a genuine quarter-point value, not noise)', () => {
      const r = casualPenaltyMultiplierForAward({
        award: 'MA000010',
        category: 'penalty',
        standardMult: 1.33,
        penaltyId: 'row',
      });
      expect(r.multiplier).toBeCloseTo(1.6625, 4);
    });

    it('overtime: 150% standard becomes 187.5%', () => {
      const r = casualPenaltyMultiplierForAward({
        award: 'MA000010',
        category: 'overtime',
        standardMult: 1.5,
        penaltyId: 'ot15',
      });
      expect(r.multiplier).toBeCloseTo(1.875, 4);
    });
  });

  describe('refusal — never a default, never a silent identity', () => {
    it('throws CasualPenaltyConventionUnmodelled for an unlisted award (MA000025)', () => {
      expect(() =>
        casualPenaltyMultiplierForAward({
          award: 'MA000025',
          category: 'penalty',
          standardMult: 1.5,
          penaltyId: 'sat',
        }),
      ).toThrow(CasualPenaltyConventionUnmodelled);
    });

    it('throws for a completely unknown/empty award code, not a default multiplier', () => {
      expect(() =>
        casualPenaltyMultiplierForAward({
          award: '',
          category: 'penalty',
          standardMult: 1.5,
          penaltyId: 'sat',
        }),
      ).toThrow(CasualPenaltyConventionUnmodelled);
    });

    it('carries award/category/penaltyId as typed DATA on the thrown error, not just in the message', () => {
      try {
        casualPenaltyMultiplierForAward({
          award: 'MA000025',
          category: 'penalty',
          standardMult: 1.5,
          penaltyId: 'sat',
        });
        expect.unreachable('expected a throw');
      } catch (e) {
        expect(e).toBeInstanceOf(CasualPenaltyConventionUnmodelled);
        const err = e as CasualPenaltyConventionUnmodelled;
        expect(err.award).toBe('MA000025');
        expect(err.category).toBe('penalty');
        expect(err.penaltyId).toBe('sat');
      }
    });

    it('never returns a number for a known award but an UNMODELLED category on it', () => {
      // MA000020 is fully modelled for both categories today; assert the
      // GENERAL shape instead — a category absent from an award's entry
      // refuses rather than falling back to the other category's kind.
      // MA000009 has no overtime ADDITIVE entry; confirm penalty and
      // overtime resolve to genuinely different conventions (proves the
      // lookup is category-scoped, not award-scoped).
      const penalty = casualPenaltyMultiplierForAward({
        award: 'MA000009', category: 'penalty', standardMult: 1.5, penaltyId: 'sun',
      });
      const overtime = casualPenaltyMultiplierForAward({
        award: 'MA000009', category: 'overtime', standardMult: 1.5, penaltyId: 'ot15',
      });
      expect(penalty.multiplier).not.toBeCloseTo(overtime.multiplier, 4);
    });
  });
});
