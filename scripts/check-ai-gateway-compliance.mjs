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

const bannedImportSnippets = [
  "from 'openai'",
  'from "openai"',
  "from '@anthropic-ai/sdk'",
  'from "@anthropic-ai/sdk"',
  "from '@google/genai'",
  'from "@google/genai"',
  "from 'google-genai'",
  'from "google-genai"',
]

const aiCallSnippets = ['generateText(', 'streamText(', 'generateObject(']
const metadataTokens = ['issueNumber', 'repo', 'agentRole']
const clientSideGatewayKeySnippets = [
  'VITE_AI_GATEWAY_API_KEY',
  'NEXT_PUBLIC_AI_GATEWAY_API_KEY',
]

const violations = []

for (const relativeFilePath of trackedFiles) {
  const absoluteFilePath = path.join(repoRoot, relativeFilePath)
  const fileContent = readFileSync(absoluteFilePath, 'utf8')
  const lines = fileContent.split('\n')

  for (const snippet of bannedImportSnippets) {
    lines.forEach((line, index) => {
      if (line.includes(snippet)) {
        violations.push(
          `${relativeFilePath}:${index + 1} banned direct model provider import (${snippet})`
        )
      }
    })
  }

  const hasAICall = aiCallSnippets.some((snippet) => fileContent.includes(snippet))
  if (hasAICall) {
    const missingMetadataTokens = metadataTokens.filter(
      (token) => !fileContent.includes(token)
    )
    if (missingMetadataTokens.length > 0) {
      violations.push(
        `${relativeFilePath} missing AI Gateway metadata token(s): ${missingMetadataTokens.join(
          ', '
        )}`
      )
    }
  }

  const isClientCode =
    relativeFilePath.includes('/src/') && !relativeFilePath.includes('/src/server/')

  if (isClientCode) {
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
