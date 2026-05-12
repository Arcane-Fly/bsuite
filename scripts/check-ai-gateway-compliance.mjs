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
const CALL_WINDOW_SIZE = 1200

/**
 * Server/client path heuristics:
 * - Server paths cover Next.js API routes, Supabase edge functions, and explicit server folders.
 * - Client paths target common browser-facing folders in Vite/React/Next.js apps.
 * - A file is considered browser code only when it matches client hints and does not match server hints.
 */
const serverPathHints = [
  '/src/server/',
  '/app/api/',
  '/pages/api/',
  '/supabase/functions/',
  '/edge-functions/',
]
const clientPathHints = [
  '/src/components/',
  '/src/pages/',
  '/src/hooks/',
  '/src/contexts/',
  '/app/',
  '/pages/',
]

const violations = []

function lineImportsModule(line, moduleName) {
  return (
    line.includes(`from '${moduleName}'`) ||
    line.includes(`from "${moduleName}"`) ||
    line.includes(`require('${moduleName}')`) ||
    line.includes(`require("${moduleName}")`)
  )
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
      const missingMetadataTokens = metadataTokens.filter(
        (token) =>
          !windowContent.includes(`${token}:`) && !windowContent.includes(`${token},`)
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

  const isLikelyServerCode = serverPathHints.some((segment) =>
    relativeFilePath.includes(segment)
  )

  const isLikelyBrowserCode = clientPathHints.some((segment) =>
    relativeFilePath.includes(segment)
  )

  const hasUseClientDirective =
    fileContent.startsWith("'use client'") || fileContent.startsWith('"use client"')

  if ((isLikelyBrowserCode || hasUseClientDirective) && !isLikelyServerCode) {
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
}

if (violations.length > 0) {
  console.error('AI Gateway compliance check failed:')
  for (const violation of violations) {
    console.error(`- ${violation}`)
  }
  process.exit(1)
}

console.log(`AI Gateway compliance check passed for ${trackedFiles.length} files.`)
