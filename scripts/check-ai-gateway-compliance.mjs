#!/usr/bin/env node

import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()

/*
 * `--recurse-submodules` is load-bearing, not a tidy-up.
 *
 * Plain `git ls-files` stops at a gitlink. In this repo that means it returns
 * 1,286 files and NOT ONE of them is under crm7/, business-suite-unified/,
 * conduit/, throughput/, braden/ or R80.4/ — which is where every real LLM call
 * in the estate lives. Recursing returns 8,047. So for as long as this gate used
 * the plain form it examined 16% of the estate and printed
 * "AI Gateway compliance check passed for 530 files" over the other 84%.
 *
 * A gate that cannot tell "checked nothing" from "found nothing" is not a gate,
 * so the coverage self-check below refuses rather than reporting a clean pass.
 */
const trackedFiles = execSync('git ls-files --recurse-submodules', { encoding: 'utf8' })
  .split('\n')
  .map((file) => file.trim())
  .filter(Boolean)
  .filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file))
  .filter((file) => !file.includes('/node_modules/'))
  .filter((file) => !file.startsWith('docs/'))
  .filter((file) => file !== 'scripts/check-ai-gateway-compliance.mjs')

const bannedProviderModules = [
  'openai',
  '@anthropic-ai/sdk',
  '@google/genai',
  'google-genai',
]

const aiCallSnippets = ['generateText(', 'streamText(', 'generateObject(']
const metadataTokens = ['issueNumber', 'repo', 'agentRole']
const metadataKeyPatterns = {
  issueNumber: /\bissueNumber\s*[: ,]/,
  repo: /\brepo\s*[: ,]/,
  agentRole: /\bagentRole\s*[: ,]/,
}
const clientSideGatewayKeySnippets = [
  'VITE_AI_GATEWAY_API_KEY',
  'NEXT_PUBLIC_AI_GATEWAY_API_KEY',
]
// Captures typical AI SDK call options payloads (including metadata objects and headers)
// across ~20-40 line invocation blocks while avoiding unbounded scanning per callsite.
// If callsites grow beyond this, increase this constant alongside tests.
const CALL_WINDOW_SIZE = 1200

const violations = []

function escapeForRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function toLineNumber(content, index) {
  return content.slice(0, index).split('\n').length
}

function stripComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
}

function findCallWindows(fileContent, callSnippet) {
  const windows = []
  let currentIndex = fileContent.indexOf(callSnippet)
  while (currentIndex !== -1) {
    windows.push(fileContent.slice(currentIndex, currentIndex + CALL_WINDOW_SIZE))
    currentIndex = fileContent.indexOf(callSnippet, currentIndex + callSnippet.length)
  }
  return windows
}

for (const relativeFilePath of trackedFiles) {
  const absoluteFilePath = path.join(repoRoot, relativeFilePath)
  const fileContent = readFileSync(absoluteFilePath, 'utf8')
  const contentWithoutComments = stripComments(fileContent)
  const uncommentedLines = contentWithoutComments.split('\n')

  for (const moduleName of bannedProviderModules) {
    const importPattern = new RegExp(
      `(?:from\\s*['"]${escapeForRegExp(moduleName)}['"]|require\\(\\s*['"]${escapeForRegExp(
        moduleName
      )}['"]\\s*\\)|import\\(\\s*['"]${escapeForRegExp(moduleName)}['"]\\s*\\))`
    )
    const match = importPattern.exec(contentWithoutComments)
    if (match?.index !== undefined) {
      violations.push(
        `${relativeFilePath}:${toLineNumber(
          contentWithoutComments,
          match.index
        )} banned direct model provider import (${moduleName})`
      )
    }
  }

  for (const aiCallSnippet of aiCallSnippets) {
    const callWindows = findCallWindows(contentWithoutComments, aiCallSnippet)
    callWindows.forEach((windowContent, callIndex) => {
      // Exact key spellings are intentional for normalized Gateway observability fields.
      const tokenPresence = Object.fromEntries(
        metadataTokens.map((token) => [token, metadataKeyPatterns[token].test(windowContent)])
      )
      const missingMetadataTokens = metadataTokens.filter(
        (token) => !tokenPresence[token]
      )
      if (missingMetadataTokens.length > 0) {
        violations.push(
          `${relativeFilePath} ${aiCallSnippet} call #${
            callIndex + 1
          } missing AI Gateway metadata token(s): ${missingMetadataTokens.join(', ')}`
        )
      }
    })
  }

  for (const snippet of clientSideGatewayKeySnippets) {
    uncommentedLines.forEach((line, index) => {
      if (line.includes(snippet)) {
        violations.push(
          `${relativeFilePath}:${index + 1} client-side AI Gateway key usage is forbidden (${snippet})`
        )
      }
    })
  }
}

