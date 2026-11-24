#!/usr/bin/env node
/**
 * Genera los iconos de la app desde el logo vectorial (brand/logo.svg).
 *   node scripts/build-logo.cjs
 * Requiere Playwright (herramienta de desarrollo, no es dependencia de la app): npm i -D playwright
 */
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

const ROOT = path.resolve(__dirname, '..')
const svg = fs.readFileSync(path.join(ROOT, 'brand', 'logo.svg'), 'utf8')
const PUB = path.join(ROOT, 'public')
const TILE = '#0A0A0A'

// [archivo, lado, radio de esquinas (0 = a sangre), tamaño del logo dentro, tarjeta de fondo]
const JOBS = [
  ['icon-192.png', 192, 0.22, 0.82, true],
  ['icon-512.png', 512, 0.22, 0.82, true],
  ['icon-maskable-512.png', 512, 0, 0.62, true], // el logo cabe en la zona segura de Android
  ['apple-touch-icon.png', 180, 0, 0.78, true],   // iOS redondea solo las esquinas
  ['favicon-64.png', 64, 0, 1, false],            // sin tarjeta: solo el emblema
]

;(async () => {
  fs.copyFileSync(path.join(ROOT, 'brand', 'logo.svg'), path.join(PUB, 'logo.svg'))
  const browser = await chromium.launch()
  for (const [file, side, radius, fill, tile] of JOBS) {
    const inner = Math.round(side * fill)
    const html = `<!doctype html><body style="margin:0;background:transparent">
      <div style="width:${side}px;height:${side}px;display:grid;place-items:center;
        background:${tile ? TILE : 'transparent'};border-radius:${Math.round(side * radius)}px">
        ${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" style="display:block" `)}
      </div></body>`
    const page = await browser.newPage({ viewport: { width: side, height: side } })
    await page.setContent(html)
    await page.screenshot({ path: path.join(PUB, file), omitBackground: true })
    await page.close()
    console.log('✓', file)
  }
  await browser.close()
})()
