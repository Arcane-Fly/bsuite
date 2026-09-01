#!/usr/bin/env node
/**
 * Transcribes the operator's own Lucidchart export of the apprentice onboarding /
 * placement journey into an xyflow-native workflow graph, and emits:
 *
 *   1. scripts/seed-data/apprentice-placement-workflow.graph.json
 *        The {nodes, edges, viewport} object exactly as it will be stored in
 *        workflow_definition_versions.graph (jsonb).
 *   2. scripts/seed-data/apprentice-placement-workflow.ai_context.json
 *        The six ProcessDecisionBlock rationale notes, VERBATIM, exactly as it will
 *        be stored in workflow_definition_versions.ai_context (jsonb).
 *   3. supabase/seeds/20260901_apprentice_placement_workflow_seed.sql
 *        The idempotent seed SQL an operator/CI can run once
 *        supabase/migrations/20261102000000_workflow_definitions.sql (Lane 1) has
 *        landed. NOT a numbered migration — see the header comment in that file for
 *        why, and for the UNIQUE-constraint caveat this seed depends on.
 *
 * Source of truth: docs/design-inputs/20260901-apprentice-onboarding-journey-lucidchart-v1.00A.json
 * (the operator's own Lucidchart export — 54 shapes / 41 connectors on one page).
 * This script is the transcription; nothing here is hand-typed against the graph.
 *
 * Usage:
 *   node scripts/generate-apprentice-placement-workflow-seed.mjs [path/to/lucidchart.json]
 *
 * Contract this codes against (packages/workflow-canvas, Lane 2 — not built by this
 * script, not modified by it):
 *   - node.type in {step, decision, terminator, handoff, swimlane}
 *   - swimlanes are xyflow parent nodes (children carry parentId + extent: 'parent')
 *   - graph shape is xyflow's native {nodes, edges, viewport}
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')

const DEFAULT_SOURCE = join(
  REPO_ROOT,
  'docs/design-inputs/20260901-apprentice-onboarding-journey-lucidchart-v1.00A.json',
)

const WORKFLOW_KEY = 'apprentice-placement'
const WORKFLOW_NAME = 'Apprentice Placement'
const WORKFLOW_DESCRIPTION =
  'End-to-end apprentice journey from accepting an employment offer through training ' +
  'contract lodgement, DEWR/State Training Authority notification, host placement and ' +
  'rate confirmation, nominal training-plan setup, and portal visibility for the ' +
  'apprentice and host employer. Transcribed from the operator’s own Lucidchart ' +
  '(docs/design-inputs/20260901-apprentice-onboarding-journey-lucidchart-v1.00A.json).'

// The lane order is fixed by the operator's own AdvancedSwimLaneBlock Primary_0..5
// text areas. This is asserted, not assumed — see assertLaneOrder() below.
const EXPECTED_LANE_NAMES = [
  'Apprentice',
  'GTO / Labour Hire Team',
  'Apprentice Connect Provider',
  'DEWR and State Training Authority',
  'Training Provider',
  'Host Employer',
]

const NODE_CLASS_TO_TYPE = {
  ProcessBlock: 'step',
  DecisionBlock: 'decision',
  TerminatorBlockV2: 'terminator',
}

// ---------- generic helpers ----------

function slugify(text, maxLen = 100) {
  const s = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
    .replace(/-+$/g, '')
  return s || 'node'
}

function uniqueSlug(text, used, maxLen = 100) {
  const base = slugify(text, maxLen)
  let candidate = base
  let n = 2
  while (used.has(candidate)) {
    candidate = `${base}-${n}`
    n++
  }
  used.add(candidate)
  return candidate
}

function textOf(shape, label = 'Text') {
  const ta = (shape.textAreas || []).find((t) => t.label === label)
  return ta ? ta.text : undefined
}

function lanePrimaryKeyOf(shape) {
  for (const ld of shape.linkedData || []) {
    for (const kv of ld.data || []) {
      if (kv.key === 'SpreadsheetRowParentKey' && kv.value !== 'DEFAULT_EMPTY') {
        return kv.value // e.g. "Primary_3"
      }
    }
  }
  return undefined
}

// ---------- parsing ----------

/** Extracts lanes, workflow nodes, raw edges, and the six rationale notes. */
export function parseLucidchart(doc) {
  const page = doc.pages[0]
  const shapes = page.items.shapes
  const lines = page.items.lines

  const swimlane = shapes.find((s) => s.class === 'AdvancedSwimLaneBlock')
  if (!swimlane) throw new Error('No AdvancedSwimLaneBlock found in Lucidchart export')

  const laneNamesByPrimary = {}
  for (const ta of swimlane.textAreas) {
    const m = /^Primary_(\d+)$/.exec(ta.label)
    if (m) laneNamesByPrimary[`Primary_${m[1]}`] = ta.text
  }

  const laneKeys = Object.keys(laneNamesByPrimary).sort(
    (a, b) => Number(a.split('_')[1]) - Number(b.split('_')[1]),
  )
  const lanes = laneKeys.map((primaryKey, index) => ({
    primaryKey,
    index,
    name: laneNamesByPrimary[primaryKey],
    id: `lane-${slugify(laneNamesByPrimary[primaryKey])}`,
  }))

  assertLaneOrder(lanes)

  const laneByPrimary = Object.fromEntries(lanes.map((l) => [l.primaryKey, l]))

  const usedSlugs = new Set()
  const nodesBySourceId = new Map()
  const nodeClasses = Object.keys(NODE_CLASS_TO_TYPE)

  for (const shape of shapes) {
    if (!nodeClasses.includes(shape.class)) continue
    const label = textOf(shape, 'Text')
    if (label === undefined) {
      throw new Error(`${shape.class} ${shape.id} has no Text label`)
    }
    const primaryKey = lanePrimaryKeyOf(shape)
    if (!primaryKey || !laneByPrimary[primaryKey]) {
      throw new Error(`${shape.class} ${shape.id} ("${label}") has no resolvable lane`)
    }
    const id = uniqueSlug(label, usedSlugs)
    nodesBySourceId.set(shape.id, {
      id,
      sourceId: shape.id,
      type: NODE_CLASS_TO_TYPE[shape.class],
      label,
      lane: laneByPrimary[primaryKey],
    })
  }

  const edgesRaw = lines.map((line) => {
    const srcSourceId = line.endpoint1.connectedTo
    const tgtSourceId = line.endpoint2.connectedTo
    const src = nodesBySourceId.get(srcSourceId)
    const tgt = nodesBySourceId.get(tgtSourceId)
    if (!src || !tgt) {
      throw new Error(
        `Line ${line.id} connects to a non-workflow shape (${srcSourceId} -> ${tgtSourceId})`,
      )
    }
    const labelTa = (line.textAreas || [])[0]
    return {
      sourceLineId: line.id,
      source: src.id,
      target: tgt.id,
      label: labelTa ? labelTa.text : undefined,
      // Lucidchart direction convention observed across all 41 lines in this export:
      // endpoint1.style === 'None' (tail), endpoint2.style === 'Arrow' (head).
      endpoint1Style: line.endpoint1.style,
      endpoint2Style: line.endpoint2.style,
    }
  })

  for (const e of edgesRaw) {
    if (e.endpoint1Style !== 'None' || e.endpoint2Style !== 'Arrow') {
      throw new Error(
        `Line ${e.sourceLineId} has an unexpected endpoint style pairing ` +
          `(${e.endpoint1Style} -> ${e.endpoint2Style}); direction assumption may not hold`,
      )
    }
  }

  const rationaleNotes = shapes
    .filter((s) => s.class === 'ProcessDecisionBlock')
    .map((s) => ({
      id: s.id,
      question: textOf(s, 't_ProcessDecisionQuestion'),
      answer: textOf(s, 't_ProcessDecisionAnswer'),
    }))

  return {
    lanes,
    nodes: Array.from(nodesBySourceId.values()),
    edgesRaw,
    rationaleNotes,
  }
}

