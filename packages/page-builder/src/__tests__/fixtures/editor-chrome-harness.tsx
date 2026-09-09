import React from 'react';
import { createRoot } from 'react-dom/client';
import { PageGridLayout } from '../../PageGridLayout.js';

/**
 * Real PageGridLayout mount for browser geometry — not toy coloured boxes.
 *
 * THREE cards, because one full-width card cannot ask the narrow-width
 * question. `activeCols` is the SAME at every breakpoint (usePageGridLayout
 * :405), so a `w: 4` card is one third of the canvas at 390 as well as at
 * 1440 — roughly 105px, which is the real geometry an editor label has to
 * live in on a phone.
 *
 *  - candidates    w12 autoHeight  short label  — the gradient-heading overlap
 *                                                 case, and the control: a
 *                                                 short label must never clip.
 *  - reconciliation w4 autoHeight  long label   — one unbroken word wider than
 *                                                 a third of a 390 canvas.
 *  - superannuation w4 fixed       longer label — the same stress on the OTHER
 *                                                 code path (strip above the
 *                                                 overflow-auto body).
 *  - payroll        w2 autoHeight longest label — the NARROWEST real card.
 *
 * The narrow-card case is NOT reachable by shrinking the viewport.
 * `buildResponsiveLayouts` stacks EVERY card to full width at `xxs`, i.e. below
 * a 480px CONTAINER — deliberately, and documented there. So a 390 viewport
 * gives one full-width 346px card per row and no realistic label can overflow
 * it. The geometry that reproduces the class is a narrow CARD in a container
 * wide enough to keep columns: an ordinary laptop with the sidebar open lands
 * at `xs`/`sm`, mirrors `lg`, and a 2-of-12 card there is ~100px. That is what
 * `payroll` is for, and why the script measures a 768 cell as well as 1440 and
 * 390.
 */
function Card({ heading, body }: { heading: string; body: string }) {
  return (
    <article data-slot="card-content">
      <h2 data-slot="card-heading">{heading}</h2>
      <p data-slot="card-body">{body}</p>
    </article>
  );
}

function Harness() {
  return (
    <div
      id="harness-root"
      style={{ width: '100%', maxWidth: '100%', minHeight: 400, padding: 16, boxSizing: 'border-box' }}
    >
      <PageGridLayout
        pageKey="editor-chrome-harness"
        canEditPage
        itemChrome
        defaultLayouts={{
          lg: [
            { i: 'candidates', x: 0, y: 0, w: 12, h: 6, autoHeight: true },
            { i: 'reconciliation', x: 0, y: 6, w: 4, h: 6, autoHeight: true },
            { i: 'superannuation', x: 4, y: 6, w: 4, h: 6, autoHeight: false },
            { i: 'payroll', x: 8, y: 6, w: 2, h: 6, autoHeight: true },
          ],
        }}
        widgets={{
          candidates: <Card heading="Candidates" body="Pipeline rows stay readable under the editor strip." />,
          reconciliation: <Card heading="Reconciliation" body="Narrow card, long single-word label." />,
          superannuation: <Card heading="Super" body="Fixed-height card, longer single-word label." />,
          payroll: <Card heading="Payroll" body="Two of twelve columns — the narrowest real card." />,
        }}
        widgetMeta={{
          candidates: { label: 'Candidates' },
          reconciliation: { label: 'Reconciliation' },
          superannuation: { label: 'SuperannuationReconciliationExceptions' },
          payroll: { label: 'SuperannuationReconciliationExceptionsQueue' },
        }}
      />
    </div>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('missing #root');
createRoot(root).render(<Harness />);
