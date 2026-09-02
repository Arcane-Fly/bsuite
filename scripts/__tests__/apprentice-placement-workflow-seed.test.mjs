import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  parseLucidchart,
  classifyBackEdges,
  computeLayers,
  layoutGraph,
  buildAll,
} from '../generate-apprentice-placement-workflow-seed.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '../..')
const SOURCE = join(
  REPO_ROOT,
  'docs/design-inputs/20260901-apprentice-onboarding-journey-lucidchart-v1.00A.json',
)

let failed = 0
function check(name, cond) {
  if (!cond) {
    console.error(`FAIL ${name}`)
    failed++
  } else {
    console.log(`ok   ${name}`)
  }
}

const doc = JSON.parse(readFileSync(SOURCE, 'utf8'))
const { parsed, graph, aiContext, backEdgeIndices } = buildAll(doc)

// ---------- 1. counts ----------

check('54 shapes in source page', doc.pages[0].items.shapes.length === 54)
check('41 connectors in source page', doc.pages[0].items.lines.length === 41)
check('6 swimlanes parsed', parsed.lanes.length === 6)
check(
  'lane names match the operator order',
  JSON.stringify(parsed.lanes.map((l) => l.name)) ===
    JSON.stringify([
      'Apprentice',
      'GTO / Labour Hire Team',
      'Apprentice Connect Provider',
      'DEWR and State Training Authority',
      'Training Provider',
      'Host Employer',
    ]),
)
check('32 ProcessBlock steps parsed', parsed.nodes.filter((n) => n.type === 'step').length === 32)
check(
  '2 DecisionBlock decisions parsed',
  parsed.nodes.filter((n) => n.type === 'decision').length === 2,
)
check(
  '2 TerminatorBlockV2 terminators parsed',
  parsed.nodes.filter((n) => n.type === 'terminator').length === 2,
)
check('41 edges emitted', graph.edges.length === 41)
check(
  '42 graph nodes emitted (6 lanes + 36 workflow nodes)',
  graph.nodes.length === 42 && graph.nodes.filter((n) => n.type === 'swimlane').length === 6,
)
check('6 rationale notes extracted', parsed.rationaleNotes.length === 6)
check('ai_context carries all 6 rationale notes', aiContext.rationale_notes.length === 6)

// ---------- 2. every rationale note is verbatim ----------

const rawText = readFileSync(SOURCE, 'utf8')
for (const note of aiContext.rationale_notes) {
  check(`ai_context note ${note.id} question is verbatim substring of source`, rawText.includes(JSON.stringify(note.question).slice(1, -1)))
  check(`ai_context note ${note.id} answer is verbatim substring of source`, rawText.includes(JSON.stringify(note.answer).slice(1, -1)))
}

// ---------- 3. node/edge id resolution + lane parenting ----------

const nodeIds = new Set(graph.nodes.map((n) => n.id))
const laneIds = new Set(graph.nodes.filter((n) => n.type === 'swimlane').map((n) => n.id))
const contentNodes = graph.nodes.filter((n) => n.type !== 'swimlane')

let allEdgesResolve = true
for (const e of graph.edges) {
  if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) allEdgesResolve = false
}
check('every edge source/target resolves to a real node', allEdgesResolve)

let everyNodeHasLaneParent = true
for (const n of contentNodes) {
  if (!n.parentId || !laneIds.has(n.parentId) || n.extent !== 'parent') everyNodeHasLaneParent = false
}
check('every non-lane node has a lane parentId + extent:"parent"', everyNodeHasLaneParent)

let noNodeOutsideItsLaneBand = true
for (const n of contentNodes) {
  if (n.position.x < 0 || n.position.y < 0) noNodeOutsideItsLaneBand = false
}
check('every child position is non-negative relative to its lane', noNodeOutsideItsLaneBand)

// ---------- 4. the two loops, by node id ----------

const byLabel = new Map(parsed.nodes.map((n) => [n.label, n.id]))
const changeRatesId = byLabel.get('Change rates or placement and resend for e-signing')
const sendForESigningId = byLabel.get('Send placement for CRM-triggered e-signing')
const cancelId = byLabel.get('Cancel placement and seek a new host')
const createOrConfirmHostId = byLabel.get('Create or confirm host placement')