/*
 * COVERAGE SELF-CHECK. The failure this gate actually suffered was not a missed
 * violation — it was a confident pass over files it never opened. A count alone
 * cannot distinguish the two, so print the breakdown and refuse a pass that saw
 * no submodule at all while the submodules are plainly checked out.
 */
const SUBMODULES = ['crm7', 'business-suite-unified', 'conduit', 'throughput', 'braden', 'R80.4']
const perScope = new Map([['bsuite (parent)', 0]])
for (const f of trackedFiles) {
  const sub = SUBMODULES.find((s) => f.startsWith(`${s}/`))
  const key = sub ?? 'bsuite (parent)'
  perScope.set(key, (perScope.get(key) ?? 0) + 1)
}
const checkedOut = SUBMODULES.filter((s) => existsSync(path.join(repoRoot, s, '.git')))
const seen = SUBMODULES.filter((s) => (perScope.get(s) ?? 0) > 0)
const blind = checkedOut.filter((s) => !seen.includes(s))

console.log('AI Gateway compliance — files examined per scope:')
for (const [scope, n] of [...perScope].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(5)}  ${scope}`)
}

if (blind.length > 0) {
  console.error(
    `\nCOVERAGE FAILURE — ${blind.length} submodule(s) are checked out but contributed ZERO files: ` +
      `${blind.join(', ')}.\nThat is the exact shape of the defect this check exists to prevent: a clean ` +
      `pass over code the gate never opened. Fix the enumeration; do not lower the check.`
  )
  process.exit(1)
}

/*
 * SHRINKING RATCHET on metadata violations.
 *
 * Turning on --recurse-submodules surfaced four pre-existing violations that were
 * always there and never visible. Leaving the gate red would train everyone to
 * ignore it, so the debt is banked and may only shrink — never rise.
 *
 * The four are RUNTIME user endpoints, not agent calls, which is why they lack
 * `issueNumber`: a chat request from a signed-in user has no issue. The honest
 * value there is `issueNumber: null` alongside a real `repo` and a real
 * `agentRole` naming the surface — NOT an invented issue number, which would
 * satisfy this check while making the cost attribution a lie.
 *
 * Baseline reaches 0 via the three submodule PRs named in AI_GATEWAY_BASELINE.
 */
const BASELINE_PATH = path.join(repoRoot, 'scripts', '.ai-gateway-baseline')
const baseline = existsSync(BASELINE_PATH)
  ? Number.parseInt(readFileSync(BASELINE_PATH, 'utf8').trim(), 10)
  : 0

if (violations.length > baseline) {
  console.error(
    `AI Gateway compliance REGRESSED: ${violations.length} violation(s) against a baseline of ${baseline}.`
  )
  for (const violation of violations) console.error(`- ${violation}`)
  process.exit(1)
}

if (violations.length > 0) {
  console.warn(`\nAI Gateway metadata debt: ${violations.length} of a permitted ${baseline} (may shrink, never rise):`)
  for (const violation of violations) console.warn(`- ${violation}`)
}

if (violations.length < baseline) {
  console.error(
    `\nRATCHET: violations fell to ${violations.length} but the baseline still reads ${baseline}. ` +
      `Re-bank it — a baseline left above the truth silently re-permits the debt you just paid off.`
  )
  process.exit(1)
}

console.log(
  `\nAI Gateway compliance check passed for ${trackedFiles.length} file(s) across ` +
    `${perScope.size} scope(s) (${seen.length} of ${checkedOut.length} submodule(s) reached).`
)
