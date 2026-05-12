#!/usr/bin/env node

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()

const trackedFiles = execSync('git ls-files', { encoding: 'utf8' })
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
const clientSideGatewayKeySnippets = [
  'VITE_AI_GATEWAY_API_KEY',
  'NEXT_PUBLIC_AI_GATEWAY_API_KEY',
]
// Captures typical AI SDK call options payloads (including metadata objects and headers)
// without scanning an unbounded amount of source per callsite.
const CALL_WINDOW_SIZE = 1200

const violations = []

function extractQuotedSpecifier(line, marker) {
  const markerIndex = line.indexOf(marker)
  if (markerIndex === -1) return null

  const firstSingleQuoteIndex = line.indexOf("'", markerIndex + marker.length)
  const firstDoubleQuoteIndex = line.indexOf('"', markerIndex + marker.length)
  const quoteStartIndexCandidates = [firstSingleQuoteIndex, firstDoubleQuoteIndex].filter(
    (index) => index !== -1
  )

  if (quoteStartIndexCandidates.length === 0) return null
  const quoteStartIndex = Math.min(...quoteStartIndexCandidates)
  const quoteChar = line[quoteStartIndex]
  const quoteEndIndex = line.indexOf(quoteChar, quoteStartIndex + 1)

  if (quoteEndIndex === -1) return null
  return line.slice(quoteStartIndex + 1, quoteEndIndex)
}

function lineImportsModule(line, moduleName) {
  const fromSpecifier = extractQuotedSpecifier(line, 'from')
  const requireSpecifier = extractQuotedSpecifier(line, 'require(')
  return fromSpecifier === moduleName || requireSpecifier === moduleName
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
  const lines = fileContent.split('\n')

  for (const moduleName of bannedProviderModules) {
    lines.forEach((line, index) => {
      if (lineImportsModule(line, moduleName)) {
        violations.push(
          `${relativeFilePath}:${index + 1} banned direct model provider import (${moduleName})`
        )
      }
    })
  }

  for (const aiCallSnippet of aiCallSnippets) {
    const callWindows = findCallWindows(fileContent, aiCallSnippet)
    callWindows.forEach((windowContent, callIndex) => {
      const metadataKeyPatterns = {
        issueNumber: /\bissueNumber\s*[: ,]/,
        repo: /\brepo\s*[: ,]/,
        agentRole: /\bagentRole\s*[: ,]/,
      }
      const missingMetadataTokens = metadataTokens.filter(
        (token) => !metadataKeyPatterns[token].test(windowContent)
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
    lines.forEach((line, index) => {
      if (line.includes(snippet)) {
        violations.push(
          `${relativeFilePath}:${index + 1} client-side AI Gateway key usage is forbidden (${snippet})`
        )
      }
    })
  }
}

if (violations.length > 0) {
  console.error('AI Gateway compliance check failed:')
  for (const violation of violations) {
    console.error(`- ${violation}`)
  }
  process.exit(1)
}

console.log(`AI Gateway compliance check passed for ${trackedFiles.length} files.`)
