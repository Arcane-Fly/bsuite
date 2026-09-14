# SEC-P2: postMessage to '*' in BSU embed forms leaks capture status

https://github.com/GaryOcean428/bsuite/issues/2001

Snapshot updatedAt: 2026-08-24T03:28:03Z. Open at capture; re-read live.

## Finding
LeadForm.tsx:132 and Contact.tsx:109 call window.parent.postMessage({type:'bsuite-lead-captured'}, '*'). Any cross-origin embedder receives the confirmation event.

**Action:** Restrict targetOrigin to allowlisted parent domains.

Found by route inventory security audit (Phase 2, Task 2.3).