function assertLaneOrder(lanes) {
  const got = lanes.map((l) => l.name)
  const same =
    got.length === EXPECTED_LANE_NAMES.length &&
    got.every((name, i) => name === EXPECTED_LANE_NAMES[i])
  if (!same) {
    throw new Error(
      `Lane order/names changed in the source export.\nExpected: ${JSON.stringify(
        EXPECTED_LANE_NAMES,
      )}\nGot:      ${JSON.stringify(got)}`,
    )
  }
}

// ---------- graph algorithms ----------

/**
 * DFS back-edge classification (Cormen et al. white/gray/black colouring). An edge
 * u->v is a "back edge" iff v is an ancestor of u in the DFS tree (colour === 'gray',
 * i.e. still on the recursion stack when u->v is examined). This is the standard,
 * order-independent-in-outcome way to find feedback edges in a graph that is a DAG
 * plus a small number of loops — it does not hardcode which edges are loops.
 */
export function classifyBackEdges(nodeIds, edgesRaw, startNodeId) {
  const adj = new Map(nodeIds.map((id) => [id, []]))
  edgesRaw.forEach((e, i) => adj.get(e.source).push({ to: e.target, i }))

  const color = new Map(nodeIds.map((id) => [id, 'white']))
  const backEdgeIndices = new Set()

  function dfs(u) {
    color.set(u, 'gray')
    for (const { to, i } of adj.get(u) || []) {
      if (color.get(to) === 'white') dfs(to)
      else if (color.get(to) === 'gray') backEdgeIndices.add(i)
      // 'black' => forward/cross edge, not a cycle; leave it in the DAG.
    }
    color.set(u, 'black')
  }

  dfs(startNodeId)
  // Defensive: visit any node unreachable from Start too, so layering never throws.
  for (const id of nodeIds) if (color.get(id) === 'white') dfs(id)

  return backEdgeIndices
}

