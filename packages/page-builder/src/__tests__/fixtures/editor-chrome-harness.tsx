import React from 'react';
import { createRoot } from 'react-dom/client';
import { PageGridLayout } from '../../PageGridLayout.js';

/**
 * Real PageGridLayout mount for browser geometry — not toy coloured boxes.
 * The heading is the same class of content the overlapping label covered
 * (Candidates on the live matrix).
 */
function CandidatesCard() {
  return (
    <article data-slot="card-content">
      <h2 data-slot="card-heading">Candidates</h2>
      <p data-slot="card-body">Pipeline rows stay readable under the editor strip.</p>
    </article>
  );
}

function Harness() {
  return (
    <div id="harness-root" style={{ width: '100%', maxWidth: '100%', minHeight: 400, padding: 16, boxSizing: 'border-box' }}>
      <PageGridLayout
        pageKey="editor-chrome-harness"
        canEditPage
        itemChrome
        defaultLayouts={{
          lg: [{ i: 'candidates', x: 0, y: 0, w: 12, h: 6, autoHeight: true }],
        }}
        widgets={{ candidates: <CandidatesCard /> }}
        widgetMeta={{ candidates: { label: 'Candidates' } }}
      />
    </div>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('missing #root');
createRoot(root).render(<Harness />);
