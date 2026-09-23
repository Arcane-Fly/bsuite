import { readFileSync } from 'node:fs'
import { transactionStatements, SCOPES } from './check-migration-owns-no-transaction.mjs'
import { readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
const root = process.cwd()
let total = 0
for (const scope of SCOPES) {
  const dir = path.join(root, scope)
  if (!existsSync(dir)) continue
  let c = 0
  const list = []
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.sql')) continue
    const stmts = transactionStatements(readFileSync(path.join(dir, f), 'utf8'))
    if (stmts.length) { c++; list.push(f) }
  }
  total += c
  console.log(`${scope}: ${c}`)
  for (const l of list) console.log(`    ${l}`)
}
console.log(`TOTAL: ${total}`)