/** Longest-path layering (Kahn topological sort) over the DAG with back edges removed. */
export function computeLayers(nodeIds, edgesRaw, backEdgeIndices) {
  const dagEdges = edgesRaw.filter((_, i) => !backEdgeIndices.has(i))
  const preds = new Map(nodeIds.map((id) => [id, []]))
  const indegree = new Map(nodeIds.map((id) => [id, 0]))
  for (const e of dagEdges) {
    preds.get(e.target).push(e.source)
    indegree.set(e.target, indegree.get(e.target) + 1)
  }

  const layer = new Map()
  const topoOrder = []
  const queue = nodeIds.filter((id) => indegree.get(id) === 0)
  const indegreeLeft = new Map(indegree)

  while (queue.length) {
    const u = queue.shift()
    topoOrder.push(u)
    const predLayers = preds.get(u).map((p) => layer.get(p))
    layer.set(u, predLayers.length ? Math.max(...predLayers) + 1 : 0)
    for (const e of dagEdges) {
      if (e.source !== u) continue
      indegreeLeft.set(e.target, indegreeLeft.get(e.target) - 1)
      if (indegreeLeft.get(e.target) === 0) queue.push(e.target)
    }
  }

  if (topoOrder.length !== nodeIds.length) {
    throw new Error(
      'computeLayers: DAG-after-removing-back-edges still has a cycle ' +
        `(topo-sorted ${topoOrder.length}/${nodeIds.length} nodes) — back-edge ` +
        'detection did not remove enough edges.',
    )
  }

  return { layer, topoOrder }
}

// ---------- layout ----------

const NODE_WIDTH = 220
const NODE_HEIGHT = 80
const COLUMN_SPACING = 260
const LANE_PADDING_X = 40
const LANE_PADDING_Y = 40
const LANE_HEIGHT = LANE_PADDING_Y * 2 + NODE_HEIGHT
const LANE_GAP = 24

/**
 * Lays out nodes by "lane row + topological column" (per the operator's own
 * instruction: derive positions from Lucidchart geometry where sane, otherwise use
 * lane row + topological column — the source export carries no x/y/width/height at
 * all, so this is the only sane path here).
 */
