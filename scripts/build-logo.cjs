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

// Icono de la app: tarjeta oscura con borde dorado (como en la referencia).
const GOLD = 'linear-gradient(145deg,#FFE89A 0%,#F2B100 48%,#B87800 100%)'
const DARK = 'linear-gradient(160deg,#25272b 0%,#121315 100%)'

// [archivo, lado, radio (0 = a sangre), tamaño del logo, estilo]
const JOBS = [
  ['icon-192.png', 192, 0.22, 0.74, 'border'],
  ['icon-512.png', 512, 0.22, 0.74, 'border'],
  ['icon-maskable-512.png', 512, 0, 0.58, 'flat'], // a sangre; el logo cabe en la zona segura de Android
  ['apple-touch-icon.png', 180, 0, 0.7, 'flat'],   // iOS redondea solo las esquinas
  ['favicon-64.png', 64, 0, 1, 'none'],            // solo el emblema
]

const logoAt = (px) => svg.replace('<svg ', `<svg width="${px}" height="${px}" style="display:block" `)

;(async () => {
  fs.copyFileSync(path.join(ROOT, 'brand', 'logo.svg'), path.join(PUB, 'logo.svg'))
  const browser = await chromium.launch()
  for (const [file, side, radius, fill, style] of JOBS) {
    const r = Math.round(side * radius)
    const inner = Math.round(side * fill)
    const border = Math.max(3, Math.round(side * 0.035))
    const body =
      style === 'border'
        ? `<div style="width:${side}px;height:${side}px;border-radius:${r}px;background:${GOLD};display:grid;place-items:center">
             <div style="width:${side - border * 2}px;height:${side - border * 2}px;border-radius:${Math.max(0, r - border)}px;background:${DARK};display:grid;place-items:center;
               box-shadow:inset 0 0 ${Math.round(side * 0.08)}px rgba(0,0,0,.6)">${logoAt(inner)}</div></div>`
        : style === 'flat'
          ? `<div style="width:${side}px;height:${side}px;background:${DARK};display:grid;place-items:center">${logoAt(inner)}</div>`
          : `<div style="width:${side}px;height:${side}px;display:grid;place-items:center">${logoAt(inner)}</div>`
    const page = await browser.newPage({ viewport: { width: side, height: side } })
    await page.setContent(`<!doctype html><body style="margin:0;background:transparent">${body}</body>`)
    await page.screenshot({ path: path.join(PUB, file), omitBackground: true })
    await page.close()
    console.log('✓', file)
  }
  await browser.close()
})()