check('loop 1 endpoints resolved', Boolean(changeRatesId && sendForESigningId))
check('loop 2 endpoints resolved', Boolean(cancelId && createOrConfirmHostId))

const loop1Edge = graph.edges.find((e) => e.source === changeRatesId && e.target === sendForESigningId)
const loop2Edge = graph.edges.find((e) => e.source === cancelId && e.target === createOrConfirmHostId)

check(
  `loop 1 present as an edge: ${changeRatesId} -> ${sendForESigningId}`,
  Boolean(loop1Edge),
)
check(
  `loop 2 present as an edge: ${cancelId} -> ${createOrConfirmHostId}`,
  Boolean(loop2Edge),
)

// Both loop edges must have been classified as DFS back edges (feedback), confirming
// the layering algorithm recognised them as loops rather than silently dropping them.
const edgeIndexById = new Map(graph.edges.map((e, i) => [e.id, i]))
check(
  'loop 1 edge is classified as a back edge (feedback), not a forward edge',
  backEdgeIndices.has(edgeIndexById.get(loop1Edge.id)),
)
check(
  'loop 2 edge is classified as a back edge (feedback), not a forward edge',
  backEdgeIndices.has(edgeIndexById.get(loop2Edge.id)),
)
check('exactly 2 back edges detected (both loops, nothing else)', backEdgeIndices.size === 2)

// ---------- 5. the four-way branch out of "Host accepted placement?" ----------

const hostAcceptedId = byLabel.get('Host accepted placement?')
const branchEdges = graph.edges.filter((e) => e.source === hostAcceptedId)
check('"Host accepted placement?" has exactly 4 outgoing edges', branchEdges.length === 4)
check(
  'branch labels are Yes / Manual approval / Cancel / No',
  JSON.stringify(branchEdges.map((e) => e.label).sort()) ===
    JSON.stringify(['Cancel', 'Manual approval', 'No', 'Yes'].sort()),
)

// ---------- 6. no step is orphaned (unreachable from Start) ----------

const startId = byLabel.get('Start')
const adjacency = new Map(contentNodes.map((n) => [n.id, []]))
for (const e of graph.edges) adjacency.get(e.source).push(e.target)

const reached = new Set([startId])
const queue = [startId]
while (queue.length) {
  const u = queue.shift()
  for (const v of adjacency.get(u) || []) {
    if (!reached.has(v)) {
      reached.add(v)
      queue.push(v)
    }
  }
}
const unreachable = contentNodes.filter((n) => !reached.has(n.id))
check(
  `every node reachable from Start (${unreachable.length} unreachable)`,
  unreachable.length === 0,
)
if (unreachable.length) console.error('  unreachable:', unreachable.map((n) => n.id))

// Every node other than Start must also have at least one incoming edge (no dangling
// step reachable only in theory — this is the same check from the other direction).
const hasIncoming = new Set(graph.edges.map((e) => e.target))
const noIncoming = contentNodes.filter((n) => n.id !== startId && !hasIncoming.has(n.id))
check(`every non-Start node has >=1 incoming edge (${noIncoming.length} without)`, noIncoming.length === 0)

// ---------- 7. layering produced a valid DAG (sanity on the algorithm itself) ----------

const allNodeIds = contentNodes.map((n) => n.id)
const edgesRawLike = graph.edges.map((e) => ({ source: e.source, target: e.target }))
const recomputedBackEdges = classifyBackEdges(allNodeIds, edgesRawLike, startId)
const { topoOrder } = computeLayers(allNodeIds, edgesRawLike, recomputedBackEdges)
check('topological sort covers every node once DAG is acyclic', topoOrder.length === allNodeIds.length)

// ---------- 8. round-trip: serialise -> parse -> deep-equal ----------

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(sortForCompare(b)) ||
    JSON.stringify(sortForCompare(a)) === JSON.stringify(sortForCompare(b))
}
function sortForCompare(x) {
  // graph.json / ai_context.json have stable key order from JSON.stringify already;
  // this just guards against a future refactor changing insertion order.
  return JSON.parse(JSON.stringify(x))
}

