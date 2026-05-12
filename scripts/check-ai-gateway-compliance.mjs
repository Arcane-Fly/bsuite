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
// without scanning an unbounded amount of source per callsite.
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
      )}['"]\\s*\\))`
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

if (violations.length > 0) {
  console.error('AI Gateway compliance check failed:')
  for (const violation of violations) {
    console.error(`- ${violation}`)
  }
  process.exit(1)
}

console.log(`AI Gateway compliance check passed for ${trackedFiles.length} files.`)
