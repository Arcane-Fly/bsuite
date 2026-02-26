#!/usr/bin/env node
/**
 * Build-time prerender script for Vite SPAs.
 *
 * Usage: node scripts/prerender.mjs --dist=dist --routes=/,/about,/contact
 *
 * Launches a local static server from the dist directory, visits each route
 * with headless Chromium, and saves the rendered HTML as static files.
 */

import { createServer } from 'http'
import { createRequire } from 'module'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname, extname } from 'path'

// Resolve packages from the caller's cwd (where puppeteer is installed)
const require = createRequire(join(process.cwd(), 'package.json'))

// Parse CLI args
const args = Object.fromEntries(
  process.argv.slice(2).map(arg => {
    const [key, val] = arg.replace(/^--/, '').split('=')
    return [key, val]
  })
)

const distDir = join(process.cwd(), args.dist || 'dist')
const routes = (args.routes || '/').split(',').map(r => r.trim())

if (!existsSync(distDir)) {
  console.error(`dist directory not found: ${distDir}`)
  process.exit(1)
}

console.log(`\nPrerendering ${routes.length} route(s) from ${distDir}...\n`)

// Simple static file server
function createStaticServer(dir) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.wasm': 'application/wasm',
    '.txt': 'text/plain',
    '.xml': 'application/xml',
  }

  return createServer((req, res) => {
    const url = new URL(req.url, `http://localhost`)
    let filePath = join(dir, url.pathname === '/' ? 'index.html' : url.pathname)

    // SPA fallback: if file doesn't exist, serve index.html
    if (!existsSync(filePath) || !extname(filePath)) {
      filePath = join(dir, 'index.html')
    }

    try {
      const content = readFileSync(filePath)
      const ext = extname(filePath)
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' })
      res.end(content)
    } catch {
      res.writeHead(404)
      res.end('Not found')
    }
  })
}

async function prerender() {
  const puppeteer = require('puppeteer')
  const server = createStaticServer(distDir)

  await new Promise(resolve => server.listen(0, resolve))
  const port = server.address().port
  console.log(`Static server running on port ${port}`)

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  })

  for (const route of routes) {
    const page = await browser.newPage()
    const url = `http://localhost:${port}${route}`

    console.log(`  Rendering: ${route}`)

    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })

      // Wait for React to render content into #root
      await page.waitForSelector('#root', { timeout: 10000 })

      // Allow time for react-helmet-async to update <head>
      await new Promise(r => setTimeout(r, 1000))

      const html = await page.content()

      // Write to dist as a static HTML file
      const outPath = route === '/'
        ? join(distDir, 'index.html')
        : join(distDir, route, 'index.html')

      const outDir = dirname(outPath)
      if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true })
      }

      writeFileSync(outPath, html)
      console.log(`  Wrote: ${outPath}`)
    } catch (err) {
      console.error(`  Failed to render ${route}: ${err.message}`)
    } finally {
      await page.close()
    }
  }

  await browser.close()
  server.close()
  console.log(`\nPrerendered ${routes.length} route(s) successfully.\n`)
}

prerender().catch(err => {
  console.error('Prerender failed:', err)
  process.exit(1)
})