export function layoutGraph({ lanes, nodes, edgesRaw, rationaleNotes }) {
  const nodeIds = nodes.map((n) => n.id)
  const startNode = nodes.find((n) => n.type === 'terminator' && n.label === 'Start')
  if (!startNode) throw new Error('No terminator node labelled "Start" found')

  const backEdgeIndices = classifyBackEdges(nodeIds, edgesRaw, startNode.id)
  const { layer, topoOrder } = computeLayers(nodeIds, edgesRaw, backEdgeIndices)
  const topoIndex = new Map(topoOrder.map((id, i) => [id, i]))

  // Column = position within the node's own lane, ordered by (layer, topo index).
  // This guarantees no two nodes in the same lane share a column (no overlap) while
  // keeping the left-to-right order faithful to the overall process flow.
  const byLane = new Map(lanes.map((l) => [l.id, []]))
  for (const n of nodes) byLane.get(n.lane.id).push(n)
  for (const laneNodes of byLane.values()) {
    laneNodes.sort((a, b) => {
      const dl = layer.get(a.id) - layer.get(b.id)
      if (dl !== 0) return dl
      return topoIndex.get(a.id) - topoIndex.get(b.id)
    })
  }

  const columnOf = new Map()
  let maxColumns = 0
  for (const laneNodes of byLane.values()) {
    laneNodes.forEach((n, col) => columnOf.set(n.id, col))
    maxColumns = Math.max(maxColumns, laneNodes.length)
  }

  const laneWidth = LANE_PADDING_X * 2 + Math.max(maxColumns, 1) * COLUMN_SPACING - (COLUMN_SPACING - NODE_WIDTH)

  const flowNodes = []
  for (const lane of lanes) {
    flowNodes.push({
      id: lane.id,
      type: 'swimlane',
      position: { x: 0, y: lane.index * (LANE_HEIGHT + LANE_GAP) },
      style: { width: laneWidth, height: LANE_HEIGHT },
      data: { label: lane.name, order: lane.index },
      draggable: false,
      selectable: false,
    })
  }
  for (const n of nodes) {
    const col = columnOf.get(n.id)
    flowNodes.push({
      id: n.id,
      type: n.type,
      parentId: n.lane.id,
      extent: 'parent',
      position: { x: LANE_PADDING_X + col * COLUMN_SPACING, y: LANE_PADDING_Y },
      style: { width: NODE_WIDTH, height: NODE_HEIGHT },
      data: { label: n.label, sourceId: n.sourceId },
    })
  }

  const usedEdgeIds = new Set()
  const flowEdges = edgesRaw.map((e) => {
    let id = `e-${e.source}-${e.target}`
    let n = 2
    while (usedEdgeIds.has(id)) {
      id = `e-${e.source}-${e.target}-${n}`
      n++
    }
    usedEdgeIds.add(id)
    const edge = { id, source: e.source, target: e.target, data: { sourceId: e.sourceLineId } }
    if (e.label) edge.label = e.label
    return edge
  })

  const graph = { nodes: flowNodes, edges: flowEdges, viewport: { x: 0, y: 0, zoom: 1 } }

  const aiContext = {
    rationale_notes: rationaleNotes.map((n) => ({
      id: n.id,
      question: n.question,
      answer: n.answer,
    })),
  }

  return { graph, aiContext, backEdgeIndices, layer, topoOrder, columnOf }
}

// ---------- SQL emission ----------

function sqlStringLiteral(jsonValue) {
  // Dollar-quoted so we never have to escape single quotes inside the JSON text.
  return `$jsonb$${JSON.stringify(jsonValue)}$jsonb$`
}