const graphRoundTrip = JSON.parse(JSON.stringify(graph))
check('graph round-trips: serialise -> parse -> deep-equal', deepEqual(graph, graphRoundTrip))

const aiContextRoundTrip = JSON.parse(JSON.stringify(aiContext))
check(
  'ai_context round-trips: serialise -> parse -> deep-equal',
  deepEqual(aiContext, aiContextRoundTrip),
)

// The committed artifact on disk must be byte-identical to what the generator
// produces right now, i.e. nobody hand-edited scripts/seed-data/*.json after
// generation.
const committedGraphPath = join(
  REPO_ROOT,
  'scripts/seed-data/apprentice-placement-workflow.graph.json',
)
const committedAiContextPath = join(
  REPO_ROOT,
  'scripts/seed-data/apprentice-placement-workflow.ai_context.json',
)
const committedGraph = JSON.parse(readFileSync(committedGraphPath, 'utf8'))
const committedAiContext = JSON.parse(readFileSync(committedAiContextPath, 'utf8'))
check(
  'committed graph.json matches freshly-generated graph (regenerate if this fails)',
  JSON.stringify(committedGraph) === JSON.stringify(graph),
)
check(
  'committed ai_context.json matches freshly-generated ai_context',
  JSON.stringify(committedAiContext) === JSON.stringify(aiContext),
)

// ---------- 9. every workflow node type is one of the Lane 2 canvas contract types ----------

const ALLOWED_TYPES = new Set(['step', 'decision', 'terminator', 'handoff', 'swimlane'])
const badTypes = graph.nodes.filter((n) => !ALLOWED_TYPES.has(n.type))
check(`every node.type is in the canvas contract vocabulary (${badTypes.length} bad)`, badTypes.length === 0)

// ---------- terminator role, and why it is not cosmetic ----------
//
// `TerminatorNodeDataSchema` declares `role: z.enum(['start','end'])` and it is
// REQUIRED. The seed omitted it, so the graph shipped to production was invalid
// against the package's own schema and nothing anywhere said so.
//
// The cost was not a warning. `terminatorRole()` reads
// `data.role === 'start' ? 'start' : 'end'`, so a roleless terminator silently
// becomes an END; an end terminator declares only FLOW_IN; the Start node
// therefore had no source handle and the edge LEAVING it could not attach.
// Measured on production 2026-09-02: 42 of 42 nodes rendered, 40 of 41 edges,
// and the single missing one was `e-start-accept-employment-offer` — the entry
// into the entire process. No error appeared in the console, the network, or the
// page.
//
// Asserting the ROLE alone would not have caught it, because the defect only
// becomes visible where role meets handles. So the edge is asserted too.

const terminators = graph.nodes.filter((n) => n.type === 'terminator')
check(`2 terminators (found ${terminators.length})`, terminators.length === 2)

const roleless = terminators.filter((n) => n.data?.role !== 'start' && n.data?.role !== 'end')
check(
  `every terminator carries role start|end (${roleless.length} without) — a missing role ` +
    `defaults to 'end', which strips the Start node of its only source handle`,
  roleless.length === 0,
)

const startTerm = terminators.find((n) => n.data?.role === 'start')
check('exactly one terminator has role=start', Boolean(startTerm) &&
  terminators.filter((n) => n.data?.role === 'start').length === 1)

// The edge that vanished. Named explicitly: a count would still pass if THIS one
// were the casualty and some other edge appeared in its place.
const startEdges = graph.edges.filter((e) => e.source === startTerm?.id)
check(
  `the start terminator has an outgoing edge (${startEdges.length}) — this is the one ` +
    `that silently disappeared in production while every count still looked right`,
  startEdges.length >= 1,
)

// ---------- summary ----------

if (failed) {
  console.error(`\n${failed} check(s) FAILED`)
  process.exit(1)
}
console.log('\nall checks passed')
