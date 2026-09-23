import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { classify } from './audit-doc-completion.mjs'

const roots = ['.', 'crm7', 'business-suite-unified', 'conduit', 'braden', 'throughput', 'R80.4']
const artifactsPresent = new Set()
for (const root of roots) {
  for (const d of ['scripts', '.github/workflows']) {
    const dir = root === '.' ? d : join(root, d)
    if (existsSync(dir)) for (const f of readdirSync(dir)) artifactsPresent.add(f)
  }
}
const candidates = process.argv.slice(2)
for (const p of candidates) {
  const text = readFileSync(p, 'utf8')
  const r = classify(text, p, artifactsPresent, p)
  const unbound = !r.bindable && r.deadCitations.length === 0 && !r.archival
  console.log(`${unbound ? 'UNBOUND' : r.archival ? 'ARCHIVAL' : r.bindable ? 'BINDABLE' : 'DEAD-CITE'}  ${p}  live=[${[...r.liveGates, ...r.liveWorkflows].slice(0, 3).join(',')}] dead=[${r.deadCitations.slice(0, 3).join(',')}]`)
}