export function renderSeedSql({ graph, aiContext }) {
  const graphLiteral = sqlStringLiteral(graph)
  const aiContextLiteral = sqlStringLiteral(aiContext)
  const descriptionLiteral = WORKFLOW_DESCRIPTION.replace(/'/g, "''")

  return `-- Seed data, not schema. Deliberately NOT a numbered migration file: this estate
-- shares one schema_migrations table keyed on version string across 8 applier
-- scopes, and a colliding version string is silently skipped (see
-- docs/plans/20260901-workflow-canvas-implementation-v1.00A.md). A seed has no such
-- collision risk and can be re-run safely any time after the schema exists.
--
-- GENERATED FILE — do not hand-edit. Regenerate with:
--   node scripts/generate-apprentice-placement-workflow-seed.mjs
-- from docs/design-inputs/20260901-apprentice-onboarding-journey-lucidchart-v1.00A.json
-- (the operator's own Lucidchart export of the apprentice placement journey).
--
-- Depends on supabase/migrations/20261102000000_workflow_definitions.sql (Lane 1),
-- which has not merged as of authoring this seed. Running this before that
-- migration lands is a safe no-op (see the to_regclass guard below).
--
-- IDEMPOTENCY CAVEAT FOR LANE 1 — READ BEFORE MERGING THE MIGRATION:
-- This seed inserts with tenant_id IS NULL (a platform/system template) and relies
-- on ON CONFLICT (tenant_id, key) DO NOTHING to make re-runs a no-op. Postgres's
-- default UNIQUE constraint semantics treat every NULL as DISTINCT from every other
-- NULL, so a plain \`UNIQUE (tenant_id, key)\` will NOT stop two seed runs from
-- inserting two platform rows with the same key. workflow_definitions' unique
-- constraint on (tenant_id, key) MUST be declared
-- \`UNIQUE NULLS NOT DISTINCT (tenant_id, key)\` (Postgres 15+) — or an equivalent
-- partial unique index on (key) WHERE tenant_id IS NULL — for this seed's
-- idempotency contract to hold. Verified empirically in
-- scripts/__tests__/apprentice-placement-workflow-seed.test.mjs (search for
-- "NULLS NOT DISTINCT"): the naive constraint reproducibly duplicates the row on a
-- second run; the NULLS NOT DISTINCT constraint does not.
DO $seed$
DECLARE
  v_def_id uuid;
  v_ver_id uuid;
BEGIN
  IF to_regclass('public.workflow_definitions') IS NULL
     OR to_regclass('public.workflow_definition_versions') IS NULL THEN
    RAISE NOTICE 'workflow_definitions/workflow_definition_versions not present yet — skipping seed (awaiting migration 20261102000000_workflow_definitions.sql)';
    RETURN;
  END IF;

  INSERT INTO public.workflow_definitions (tenant_id, key, name, description, is_system)
  VALUES (NULL, '${WORKFLOW_KEY}', '${WORKFLOW_NAME}', '${descriptionLiteral}', true)
  ON CONFLICT (tenant_id, key) DO NOTHING;

  SELECT id INTO v_def_id
  FROM public.workflow_definitions
  WHERE tenant_id IS NULL AND key = '${WORKFLOW_KEY}'
  LIMIT 1;

  INSERT INTO public.workflow_definition_versions
    (workflow_definition_id, version, status, graph, ai_context, tenant_id, published_at)
  VALUES
    (v_def_id, 1, 'published', ${graphLiteral}::jsonb, ${aiContextLiteral}::jsonb, NULL, now())
  ON CONFLICT (workflow_definition_id, version) DO NOTHING;

  SELECT id INTO v_ver_id
  FROM public.workflow_definition_versions
  WHERE workflow_definition_id = v_def_id AND version = 1
  LIMIT 1;

  UPDATE public.workflow_definitions
  SET current_published_version_id = v_ver_id, updated_at = now()
  WHERE id = v_def_id
    AND current_published_version_id IS DISTINCT FROM v_ver_id;
END
$seed$;
`
}

// ---------- orchestration ----------

export function buildAll(doc) {
  const parsed = parseLucidchart(doc)
  const { graph, aiContext, backEdgeIndices, layer, topoOrder, columnOf } = layoutGraph(parsed)
  return { parsed, graph, aiContext, backEdgeIndices, layer, topoOrder, columnOf }
}

function main() {
  const sourcePath = process.argv[2] || DEFAULT_SOURCE
  const doc = JSON.parse(readFileSync(sourcePath, 'utf8'))
  const { graph, aiContext } = buildAll(doc)

  const graphPath = join(REPO_ROOT, 'scripts/seed-data/apprentice-placement-workflow.graph.json')
  const aiContextPath = join(
    REPO_ROOT,
    'scripts/seed-data/apprentice-placement-workflow.ai_context.json',
  )
  const sqlPath = join(
    REPO_ROOT,
    'supabase/seeds/20260901_apprentice_placement_workflow_seed.sql',
  )

  mkdirSync(dirname(graphPath), { recursive: true })
  mkdirSync(dirname(sqlPath), { recursive: true })

  writeFileSync(graphPath, JSON.stringify(graph, null, 2) + '\n')
  writeFileSync(aiContextPath, JSON.stringify(aiContext, null, 2) + '\n')
  writeFileSync(sqlPath, renderSeedSql({ graph, aiContext }))

  console.log(`wrote ${graph.nodes.length} nodes, ${graph.edges.length} edges`)
  console.log(`  -> ${graphPath}`)
  console.log(`  -> ${aiContextPath}`)
  console.log(`  -> ${sqlPath}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
